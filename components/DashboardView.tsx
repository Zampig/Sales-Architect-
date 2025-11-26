import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar, Cell, PieChart, Pie } from 'recharts';
import { Activity, Trophy, TrendingUp, Calendar, AlertCircle, ArrowUpRight, Target, Zap, MessageSquare, Clock, Mic, Brain, ChevronRight, Play, BookOpen, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { SessionMetrics, ExtendedDashboardMetrics } from '../types';
import { generateMockDashboardData } from '../utils/mockDashboardData';

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

    useEffect(() => {
        if (!user) return;
        fetchDashboardData();
    }, [user]);

    const fetchDashboardData = async () => {
        try {
            const { data, error } = await supabase
                .from('sessions')
                .select(`
          id, created_at, mode, persona,
          session_metrics (engagement_score, objections_handled, conversion_probability, feedback)
        `)
                .eq('user_id', user!.id)
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

                // Generate Extended Metrics (Mocked based on real aggregates)
                const total = processedSessions.length;
                const realAggregates = {
                    totalSessions: total,
                    avgEngagement: total ? Math.round(processedSessions.reduce((acc, s) => acc + s.engagementScore, 0) / total) : 0,
                    avgWinProb: total ? Math.round(processedSessions.reduce((acc, s) => acc + s.conversionProbability, 0) / total) : 0,
                    totalObjections: processedSessions.reduce((acc, s) => acc + s.objectionsHandled, 0)
                };

                setMetrics(generateMockDashboardData(realAggregates));
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading || !metrics) {
        return (
            <div className="flex items-center justify-center h-full text-gemini-blue animate-pulse">
                <div className="flex flex-col items-center gap-4">
                    <Activity className="w-10 h-10 animate-spin" />
                    <span className="text-lg font-medium">Loading Analytics...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-gemini-dark p-6 overflow-y-auto space-y-6 custom-scrollbar">

            {/* Header */}
            <div className="flex justify-between items-end border-b border-gemini-highlight/30 pb-4">
                <div>
                    <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                        Coach Performance
                    </h1>
                    <p className="text-gemini-muted mt-1 text-sm">Track your progress and master your sales skills.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setTimeRange('7d')}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${timeRange === '7d' ? 'bg-gemini-blue text-white' : 'bg-gemini-card text-gemini-muted hover:text-white'}`}
                    >
                        Last 7 Days
                    </button>
                    <button
                        onClick={() => setTimeRange('30d')}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${timeRange === '30d' ? 'bg-gemini-blue text-white' : 'bg-gemini-card text-gemini-muted hover:text-white'}`}
                    >
                        Last 30 Days
                    </button>
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
                    title="Practice Streak"
                    value={`${metrics.practiceStreakDays} Days`}
                    icon={<Calendar size={20} />}
                    trend="up"
                    color="emerald"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column - 2/3 Width */}
                <div className="lg:col-span-2 space-y-6">

                    {/* 6. Performance Trend */}
                    <div className="glass-card p-5 rounded-xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <TrendingUp size={18} className="text-blue-400" /> Performance Trend
                            </h3>
                        </div>
                        <div className="h-[250px] w-full">
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
                        </div>
                    </div>

                    {/* 3. Skill Breakdown */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {metrics.skills.map((skill, idx) => (
                            <div key={idx} className="glass-card p-4 rounded-xl hover:border-blue-500/30 transition-colors group">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="font-semibold text-white">{skill.name}</span>
                                    <span className={`text-xs font-bold px-2 py-1 rounded-md ${skill.score >= 80 ? 'bg-emerald-500/10 text-emerald-400' :
                                            skill.score >= 60 ? 'bg-amber-500/10 text-amber-400' :
                                                'bg-red-500/10 text-red-400'
                                        }`}>
                                        {skill.score}
                                    </span>
                                </div>
                                <div className="w-full bg-gemini-dark h-1.5 rounded-full mb-3 overflow-hidden">
                                    <div
                                        className={`h-full rounded-full ${skill.score >= 80 ? 'bg-emerald-500' :
                                                skill.score >= 60 ? 'bg-amber-500' :
                                                    'bg-red-500'
                                            }`}
                                        style={{ width: `${skill.score}%` }}
                                    ></div>
                                </div>
                                <p className="text-xs text-gemini-muted mb-3 line-clamp-1">{skill.description}</p>
                                <button className="text-xs font-medium text-blue-400 hover:text-blue-300 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    Practice this skill <ChevronRight size={12} />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* 4. Objection Handling Zone */}
                    <div className="glass-card p-5 rounded-xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <AlertCircle size={18} className="text-red-400" /> Objection Handling
                            </h3>
                            <button className="text-xs bg-red-500/10 text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-500/20 transition-colors font-medium">
                                Start Objection Drill
                            </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {metrics.objections.map((obj, idx) => (
                                <div key={idx} className="bg-gemini-dark/50 p-3 rounded-lg border border-gemini-highlight/30 flex justify-between items-center">
                                    <div>
                                        <div className="font-medium text-sm text-white">{obj.type}</div>
                                        <div className="text-xs text-gemini-muted mt-0.5">{obj.count} attempts • {obj.avgResponseTimeMs / 1000}s avg pace</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-lg font-bold text-white">{obj.successRate}%</div>
                                        <div className="text-[10px] text-gemini-muted uppercase">Success</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 5. Engagement & Sentiment */}
                    <div className="glass-card p-5 rounded-xl">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                            <Brain size={18} className="text-purple-400" /> Buyer Sentiment Flow
                        </h3>
                        <div className="h-[150px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={metrics.sentiment.timeline}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} opacity={0.3} />
                                    <XAxis dataKey="trigger" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} interval={0} />
                                    <YAxis domain={[0, 100]} hide />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                                        itemStyle={{ color: '#e2e8f0' }}
                                    />
                                    <Line type="monotone" dataKey="score" stroke="#a855f7" strokeWidth={3} dot={{ r: 4, fill: '#a855f7' }} activeDot={{ r: 6 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex justify-between mt-2 text-xs text-gemini-muted px-2">
                            <span>Start: <span className="text-white font-bold">{metrics.sentiment.start}%</span></span>
                            <span>End: <span className="text-white font-bold">{metrics.sentiment.end}%</span></span>
                        </div>
                    </div>

                </div>

                {/* Right Column - 1/3 Width */}
                <div className="space-y-6">

                    {/* 10. Next Best Actions */}
                    <div className="glass-panel p-5 rounded-xl border-l-4 border-l-blue-500">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <Zap size={18} className="text-yellow-400" /> Next Best Actions
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

                    {/* 2. Conversation Quality */}
                    <div className="glass-card p-5 rounded-xl">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <MessageSquare size={18} className="text-cyan-400" /> Conversation Quality
                        </h3>
                        <div className="space-y-4">
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

                    {/* 7. Recent Coaching Feedback */}
                    <div className="glass-card p-5 rounded-xl">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <Brain size={18} className="text-pink-400" /> Recent Feedback
                        </h3>
                        <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                            {metrics.recentFeedback.map((fb) => (
                                <div key={fb.id} className="bg-gemini-dark/50 p-3 rounded-lg border border-gemini-highlight/30">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-[10px] font-bold uppercase tracking-wider bg-gemini-highlight px-1.5 py-0.5 rounded text-gemini-muted">{fb.tag}</span>
                                        <span className="text-[10px] text-gemini-muted">{fb.date}</span>
                                    </div>
                                    <p className="text-xs text-gray-300 mb-2 leading-relaxed">"{fb.feedback}"</p>
                                    <div className="flex items-center gap-1 text-emerald-400 text-xs font-medium">
                                        <ArrowUpRight size={12} /> {fb.impact}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 9. Product Knowledge */}
                    <div className="glass-card p-5 rounded-xl">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <BookOpen size={18} className="text-indigo-400" /> Knowledge Check
                        </h3>
                        <div className="mb-4">
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-gemini-muted">Accuracy Score</span>
                                <span className="text-white font-bold">{metrics.productKnowledge.accuracyScore}%</span>
                            </div>
                            <div className="w-full bg-gemini-dark h-2 rounded-full overflow-hidden">
                                <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${metrics.productKnowledge.accuracyScore}%` }}></div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex flex-wrap gap-1">
                                {metrics.productKnowledge.keywordsUsed.map(k => (
                                    <span key={k} className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-full flex items-center gap-1">
                                        <CheckCircle2 size={10} /> {k}
                                    </span>
                                ))}
                                {metrics.productKnowledge.keywordsMissed.map(k => (
                                    <span key={k} className="text-[10px] bg-red-500/10 text-red-400 px-2 py-1 rounded-full flex items-center gap-1">
                                        <XCircle size={10} /> {k}
                                    </span>
                                ))}
                            </div>
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
                {trend !== 'flat' && (
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 ${trend === 'up' ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'}`}>
                        {trend === 'up' ? '+' : '-'}{Math.floor(Math.random() * 10) + 1}%
                    </span>
                )}
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
