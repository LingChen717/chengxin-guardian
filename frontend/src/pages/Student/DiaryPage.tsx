import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { BookHeart, Loader2, TrendingUp } from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Toast, ToastType } from '../../components/ui/Feedback';
import { api } from '../../services/api';
import { store } from '../../store';
import type { Diary } from '../../types/app';

function buildSuggestions(entry?: Diary) {
  if (!entry) return ['建议先完成第一篇记录，系统将据此生成后续趋势。'];
  const list: string[] = [];
  if (entry.emotion_score <= 4) list.push('建议连续记录近 3 天情绪变化，并主动联系可信任的人交流。');
  if ((entry.dimensions?.anxiety || 0) >= 7) list.push('焦虑维度较高，可先进行 3 分钟呼吸训练后再继续记录。');
  if ((entry.dimensions?.fatigue || 0) >= 7) list.push('当前疲惫感较明显，建议关注作息与任务负荷，避免长期透支。');
  if (!list.length) list.push('当前整体状态相对稳定，建议保持规律记录，用于观察波动趋势。');
  return list.slice(0, 3);
}

export default function DiaryPage() {
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [content, setContent] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: ToastType } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const result = await api.getStudentHistory();
        setDiaries(result.data.diaries);
      } catch (error) {
        const msg = error instanceof Error ? error.message : '加载日记失败';
        setToast({ msg, type: 'error' });
      }
    })();
  }, []);

  const handleSave = async () => {
    if (!content.trim() || isAnalyzing) return;
    const profile = store.get('student_profile');
    if (!profile) return;

    setIsAnalyzing(true);
    try {
      const result = await api.analyzeDiary(content, profile.studentId);
      setDiaries((prev) => [result.data, ...prev]);
      setContent('');
      setToast({ msg: result.analysis?.risk_level === 'medium' || result.analysis?.risk_level === 'high' ? '日记分析已完成，系统已同步关注风险变化' : '日记分析已完成', type: 'success' });
    } catch (error) {
      const msg = error instanceof Error ? error.message : '日记分析异常';
      setToast({ msg, type: 'error' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const latestDiary = diaries[0];
  const radarData = latestDiary?.dimensions ? [
    { subject: '焦虑指数', value: latestDiary.dimensions.anxiety },
    { subject: '抑郁趋向', value: latestDiary.dimensions.sadness },
    { subject: '心流平静', value: latestDiary.dimensions.peace },
    { subject: '身心疲惫', value: latestDiary.dimensions.fatigue },
    { subject: '恢复信心', value: latestDiary.dimensions.confidence },
  ] : [];

  const trendData = useMemo(() => {
    return [...diaries]
      .slice(0, 7)
      .reverse()
      .map((entry) => ({
        date: format(entry.timestamp, 'MM/dd'),
        emotion: entry.emotion_score,
        anxiety: entry.dimensions?.anxiety || 0,
        fatigue: entry.dimensions?.fatigue || 0,
      }));
  }, [diaries]);

  const keywordStats = useMemo(() => {
    const map = new Map<string, number>();
    diaries.forEach((item) => item.stress_keywords.forEach((keyword) => map.set(keyword, (map.get(keyword) || 0) + 1)));
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [diaries]);

  const suggestions = useMemo(() => buildSuggestions(latestDiary), [latestDiary]);

  return (
    <div className="flex flex-col h-full bg-bg-body">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <header className="bg-bg-card border-b border-border px-6 py-4 flex items-center justify-between z-10">
        <div>
          <h2 className="text-base font-semibold text-text-main">情绪日记</h2>
          <p className="text-sm text-text-muted">记录每日情绪，生成画像与波动趋势</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 xl:grid-cols-[0.95fr_1.05fr] gap-6">
        <div className="space-y-6">
          <div className="bg-bg-card border border-border rounded-xl p-5 h-fit">
            <h3 className="text-base font-semibold mb-4">写下今天的感受</h3>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="比如：今天因为实习和论文同时推进，感觉有点喘不过气，也担心自己做不好……"
              className="w-full h-56 bg-bg-body border border-border rounded-lg p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
            <button
              onClick={handleSave}
              disabled={!content.trim() || isAnalyzing}
              className="mt-4 w-full bg-primary text-white rounded-lg px-4 py-2.5 flex items-center justify-center text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isAnalyzing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />分析中...</> : '保存并分析'}
            </button>
          </div>

          <div className="bg-bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <BookHeart className="w-4 h-4 text-primary" />
              <h3 className="text-base font-semibold">本周高频关键词</h3>
            </div>
            {keywordStats.length ? (
              <div className="flex flex-wrap gap-2">
                {keywordStats.map(([word, count]) => (
                  <span key={word} className="rounded-full border border-border bg-bg-body px-3 py-1.5 text-xs font-semibold text-text-main">
                    {word} · {count}
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-sm text-text-muted bg-bg-body p-4 rounded-lg text-center border border-border">完成记录后将生成压力关键词画像</div>
            )}
          </div>

          <div className="bg-bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-success" />
              <h3 className="text-base font-semibold">系统建议</h3>
            </div>
            <ul className="space-y-3 text-sm text-text-muted leading-6">
              {suggestions.map((item) => (
                <li key={item} className="rounded-lg border border-border bg-bg-body px-4 py-3">{item}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 2xl:grid-cols-2 gap-6">
            <div className="bg-bg-card border border-border rounded-xl p-5 min-h-[320px]">
              <h3 className="text-base font-semibold mb-4">最近一次心理画像</h3>
              {latestDiary?.dimensions ? (
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
                      <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
                      <Radar dataKey="value" stroke="#2563EB" fill="#2563EB" fillOpacity={0.3} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[260px] flex items-center justify-center text-sm text-text-muted bg-bg-body rounded-lg border border-border">暂无分析数据</div>
              )}
            </div>

            <div className="bg-bg-card border border-border rounded-xl p-5 min-h-[320px]">
              <h3 className="text-base font-semibold mb-4">近 7 次情绪波动趋势</h3>
              {trendData.length ? (
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis domain={[0, 10]} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="emotion" name="情绪分" stroke="#2563EB" strokeWidth={2.5} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="anxiety" name="焦虑值" stroke="#D97706" strokeWidth={2} dot={{ r: 2 }} />
                      <Line type="monotone" dataKey="fatigue" name="疲惫值" stroke="#059669" strokeWidth={2} dot={{ r: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[260px] flex items-center justify-center text-sm text-text-muted bg-bg-body rounded-lg border border-border">暂无趋势数据</div>
              )}
            </div>
          </div>

          <div className="bg-bg-card border border-border rounded-xl p-5">
            <h3 className="text-base font-semibold mb-4">日记记录</h3>
            <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
              {diaries.length > 0 ? diaries.map((entry) => (
                <div key={entry.id} className="rounded-lg border border-border bg-bg-body p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold px-2 py-0.5 rounded bg-primary-light text-primary">情绪分 {entry.emotion_score}/10</span>
                      <span className="font-semibold px-2 py-0.5 rounded bg-green-50 text-success">{entry.stress_keywords.join('、') || '常规波动'}</span>
                    </div>
                    <span className="text-text-muted">{format(entry.timestamp, 'yyyy-MM-dd HH:mm')}</span>
                  </div>
                  <p className="text-sm text-text-main whitespace-pre-wrap">{entry.content}</p>
                  <div className="text-xs text-text-muted space-y-1 leading-6">
                    <p><span className="font-semibold">摘要：</span>{entry.summary}</p>
                  </div>
                </div>
              )) : (
                <div className="text-sm text-text-muted bg-bg-body p-4 rounded-lg text-center border border-border">暂无日记记录</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
