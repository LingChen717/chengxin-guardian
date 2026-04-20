import { useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { Activity, AlertTriangle, BookOpen, Database, Download, Eye, EyeOff, FileText, ShieldCheck, Trash2, Upload, User } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../../services/api';
import { store } from '../../store';
import type { AppData } from '../../types/app';

function createEmptyData(): AppData {
  return { version: '4.0.0', exportedAt: Date.now(), students: [], chats: [], diaries: [], alerts: [], notes: [] };
}

export default function DataDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'records' | 'governance'>('overview');
  const [data, setData] = useState<AppData>(createEmptyData());
  const [loading, setLoading] = useState(true);
  const [isMasked, setIsMasked] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await api.exportAllData();
      setData(result.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleExport = async () => {
    const result = await api.exportAllData();
    const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chengxin_guardian_export_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const parsed = JSON.parse(text);
    await api.importAllData(parsed);
    await loadData();
    event.target.value = '';
  };

  const handleClearAll = async () => {
    await api.resetAllData();
    setConfirmClear(false);
    await loadData();
  };

  const handleLogout = () => {
    store.set('superadmin_token', null);
    window.location.href = '/';
  };

  const trendData = useMemo(() => {
    const map = new Map<string, { date: string; chats: number; diaries: number; alerts: number }>();
    const addPoint = (timestamp: number, key: 'chats' | 'diaries' | 'alerts') => {
      const date = new Date(timestamp).toISOString().slice(0, 10);
      const current = map.get(date) || { date, chats: 0, diaries: 0, alerts: 0 };
      current[key] += 1;
      map.set(date, current);
    };
    data.chats.forEach((item) => addPoint(item.timestamp, 'chats'));
    data.diaries.forEach((item) => addPoint(item.timestamp, 'diaries'));
    data.alerts.forEach((item) => addPoint(item.timestamp, 'alerts'));
    return [...map.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-7);
  }, [data]);

  const statusDistribution = useMemo(() => {
    const source = [
      { name: '待研判', value: data.alerts.filter((item) => item.status === 'pending').length },
      { name: '跟进中', value: data.alerts.filter((item) => item.status === 'following').length },
      { name: '已处理', value: data.alerts.filter((item) => item.status === 'resolved').length },
      { name: '已归档', value: data.alerts.filter((item) => item.status === 'archived').length },
    ];
    return source;
  }, [data]);

  const latestStudents = useMemo(() => [...data.students].sort((a, b) => b.createdAt - a.createdAt).slice(0, 10), [data.students]);
  const latestNotes = useMemo(() => [...data.notes].sort((a, b) => b.timestamp - a.timestamp).slice(0, 10), [data.notes]);
  const latestAlerts = useMemo(() => [...data.alerts].sort((a, b) => b.timestamp - a.timestamp).slice(0, 10), [data.alerts]);

  return (
    <div className="flex h-screen w-screen bg-bg-body text-text-main font-sans overflow-hidden">
      <aside className="w-72 bg-bg-card border-r border-border flex flex-col">
        <div className="p-6 border-b border-border">
          <h1 className="text-xl font-bold flex items-center gap-2"><Database className="w-6 h-6 text-[#9333EA]" />系统管理中心</h1>
        </div>
        <nav className="flex-1 px-4 space-y-1 mt-2">
          {[
            ['overview', '平台总览', Activity],
            ['students', '学生档案', User],
            ['records', '业务记录', FileText],
            ['governance', '数据治理', ShieldCheck],
          ].map(([key, label, Icon]) => (
            <button key={key} onClick={() => setActiveTab(key as typeof activeTab)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm font-semibold ${activeTab === key ? 'bg-[#F3E8FF] text-[#9333EA]' : 'text-text-muted hover:bg-bg-body'}`}>
              <Icon className="w-5 h-5" /> {label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-border">
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 text-sm text-text-muted hover:text-text-main hover:bg-bg-body py-2 rounded-lg transition-colors">返回首页</button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-y-auto">
        <header className="bg-bg-card border-b border-border px-8 py-5 flex justify-between items-center z-10 sticky top-0">
          <h2 className="text-lg font-semibold flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-success" />平台运行与数据治理</h2>
          <div className="flex gap-4 items-center">
            <button onClick={() => setIsMasked(!isMasked)} className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg text-sm font-semibold transition-colors ${isMasked ? 'bg-[#F3E8FF] text-[#9333EA] border-[#D8B4FE]' : 'bg-bg-body border-border text-text-muted hover:text-text-main'}`}>
              {isMasked ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {isMasked ? '脱敏已开启' : '脱敏查看'}
            </button>
            <input type="file" accept=".json" className="hidden" ref={fileInputRef} onChange={handleImport} />
            <button onClick={() => fileInputRef.current?.click()} disabled={isMasked} className={`flex items-center gap-1.5 text-sm font-semibold transition-colors ${isMasked ? 'text-text-muted opacity-50' : 'text-text-muted hover:text-text-main'}`}><Upload className="w-4 h-4" />导入数据</button>
            <button onClick={handleExport} className="flex items-center gap-1.5 text-text-muted hover:text-text-main text-sm font-semibold transition-colors"><Download className="w-4 h-4" />导出数据</button>
            {confirmClear ? (
              <div className="flex items-center gap-2 bg-[#FEF2F2] border border-[#FECACA] p-1 rounded-lg">
                <span className="text-xs text-red-600 font-semibold px-2">确认清空全部数据？</span>
                <button onClick={handleClearAll} className="bg-red-600 text-white text-xs font-semibold px-3 py-1.5 rounded hover:bg-red-700">确认</button>
                <button onClick={() => setConfirmClear(false)} className="bg-bg-card text-text-main text-xs font-semibold px-3 py-1.5 border border-border rounded hover:bg-bg-body">取消</button>
              </div>
            ) : (
              <button disabled={isMasked} onClick={() => setConfirmClear(true)} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${isMasked ? 'text-text-muted bg-bg-body border border-border opacity-50' : 'bg-bg-card border border-border text-red-600 hover:bg-red-50'}`}><Trash2 className="w-4 h-4" />重置数据</button>
            )}
          </div>
        </header>

        <div className="p-8 max-w-7xl w-full mx-auto">
          {loading ? <div className="rounded-xl border border-border bg-bg-card p-8 text-center text-text-muted">正在加载系统数据...</div> : (
            <>
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="bg-bg-card border border-border p-5 rounded-xl"><div className="flex justify-between items-center mb-2"><span className="text-sm font-semibold text-text-muted">学生档案</span><User className="w-5 h-5 text-[#9333EA]" /></div><div className="text-3xl font-bold">{data.students.length}</div></div>
                    <div className="bg-bg-card border border-border p-5 rounded-xl"><div className="flex justify-between items-center mb-2"><span className="text-sm font-semibold text-text-muted">对话记录</span><Activity className="w-5 h-5 text-primary" /></div><div className="text-3xl font-bold">{data.chats.length}</div></div>
                    <div className="bg-bg-card border border-border p-5 rounded-xl"><div className="flex justify-between items-center mb-2"><span className="text-sm font-semibold text-text-muted">日记记录</span><BookOpen className="w-5 h-5 text-success" /></div><div className="text-3xl font-bold">{data.diaries.length}</div></div>
                    <div className="bg-bg-card border border-border p-5 rounded-xl"><div className="flex justify-between items-center mb-2"><span className="text-sm font-semibold text-text-muted">预警事件</span><AlertTriangle className="w-5 h-5 text-warning" /></div><div className="text-3xl font-bold">{data.alerts.length}</div></div>
                    <div className="bg-bg-card border border-border p-5 rounded-xl"><div className="flex justify-between items-center mb-2"><span className="text-sm font-semibold text-text-muted">干预记录</span><FileText className="w-5 h-5 text-[#B91C1C]" /></div><div className="text-3xl font-bold">{data.notes.length}</div></div>
                  </div>
                  <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
                    <div className="bg-bg-card border border-border rounded-xl p-6">
                      <h3 className="text-base font-semibold mb-4">近 7 日平台活跃趋势</h3>
                      <div className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={trendData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Line type="monotone" dataKey="chats" name="对话" stroke="#2563EB" strokeWidth={2.5} />
                            <Line type="monotone" dataKey="diaries" name="日记" stroke="#059669" strokeWidth={2.5} />
                            <Line type="monotone" dataKey="alerts" name="预警" stroke="#DC2626" strokeWidth={2.5} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    <div className="bg-bg-card border border-border rounded-xl p-6">
                      <h3 className="text-base font-semibold mb-4">预警状态分布</h3>
                      <div className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={statusDistribution}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Bar dataKey="value" fill="#9333EA" radius={[6, 6, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'students' && (
                <div className="bg-bg-card border border-border rounded-xl p-6">
                  <h3 className="text-base font-semibold mb-4 border-b border-border pb-4">最新建档学生</h3>
                  <div className="space-y-3">
                    {latestStudents.length ? latestStudents.map((student) => (
                      <div key={student.studentId} className="rounded-lg border border-border bg-bg-body px-4 py-3 flex flex-wrap justify-between items-center gap-3 text-sm">
                        <div>
                          <p className="font-semibold text-text-main">{isMasked ? `${student.name[0]}**` : student.name}</p>
                          <p className="text-text-muted">{isMasked ? `${student.studentId.slice(0, 3)}***` : student.studentId} · {student.major}</p>
                        </div>
                        <span className="text-text-muted">{format(student.createdAt, 'yyyy-MM-dd HH:mm')}</span>
                      </div>
                    )) : <div className="text-sm text-text-muted bg-bg-body p-4 rounded-lg text-center">暂无学生档案</div>}
                  </div>
                </div>
              )}

              {activeTab === 'records' && (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <div className="bg-bg-card border border-border rounded-xl p-6">
                    <h3 className="text-base font-semibold mb-4 border-b border-border pb-4">最新预警事件</h3>
                    <div className="space-y-3">
                      {latestAlerts.length ? latestAlerts.map((alert) => (
                        <div key={alert.id} className="rounded-lg border border-border bg-bg-body p-4 text-sm">
                          <div className="flex justify-between items-center mb-2 gap-2 flex-wrap">
                            <span className="font-semibold text-text-main">{isMasked ? `${alert.studentName[0]}**` : alert.studentName}</span>
                            <span className="text-text-muted">{format(alert.timestamp, 'yyyy-MM-dd HH:mm')}</span>
                          </div>
                          <p className="text-text-muted leading-6">{alert.reason}</p>
                        </div>
                      )) : <div className="text-sm text-text-muted bg-bg-body p-4 rounded-lg text-center">暂无预警记录</div>}
                    </div>
                  </div>
                  <div className="bg-bg-card border border-border rounded-xl p-6">
                    <h3 className="text-base font-semibold mb-4 border-b border-border pb-4">最新干预记录</h3>
                    <div className="space-y-3">
                      {latestNotes.length ? latestNotes.map((note) => (
                        <div key={note.id} className="rounded-lg border border-border bg-bg-body p-4 text-sm">
                          <div className="flex justify-between items-center mb-2 gap-2 flex-wrap">
                            <span className="font-semibold text-text-main">{isMasked ? `${note.studentId.slice(0, 3)}***` : note.studentId}</span>
                            <span className="text-text-muted">{format(note.timestamp, 'yyyy-MM-dd HH:mm')}</span>
                          </div>
                          <p className="text-text-muted leading-6">{isMasked ? '*** (脱敏隐藏)' : note.content}</p>
                        </div>
                      )) : <div className="text-sm text-text-muted bg-bg-body p-4 rounded-lg text-center">暂无干预记录</div>}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'governance' && (
                <div className="grid grid-cols-1 xl:grid-cols-[1fr_0.9fr] gap-6">
                  <div className="bg-bg-card border border-border rounded-xl p-6">
                    <h3 className="text-base font-semibold mb-4">治理说明</h3>
                    <div className="space-y-4 text-sm text-text-muted leading-7">
                      <div className="rounded-lg border border-border bg-bg-body p-4">平台支持数据导入、导出、整体重置与脱敏查看，用于平台治理与系统维护。</div>
                      <div className="rounded-lg border border-border bg-bg-body p-4">预警与干预记录默认保留时间戳和角色信息，用于后续审阅与追踪处理。</div>
                      <div className="rounded-lg border border-border bg-bg-body p-4">当前版本采用文件式存储，支持快速部署与运行环境复现。</div>
                    </div>
                  </div>
                  <div className="bg-bg-card border border-border rounded-xl p-6">
                    <h3 className="text-base font-semibold mb-4">操作入口</h3>
                    <div className="space-y-3 text-sm">
                      <button onClick={handleExport} className="w-full rounded-lg border border-border bg-bg-body px-4 py-3 text-left font-semibold text-text-main">导出全量平台数据</button>
                      <button onClick={() => fileInputRef.current?.click()} disabled={isMasked} className={`w-full rounded-lg border px-4 py-3 text-left font-semibold ${isMasked ? 'border-border bg-bg-body text-text-muted opacity-50' : 'border-border bg-bg-body text-text-main'}`}>导入平台数据</button>
                      <button onClick={() => setConfirmClear(true)} disabled={isMasked} className={`w-full rounded-lg border px-4 py-3 text-left font-semibold ${isMasked ? 'border-border bg-bg-body text-text-muted opacity-50' : 'border-red-200 bg-red-50 text-red-700'}`}>重置平台数据</button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
