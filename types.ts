
export type Role = 'user' | 'model';

export interface Message {
  id: string;
  role: Role;
  text: string;
  timestamp: Date;
}

export type TrainingMode = 'strategy' | 'roleplay' | 'coaching';
export type Intensity = 'easy' | 'normal' | 'hard';

export interface SalesSettings {
  mode: TrainingMode;
  persona: string;
  intensity: Intensity;
}

export interface LiveConnectionState {
  isConnected: boolean;
  isStreaming: boolean;
  error: string | null;
}

export interface SessionMetrics {
  engagementScore: number;
  objectionsHandled: number;
  conversionProbability: number;
  feedback: string;
}

export interface UserProfile {
  name: string;
  title: string;
  company: string;
  email: string;
  coachingStyle: 'Direct' | 'Encouraging' | 'Socratic';
  voicePreference: 'Male' | 'Female';
}

export interface SessionHistoryItem {
  id: string;
  date: string;
  mode: TrainingMode;
  persona: string;
  metrics?: SessionMetrics;
  duration: string; // Stored as "X min" string or calculated
}

export interface UserDocument {
  id: string;
  filename: string;
  content: string;
  created_at: string;
}
