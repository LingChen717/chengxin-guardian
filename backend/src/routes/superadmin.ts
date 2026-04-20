import { Router, type Request, type Response } from 'express';
import { store } from '../db/store.js';
import { requireRole } from '../middleware/auth.js';

export const superadminRouter = Router();

superadminRouter.use('/superadmin', requireRole('superadmin'));

superadminRouter.get('/superadmin/overview', (req: Request, res: Response) => {
  const data = store.getAll();
  return res.json({
    data: {
      students: data.students,
      chats: data.chats,
      diaries: data.diaries,
      alerts: data.alerts,
      notes: data.notes,
    }
  });
});

superadminRouter.get('/superadmin/export', (req: Request, res: Response) => {
  return res.json({ data: store.getAll() });
});

superadminRouter.post('/superadmin/import', (req: Request, res: Response) => {
  const payload = req.body?.data;
  if (!payload || typeof payload !== 'object') {
    return res.status(400).json({ message: '导入数据格式错误' });
  }
  store.saveAll(payload);
  return res.json({ ok: true });
});

superadminRouter.delete('/superadmin/reset', (req: Request, res: Response) => {
  store.reset();
  return res.json({ ok: true });
});
