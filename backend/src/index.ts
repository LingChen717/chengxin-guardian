import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { authRouter } from './routes/auth.js';
import { studentRouter } from './routes/student.js';
import { adminRouter } from './routes/admin.js';
import { superadminRouter } from './routes/superadmin.js';

const app = express();
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, name: 'chengxin-guardian-backend', time: Date.now() });
});

app.use('/api/auth', authRouter);
app.use('/api', studentRouter);
app.use('/api', adminRouter);
app.use('/api', superadminRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = err instanceof Error ? err.message : '服务器内部错误';
  res.status(500).json({ message });
});

app.listen(config.port, () => {
  console.log(`Backend running on http://localhost:${config.port}`);
});
