import type { Alert, AlertStatus, AppData, ChatMsg, CounselorNote, Diary, Student } from '../types/app';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').trim();

function buildUrl(path: string): string {
  if (API_BASE_URL) return `${API_BASE_URL.replace(/\/+$/, '')}${path}`;
  return path;
}

function getToken(key: string): string {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return '';
    const parsed = JSON.parse(raw);
    return typeof parsed === 'string' ? parsed : '';
  } catch {
    return '';
  }
}

async function request<T>(path: string, init: RequestInit = {}, tokenKey?: string): Promise<T> {
  const headers = new Headers(init.headers || {});
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (tokenKey) {
    const token = getToken(tokenKey);
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(buildUrl(path), {
    ...init,
    headers,
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(payload?.message || `请求失败: ${response.status}`);
  }
  return payload as T;
}

export const api = {
  studentLogin(payload: { studentId: string; name: string; major: string }) {
    return request<{ token: string; profile: Student; role: 'student' }>('/api/auth/student/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  adminLogin(password: string) {
    return request<{ token: string; role: 'admin' }>('/api/auth/admin/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
  },
  superadminLogin(password: string) {
    return request<{ token: string; role: 'superadmin' }>('/api/auth/superadmin/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
  },
  getStudentHistory() {
    return request<{ data: { student: Student; chats: ChatMsg[]; diaries: Diary[]; alerts: Alert[]; notes: CounselorNote[] } }>('/api/student/history', {}, 'student_token');
  },
  sendChat(message: string, studentId: string) {
    return request<{ userMsg: ChatMsg; modelMsg: ChatMsg; result: { reply: string; risk_level: 'low' | 'medium' | 'high'; risk_reason: string } }>('/api/chats/send', {
      method: 'POST',
      body: JSON.stringify({ message, studentId }),
    }, 'student_token');
  },
  analyzeDiary(content: string, studentId: string) {
    return request<{ data: Diary; analysis?: { risk_level: 'low' | 'medium' | 'high'; risk_reason: string } }>('/api/diaries/analyze', {
      method: 'POST',
      body: JSON.stringify({ content, studentId }),
    }, 'student_token');
  },
  getAdminAlerts(masked: boolean) {
    return request<{ data: Alert[] }>(`/api/admin/alerts?masked=${masked ? 'true' : 'false'}`, {}, 'admin_token');
  },
  updateAlertStatus(id: string, status: AlertStatus) {
    return request<{ data: Alert }>(`/api/admin/alerts/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }, 'admin_token');
  },
  getAdminStats() {
    return request<{
      data: {
        studentCount: number;
        pendingCount: number;
        followingCount: number;
        resolvedCount: number;
        archivedCount: number;
        highRiskCount: number;
        mediumRiskCount: number;
        keywords: Array<{ word: string; count: number }>;
        alertCount: number;
        diaryCount: number;
        chatCount: number;
        sourceDistribution: { chat: number; diary: number };
        alertTrend: Array<{ date: string; alerts: number; diaries: number }>;
        systemStatus: Record<string, string>;
      }
    }>('/api/admin/stats', {}, 'admin_token');
  },
  getStudents() {
    return request<{ data: Student[] }>('/api/admin/students', {}, 'admin_token');
  },
  getStudentDetail(studentId: string) {
    return request<{ data: { student: Student; chats: ChatMsg[]; diaries: Diary[]; notes: CounselorNote[]; alerts: Alert[] } }>(`/api/admin/students/${studentId}/detail`, {}, 'admin_token');
  },
  addStudentNote(studentId: string, content: string) {
    return request<{ data: CounselorNote }>(`/api/admin/students/${studentId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }, 'admin_token');
  },
  deleteStudent(studentId: string) {
    return request<{ ok: boolean }>(`/api/admin/students/${studentId}`, { method: 'DELETE' }, 'admin_token');
  },
  getSuperadminOverview() {
    return request<{ data: { students: Student[]; chats: ChatMsg[]; diaries: Diary[]; alerts: Alert[]; notes: CounselorNote[] } }>('/api/superadmin/overview', {}, 'superadmin_token');
  },
  exportAllData() {
    return request<{ data: AppData }>('/api/superadmin/export', {}, 'superadmin_token');
  },
  importAllData(data: AppData) {
    return request<{ ok: boolean }>('/api/superadmin/import', {
      method: 'POST',
      body: JSON.stringify({ data }),
    }, 'superadmin_token');
  },
  resetAllData() {
    return request<{ ok: boolean }>('/api/superadmin/reset', { method: 'DELETE' }, 'superadmin_token');
  },
};
