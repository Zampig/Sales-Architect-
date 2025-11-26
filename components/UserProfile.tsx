
import React, { useState, useEffect, useRef } from 'react';
import { User, Save, Clock, Trophy, Target, Settings, X, Calendar, Activity, Mic, Loader2, FileText, Upload, Trash2, AlertCircle, LayoutDashboard, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import { UserProfile, SessionHistoryItem, TrainingMode, UserDocument } from '../types';
import { supabase } from '../supabaseClient';
import { extractTextFromPdf } from '../utils/pdfUtils';

interface UserProfileProps {
  profile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => Promise<void> | void;
  onClose: () => void;
  onLoadSession: (sessionId: string, mode: TrainingMode, persona: string) => void;
}

const UserProfileView: React.FC<UserProfileProps> = ({ profile, onUpdateProfile, onClose, onLoadSession }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'details' | 'knowledge' | 'history'>('dashboard');
  const [formData, setFormData] = useState<UserProfile>(profile);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // History & Stats State
  const [history, setHistory] = useState<SessionHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [stats, setStats] = useState({
      totalSessions: 0,
      avgEngagement: 0,
      avgWinRate: 0,
      objectionsCrushed: 0,
      trend: 'neutral' as 'up' | 'down' | 'neutral',
      graphData: [] as number[]
  });

  // Documents State
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch data immediately on mount to populate dashboard
  useEffect(() => {
    fetchHistory();
    fetchDocuments();
  }, []);

  const fetchHistory = async () => {
      setLoadingHistory(true);
      try {
          const { data, error } = await supabase
            .from('sessions')
            .select(`
                *,
                session_metrics (
                    engagement_score,
                    objections_handled,
                    conversion_probability,
                    feedback
                )
            `)
            .order('created_at', { ascending: false });
            
          if (error) throw error;
          
          if (data) {
              const mapped: SessionHistoryItem[] = data.map(item => {
                  const metricsData = item.session_metrics && item.session_metrics[0];
                  
                  return {
                    id: item.id,
                    date: item.created_at,
                    mode: item.mode as TrainingMode,
                    persona: item.persona,
                    duration: '15 min', // Placeholder or calc from start/end
                    metrics: metricsData ? {
                        engagementScore: metricsData.engagement_score,
                        objectionsHandled: metricsData.objections_handled,
                        conversionProbability: metricsData.conversion_probability,
                        feedback: metricsData.feedback
                    } : undefined
                  };
              });
              setHistory(mapped);
              calculateStats(mapped);
          }
      } catch (e) {
          console.error("Error fetching history", e);
      } finally {
          setLoadingHistory(false);
      }
  };

  const calculateStats = (items: SessionHistoryItem[]) => {
      // Filter for sessions that actually have scores (Voice sessions)
      const ratedSessions = items.filter(i => i.metrics).reverse(); // Reverse to get chronological order for graph
      
      if (ratedSessions.length === 0) return;

      const totalEng = ratedSessions.reduce((acc, curr) => acc + (curr.metrics?.engagementScore || 0), 0);
      const totalWin = ratedSessions.reduce((acc, curr) => acc + (curr.metrics?.conversionProbability || 0), 0);
      const totalObjs = ratedSessions.reduce((acc, curr) => acc + (curr.metrics?.objectionsHandled || 0), 0);

      // Graph Data: Last 10 sessions engagement scores
      const graphData = ratedSessions.slice(-10).map(s => s.metrics?.engagementScore || 0);

      // Trend Calculation: Compare average of last 3 vs previous 3
      let trend: 'up' | 'down' | 'neutral' = 'neutral';
      if (ratedSessions.length >= 2) {
          const recentSessions = ratedSessions.slice(-3);
          const oldSessions = ratedSessions.slice(-6, -3);
          
          if (oldSessions.length > 0) {
             const recentAvg = recentSessions.reduce((sum, i) => sum + (i.metrics?.engagementScore || 0), 0) / recentSessions.length;
             const oldAvg = oldSessions.reduce((sum, i) => sum + (i.metrics?.engagementScore || 0), 0) / oldSessions.length;
             
             if (recentAvg > oldAvg) trend = 'up';
             else if (recentAvg < oldAvg) trend = 'down';
          }
      }

      setStats({
          totalSessions: items.length,
          avgEngagement: Math.round(totalEng / ratedSessions.length),
          avgWinRate: Math.round(totalWin / ratedSessions.length),
          objectionsCrushed: totalObjs,
          trend,
          graphData
      });
  };

  const fetchDocuments = async () => {
      try {
          const { data, error } = await supabase
              .from('user_documents')
              .select('*')
              .order('created_at', { ascending: false });
              
          if (error) throw error;
          setDocuments(data || []);
      } catch (error) {
          console.error("Error fetching documents:", error);
      }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      if (file.type !== 'application/pdf') {
          setUploadError("Only PDF files are supported.");
          return;
      }

      if (file.size > 5 * 1024 * 1024) { // 5MB limit
          setUploadError("File size must be under 5MB.");
          return;
      }

      setIsUploading(true);
      setUploadError(null);

      try {
          const textContent = await extractTextFromPdf(file);
          if (textContent.length < 50) throw new Error("Could not extract enough text. File might be scanned image.");

          const { data: userData } = await supabase.auth.getUser();
          if (!userData.user) throw new Error("Not authenticated");

          const { error } = await supabase.from('user_documents').insert({
              user_id: userData.user.id,
              filename: file.name,
              content: textContent
          });

          if (error) throw error;
          await fetchDocuments();
          
      } catch (err: any) {
          console.error("Upload failed", err);
          setUploadError(err.message || "Failed to upload document.");
      } finally {
          setIsUploading(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };

  const handleDeleteDocument = async (id: string) => {
      try {
          const { error } = await supabase.from('user_documents').delete().eq('id', id);
          if (error) throw error;
          setDocuments(prev => prev.filter(d => d.id !== id));
      } catch (err) {
          console.error("Delete failed", err);
      }
  };

  const handleSave = async () => {
    setIsSaving(true);
    await onUpdateProfile(formData);
    setIsSaving(false);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  // Simple SVG Line Chart Component
  const TrendGraph = ({ data }: { data: number[] }) => {
     if (data.length < 2) return (
         <div className="h-full flex items-center justify-center text-gemini-muted text-xs italic">
             Complete more sessions to see trend line
         </div>
     );

     const height = 60;
     const width = 200;
     const max = 100;
     const points = data.map((val, i) => {
         const x = (i / (data.length - 1)) * width;
         const y = height - (val / max) * height;
         return `${x},${y}`;
     }).join(' ');

     return (
         <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
             <polyline 
                points={points} 
                fill="none" 
                stroke="#3B82F6" 
                strokeWidth="2" 
                vectorEffect="non-scaling-stroke"
             />
             <defs>
                <linearGradient id="gradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
                </linearGradient>
             </defs>
             <polygon points={`0,${height} ${points} ${width},${height}`} fill="url(#gradient)" />
         </svg>
     );
  };

  return (
    <div className="flex flex-col h-full bg-gemini-dark animate-fade-in relative overflow-hidden">
      
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gemini-highlight bg-gemini-dark z-10">
        <div>
          <h1 className="text-2xl font-bold text-gemini-text flex items-center gap-3">
            <User className="text-gemini-blue" size={28} />
            {profile.name ? `${profile.name}'s Dashboard` : 'User Profile'}
          </h1>
          <p className="text-gemini-muted text-sm mt-1">{profile.title} {profile.company ? `at ${profile.company}` : ''}</p>
        </div>
        <button 
          onClick={onClose}
          className="p-2 hover:bg-gemini-highlight rounded-full transition-colors text-gemini-muted hover:text-white"
        >
          <X size={24} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gemini-highlight px-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'dashboard' 
              ? 'border-gemini-blue text-gemini-blue' 
              : 'border-transparent text-gemini-muted hover:text-gemini-text'
          }`}
        >
          <LayoutDashboard size={16} />
          Dashboard
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'history' 
              ? 'border-gemini-blue text-gemini-blue' 
              : 'border-transparent text-gemini-muted hover:text-gemini-text'
          }`}
        >
          <Clock size={16} />
          Full History
        </button>
        <button
          onClick={() => setActiveTab('knowledge')}
          className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'knowledge' 
              ? 'border-gemini-blue text-gemini-blue' 
              : 'border-transparent text-gemini-muted hover:text-gemini-text'
          }`}
        >
          <FileText size={16} />
          Knowledge Base
        </button>
        <button
          onClick={() => setActiveTab('details')}
          className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'details' 
              ? 'border-gemini-blue text-gemini-blue' 
              : 'border-transparent text-gemini-muted hover:text-gemini-text'
          }`}
        >
          <Settings size={16} />
          Settings
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto">
          
          {activeTab === 'dashboard' && (
              <div className="space-y-8 animate-fade-in">
                  {/* KPI Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-gemini-card border border-gemini-highlight rounded-2xl p-6 flex flex-col justify-between h-40 relative overflow-hidden group shadow-lg">
                          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                              <Activity size={64} className="text-gemini-blue" />
                          </div>
                          <div className="flex justify-between items-start z-10">
                              <span className="text-xs font-bold text-gemini-muted uppercase tracking-wider">Avg. Engagement</span>
                              {stats.trend === 'up' && <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-full flex items-center"><TrendingUp size={12} className="mr-1" /> Improving</span>}
                              {stats.trend === 'down' && <span className="text-xs bg-red-500/10 text-red-400 px-2 py-1 rounded-full flex items-center"><TrendingDown size={12} className="mr-1" /> Declining</span>}
                          </div>
                          
                          <div className="flex items-end justify-between z-10 mt-2">
                             <span className="text-5xl font-light text-white">{stats.avgEngagement}%</span>
                             <div className="h-12 w-24">
                                 <TrendGraph data={stats.graphData} />
                             </div>
                          </div>
                      </div>

                      <div className="bg-gemini-card border border-gemini-highlight rounded-2xl p-6 flex flex-col justify-between h-40 relative overflow-hidden group shadow-lg">
                          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                              <Trophy size={64} className="text-purple-500" />
                          </div>
                          <span className="text-xs font-bold text-gemini-muted uppercase tracking-wider">Avg. Win Rate</span>
                          <div className="mt-4">
                              <span className="text-5xl font-light text-white">{stats.avgWinRate}%</span>
                              <div className="w-full bg-gemini-dark h-1.5 rounded-full mt-2 overflow-hidden">
                                  <div className="h-full bg-purple-500" style={{width: `${stats.avgWinRate}%`}}></div>
                              </div>
                          </div>
                      </div>

                      <div className="bg-gemini-card border border-gemini-highlight rounded-2xl p-6 flex flex-col justify-between h-40 relative overflow-hidden group shadow-lg">
                          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                              <Target size={64} className="text-gemini-cyan" />
                          </div>
                          <span className="text-xs font-bold text-gemini-muted uppercase tracking-wider">Objections Crushed</span>
                          <span className="text-5xl font-light text-white">{stats.objectionsCrushed}</span>
                          <p className="text-xs text-gemini-muted mt-1">Total objections successfully handled across all sessions</p>
                      </div>
                  </div>

                  {/* Recent Activity Section */}
                  <div>
                      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                          <Clock size={20} className="text-gemini-blue" />
                          Recent Sessions
                      </h3>
                      <div className="space-y-4">
                          {loadingHistory ? (
                             <div className="text-center py-10"><Loader2 className="animate-spin mx-auto text-gemini-blue" /></div>
                          ) : history.length === 0 ? (
                             <div className="bg-gemini-card/50 border border-dashed border-gemini-highlight rounded-xl p-8 text-center">
                                 <p className="text-gemini-muted mb-4">No sessions yet.</p>
                                 <button onClick={onClose} className="px-4 py-2 bg-gemini-blue text-white rounded-lg text-sm hover:bg-blue-600 transition-colors">Start your first roleplay</button>
                             </div>
                          ) : (
                             history.slice(0, 3).map(session => (
                                 <div 
                                    key={session.id} 
                                    onClick={() => {
                                        onLoadSession(session.id, session.mode, session.persona);
                                        onClose();
                                    }}
                                    className="bg-gemini-card border border-gemini-highlight rounded-xl p-5 hover:border-gemini-blue/50 transition-all cursor-pointer group"
                                 >
                                     <div className="flex justify-between items-start">
                                         <div>
                                             <div className="flex items-center gap-2 mb-2">
                                                 <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${
                                                     session.mode === 'strategy' ? 'bg-purple-500/10 border-purple-500/30 text-purple-300' :
                                                     session.mode === 'coaching' ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' :
                                                     'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                                                 }`}>{session.mode}</span>
                                                 <span className="text-xs text-gemini-muted">{new Date(session.date).toLocaleDateString()}</span>
                                             </div>
                                             <h4 className="font-medium text-white group-hover:text-gemini-blue transition-colors">{session.persona}</h4>
                                         </div>
                                         <ArrowRight className="text-gemini-muted group-hover:text-white opacity-0 group-hover:opacity-100 transition-all" size={20} />
                                     </div>
                                     
                                     {session.metrics && (
                                         <div className="mt-4 pt-4 border-t border-gemini-highlight grid grid-cols-2 gap-4">
                                             <div>
                                                 <div className="flex justify-between text-xs mb-1">
                                                     <span className="text-gemini-muted">Engagement</span>
                                                     <span className="text-white">{session.metrics.engagementScore}%</span>
                                                 </div>
                                                 <div className="h-1.5 w-full bg-gemini-dark rounded-full overflow-hidden">
                                                     <div className="h-full bg-gemini-blue rounded-full" style={{width: `${session.metrics.engagementScore}%`}}></div>
                                                 </div>
                                             </div>
                                             <div>
                                                 <div className="flex justify-between text-xs mb-1">
                                                     <span className="text-gemini-muted">Win Prob</span>
                                                     <span className="text-white">{session.metrics.conversionProbability}%</span>
                                                 </div>
                                                 <div className="h-1.5 w-full bg-gemini-dark rounded-full overflow-hidden">
                                                     <div className="h-full bg-purple-500 rounded-full" style={{width: `${session.metrics.conversionProbability}%`}}></div>
                                                 </div>
                                             </div>
                                         </div>
                                     )}
                                 </div>
                             ))
                          )}
                      </div>
                  </div>
              </div>
          )}

          {activeTab === 'details' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
              {/* Personal Info Card */}
              <div className="bg-gemini-card rounded-2xl p-6 border border-gemini-highlight shadow-md">
                <h3 className="text-lg font-semibold text-gemini-text mb-6 flex items-center gap-2">
                  <User size={20} className="text-purple-400" />
                  Personal Details
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gemini-muted uppercase tracking-wider mb-2">Full Name</label>
                    <input 
                      type="text" 
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full bg-gemini-card border border-gemini-highlight rounded-lg p-3 text-gemini-text focus:border-gemini-blue focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gemini-muted uppercase tracking-wider mb-2">Job Title</label>
                    <input 
                      type="text" 
                      value={formData.title}
                      onChange={e => setFormData({...formData, title: e.target.value})}
                      className="w-full bg-gemini-card border border-gemini-highlight rounded-lg p-3 text-gemini-text focus:border-gemini-blue focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gemini-muted uppercase tracking-wider mb-2">Company</label>
                    <input 
                      type="text" 
                      value={formData.company}
                      onChange={e => setFormData({...formData, company: e.target.value})}
                      className="w-full bg-gemini-card border border-gemini-highlight rounded-lg p-3 text-gemini-text focus:border-gemini-blue focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gemini-muted uppercase tracking-wider mb-2">Email</label>
                    <input 
                      type="email" 
                      value={formData.email}
                      disabled
                      className="w-full bg-gemini-dark/50 border border-gemini-highlight rounded-lg p-3 text-gemini-muted cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* Preferences Card */}
              <div className="bg-gemini-card rounded-2xl p-6 border border-gemini-highlight shadow-md flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gemini-text mb-6 flex items-center gap-2">
                    <Target size={20} className="text-gemini-cyan" />
                    Coaching Preferences
                  </h3>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-xs font-bold text-gemini-muted uppercase tracking-wider mb-3">AI Coaching Style</label>
                      <div className="grid grid-cols-1 gap-3">
                        {(['Direct', 'Encouraging', 'Socratic'] as const).map(style => (
                          <button
                            key={style}
                            onClick={() => setFormData({...formData, coachingStyle: style})}
                            className={`p-4 rounded-xl border text-left transition-all ${
                              formData.coachingStyle === style
                                ? 'bg-blue-600/10 border-blue-500 text-gemini-text shadow-sm'
                                : 'bg-gemini-dark border-gemini-highlight text-gemini-muted hover:border-gemini-muted hover:text-gemini-text'
                            }`}
                          >
                            <div className="font-semibold text-sm mb-1">{style}</div>
                            <div className="text-xs opacity-80">
                              {style === 'Direct' && 'Concise, blunt feedback focused on results.'}
                              {style === 'Encouraging' && 'Supportive tone focusing on strengths first.'}
                              {style === 'Socratic' && 'Asks questions to help you find the answer.'}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gemini-highlight">
                       <label className="block text-xs font-bold text-gemini-muted uppercase tracking-wider mb-3">Voice Preference</label>
                       <div className="flex gap-4">
                          <button
                            onClick={() => setFormData({...formData, voicePreference: 'Female'})}
                            className={`flex-1 p-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${
                              formData.voicePreference === 'Female' || !formData.voicePreference
                                ? 'bg-gemini-blue/10 border-gemini-blue text-gemini-text shadow-sm'
                                : 'bg-gemini-dark border-gemini-highlight text-gemini-muted hover:text-white'
                            }`}
                          >
                             <Mic size={16} /> Female (Zephyr)
                          </button>
                          <button
                            onClick={() => setFormData({...formData, voicePreference: 'Male'})}
                            className={`flex-1 p-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${
                              formData.voicePreference === 'Male'
                                ? 'bg-gemini-blue/10 border-gemini-blue text-gemini-text shadow-sm'
                                : 'bg-gemini-dark border-gemini-highlight text-gemini-muted hover:text-white'
                            }`}
                          >
                             <Mic size={16} /> Male (Fenrir)
                          </button>
                       </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-gemini-highlight">
                  <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="w-full py-3 bg-gemini-blue hover:bg-blue-600 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-blue-500/25 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? (
                         <>
                            <Loader2 size={18} className="animate-spin" />
                            Saving...
                         </>
                    ) : isSaved ? (
                         <span className="text-white">Changes Saved!</span> 
                    ) : (
                        <>
                            <Save size={18} />
                            Save Profile
                        </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'knowledge' && (
              <div className="space-y-6 animate-fade-in">
                  <div className="bg-gemini-card rounded-2xl p-8 border border-gemini-highlight text-center">
                      <div className="w-16 h-16 bg-gemini-dark rounded-full flex items-center justify-center mx-auto mb-4 border border-gemini-highlight">
                          <FileText size={32} className="text-gemini-blue" />
                      </div>
                      <h3 className="text-xl font-semibold text-white mb-2">Company Knowledge Base</h3>
                      <p className="text-gemini-muted max-w-lg mx-auto mb-8">
                          Upload PDF documents about your company, products, and pricing. 
                          The Sales Architect will read these and customize the roleplay to your specific offer.
                      </p>
                      
                      {uploadError && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3 max-w-md mx-auto text-left">
                          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                          <p className="text-sm text-red-200">{uploadError}</p>
                        </div>
                      )}

                      <div className="flex justify-center">
                          <input 
                            type="file" 
                            accept="application/pdf" 
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            className="hidden"
                            id="pdf-upload"
                          />
                          <label 
                            htmlFor="pdf-upload"
                            className={`px-6 py-3 rounded-xl font-medium cursor-pointer transition-all flex items-center gap-2 ${
                                isUploading 
                                ? 'bg-gemini-highlight text-gemini-muted cursor-not-allowed'
                                : 'bg-gemini-blue hover:bg-blue-600 text-white shadow-lg hover:shadow-blue-500/25'
                            }`}
                          >
                             {isUploading ? <Loader2 className="animate-spin" /> : <Upload size={18} />}
                             {isUploading ? 'Processing PDF...' : 'Upload PDF Document'}
                          </label>
                      </div>
                      <p className="text-xs text-gemini-muted mt-4">Max 5MB • Text-based PDFs only</p>
                  </div>

                  <div className="space-y-4">
                      <h4 className="text-xs font-bold text-gemini-muted uppercase tracking-wider pl-1">Uploaded Documents ({documents.length})</h4>
                      
                      {documents.length === 0 ? (
                          <div className="text-center py-10 bg-gemini-card/50 rounded-xl border border-dashed border-gemini-highlight">
                              <p className="text-gemini-muted text-sm">No documents uploaded yet.</p>
                          </div>
                      ) : (
                          documents.map(doc => (
                              <div key={doc.id} className="flex items-center justify-between p-4 bg-gemini-card border border-gemini-highlight rounded-xl group hover:border-gemini-blue/50 transition-colors">
                                  <div className="flex items-center gap-4">
                                      <div className="p-2 bg-red-500/10 rounded-lg text-red-400">
                                          <FileText size={20} />
                                      </div>
                                      <div>
                                          <h4 className="font-medium text-gemini-text">{doc.filename}</h4>
                                          <p className="text-xs text-gemini-muted">Uploaded {new Date(doc.created_at).toLocaleDateString()}</p>
                                      </div>
                                  </div>
                                  <button 
                                    onClick={() => handleDeleteDocument(doc.id)}
                                    className="p-2 text-gemini-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                    title="Delete Document"
                                  >
                                      <Trash2 size={18} />
                                  </button>
                              </div>
                          ))
                      )}
                  </div>
              </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-6 animate-fade-in">
              {loadingHistory ? (
                  <div className="text-center py-20 text-gemini-blue">
                      <Loader2 size={32} className="mx-auto animate-spin mb-4" />
                      <p>Loading sessions...</p>
                  </div>
              ) : history.length === 0 ? (
                <div className="text-center py-20 text-gemini-muted">
                    <Clock size={48} className="mx-auto mb-4 opacity-20" />
                    <p>No sessions recorded yet.</p>
                </div>
              ) : (
                history.map((session) => (
                  <button 
                    key={session.id} 
                    onClick={() => {
                        onLoadSession(session.id, session.mode, session.persona);
                        onClose();
                    }}
                    className="w-full text-left bg-gemini-card border border-gemini-highlight rounded-xl p-6 transition-all hover:border-gemini-blue/50 hover:shadow-lg group relative"
                  >
                    <div className="flex flex-col md:flex-row justify-between md:items-start gap-4 mb-4">
                      <div className="flex-1 w-full">
                        <div className="flex items-center gap-3 mb-2">
                           <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${
                               session.mode === 'strategy' 
                                ? 'bg-purple-500/10 border-purple-500/30 text-purple-300'
                                : session.mode === 'coaching'
                                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                                : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                           }`}>
                                {session.mode}
                           </span>
                           <span className="text-xs text-gemini-muted flex items-center gap-1">
                               <Calendar size={12} />
                               {new Date(session.date).toLocaleDateString()}
                           </span>
                        </div>
                        <h3 className="text-lg font-semibold text-gemini-text group-hover:text-gemini-blue transition-colors">
                            {session.persona}
                        </h3>
                        
                        {/* Enhanced Metrics Display for Full History */}
                        {session.metrics ? (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 w-full">
                                <div className="bg-gemini-dark p-3 rounded-lg border border-gemini-highlight">
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-gemini-muted">Engagement</span>
                                        <span className="text-white font-bold">{session.metrics.engagementScore}%</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-gemini-blue rounded-full" style={{width: `${session.metrics.engagementScore}%`}}></div>
                                    </div>
                                </div>
                                <div className="bg-gemini-dark p-3 rounded-lg border border-gemini-highlight">
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-gemini-muted">Win Prob</span>
                                        <span className="text-white font-bold">{session.metrics.conversionProbability}%</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-purple-500 rounded-full" style={{width: `${session.metrics.conversionProbability}%`}}></div>
                                    </div>
                                </div>
                                <div className="bg-gemini-dark p-3 rounded-lg border border-gemini-highlight flex items-center justify-between">
                                    <span className="text-xs text-gemini-muted">Objections</span>
                                    <span className="text-sm text-emerald-400 font-bold">{session.metrics.objectionsHandled}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="mt-3 text-sm text-gemini-muted italic">Text-based coaching session</div>
                        )}
                      </div>
                      
                      <div className="text-gemini-blue opacity-0 group-hover:opacity-100 transition-opacity text-sm font-medium whitespace-nowrap self-center md:self-center">
                          Resume Chat →
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfileView;
