import { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, HeartPulse, MessageCircleHeart, Phone, Send, ShieldAlert, Sparkles, User } from 'lucide-react';
import { api } from '../../services/api';
import { store } from '../../store';
import type { Alert, ChatMsg, Diary } from '../../types/app';

const QUICK_TOPICS = ['学业压力', '情感困扰', '人际关系', '睡眠焦虑'];
const QUICK_REPLIES = ['我今天压力好大', '我有点害怕人际交往', '我最近总是失眠', '我觉得自己什么都做不好'];

function extractFocusWords(diaries: Diary[], messages: ChatMsg[]) {
  const pool = [
    ...diaries.flatMap((item) => item.stress_keywords || []),
    ...messages.filter((item) => item.role === 'user').flatMap((item) => {
      const text = item.text;
      const result: string[] = [];
      if (/考研|论文|作业|答辩|考试/u.test(text)) result.push('学业压力');
      if (/实习|面试|就业/u.test(text)) result.push('就业压力');
      if (/失眠|睡不着/u.test(text)) result.push('睡眠问题');
      if (/分手|关系|感情/u.test(text)) result.push('情感关系');
      if (/同学|舍友|老师|人际/u.test(text)) result.push('人际关系');
      return result;
    }),
  ];
  const map = new Map<string, number>();
  pool.forEach((item) => map.set(item, (map.get(item) || 0) + 1));
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([label]) => label);
}

function getDialogueSummary(messages: ChatMsg[]) {
  const latestUser = [...messages].reverse().find((item) => item.role === 'user');
  if (!latestUser) return '系统将结合对话内容持续更新你的关注主题。';
  if (/失眠|睡不着/u.test(latestUser.text)) return '你最近反复提到睡眠负担与持续紧张，建议结合呼吸训练与规律记录观察变化。';
  if (/论文|答辩|考试|作业|绩点/u.test(latestUser.text)) return '当前对话以学业压力为主，系统建议继续梳理最具体的压力源与时间节点。';
  if (/分手|感情|关系/u.test(latestUser.text)) return '你当前更需要的是被理解与被支持，建议先描述最困扰你的情绪而不是急于下结论。';
  return '本次对话已记录为后续陪伴参考，建议继续描述最反复出现的想法与情绪反应。';
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [riskHint, setRiskHint] = useState<{ level: 'medium' | 'high'; text: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const result = await api.getStudentHistory();
        setDiaries(result.data.diaries);
        setAlerts(result.data.alerts);
        if (result.data.chats.length > 0) {
          setMessages(result.data.chats);
        } else {
          setMessages([{
            id: 'init',
            studentId: result.data.student.studentId,
            role: 'model',
            text: '你好，我是澄心。你可以从学业、情感、人际或睡眠等方面开始，我会陪你慢慢梳理。',
            timestamp: Date.now(),
          }]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载聊天记录失败');
      }
    })();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const focusWords = useMemo(() => extractFocusWords(diaries, messages), [diaries, messages]);
  const dialogueSummary = useMemo(() => getDialogueSummary(messages), [messages]);
  const unresolvedAlerts = useMemo(() => alerts.filter((item) => item.status === 'pending' || item.status === 'following'), [alerts]);

  const handleSend = async (forcedText?: string) => {
    const textToSend = forcedText || input;
    if (!textToSend.trim() || isLoading) return;

    const profile = store.get('student_profile');
    if (!profile) return;

    setError('');
    setRiskHint(null);
    setIsLoading(true);
    if (!forcedText) setInput('');

    try {
      const response = await api.sendChat(textToSend.trim(), profile.studentId);
      setMessages((prev) => [...prev.filter((item) => item.id !== 'init'), response.userMsg, response.modelMsg]);
      if (response.result.risk_level === 'medium' || response.result.risk_level === 'high') {
        setRiskHint({
          level: response.result.risk_level,
          text: response.result.risk_level === 'high'
            ? '系统已识别到高风险信号，建议立即联系可信任的人、学校心理中心或紧急援助渠道。'
            : '系统识别到需要持续关注的情绪风险，已同步进入辅导员关注流程。',
        });
      }
      const history = await api.getStudentHistory();
      setAlerts(history.data.alerts);
      setDiaries(history.data.diaries);
    } catch (err) {
      setError(err instanceof Error ? err.message : '发送失败');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-bg-body">
      <header className="bg-bg-card border-b border-border px-6 py-4 flex items-center justify-between z-10">
        <div>
          <h2 className="text-base font-semibold text-text-main">心理对话</h2>
          <p className="text-sm text-text-muted">以陪伴、倾听与梳理为主的日常交流空间</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-primary bg-primary-light px-2 py-1 rounded">
          <Bot className="w-4 h-4" />
          <span>陪伴中</span>
        </div>
      </header>

      <div className="border-b border-border bg-bg-card/60 px-6 py-4">
        <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-4">
          <div className="rounded-xl border border-border bg-bg-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-text-main">近期关注主题</h3>
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              {(focusWords.length ? focusWords : ['情绪梳理', '日常陪伴']).map((item) => (
                <span key={item} className="rounded-full bg-primary-light px-3 py-1 text-xs font-semibold text-primary">
                  {item}
                </span>
              ))}
            </div>
            <p className="text-xs leading-6 text-text-muted">{dialogueSummary}</p>
          </div>
          <div className="rounded-xl border border-border bg-bg-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <HeartPulse className="w-4 h-4 text-warning" />
              <h3 className="text-sm font-semibold text-text-main">今日可以从这里开始</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {QUICK_TOPICS.map((item) => (
                <button key={item} onClick={() => handleSend(`我想聊聊${item}`)} className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-text-main hover:border-primary/30 hover:bg-primary-light hover:text-primary transition-colors">
                  {item}
                </button>
              ))}
            </div>
            <p className="text-xs text-text-muted mt-3">系统默认采用最小化记录策略，仅用于心理陪伴与风险预警辅助。</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      {riskHint && (
        <div className={`mx-6 mt-4 rounded-xl border px-4 py-4 text-sm flex flex-col gap-3 ${riskHint.level === 'high' ? 'border-red-200 bg-red-50 text-red-700' : 'border-yellow-200 bg-yellow-50 text-yellow-800'}`}>
          <div className="flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{riskHint.text}</span>
          </div>
          <div className="flex flex-wrap gap-2 pl-6">
            <button className="rounded-lg bg-bg-card px-3 py-1.5 text-xs font-semibold border border-current/20">查看校园心理中心联系方式</button>
            <button className="rounded-lg bg-bg-card px-3 py-1.5 text-xs font-semibold border border-current/20 flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> 紧急帮助提示</button>
            <button className="rounded-lg bg-bg-card px-3 py-1.5 text-xs font-semibold border border-current/20">进入呼吸稳定模式</button>
          </div>
        </div>
      )}

      {unresolvedAlerts.length > 0 && !riskHint && (
        <div className="mx-6 mt-4 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" />
            <span>当前存在 {unresolvedAlerts.length} 条待跟进风险记录，系统已纳入持续关注。</span>
          </div>
          <span className="text-xs font-semibold rounded-full bg-bg-card px-2 py-1 border border-yellow-200">持续关注中</span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold ${msg.role === 'user' ? 'bg-primary text-white' : 'bg-primary-light text-primary'}`}>
              {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>
            <div className={`max-w-[72%] rounded-xl px-4 py-3 border ${msg.role === 'user' ? 'bg-primary text-white border-primary rounded-tr-none' : 'bg-bg-card text-text-main border-border rounded-tl-none'}`}>
              <p className="whitespace-pre-wrap leading-relaxed text-sm">{msg.text}</p>
            </div>
          </div>
        ))}
        {messages.length <= 1 && !isLoading && (
          <div className="flex flex-wrap gap-2 mt-4 ml-12 lg:max-w-[72%]">
            {QUICK_REPLIES.map((qr) => (
              <button
                key={qr}
                onClick={() => handleSend(qr)}
                className="bg-bg-body text-text-main border border-border text-xs px-3 py-1.5 rounded-full hover:bg-primary-light hover:text-primary hover:border-primary/30 transition-colors shadow-sm"
              >
                {qr}
              </button>
            ))}
          </div>
        )}
        {isLoading && (
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-primary-light text-primary flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-bg-card rounded-xl rounded-tl-none px-4 py-3 border border-border flex gap-1 h-[46px] items-center">
              <div className="w-2 h-2 bg-text-muted rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              <div className="w-2 h-2 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-bg-card border-t border-border">
        <div className="max-w-5xl mx-auto space-y-3">
          <div className="rounded-xl border border-border bg-bg-body px-4 py-3 flex items-center gap-2 text-xs text-text-muted">
            <MessageCircleHeart className="w-4 h-4 text-primary" />
            本轮对话会自动生成轻量总结，用于后续陪伴与风险研判，不会向无关人员开放原始记录。
          </div>
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="请输入想交流的内容"
              className="flex-1 bg-bg-body border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-text-main placeholder:text-text-muted"
            />
            <button
              onClick={() => handleSend()}
              disabled={isLoading || !input.trim()}
              className="bg-primary text-white rounded-lg px-4 py-2 flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shrink-0 font-semibold text-sm"
            >
              <Send className="w-4 h-4 mr-2" />
              发送内容
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
