import { Router, type Request, type Response } from 'express';
import { store } from '../db/store.js';
import { config } from '../config.js';
import { makeToken } from '../middleware/auth.js';

export const authRouter = Router();

authRouter.post('/student/login', (req: Request, res: Response) => {
  const studentId = String(req.body?.studentId || '').trim();
  const name = String(req.body?.name || '').trim();
  const major = String(req.body?.major || '').trim();
  if (!studentId || !name || !major) {
    return res.status(400).json({ message: '请完整填写学号、姓名和专业班级' });
  }
  const existing = store.findStudent(studentId);
  if (existing && existing.name !== name) {
    return res.status(400).json({ message: '该学号已存在，且姓名与历史档案不一致，请核对后再试' });
  }
  const profile = existing || store.upsertStudent({ studentId, name, major, createdAt: Date.now() });
  return res.json({
    token: makeToken({ role: 'student', subject: studentId, issuedAt: Date.now() }),
    profile,
    role: 'student',
  });
});

authRouter.post('/admin/login', (req: Request, res: Response) => {
  if (!config.adminPassword) {
    return res.status(503).json({ message: '心理辅导工作台访问口令未配置' });
  }
  const password = String(req.body?.password || '').trim();
  if (password !== config.adminPassword) {
    return res.status(401).json({ message: '口令错误' });
  }
  return res.json({
    token: makeToken({ role: 'admin', subject: 'console', issuedAt: Date.now() }),
    role: 'admin',
  });
});

authRouter.post('/superadmin/login', (req: Request, res: Response) => {
  if (!config.superadminPassword) {
    return res.status(503).json({ message: '系统治理中心访问口令未配置' });
  }
  const password = String(req.body?.password || '').trim();
  if (password !== config.superadminPassword) {
    return res.status(401).json({ message: '口令错误' });
  }
  return res.json({
    token: makeToken({ role: 'superadmin', subject: 'root', issuedAt: Date.now() }),
    role: 'superadmin',
  });
});
