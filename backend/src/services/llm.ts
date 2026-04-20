import { config } from '../config.js';
import type { ChatResult, DiaryResult, RiskLevel } from '../types.js';
import { redactSensitiveText } from '../utils/redact.js';

const HIGH_RISK_PATTERNS = [/自杀/u,/不想活/u,/活着没意思/u,/结束生命/u,/割腕/u,/跳楼/u,/轻生/u,/遗书/u,/服药自尽/u,/安眠药/u,/自残/u,/伤害自己/u,/想消失/u,/不回来了/u,/杀了他/u,/杀了她/u,/报复社会/u,/同归于尽/u];
const MEDIUM_RISK_PATTERNS = [/撑不住/u,/崩溃/u,/活不下去/u,/绝望/u,/彻底完了/u,/失控/u,/想逃离/u,/没人需要我/u,/我是不是消失更好/u];

function detectLocalRisk(text: string): { level: RiskLevel; reason: string } {
  const normalized = text.replace(/\s+/g, '');
  for (const pattern of HIGH_RISK_PATTERNS) {
    if (pattern.test(normalized)) return { level: 'high', reason: `命中高风险表达：${pattern}` };
  }
  for (const pattern of MEDIUM_RISK_PATTERNS) {
    if (pattern.test(normalized)) return { level: 'medium', reason: `命中中风险表达：${pattern}` };
  }
  return { level: 'low', reason: '' };
}

function inferStressKeywords(text: string): string[] {
  const rules: Array<[RegExp, string]> = [
    [/考研|保研|升学/u, '升学压力'],
    [/绩点|挂科|考试|论文|答辩|作业/u, '学业压力'],
    [/实习|就业|找工作|面试/u, '就业压力'],
    [/分手|感情|失恋/u, '情感关系'],
    [/舍友|同学|老师|人际/u, '人际关系'],
    [/失眠|睡不着|熬夜/u, '睡眠问题'],
    [/焦虑|紧张|害怕/u, '焦虑情绪'],
    [/累|疲惫|没力气/u, '身心疲惫'],
    [/家庭|父母/u, '家庭压力'],
    [/钱|经济|生活费/u, '经济压力'],
  ];
  return rules.filter(([pattern]) => pattern.test(text)).map(([, label]) => label).slice(0, 5);
}

function clampScore(value: number, min = 1, max = 10): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

async function callRemoteJSON(messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>, model: string) {
  const endpoint = `${config.llm.baseUrl.replace(/\/+$/, '')}/chat/completions`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.llm.timeoutMs);
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.llm.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        stream: false,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });
    const raw = await response.text();
    if (!response.ok) throw new Error(raw.slice(0, 300));
    const payload = JSON.parse(raw);
    const content = payload?.choices?.[0]?.message?.content;
    return content ? JSON.parse(String(content).replace(/```json|```/g, '').trim()) : null;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function chatWithGuardian(history: string[], input: string): Promise<ChatResult> {
  const localRisk = detectLocalRisk(input);
  if (!config.llm.apiKey) {
    return {
      reply: localRisk.level === 'high'
        ? '我注意到你刚刚表达了明显的危险信号。请立刻联系身边可信任的人、学校心理中心或当地紧急援助电话，现在先不要独处。'
        : '我在这里陪着你。你现在最压着你的那件事，是最近突然变重了，还是已经持续很久了？',
      risk_level: localRisk.level,
      risk_reason: localRisk.reason || '当前处于基础模式，使用本地规则识别风险',
    };
  }

  const system = `你是“澄心”，一名采用 CBT 风格的高校心理陪伴智能体。请温和、克制、非说教地回应，并仅返回 JSON：{"reply":"...","risk_level":"low|medium|high","risk_reason":"..."}`;
  const messages = [
    { role: 'system' as const, content: system },
    ...history.slice(-8).map((item, index) => ({ role: index % 2 === 0 ? 'user' as const : 'assistant' as const, content: redactSensitiveText(item) })),
    { role: 'user' as const, content: redactSensitiveText(input) },
  ];

  try {
    const remote = await callRemoteJSON(messages, config.llm.chatModel);
    const remoteRisk = ['low', 'medium', 'high'].includes(remote?.risk_level) ? remote.risk_level : 'low';
    const finalRisk: RiskLevel = localRisk.level === 'high' ? 'high' : (remoteRisk === 'high' ? 'high' : (localRisk.level === 'medium' || remoteRisk === 'medium' ? 'medium' : 'low'));
    return {
      reply: typeof remote?.reply === 'string' && remote.reply.trim() ? remote.reply.trim() : '我在这里陪着你，你愿意再具体说说发生了什么吗？',
      risk_level: finalRisk,
      risk_reason: [remote?.risk_reason, localRisk.reason].filter(Boolean).join('；') || '模型完成了基础风险评估',
    };
  } catch {
    return {
      reply: localRisk.level === 'high'
        ? '我注意到你现在可能处在危险状态。请立刻联系可信任的人，并尽快联系学校心理中心或当地紧急电话。'
        : '谢谢你愿意说出来。先别急着否定自己，你最近最反复出现的情绪是什么？',
      risk_level: localRisk.level,
      risk_reason: localRisk.reason || '远程模型调用失败，已退回本地安全回复',
    };
  }
}

function inferDiaryRisk(localRisk: { level: RiskLevel; reason: string }, emotionScore: number, dimensions: DiaryResult['dimensions']) {
  if (localRisk.level === 'high') return { risk_level: 'high' as RiskLevel, risk_reason: localRisk.reason || '文本中存在高风险表达' };
  if (localRisk.level === 'medium' || emotionScore <= 4 || dimensions.sadness >= 8 || dimensions.anxiety >= 8) {
    return { risk_level: 'medium' as RiskLevel, risk_reason: localRisk.reason || '情绪分较低或负向情绪维度较高，建议持续关注' };
  }
  return { risk_level: 'low' as RiskLevel, risk_reason: '当前记录以常规情绪波动为主' };
}

export async function analyzeDiary(content: string): Promise<DiaryResult> {
  const localRisk = detectLocalRisk(content);
  const inferred = inferStressKeywords(content);

  if (!config.llm.apiKey) {
    const fallbackDimensions = {
      anxiety: clampScore(content.includes('焦虑') || content.includes('紧张') ? 8 : 6),
      sadness: clampScore(content.includes('难过') || content.includes('失落') ? 7 : 5),
      peace: clampScore(localRisk.level === 'low' ? 6 : 3),
      fatigue: clampScore(content.includes('累') || content.includes('疲惫') ? 8 : 5),
      confidence: clampScore(content.includes('我可以') || content.includes('慢慢来') ? 7 : 4),
    };
    const emotionScore = localRisk.level === 'high' ? 2 : localRisk.level === 'medium' ? 4 : 7;
    const risk = inferDiaryRisk(localRisk, emotionScore, fallbackDimensions);
    return {
      emotion_score: emotionScore,
      stress_keywords: inferred.length ? inferred : ['情绪波动'],
      summary: '系统已根据文本完成基础分析，建议持续记录近几日的情绪变化。',
      dimensions: fallbackDimensions,
      ...risk,
    };
  }

  const system = `你是一名高校心理情绪分析助手，只能返回 JSON：{"emotion_score":1-10,"stress_keywords":["..."],"summary":"...","dimensions":{"anxiety":1-10,"sadness":1-10,"peace":1-10,"fatigue":1-10,"confidence":1-10}}`;
  const messages = [
    { role: 'system' as const, content: system },
    { role: 'user' as const, content: redactSensitiveText(content) },
  ];

  try {
    const remote = await callRemoteJSON(messages, config.llm.diaryModel);
    const dimensions = {
      anxiety: clampScore(Number(remote?.dimensions?.anxiety || 6)),
      sadness: clampScore(Number(remote?.dimensions?.sadness || 5)),
      peace: clampScore(Number(remote?.dimensions?.peace || 4)),
      fatigue: clampScore(Number(remote?.dimensions?.fatigue || 5)),
      confidence: clampScore(Number(remote?.dimensions?.confidence || 4)),
    };
    const emotionScore = clampScore(Number(remote?.emotion_score || 6));
    const risk = inferDiaryRisk(localRisk, emotionScore, dimensions);
    return {
      emotion_score: emotionScore,
      stress_keywords: Array.isArray(remote?.stress_keywords) && remote.stress_keywords.length ? remote.stress_keywords.slice(0, 5) : (inferred.length ? inferred : ['情绪波动']),
      summary: typeof remote?.summary === 'string' && remote.summary.trim() ? remote.summary.trim() : '系统已完成日记分析。',
      dimensions,
      ...risk,
    };
  } catch {
    const fallbackDimensions = {
      anxiety: 6,
      sadness: 5,
      peace: 4,
      fatigue: 5,
      confidence: 4,
    };
    const emotionScore = localRisk.level === 'high' ? 2 : localRisk.level === 'medium' ? 4 : 7;
    const risk = inferDiaryRisk(localRisk, emotionScore, fallbackDimensions);
    return {
      emotion_score: emotionScore,
      stress_keywords: inferred.length ? inferred : ['情绪波动'],
      summary: '远程分析不可用，系统已退回到本地情绪分析模式。',
      dimensions: fallbackDimensions,
      ...risk,
    };
  }
}
