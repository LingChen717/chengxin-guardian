export interface Student {
  studentId: string;
  name: string;
  major: string;
  createdAt: number;
}

export interface ChatMsg {
  id: string;
  studentId: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface Diary {
  id: string;
  studentId: string;
  content: string;
  emotion_score: number;
  stress_keywords: string[];
  summary: string;
  timestamp: number;
  dimensions?: {
    anxiety: number;
    sadness: number;
    peace: number;
    fatigue: number;
    confidence: number;
  };
}

export type AlertStatus = 'pending' | 'following' | 'resolved' | 'archived';
export type AlertSource = 'chat' | 'diary';
export type RiskLevel = 'low' | 'medium' | 'high';

export interface Alert {
  id: string;
  studentId: string;
  studentName: string;
  timestamp: number;
  trigger_text: string;
  reason: string;
  status: AlertStatus;
  risk_level?: RiskLevel;
  source?: AlertSource;
}

export interface CounselorNote {
  id: string;
  studentId: string;
  timestamp: number;
  content: string;
}

export interface AppData {
  version: string;
  exportedAt: number;
  students: Student[];
  chats: ChatMsg[];
  diaries: Diary[];
  alerts: Alert[];
  notes: CounselorNote[];
}

export interface ChatResult {
  reply: string;
  risk_level: RiskLevel;
  risk_reason: string;
}

export interface DiaryResult {
  emotion_score: number;
  stress_keywords: string[];
  summary: string;
  dimensions: {
    anxiety: number;
    sadness: number;
    peace: number;
    fatigue: number;
    confidence: number;
  };
  risk_level: RiskLevel;
  risk_reason: string;
}
