import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from 'recharts';
import { Activity, Trophy, TrendingUp, Calendar, AlertCircle, ArrowUpRight, Target, Zap, MessageSquare } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { SessionMetrics } from '../types';

interface DashboardMetrics {
    totalSessions: number;
    avgEngagement: number;
    avgWinProb: number;
    totalObjections: number;
}

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
    const [metrics, setMetrics] = useState<DashboardMetrics>({
        totalSessions: 0,
        avgEngagement: 0,
        avgWinProb: 0,
        totalObjections: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        fetchDashboardData();
    }, [user]);

    const fetchDashboardData = async () => {
        try {
            // Fetch sessions with metrics
            const { data, error } = await supabase
                .from('sessions')
                .select(`
          id,
          created_at,
          mode,
          persona,
          session_metrics (
            engagement_score,
            objections_handled,
            conversion_probability,
            feedback
          )
        `)
                .eq('user_id', user!.id)
                .order('created_at', { ascending: true });

            if (error) throw error;

            if (data) {
                // Process Data
                const processedSessions: SessionData[] = data
                    .filter(s => s.session_metrics && s.session_metrics.length > 0) // Only sessions with metrics
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

                // Calculate Aggregates
                if (processedSessions.length > 0) {
                    const total = processedSessions.length;
                    setMetrics({
                        totalSessions: total,
                        avgEngagement: Math.round(processedSessions.reduce((acc, s) => acc + s.engagementScore, 0) / total),
                        avgWinProb: Math.round(processedSessions.reduce((acc, s) => acc + s.conversionProbability, 0) / total),
                        totalObjections: processedSessions.reduce((acc, s) => acc + s.objectionsHandled, 0)
                    });
                }
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
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
        <div className="flex flex-col h-full bg-gemini-dark p-8 overflow-y-auto space-y-8 custom-scrollbar">

            {/* Header */}
            <div className="flex justify-between items-end border-b border-gemini-highlight/30 pb-6">
                <div>
                    <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                        Sales Intelligence
                    </h1>
                    <p className="text-gemini-muted mt-2 text-lg">Performance analytics and AI-driven coaching insights.</p>
                </div>
                <div className="text-right bg-gemini-card/50 p-4 rounded-xl border border-gemini-highlight/50 backdrop-blur-sm">
                    <div className="text-sm text-gemini-muted font-medium uppercase tracking-wider">Total Sessions</div>
                    <div className="text-3xl font-bold text-white">{metrics.totalSessions}</div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-card p-6 rounded-2xl relative overflow-hidden group hover:border-blue-500/50 transition-all duration-300">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Activity size={80} />
                    </div>
                    <div className="flex justify-between items-start mb-6 relative z-10">
                        <div className="p-3 bg-blue-500/20 rounded-xl text-blue-400 group-hover:scale-110 transition-transform">
                            <Zap size={24} />
                        </div>
                        <span className="text-sm font-medium text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-1 rounded-lg">
                            +5% <ArrowUpRight size={14} />
                        </span>
                    </div>
                    <div className="relative z-10">
                        <div className="text-4xl font-bold text-white mb-2">{metrics.avgEngagement}%</div>
                        <div className="text-sm text-gemini-muted uppercase tracking-wider font-medium">Avg Engagement</div>
                    </div>
                </div>

                <div className="glass-card p-6 rounded-2xl relative overflow-hidden group hover:border-purple-500/50 transition-all duration-300">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Trophy size={80} />
                    </div>
                    <div className="flex justify-between items-start mb-6 relative z-10">
                        <div className="p-3 bg-purple-500/20 rounded-xl text-purple-400 group-hover:scale-110 transition-transform">
                            <Target size={24} />
                        </div>
                        <span className="text-sm font-medium text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-1 rounded-lg">
                            +12% <ArrowUpRight size={14} />
                        </span>
                    </div>
                    <div className="relative z-10">
                        <div className="text-4xl font-bold text-white mb-2">{metrics.avgWinProb}%</div>
                        <div className="text-sm text-gemini-muted uppercase tracking-wider font-medium">Avg Win Probability</div>
                    </div>
                </div>

                <div className="glass-card p-6 rounded-2xl relative overflow-hidden group hover:border-emerald-500/50 transition-all duration-300">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <TrendingUp size={80} />
                    </div>
                    <div className="flex justify-between items-start mb-6 relative z-10">
                        <div className="p-3 bg-emerald-500/20 rounded-xl text-emerald-400 group-hover:scale-110 transition-transform">
                            <MessageSquare size={24} />
                        </div>
                    </div>
                    <div className="relative z-10">
                        <div className="text-4xl font-bold text-white mb-2">{metrics.totalObjections}</div>
                        <div className="text-sm text-gemini-muted uppercase tracking-wider font-medium">Objections Crushed</div>
                    </div>
                </div>
            </div>

            {/* Charts Area */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Performance Trend */}
                <div className="glass-card p-6 rounded-2xl">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-white">Performance Trend</h3>
                        <div className="flex gap-2">
                            <div className="flex items-center gap-2 text-xs text-gemini-muted">
                                <span className="w-3 h-3 rounded-full bg-blue-500"></span> Engagement
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gemini-muted">
                                <span className="w-3 h-3 rounded-full bg-purple-500"></span> Win Prob
                            </div>
                        </div>
                    </div>
                    <div className="h-[350px] w-full">
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
                                <XAxis
                                    dataKey="created_at"
                                    stroke="#94a3b8"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    dy={10}
                                />
                                <YAxis
                                    stroke="#94a3b8"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    dx={-10}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#1e293b',
                                        borderColor: '#334155',
                                        borderRadius: '12px',
                                        color: '#fff',
                                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                    }}
                                    itemStyle={{ color: '#fff' }}
                                    cursor={{ stroke: '#3b82f6', strokeWidth: 1, strokeDasharray: '5 5' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="engagementScore"
                                    name="Engagement"
                                    stroke="#3b82f6"
                                    fillOpacity={1}
                                    fill="url(#colorEngagement)"
                                    strokeWidth={3}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="conversionProbability"
                                    name="Win Prob"
                                    stroke="#a855f7"
                                    fillOpacity={1}
                                    fill="url(#colorWin)"
                                    strokeWidth={3}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Recent Feedback / Weakness Analysis */}
                <div className="glass-card p-6 rounded-2xl flex flex-col h-[454px]">
                    <h3 className="text-xl font-bold text-white mb-6">Recent Coaching Feedback</h3>
                    <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                        {sessions.slice().reverse().slice(0, 10).map((session) => (
                            <div key={session.id} className="p-4 bg-gemini-dark/40 rounded-xl border border-gemini-highlight/30 hover:bg-gemini-dark/60 transition-colors">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${session.mode === 'strategy'
                                                ? 'bg-blue-500/20 text-blue-400'
                                                : 'bg-purple-500/20 text-purple-400'
                                            }`}>
                                            {session.mode === 'strategy' ? 'STRATEGY' : 'ROLEPLAY'}
                                        </span>
                                        <span className="text-xs text-gemini-muted">{session.created_at}</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-xs font-medium text-emerald-400">
                                        <Trophy size={12} />
                                        {session.conversionProbability}% Win
                                    </div>
                                </div>
                                <p className="text-sm text-gray-300 leading-relaxed italic">"{session.feedback}"</p>
                            </div>
                        ))}
                        {sessions.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full text-gemini-muted opacity-60">
                                <MessageSquare size={48} className="mb-4" />
                                <p>No sessions recorded yet.</p>
                                <p className="text-sm">Start a roleplay to get feedback!</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

        </div>
    );
};

export default DashboardView;
