
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

export interface HiddenState {
  budgetCap?: string;
  hiddenCompetitor?: string;
  realDecisionMaker?: string;
  timelineConstraint?: string;
  painPoint?: string;
}

export interface SessionMetrics {
  engagementScore: number;
  objectionsHandled: number;
  conversionProbability: number;
  feedback: string;
  strengths?: string[];
  focusAreas?: string[];
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

export interface ConversationQuality {
  talkToListenRatio: number; // e.g., 0.6 (60% talk)
  questionToStatementRatio: number; // e.g., 0.4
  discoveryTimeMs: number;
  pitchTimeMs: number;
  fillerWordsPerMinute: number;
  speakingPaceWpm: number;
  frameworkAdherenceScore: number; // 0-100
}

export interface SkillMetric {
  name: string;
  score: number; // 0-100
  trend: 'up' | 'down' | 'flat';
  description: string;
}

export interface ObjectionMetric {
  type: string;
  count: number;
  successRate: number; // 0-100
  avgResponseTimeMs: number;
}

export interface SentimentPoint {
  timestamp: number; // offset in ms
  score: number; // -1 to 1 or 0-100
  trigger?: string; // what caused the change
}

export interface CoachingFeedback {
  id: string;
  date: string;
  tag: string;
  feedback: string;
  impact: string;
  transcriptRef?: string;
}

export interface ProductKnowledge {
  keywordsUsed: string[];
  keywordsMissed: string[];
  accuracyScore: number;
}

export interface NextBestAction {
  id: string;
  title: string;
  type: 'drill' | 'review' | 'learning';
  actionUrl?: string;
}

export interface ExtendedDashboardMetrics {
  overallScore: number;
  avgWinProb: number;
  avgEngagement: number;
  practiceStreakDays: number;
  trends: {
    score: 'up' | 'down' | 'flat';
    winProb: 'up' | 'down' | 'flat';
    engagement: 'up' | 'down' | 'flat';
  };
  conversationQuality: ConversationQuality;
  skills: SkillMetric[];
  objections: ObjectionMetric[];
  sentiment: {
    start: number;
    end: number;
    timeline: SentimentPoint[];
  };
  recentFeedback: CoachingFeedback[];
  productKnowledge: ProductKnowledge;
  nextActions: NextBestAction[];
}
