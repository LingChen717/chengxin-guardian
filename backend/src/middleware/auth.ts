import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { config } from '../config.js';

type Role = 'student' | 'admin' | 'superadmin';

export interface AuthPayload {
  role: Role;
  subject: string;
  issuedAt: number;
}

function base64url(input: string): string {
  return Buffer.from(input, 'utf-8').toString('base64url');
}

function fromBase64url(input: string): string {
  return Buffer.from(input, 'base64url').toString('utf-8');
}

function sign(raw: string): string {
  return crypto.createHmac('sha256', config.authSecret).update(raw).digest('base64url');
}

export function makeToken(payload: AuthPayload): string {
  const raw = `${payload.role}.${payload.subject}.${payload.issuedAt}`;
  const encoded = base64url(raw);
  return `${encoded}.${sign(encoded)}`;
}

export function parseToken(token: string | undefined): AuthPayload | null {
  if (!token) return null;
  const clean = token.replace(/^Bearer\s+/i, '').trim();
  const [encoded, signature] = clean.split('.');
  if (!encoded || !signature) return null;
  if (sign(encoded) !== signature) return null;

  try {
    const raw = fromBase64url(encoded);
    const [role, subject, issuedAtText] = raw.split('.');
    if (!role || !subject || !issuedAtText) return null;
    if (!['student', 'admin', 'superadmin'].includes(role)) return null;
    const issuedAt = Number(issuedAtText);
    if (!Number.isFinite(issuedAt) || issuedAt <= 0) return null;
    return { role: role as Role, subject, issuedAt };
  } catch {
    return null;
  }
}

export function getAuth(req: Request): AuthPayload | null {
  const token = String(req.headers.authorization || '');
  return parseToken(token);
}

export function requireRole(role: Role) {
  return (req: Request, res: Response, next: NextFunction) => {
    const auth = getAuth(req);
    if (!auth) {
      return res.status(401).json({ message: '未授权访问' });
    }
    if (auth.role !== role && !(role === 'admin' && auth.role === 'superadmin')) {
      return res.status(403).json({ message: '权限不足' });
    }
    (req as Request & { auth?: AuthPayload }).auth = auth;
    next();
  };
}
