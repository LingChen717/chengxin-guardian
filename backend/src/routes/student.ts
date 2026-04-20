import { Router, type Request, type Response } from 'express';
import { store } from '../db/store.js';
import { chatWithGuardian, analyzeDiary } from '../services/llm.js';
import { requireRole } from '../middleware/auth.js';

export const studentRouter = Router();

studentRouter.use('/student', requireRole('student'));
studentRouter.use('/chats', requireRole('student'));
studentRouter.use('/diaries', requireRole('student'));

type AuthedRequest = Request & { auth?: { subject?: string } };

function getStudentIdFromReq(req: AuthedRequest): string {
  return String(req.auth?.subject || req.body?.studentId || req.params?.studentId || '').trim();
}

studentRouter.get('/student/me', (req: Request, res: Response) => {
  const studentId = getStudentIdFromReq(req as AuthedRequest);
  const student = store.findStudent(studentId);
  if (!student) {
    return res.status(404).json({ message: '学生档案不存在' });
  }
  return res.json({ data: student });
});

studentRouter.get('/student/history', (req: Request, res: Response) => {
  const studentId = getStudentIdFromReq(req as AuthedRequest);
  const data = store.getAll();
  const student = data.students.find((item) => item.studentId === studentId);
  if (!student) {
    return res.status(404).json({ message: '学生档案不存在' });
  }
  return res.json({
    data: {
      student,
      chats: data.chats.filter((item) => item.studentId === studentId).sort((a, b) => a.timestamp - b.timestamp),
      diaries: data.diaries.filter((item) => item.studentId === studentId).sort((a, b) => b.timestamp - a.timestamp),
      alerts: data.alerts.filter((item) => item.studentId === studentId).sort((a, b) => b.timestamp - a.timestamp),
      notes: data.notes.filter((item) => item.studentId === studentId).sort((a, b) => b.timestamp - a.timestamp),
    }
  });
});

studentRouter.post('/chats/send', async (req: Request, res: Response) => {
  const authedReq = req as AuthedRequest;
  const studentId = getStudentIdFromReq(authedReq);
  const message = String(req.body?.message || '').trim();
  if (!studentId || !message) {
    return res.status(400).json({ message: 'studentId 和 message 不能为空' });
  }
  if (authedReq.auth?.subject !== studentId) {
    return res.status(403).json({ message: '不能替其他学生发送消息' });
  }
  const current = store.getAll();
  const student = current.students.find((item) => item.studentId === studentId);
  if (!student) {
    return res.status(404).json({ message: '学生档案不存在，请先登录建档' });
  }
  const userMsg = { id: `${Date.now()}`, studentId, role: 'user' as const, text: message, timestamp: Date.now() };
  store.addChat(userMsg);

  const history = current.chats
    .filter((item) => item.studentId === studentId)
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(-8)
    .map((item) => item.text);
  const result = await chatWithGuardian(history, message);

  const modelMsg = { id: `${Date.now()}-m`, studentId, role: 'model' as const, text: result.reply, timestamp: Date.now() };
  store.addChat(modelMsg);

  if (result.risk_level === 'medium' || result.risk_level === 'high') {
    store.addAlert({
      id: `${Date.now()}-a`,
      studentId,
      studentName: student.name,
      timestamp: Date.now(),
      trigger_text: message,
      reason: result.risk_reason || '模型判定存在潜在风险',
      status: 'pending',
      risk_level: result.risk_level,
      source: 'chat',
    });
  }

  return res.json({ userMsg, modelMsg, result });
});

studentRouter.post('/diaries/analyze', async (req: Request, res: Response) => {
  const authedReq = req as AuthedRequest;
  const studentId = getStudentIdFromReq(authedReq);
  const content = String(req.body?.content || '').trim();
  if (!studentId || !content) {
    return res.status(400).json({ message: 'studentId 和 content 不能为空' });
  }
  if (authedReq.auth?.subject !== studentId) {
    return res.status(403).json({ message: '不能替其他学生提交日记' });
  }
  const student = store.getAll().students.find((item) => item.studentId === studentId);
  if (!student) {
    return res.status(404).json({ message: '学生档案不存在，请先登录建档' });
  }
  const analysis = await analyzeDiary(content);
  const diary = {
    id: `${Date.now()}-d`,
    studentId,
    timestamp: Date.now(),
    content,
    emotion_score: analysis.emotion_score,
    stress_keywords: analysis.stress_keywords,
    summary: analysis.summary,
    dimensions: analysis.dimensions,
  };
  store.addDiary(diary);

  if (analysis.risk_level === 'medium' || analysis.risk_level === 'high') {
    store.addAlert({
      id: `${Date.now()}-da`,
      studentId,
      studentName: student.name,
      timestamp: Date.now(),
      trigger_text: content.slice(0, 120),
      reason: analysis.risk_reason,
      status: 'pending',
      risk_level: analysis.risk_level,
      source: 'diary',
    });
  }

  return res.json({ data: diary, analysis: { risk_level: analysis.risk_level, risk_reason: analysis.risk_reason } });
});
