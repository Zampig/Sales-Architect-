import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Activity, Trophy, TrendingUp, Calendar, Zap, MessageSquare, ArrowUpRight, Target, BookOpen, Play, Download, Loader2 } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { SessionMetrics, ExtendedDashboardMetrics, ConversationQuality, NextBestAction } from '../types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface SessionData extends SessionMetrics {
    id: string;
    created_at: string;
    mode: string;
    persona: string;
    engagementScore: number;
    objectionsHandled: number;
    conversionProbability: number;
    feedback: string;
}

const DashboardView: React.FC = () => {
    const { user } = useAuth();
    const [sessions, setSessions] = useState<SessionData[]>([]);
    const [metrics, setMetrics] = useState<ExtendedDashboardMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState<'7d' | '30d'>('7d');
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    useEffect(() => {
        if (!user) return;
        fetchDashboardData();
    }, [user, timeRange]);

    const fetchDashboardData = async () => {
        try {
            // Calculate date range
            const now = new Date();
            const pastDate = new Date();
            pastDate.setDate(now.getDate() - (timeRange === '7d' ? 7 : 30));

            const { data, error } = await supabase
                .from('sessions')
                .select(`
          id, created_at, mode, persona,
          session_metrics (engagement_score, objections_handled, conversion_probability, feedback)
        `)
                .eq('user_id', user!.id)
                .gte('created_at', pastDate.toISOString())
                .order('created_at', { ascending: true });

            if (error) throw error;

            if (data) {
                const processedSessions: SessionData[] = data
                    .filter(s => s.session_metrics && s.session_metrics.length > 0)
                    .map(s => ({
                        id: s.id,
                        created_at: new Date(s.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                        mode: s.mode,
                        persona: s.persona,
                        engagementScore: s.session_metrics[0].engagement_score,
                        objectionsHandled: s.session_metrics[0].objections_handled,
                        conversionProbability: s.session_metrics[0].conversion_probability,
                        feedback: s.session_metrics[0].feedback
                    }));

                setSessions(processedSessions);

                // --- Calculate Real Metrics ---
                const total = processedSessions.length;
                const avgEngagement = total ? Math.round(processedSessions.reduce((acc, s) => acc + s.engagementScore, 0) / total) : 0;
                const avgWinProb = total ? Math.round(processedSessions.reduce((acc, s) => acc + s.conversionProbability, 0) / total) : 0;
                const overallScore = Math.round((avgEngagement + avgWinProb) / 2);

                // Calculate Streak (Mock logic for now as we need full history for real streak, but let's try best effort)
                // For real streak, we'd need to fetch more data or have a separate query. 
                // Here we just check consecutive days in the fetched range.
                let streak = 0;
                if (processedSessions.length > 0) {
                    streak = 1;
                    // Simple logic: if we have sessions today/yesterday etc. 
                    // For this MVP, let's just use the count of unique days in the last 7 days as a proxy for "consistency"
                    const uniqueDays = new Set(processedSessions.map(s => s.created_at)).size;
                    streak = uniqueDays;
                }

                // Generate Next Best Actions based on performance
                const nextActions: NextBestAction[] = [];
                if (avgEngagement < 60) {
                    nextActions.push({ id: '1', title: 'Energy & Tone Drill', type: 'drill', actionUrl: '#' });
                }
                if (avgWinProb < 50) {
                    nextActions.push({ id: '2', title: 'Closing Techniques Review', type: 'learning', actionUrl: '#' });
                }
                if (nextActions.length === 0) {
                    nextActions.push({ id: '3', title: 'Advanced Negotiation Sim', type: 'drill', actionUrl: '#' });
                }
                // Fill up to 3
                if (nextActions.length < 3) {
                    nextActions.push({ id: '4', title: 'Competitor Battlecards', type: 'review', actionUrl: '#' });
                }


                // Mock Conversation Quality (since we don't have this granular data in DB yet)
                const conversationQuality: ConversationQuality = {
                    talkToListenRatio: 0.55,
                    questionToStatementRatio: 0.3,
                    discoveryTimeMs: 120000,
                    pitchTimeMs: 60000,
                    fillerWordsPerMinute: 3,
                    speakingPaceWpm: 145,
                    frameworkAdherenceScore: 85
                };

                setMetrics({
                    overallScore,
                    avgWinProb,
                    avgEngagement,
                    practiceStreakDays: streak,
                    trends: { score: 'up', winProb: 'flat', engagement: 'up' }, // Simple defaults
                    conversationQuality,
                    skills: [], // Removed
                    objections: [], // Removed
                    sentiment: { start: 0, end: 0, timeline: [] }, // Removed
                    recentFeedback: [], // Could populate from sessions if needed
                    productKnowledge: { keywordsUsed: [], keywordsMissed: [], accuracyScore: 0 }, // Removed
                    nextActions
                });
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const generatePDF = async () => {
        const element = document.getElementById('dashboard-content');
        if (!element) return;

        setIsGeneratingPdf(true);

        try {
            const canvas = await html2canvas(element, {
                scale: 2,
                backgroundColor: '#0f172a', // gemini-dark
                useCORS: true,
                logging: false
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'px',
                format: [canvas.width, canvas.height]
            });

            pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
            pdf.save(`Sales_Architect_Report_${new Date().toISOString().split('T')[0]}.pdf`);
        } catch (err) {
            console.error("PDF Generation Error", err);
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    if (loading || !metrics) {
        return (
            <div className="flex items-center justify-center h-full text-gemini-blue animate-pulse">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 animate-spin" />
                    <span className="text-lg font-medium">Loading Analytics...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-gemini-dark p-6 overflow-y-auto space-y-6 custom-scrollbar" id="dashboard-content">

            {/* Header */}
            <div className="flex justify-between items-end border-b border-gemini-highlight/30 pb-4">
                <div>
                    <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                        Coach Performance
                    </h1>
                    <p className="text-gemini-muted mt-1 text-sm">Track your progress and master your sales skills.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={generatePDF}
                        disabled={isGeneratingPdf}
                        className="flex items-center gap-2 px-4 py-2 bg-gemini-card border border-gemini-highlight text-white rounded-lg hover:bg-gemini-highlight transition-all disabled:opacity-50"
                    >
                        {isGeneratingPdf ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                        {isGeneratingPdf ? 'Generating...' : 'Download Report'}
                    </button>

                    <div className="flex bg-gemini-card rounded-lg p-1 border border-gemini-highlight">
                        <button
                            onClick={() => setTimeRange('7d')}
                            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${timeRange === '7d' ? 'bg-gemini-blue text-white shadow-sm' : 'text-gemini-muted hover:text-white'}`}
                        >
                            7 Days
                        </button>
                        <button
                            onClick={() => setTimeRange('30d')}
                            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${timeRange === '30d' ? 'bg-gemini-blue text-white shadow-sm' : 'text-gemini-muted hover:text-white'}`}
                        >
                            30 Days
                        </button>
                    </div>
                </div>
            </div>

            {/* 1. Top KPI Strip */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <KpiCard
                    title="Overall Skill Score"
                    value={metrics.overallScore}
                    icon={<Trophy size={20} />}
                    trend={metrics.trends.score}
                    color="amber"
                />
                <KpiCard
                    title="Avg Win Probability"
                    value={`${metrics.avgWinProb}%`}
                    icon={<Target size={20} />}
                    trend={metrics.trends.winProb}
                    color="purple"
                />
                <KpiCard
                    title="Avg Engagement"
                    value={`${metrics.avgEngagement}%`}
                    icon={<Zap size={20} />}
                    trend={metrics.trends.engagement}
                    color="blue"
                />
                <KpiCard
                    title="Daily Streak"
                    value={`${metrics.practiceStreakDays}`}
                    icon={<Calendar size={20} />}
                    trend="up"
                    color="emerald"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column - 2/3 Width */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Performance Trend Chart */}
                    <div className="glass-card p-5 rounded-xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <TrendingUp size={18} className="text-blue-400" /> Performance Trend
                            </h3>
                        </div>
                        <div className="h-[300px] w-full">
                            {sessions.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={sessions} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorEngagement" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorWin" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} opacity={0.3} />
                                        <XAxis dataKey="created_at" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                                            itemStyle={{ color: '#e2e8f0' }}
                                        />
                                        <Area type="monotone" dataKey="engagementScore" stroke="#3b82f6" fillOpacity={1} fill="url(#colorEngagement)" name="Engagement" />
                                        <Area type="monotone" dataKey="conversionProbability" stroke="#a855f7" fillOpacity={1} fill="url(#colorWin)" name="Win Prob" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-gemini-muted">
                                    No session data available for this period.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Conversation Quality Section (Moved here for better visibility) */}
                    <div className="glass-card p-5 rounded-xl">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <MessageSquare size={18} className="text-cyan-400" /> Conversation Quality
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <QualityMetric
                                label="Talk / Listen Ratio"
                                value={`${Math.round(metrics.conversationQuality.talkToListenRatio * 100)}% Talk`}
                                subValue="Target: < 45%"
                                status={metrics.conversationQuality.talkToListenRatio > 0.45 ? 'warning' : 'good'}
                            />
                            <QualityMetric
                                label="Speaking Pace"
                                value={`${metrics.conversationQuality.speakingPaceWpm} WPM`}
                                subValue="Target: 130-150"
                                status={metrics.conversationQuality.speakingPaceWpm > 160 || metrics.conversationQuality.speakingPaceWpm < 120 ? 'warning' : 'good'}
                            />
                            <QualityMetric
                                label="Filler Words"
                                value={`${metrics.conversationQuality.fillerWordsPerMinute}/min`}
                                subValue="Target: < 2"
                                status={metrics.conversationQuality.fillerWordsPerMinute > 2 ? 'warning' : 'good'}
                            />
                            <QualityMetric
                                label="Framework Adherence"
                                value={`${metrics.conversationQuality.frameworkAdherenceScore}%`}
                                subValue="Methodology Match"
                                status="good"
                            />
                        </div>
                    </div>

                </div>

                {/* Right Column - 1/3 Width */}
                <div className="space-y-6">

                    {/* AI Focus Suggestions */}
                    <div className="glass-panel p-5 rounded-xl border-l-4 border-l-blue-500">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <Zap size={18} className="text-yellow-400" /> AI Focus Suggestions
                        </h3>
                        <div className="space-y-3">
                            {metrics.nextActions.map((action) => (
                                <button key={action.id} className="w-full text-left p-3 rounded-lg bg-gemini-dark hover:bg-gemini-highlight transition-colors border border-gemini-highlight/50 group">
                                    <div className="flex items-start gap-3">
                                        <div className={`mt-1 p-1.5 rounded-full ${action.type === 'drill' ? 'bg-red-500/20 text-red-400' :
                                            action.type === 'learning' ? 'bg-blue-500/20 text-blue-400' :
                                                'bg-emerald-500/20 text-emerald-400'
                                            }`}>
                                            {action.type === 'drill' ? <Target size={14} /> : action.type === 'learning' ? <BookOpen size={14} /> : <Play size={14} />}
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium text-white group-hover:text-blue-400 transition-colors">{action.title}</div>
                                            <div className="text-xs text-gemini-muted mt-1 capitalize">{action.type}</div>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Recent Sessions List (New addition to fill space) */}
                    <div className="glass-card p-5 rounded-xl">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <Activity size={18} className="text-purple-400" /> Recent Sessions
                        </h3>
                        <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                            {sessions.slice(0, 5).reverse().map((session) => (
                                <div key={session.id} className="bg-gemini-dark/50 p-3 rounded-lg border border-gemini-highlight/30">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-xs font-bold text-white">{session.persona}</span>
                                        <span className="text-[10px] text-gemini-muted">{session.created_at}</span>
                                    </div>
                                    <div className="flex items-center gap-3 mt-2">
                                        <div className="text-xs text-gemini-muted">
                                            Score: <span className="text-white">{session.engagementScore}</span>
                                        </div>
                                        <div className="text-xs text-gemini-muted">
                                            Win: <span className="text-white">{session.conversionProbability}%</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {sessions.length === 0 && (
                                <p className="text-sm text-gemini-muted italic">No recent sessions.</p>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

// Sub-components for cleaner code
const KpiCard = ({ title, value, icon, trend, color }: { title: string, value: string | number, icon: React.ReactNode, trend: 'up' | 'down' | 'flat', color: string }) => {
    const colorClasses: Record<string, string> = {
        amber: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
        blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        emerald: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    };

    return (
        <div className="glass-card p-4 rounded-xl flex flex-col justify-between hover:bg-white/5 transition-colors">
            <div className="flex justify-between items-start mb-2">
                <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
                    {icon}
                </div>
                {/* Removed trend percentage for simplicity as requested, just showing icon if needed or keeping it simple */}
            </div>
            <div>
                <div className="text-2xl font-bold text-white">{value}</div>
                <div className="text-xs text-gemini-muted uppercase tracking-wider font-medium">{title}</div>
            </div>
        </div>
    );
};

const QualityMetric = ({ label, value, subValue, status }: { label: string, value: string, subValue: string, status: 'good' | 'warning' }) => (
    <div className="flex items-center justify-between p-3 bg-gemini-dark/50 rounded-lg border border-gemini-highlight/30">
        <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${status === 'good' ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
            <span className="text-sm text-gemini-text">{label}</span>
        </div>
        <div className="text-right">
            <div className="text-sm font-bold text-white">{value}</div>
            <div className="text-[10px] text-gemini-muted">{subValue}</div>
        </div>
    </div>
);

export default DashboardView;
