import { Router, type Request, type Response } from 'express';
import { store } from '../db/store.js';
import { maskStudent } from '../utils/redact.js';
import { requireRole } from '../middleware/auth.js';
import type { AlertStatus } from '../types.js';

export const adminRouter = Router();

adminRouter.use('/admin', requireRole('admin'));

adminRouter.get('/admin/alerts', (req: Request, res: Response) => {
  const masked = String(req.query.masked || '') === 'true';
  const alerts = store.getAll().alerts.map((item) => {
    if (!masked) return item;
    const maskedInfo = maskStudent(item.studentName, item.studentId);
    return { ...item, studentName: maskedInfo.studentName, studentId: maskedInfo.studentId };
  });
  return res.json({ data: alerts.sort((a, b) => b.timestamp - a.timestamp) });
});
adminRouter.patch('/admin/alerts/:id/status', (req: Request, res: Response) => {
  const status = String(req.body?.status || '').trim() as AlertStatus;
  if (!['pending', 'following', 'resolved', 'archived'].includes(status)) {
    return res.status(400).json({ message: '预警状态非法' });
  }
  const updated = store.updateAlertStatus(String(req.params.id), status);
  return res.json({ data: updated });
});

adminRouter.get('/admin/stats', (req: Request, res: Response) => {
  const data = store.getAll();
  const keywordMap: Record<string, number> = {};
  const trendMap: Record<string, { date: string; alerts: number; diaries: number }> = {};
  const sourceDistribution = { chat: 0, diary: 0 };
  const now = new Date();

  for (let i = 6; i >= 0; i -= 1) {
    const date = new Date(now);
    date.setDate(now.getDate() - i);
    const key = date.toISOString().slice(0, 10);
    trendMap[key] = { date: key, alerts: 0, diaries: 0 };
  }

  for (const item of data.diaries) {
    for (const kw of item.stress_keywords || []) keywordMap[kw] = (keywordMap[kw] || 0) + 1;
    const key = new Date(item.timestamp).toISOString().slice(0, 10);
    if (trendMap[key]) trendMap[key].diaries += 1;
  }

  for (const item of data.alerts) {
    const key = new Date(item.timestamp).toISOString().slice(0, 10);
    if (trendMap[key]) trendMap[key].alerts += 1;
    if (item.source === 'diary') sourceDistribution.diary += 1;
    else sourceDistribution.chat += 1;
  }

  const keywords = Object.entries(keywordMap)
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return res.json({
    data: {
      studentCount: data.students.length,
      pendingCount: data.alerts.filter((item) => item.status === 'pending').length,
      followingCount: data.alerts.filter((item) => item.status === 'following').length,
      resolvedCount: data.alerts.filter((item) => item.status === 'resolved').length,
      archivedCount: data.alerts.filter((item) => item.status === 'archived').length,
      highRiskCount: data.alerts.filter((item) => item.risk_level === 'high').length,
      mediumRiskCount: data.alerts.filter((item) => item.risk_level === 'medium').length,
      keywords,
      alertCount: data.alerts.length,
      diaryCount: data.diaries.length,
      chatCount: data.chats.length,
      sourceDistribution,
      alertTrend: Object.values(trendMap),
      systemStatus: {
        dialogue: 'running',
        alertEngine: 'running',
        diaryAnalyzer: 'running',
        dataStore: 'running',
      }
    }
  });
});

adminRouter.get('/admin/students', (req: Request, res: Response) => {
  return res.json({ data: store.getAll().students.sort((a, b) => b.createdAt - a.createdAt) });
});

adminRouter.get('/admin/students/:studentId/detail', (req: Request, res: Response) => {
  const studentId = String(req.params.studentId);
  const data = store.getAll();
  const student = data.students.find((item) => item.studentId === studentId);
  if (!student) return res.status(404).json({ message: '学生不存在' });
  return res.json({
    data: {
      student,
      chats: data.chats.filter((item) => item.studentId === studentId).sort((a, b) => a.timestamp - b.timestamp),
      diaries: data.diaries.filter((item) => item.studentId === studentId).sort((a, b) => b.timestamp - a.timestamp),
      notes: data.notes.filter((item) => item.studentId === studentId).sort((a, b) => b.timestamp - a.timestamp),
      alerts: data.alerts.filter((item) => item.studentId === studentId).sort((a, b) => b.timestamp - a.timestamp),
    }
  });
});

adminRouter.post('/admin/students/:studentId/notes', (req: Request, res: Response) => {
  const studentId = String(req.params.studentId);
  const content = String(req.body?.content || '').trim();
  if (!content) return res.status(400).json({ message: '记录内容不能为空' });
  const note = { id: `${Date.now()}-n`, studentId, timestamp: Date.now(), content };
  store.addNote(note);
  return res.json({ data: note });
});

adminRouter.delete('/admin/students/:studentId', (req: Request, res: Response) => {
  store.deleteStudentCascade(String(req.params.studentId));
  return res.json({ ok: true });
});
