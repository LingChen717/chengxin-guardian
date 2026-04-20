import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';
import type { AppData, Alert, AlertStatus, ChatMsg, CounselorNote, Diary, Student } from '../types.js';

function defaultData(): AppData {
  return {
    version: '4.0.0',
    exportedAt: Date.now(),
    students: [],
    chats: [],
    diaries: [],
    alerts: [],
    notes: [],
  };
}

function ensureFile() {
  const filePath = path.resolve(config.dataFile);
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultData(), null, 2), 'utf-8');
  }
  return filePath;
}

const filePath = ensureFile();

function normalizeAlertStatus(status: string | undefined): AlertStatus {
  if (status === 'pending' || status === 'following' || status === 'resolved' || status === 'archived') return status;
  if (status === 'unread') return 'pending';
  if (status === 'read') return 'resolved';
  return 'pending';
}

function normalizeData(data: AppData): AppData {
  return {
    ...defaultData(),
    ...data,
    version: data.version || '4.0.0',
    students: Array.isArray(data.students) ? data.students : [],
    chats: Array.isArray(data.chats) ? data.chats : [],
    diaries: Array.isArray(data.diaries) ? data.diaries : [],
    alerts: Array.isArray(data.alerts)
      ? data.alerts.map((item) => ({
          ...item,
          status: normalizeAlertStatus(item.status as string | undefined),
          source: item.source === 'diary' ? 'diary' : 'chat',
        }))
      : [],
    notes: Array.isArray(data.notes) ? data.notes : [],
  };
}

function readData(): AppData {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as AppData;
    return normalizeData(parsed);
  } catch {
    return defaultData();
  }
}

function writeData(data: AppData) {
  fs.writeFileSync(filePath, JSON.stringify({ ...normalizeData(data), exportedAt: Date.now() }, null, 2), 'utf-8');
}

export const store = {
  getAll(): AppData {
    return readData();
  },
  saveAll(data: AppData) {
    writeData(data);
  },
  reset() {
    writeData(defaultData());
  },
  findStudent(studentId: string): Student | undefined {
    return readData().students.find((s) => s.studentId === studentId);
  },
  upsertStudent(student: Student): Student {
    const data = readData();
    const others = data.students.filter((s) => s.studentId !== student.studentId);
    data.students = [student, ...others].sort((a, b) => b.createdAt - a.createdAt);
    writeData(data);
    return student;
  },
  addChat(chat: ChatMsg) {
    const data = readData();
    data.chats.push(chat);
    writeData(data);
    return chat;
  },
  addDiary(diary: Diary) {
    const data = readData();
    data.diaries = [diary, ...data.diaries].sort((a, b) => b.timestamp - a.timestamp);
    writeData(data);
    return diary;
  },
  addAlert(alert: Alert) {
    const data = readData();
    data.alerts = [alert, ...data.alerts].sort((a, b) => b.timestamp - a.timestamp);
    writeData(data);
    return alert;
  },
  addNote(note: CounselorNote) {
    const data = readData();
    data.notes = [note, ...data.notes].sort((a, b) => b.timestamp - a.timestamp);
    writeData(data);
    return note;
  },
  updateAlertStatus(id: string, status: AlertStatus) {
    const data = readData();
    data.alerts = data.alerts.map((item) => item.id === id ? { ...item, status } : item);
    writeData(data);
    return data.alerts.find((item) => item.id === id);
  },
  deleteStudentCascade(studentId: string) {
    const data = readData();
    data.students = data.students.filter((s) => s.studentId !== studentId);
    data.chats = data.chats.filter((c) => c.studentId !== studentId);
    data.diaries = data.diaries.filter((d) => d.studentId !== studentId);
    data.alerts = data.alerts.filter((a) => a.studentId !== studentId);
    data.notes = data.notes.filter((n) => n.studentId !== studentId);
    writeData(data);
  }
};
