import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { AlertTriangle, BookOpen, Calendar, Download, FileText, MessageSquare, Search, Trash2, UserSquare } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ConfirmModal, Toast, ToastType } from '../../components/ui/Feedback';
import { api } from '../../services/api';
import type { Alert, ChatMsg, CounselorNote, Diary, Student } from '../../types/app';

function getRiskSnapshot(alerts: Alert[]) {
  const latestOpen = alerts.find((item) => item.status === 'pending' || item.status === 'following') || alerts[0];
  if (!latestOpen) return { label: '暂无风险', className: 'bg-slate-100 text-slate-600', reason: '当前暂无预警记录' };
  const level = latestOpen.risk_level === 'high' ? '高风险' : latestOpen.risk_level === 'medium' ? '中风险' : '低风险';
  const className = latestOpen.risk_level === 'high' ? 'bg-red-100 text-red-700' : latestOpen.risk_level === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-600';
  return { label: level, className, reason: latestOpen.reason || '当前存在预警记录' };
}

export default function StudentManager({ isMasked }: { isMasked?: boolean }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [chats, setChats] = useState<ChatMsg[]>([]);
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [notes, setNotes] = useState<CounselorNote[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [newNote, setNewNote] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'chats' | 'diaries' | 'notes'>('overview');
  const [studentToDelete, setStudentToDelete] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: ToastType } | null>(null);
  const [loading, setLoading] = useState(false);

  const loadStudents = async () => {
    try {
      const result = await api.getStudents();
      setStudents(result.data.sort((a, b) => b.createdAt - a.createdAt));
    } catch (err) {
      setToast({ msg: err instanceof Error ? err.message : '加载学生档案失败', type: 'error' });
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const handleSelectStudent = async (student: Student) => {
    setSelectedStudent(student);
    setActiveTab('overview');
    setLoading(true);
    try {
      const result = await api.getStudentDetail(student.studentId);
      setChats(result.data.chats);
      setDiaries(result.data.diaries);
      setNotes(result.data.notes);
      setAlerts(result.data.alerts);
    } catch (err) {
      setToast({ msg: err instanceof Error ? err.message : '加载学生详情失败', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !selectedStudent) return;
    try {
      const result = await api.addStudentNote(selectedStudent.studentId, newNote.trim());
      setNotes((prev) => [result.data, ...prev]);
      setNewNote('');
      setToast({ msg: '干预记录已存档', type: 'success' });
    } catch (err) {
      setToast({ msg: err instanceof Error ? err.message : '保存记录失败', type: 'error' });
    }
  };

  const handleExportSingle = async (student: Student) => {
    try {
      const result = await api.getStudentDetail(student.studentId);
      const maskedName = isMasked ? `${student.name[0]}**` : student.name;
      const maskedId = isMasked ? `${student.studentId.substring(0, 3)}***` : student.studentId;
      const data = {
        student: { ...result.data.student, name: maskedName, studentId: maskedId },
        chats: isMasked ? result.data.chats.map((c) => ({ ...c, text: c.role === 'user' ? '*** (脱敏隐藏)' : c.text })) : result.data.chats,
        diaries: isMasked ? result.data.diaries.map((d) => ({ ...d, content: '*** (脱敏隐藏)' })) : result.data.diaries,
        notes: isMasked ? result.data.notes.map((n) => ({ ...n, content: '*** (脱敏隐藏)' })) : result.data.notes,
        alerts: result.data.alerts,
        exportTime: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `student_export_${maskedId}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setToast({ msg: err instanceof Error ? err.message : '导出失败', type: 'error' });
    }
  };

  const executeDelete = async () => {
    if (!studentToDelete) return;
    try {
      await api.deleteStudent(studentToDelete);
      if (selectedStudent?.studentId === studentToDelete) {
        setSelectedStudent(null);
        setChats([]);
        setDiaries([]);
        setNotes([]);
        setAlerts([]);
      }
      await loadStudents();
      setToast({ msg: '档案记录已彻底清除', type: 'success' });
    } catch (err) {
      setToast({ msg: err instanceof Error ? err.message : '删除失败', type: 'error' });
    } finally {
      setStudentToDelete(null);
    }
  };

  const filtered = useMemo(() => students.filter((s) => s.name.includes(search) || s.studentId.includes(search)), [search, students]);
  const formatName = (name: string, id: string) => isMasked ? `${name[0]}** (${id.substring(0, 3)}***)` : `${name} (${id})`;
  const trendData = useMemo(() => [...diaries].slice(0, 7).reverse().map((item) => ({ date: format(item.timestamp, 'MM/dd'), emotion: item.emotion_score, anxiety: item.dimensions?.anxiety || 0 })), [diaries]);
  const riskSnapshot = useMemo(() => getRiskSnapshot(alerts), [alerts]);
  const latestDiary = diaries[0];

  return (
    <div className="flex-1 flex overflow-hidden">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <ConfirmModal
        isOpen={!!studentToDelete}
        title="清除敏感档案"
        message="警告：此操作将彻底删除该学生的所有档案、对话记录及跟进记录，操作不可逆。是否继续执行？"
        onConfirm={executeDelete}
        onCancel={() => setStudentToDelete(null)}
      />
      <div className="w-[320px] bg-bg-card border-r border-border flex flex-col shrink-0">
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="搜索姓名或学号..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-bg-body border border-border rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-text-main placeholder:text-text-muted"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filtered.map((student) => (
            <button
              key={student.studentId}
              onClick={() => handleSelectStudent(student)}
              className={`w-full text-left p-3 rounded-lg border transition-all ${selectedStudent?.studentId === student.studentId ? 'bg-primary-light border-primary/30 shadow-sm' : 'bg-bg-body border-border hover:border-text-muted/30'}`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${selectedStudent?.studentId === student.studentId ? 'bg-primary text-white' : 'bg-bg-card text-text-muted border border-border'}`}>
                  <UserSquare className="w-4 h-4" />
                </div>
                <div className="overflow-hidden">
                  <h4 className="text-sm font-semibold text-text-main truncate">{formatName(student.name, student.studentId)}</h4>
                  <p className="text-xs text-text-muted truncate">{student.major}</p>
                </div>
              </div>
            </button>
          ))}
          {filtered.length === 0 && <div className="text-center text-text-muted text-sm py-8">未找到相关学生档案</div>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-bg-body">
        {selectedStudent ? (
          <div className="p-8 max-w-6xl mx-auto space-y-6 flex flex-col">
            <div className="bg-bg-card border border-border rounded-xl p-6 shadow-sm flex flex-wrap justify-between items-start gap-4">
              <div>
                <div className="flex items-center gap-3 flex-wrap mb-2">
                  <h2 className="text-2xl font-bold text-text-main tracking-tight">{formatName(selectedStudent.name, selectedStudent.studentId)}</h2>
                  <span className={`text-xs px-2 py-0.5 rounded ${riskSnapshot.className}`}>{riskSnapshot.label}</span>
                </div>
                <div className="flex flex-wrap gap-6 text-sm text-text-muted">
                  <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> 建档于 {format(selectedStudent.createdAt, 'yyyy-MM-dd')}</span>
                  <span className="flex items-center gap-1.5"><BookOpen className="w-4 h-4" /> {selectedStudent.major}</span>
                </div>
                <p className="text-sm text-text-muted mt-3 leading-6">当前研判：{riskSnapshot.reason}</p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => handleExportSingle(selectedStudent)} className="flex items-center gap-2 px-3 py-2 bg-bg-body border border-border rounded-lg text-sm font-semibold hover:bg-bg-card transition-colors text-text-main">
                  <Download className="w-4 h-4" /> 导出个案报告
                </button>
                <button onClick={() => setStudentToDelete(selectedStudent.studentId)} className="flex items-center gap-2 px-3 py-2 bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] rounded-lg text-sm font-semibold hover:bg-red-50 transition-colors">
                  <Trash2 className="w-4 h-4" /> 销毁档案
                </button>
              </div>
            </div>

            {loading ? (
              <div className="rounded-xl border border-border bg-bg-card p-8 text-center text-text-muted">正在加载学生详情...</div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-bg-card border border-border rounded-xl p-5"><p className="text-sm text-text-muted mb-2">历史预警</p><div className="text-3xl font-bold text-text-main">{alerts.length}</div></div>
                  <div className="bg-bg-card border border-border rounded-xl p-5"><p className="text-sm text-text-muted mb-2">对话记录</p><div className="text-3xl font-bold text-text-main">{chats.length}</div></div>
                  <div className="bg-bg-card border border-border rounded-xl p-5"><p className="text-sm text-text-muted mb-2">日记记录</p><div className="text-3xl font-bold text-text-main">{diaries.length}</div></div>
                  <div className="bg-bg-card border border-border rounded-xl p-5"><p className="text-sm text-text-muted mb-2">干预记录</p><div className="text-3xl font-bold text-text-main">{notes.length}</div></div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {[
                    ['overview', '状态总览'],
                    ['chats', '对话记录'],
                    ['diaries', '日记记录'],
                    ['notes', '干预记录'],
                  ].map(([key, label]) => (
                    <button key={key} onClick={() => setActiveTab(key as typeof activeTab)} className={`rounded-lg px-4 py-2 text-sm font-semibold border ${activeTab === key ? 'bg-primary-light text-primary border-primary/30' : 'bg-bg-card border-border text-text-muted'}`}>
                      {label}
                    </button>
                  ))}
                </div>

                {activeTab === 'overview' && (
                  <div className="grid grid-cols-1 xl:grid-cols-[1fr_0.9fr] gap-6">
                    <div className="space-y-6">
                      <div className="bg-bg-card border border-border rounded-xl p-5">
                        <h3 className="text-base font-semibold mb-4">近 7 次情绪趋势</h3>
                        {trendData.length ? (
                          <div className="h-[260px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={trendData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                                <YAxis domain={[0, 10]} tick={{ fontSize: 12 }} />
                                <Tooltip />
                                <Line type="monotone" dataKey="emotion" name="情绪分" stroke="#2563EB" strokeWidth={2.5} />
                                <Line type="monotone" dataKey="anxiety" name="焦虑值" stroke="#D97706" strokeWidth={2} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        ) : (
                          <div className="text-sm text-text-muted bg-bg-body border border-border rounded-lg p-8 text-center">暂无趋势数据</div>
                        )}
                      </div>

                      <div className="bg-bg-card border border-border rounded-xl p-5">
                        <h3 className="text-base font-semibold mb-4 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-warning" /> 风险预警记录</h3>
                        <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                          {alerts.length ? alerts.map((alert) => (
                            <div key={alert.id} className="rounded-lg border border-border bg-bg-body p-4">
                              <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`text-xs px-2 py-0.5 rounded ${alert.risk_level === 'high' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{alert.risk_level === 'high' ? '高风险' : '中风险'}</span>
                                  <span className="text-xs text-text-muted">{alert.source === 'diary' ? '日记触发' : '对话触发'}</span>
                                </div>
                                <span className="text-xs text-text-muted">{format(alert.timestamp, 'yyyy-MM-dd HH:mm')}</span>
                              </div>
                              <p className="text-sm text-text-main leading-6">{alert.reason}</p>
                            </div>
                          )) : <div className="text-sm text-text-muted bg-bg-body border border-border rounded-lg p-6 text-center">暂无预警记录</div>}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="bg-bg-card border border-border rounded-xl p-5">
                        <h3 className="text-base font-semibold mb-4">最新状态摘要</h3>
                        <div className="space-y-3 text-sm text-text-muted leading-6">
                          <div className="rounded-lg border border-border bg-bg-body p-4">
                            <p className="font-semibold text-text-main mb-1">最新日记摘要</p>
                            <p>{latestDiary?.summary || '暂无日记记录'}</p>
                          </div>
                          <div className="rounded-lg border border-border bg-bg-body p-4">
                            <p className="font-semibold text-text-main mb-1">近期压力关键词</p>
                            <p>{latestDiary?.stress_keywords.join('、') || '暂无'}</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-bg-card border border-border rounded-xl p-5">
                        <h3 className="text-base font-semibold mb-4 flex items-center gap-2"><FileText className="w-4 h-4 text-primary" /> 新增干预记录</h3>
                        <textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="记录本次沟通情况、处置措施与后续计划" className="w-full h-32 bg-bg-body border border-border rounded-lg p-4 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50" />
                        <button onClick={handleAddNote} disabled={!newNote.trim()} className="mt-3 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">保存干预记录</button>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'chats' && (
                  <div className="bg-bg-card border border-border rounded-xl p-5 space-y-3">
                    {chats.length ? chats.map((chat) => (
                      <div key={chat.id} className="rounded-lg border border-border bg-bg-body p-4">
                        <div className="flex justify-between items-center mb-2 text-xs text-text-muted">
                          <span className="font-semibold text-text-main">{chat.role === 'user' ? '学生表达' : '系统回复'}</span>
                          <span>{format(chat.timestamp, 'yyyy-MM-dd HH:mm:ss')}</span>
                        </div>
                        <p className="text-sm text-text-main whitespace-pre-wrap leading-6">{chat.text}</p>
                      </div>
                    )) : <div className="text-sm text-text-muted bg-bg-body border border-border rounded-lg p-6 text-center">暂无对话记录</div>}
                  </div>
                )}

                {activeTab === 'diaries' && (
                  <div className="bg-bg-card border border-border rounded-xl p-5 space-y-3">
                    {diaries.length ? diaries.map((entry) => (
                      <div key={entry.id} className="rounded-lg border border-border bg-bg-body p-4">
                        <div className="flex justify-between items-center mb-2 text-xs text-text-muted">
                          <span className="font-semibold text-text-main">情绪分 {entry.emotion_score}/10</span>
                          <span>{format(entry.timestamp, 'yyyy-MM-dd HH:mm:ss')}</span>
                        </div>
                        <p className="text-sm text-text-main whitespace-pre-wrap leading-6 mb-3">{entry.content}</p>
                        <p className="text-xs text-text-muted">摘要：{entry.summary}</p>
                      </div>
                    )) : <div className="text-sm text-text-muted bg-bg-body border border-border rounded-lg p-6 text-center">暂无日记记录</div>}
                  </div>
                )}

                {activeTab === 'notes' && (
                  <div className="bg-bg-card border border-border rounded-xl p-5 space-y-3">
                    {notes.length ? notes.map((note) => (
                      <div key={note.id} className="rounded-lg border border-border bg-bg-body p-4">
                        <div className="flex justify-between items-center mb-2 text-xs text-text-muted">
                          <span className="font-semibold text-text-main flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" /> 干预记录</span>
                          <span>{format(note.timestamp, 'yyyy-MM-dd HH:mm:ss')}</span>
                        </div>
                        <p className="text-sm text-text-main whitespace-pre-wrap leading-6">{note.content}</p>
                      </div>
                    )) : <div className="text-sm text-text-muted bg-bg-body border border-border rounded-lg p-6 text-center">暂无干预记录</div>}
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-text-muted text-sm">请选择左侧学生档案查看详情</div>
        )}
      </div>
    </div>
  );
}
