import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Activity, AlertTriangle, Eye, EyeOff, ShieldAlert, Users } from 'lucide-react';
import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart, Bar } from 'recharts';
import StudentManager from './StudentManager';
import { api } from '../../services/api';
import { store } from '../../store';
import type { Alert, AlertStatus } from '../../types/app';

const statusLabels: Record<AlertStatus, string> = {
  pending: '待研判',
  following: '跟进中',
  resolved: '已处理',
  archived: '已归档',
};

const statusStyles: Record<AlertStatus, string> = {
  pending: 'bg-red-50 text-red-700 border-red-200',
  following: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  resolved: 'bg-green-50 text-green-700 border-green-200',
  archived: 'bg-slate-100 text-slate-600 border-slate-200',
};

const riskStyles = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-slate-100 text-slate-600',
};

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'manager'>('overview');
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [keywords, setKeywords] = useState<Array<{ word: string; count: number }>>([]);
  const [studentCount, setStudentCount] = useState(0);
  const [systemStatus, setSystemStatus] = useState<Record<string, string>>({});
  const [trendData, setTrendData] = useState<Array<{ date: string; alerts: number; diaries: number }>>([]);
  const [sourceDistribution, setSourceDistribution] = useState<{ chat: number; diary: number }>({ chat: 0, diary: 0 });
  const [stats, setStats] = useState({ pendingCount: 0, followingCount: 0, resolvedCount: 0, highRiskCount: 0, mediumRiskCount: 0 });
  const [isMasked, setIsMasked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [riskFilter, setRiskFilter] = useState<'all' | 'high' | 'medium'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | AlertStatus>('all');

  const loadOverview = async () => {
    setLoading(true);
    setError('');
    try {
      const [alertRes, statsRes] = await Promise.all([
        api.getAdminAlerts(isMasked),
        api.getAdminStats(),
      ]);
      setAlerts(alertRes.data.sort((a, b) => b.timestamp - a.timestamp));
      setKeywords(statsRes.data.keywords);
      setStudentCount(statsRes.data.studentCount);
      setSystemStatus(statsRes.data.systemStatus);
      setTrendData(statsRes.data.alertTrend);
      setSourceDistribution(statsRes.data.sourceDistribution);
      setStats({
        pendingCount: statsRes.data.pendingCount,
        followingCount: statsRes.data.followingCount,
        resolvedCount: statsRes.data.resolvedCount,
        highRiskCount: statsRes.data.highRiskCount,
        mediumRiskCount: statsRes.data.mediumRiskCount,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载管理端数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'overview') {
      loadOverview();
    }
  }, [activeTab, isMasked]);

  const updateStatus = async (id: string, status: AlertStatus) => {
    try {
      await api.updateAlertStatus(id, status);
      await loadOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新预警状态失败');
    }
  };

  const filteredAlerts = useMemo(() => {
    return alerts.filter((item) => {
      const riskOk = riskFilter === 'all' ? true : item.risk_level === riskFilter;
      const statusOk = statusFilter === 'all' ? true : item.status === statusFilter;
      return riskOk && statusOk;
    });
  }, [alerts, riskFilter, statusFilter]);

  const handleLogout = () => {
    store.set('admin_token', null);
    window.location.href = '/';
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-bg-body overflow-y-auto">
      <header className="bg-bg-card border-b border-border px-6 py-4 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-8">
          <div>
            <h2 className="text-base font-semibold text-text-main flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-warning" />
              心理辅导工作台
            </h2>
          </div>
          <nav className="flex items-center gap-4 border-l border-border pl-6">
            <button onClick={() => setActiveTab('overview')} className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-colors ${activeTab === 'overview' ? 'bg-primary-light text-primary' : 'text-text-muted hover:bg-bg-body'}`}>
              风险总览
            </button>
            <button onClick={() => setActiveTab('manager')} className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-colors ${activeTab === 'manager' ? 'bg-primary-light text-primary' : 'text-text-muted hover:bg-bg-body'}`}>
              学生档案
            </button>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsMasked(!isMasked)}
            className="flex items-center gap-2 px-3 py-1.5 bg-bg-body border border-border rounded-lg text-sm font-semibold text-text-main hover:bg-bg-card transition-colors"
          >
            {isMasked ? <EyeOff className="w-4 h-4 text-warning" /> : <Eye className="w-4 h-4 text-primary" />}
            {isMasked ? '已开启脱敏保护' : '脱敏查看'}
          </button>
          <div className="bg-bg-body border border-border px-3 py-1.5 rounded-lg flex items-center gap-2">
            <Users className="w-4 h-4 text-text-muted" />
            <span className="text-sm text-text-main">学生数: {studentCount}</span>
          </div>
          <button onClick={handleLogout} className="bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA] px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-red-100 transition-colors">
            退出登录
          </button>
        </div>
      </header>

      {activeTab === 'overview' ? (
        <div className="p-6 max-w-7xl mx-auto w-full space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-bg-card rounded-xl border border-border p-5">
              <p className="text-sm text-text-muted mb-2">今日重点关注</p>
              <div className="text-3xl font-bold text-red-600">{stats.highRiskCount}</div>
              <p className="text-xs text-text-muted mt-2">高风险个案</p>
            </div>
            <div className="bg-bg-card rounded-xl border border-border p-5">
              <p className="text-sm text-text-muted mb-2">待研判</p>
              <div className="text-3xl font-bold text-text-main">{stats.pendingCount}</div>
              <p className="text-xs text-text-muted mt-2">需优先处理</p>
            </div>
            <div className="bg-bg-card rounded-xl border border-border p-5">
              <p className="text-sm text-text-muted mb-2">跟进中</p>
              <div className="text-3xl font-bold text-yellow-600">{stats.followingCount}</div>
              <p className="text-xs text-text-muted mt-2">持续关注个案</p>
            </div>
            <div className="bg-bg-card rounded-xl border border-border p-5">
              <p className="text-sm text-text-muted mb-2">已处理</p>
              <div className="text-3xl font-bold text-success">{stats.resolvedCount}</div>
              <p className="text-xs text-text-muted mt-2">完成处置记录</p>
            </div>
            <div className="bg-bg-card rounded-xl border border-border p-5">
              <p className="text-sm text-text-muted mb-2">中风险提示</p>
              <div className="text-3xl font-bold text-warning">{stats.mediumRiskCount}</div>
              <p className="text-xs text-text-muted mt-2">需持续观察</p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
            <div className="bg-bg-card rounded-xl border border-border p-5">
              <h3 className="text-base font-semibold text-text-main mb-4">近 7 日风险与记录趋势</h3>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="alerts" name="预警数" stroke="#DC2626" strokeWidth={2.5} />
                    <Line type="monotone" dataKey="diaries" name="日记数" stroke="#2563EB" strokeWidth={2.5} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-bg-card rounded-xl border border-border p-5">
                <h3 className="text-base font-semibold text-text-main mb-4">风险来源分布</h3>
                <div className="h-[160px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[{ name: '对话触发', value: sourceDistribution.chat }, { name: '日记触发', value: sourceDistribution.diary }]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#2563EB" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-bg-card rounded-xl border border-border p-5 text-text-main">
                <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  群体心理画像
                </h3>
                {keywords.length === 0 ? (
                  <div className="text-center text-text-muted text-sm py-4 bg-bg-body border border-border rounded-lg">暂无数据</div>
                ) : (
                  <div className="space-y-4">
                    {keywords.map((kw) => {
                      const maxCount = keywords[0].count || 1;
                      const percent = (kw.count / maxCount) * 100;
                      return (
                        <div key={kw.word}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-text-main font-semibold">{kw.word}</span>
                            <span className="text-text-muted">{kw.count} 次</span>
                          </div>
                          <div className="w-full bg-bg-body rounded-full h-1.5 overflow-hidden">
                            <div className="bg-primary h-1.5 rounded-full" style={{ width: `${percent}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-6">
            <div className="bg-bg-card rounded-xl border border-border overflow-hidden p-5">
              <div className="mb-4 flex flex-wrap justify-between items-center gap-3">
                <h3 className="text-base font-semibold text-text-main flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-warning" />
                  风险处置队列
                </h3>
                <div className="flex flex-wrap gap-2">
                  <select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value as typeof riskFilter)} className="rounded-lg border border-border bg-bg-body px-3 py-2 text-sm">
                    <option value="all">全部风险</option>
                    <option value="high">高风险</option>
                    <option value="medium">中风险</option>
                  </select>
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className="rounded-lg border border-border bg-bg-body px-3 py-2 text-sm">
                    <option value="all">全部状态</option>
                    <option value="pending">待研判</option>
                    <option value="following">跟进中</option>
                    <option value="resolved">已处理</option>
                    <option value="archived">已归档</option>
                  </select>
                </div>
              </div>
              {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
              {loading ? (
                <div className="p-6 text-center text-text-muted text-sm border bg-bg-body border-border rounded-lg">正在加载...</div>
              ) : filteredAlerts.length === 0 ? (
                <div className="p-6 text-center text-text-muted text-sm border bg-bg-body border-border rounded-lg">当前筛选条件下暂无风险记录</div>
              ) : (
                <ul className="space-y-3">
                  {filteredAlerts.map((alert) => {
                    const riskLevel = alert.risk_level || 'medium';
                    return (
                      <li key={alert.id} className={`p-4 rounded-xl border ${alert.status === 'pending' && riskLevel === 'high' ? 'border-red-200 bg-red-50' : 'bg-bg-body border-border'}`}>
                        <div className="flex flex-wrap justify-between items-start gap-3 mb-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-text-main">{alert.studentName} ({alert.studentId || '未知学号'})</span>
                            <span className={`text-xs px-2 py-0.5 rounded ${riskStyles[riskLevel]}`}>{riskLevel === 'high' ? '高风险' : riskLevel === 'medium' ? '中风险' : '低风险'}</span>
                            <span className={`text-xs px-2 py-0.5 rounded border ${statusStyles[alert.status]}`}>{statusLabels[alert.status]}</span>
                            <span className="text-xs text-text-muted">{alert.source === 'diary' ? '日记触发' : '对话触发'}</span>
                          </div>
                          <span className="text-xs text-text-muted">{format(alert.timestamp, 'MM/dd HH:mm')}</span>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-4">
                          <div className="space-y-2">
                            <div className="bg-bg-card border border-border rounded-lg p-3 text-sm text-text-main">
                              <span className="font-semibold text-text-muted mr-2">触发内容:</span>
                              {alert.trigger_text}
                            </div>
                            <p className="text-sm text-text-muted leading-6"><span className="font-semibold text-text-main">判定依据：</span>{alert.reason || '检测到潜在心理风险信号'}</p>
                          </div>
                          <div className="space-y-2">
                            <button onClick={() => updateStatus(alert.id, 'following')} className="w-full rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm font-semibold text-yellow-700">转为跟进中</button>
                            <button onClick={() => updateStatus(alert.id, 'resolved')} className="w-full rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm font-semibold text-green-700">标记已处理</button>
                            <button onClick={() => updateStatus(alert.id, 'archived')} className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm font-semibold text-text-main">归档记录</button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="bg-bg-card rounded-xl border border-border p-5 text-text-main">
              <h3 className="text-base font-semibold mb-4">系统运行状态</h3>
              <div className="space-y-3 text-sm mb-6">
                {Object.entries(systemStatus).map(([key, value]) => (
                  <p key={key} className="flex justify-between items-center pb-2 border-b border-border last:border-b-0">
                    <span className="text-text-muted">{key}</span>
                    <span className="text-success font-semibold px-2 py-0.5 bg-[#F0FDF4] border border-[#BBF7D0] rounded">{value === 'running' ? '运行中' : value}</span>
                  </p>
                ))}
              </div>
              <div className="rounded-xl border border-border bg-bg-body p-4 text-sm text-text-muted leading-6">
                当前工作台支持脱敏查看、风险分级、状态流转和个案跟进留痕，适用于辅导员日常研判与预警处置流程。
              </div>
            </div>
          </div>
        </div>
      ) : (
        <StudentManager isMasked={isMasked} />
      )}
    </div>
  );
}
