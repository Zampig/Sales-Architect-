import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from './supabaseClient';
import ChatView from './components/ChatView';
import VoiceView from './components/VoiceView';
import UserProfileView from './components/UserProfile';
import WelcomeView from './components/WelcomeView';
import AuthView from './components/AuthView';
import AppLayout from './components/AppLayout';
import DashboardView from './components/DashboardView';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SalesSettings, UserProfile, TrainingMode, UserDocument } from './types';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'text' | 'voice' | 'profile' | 'welcome' | 'dashboard'>('welcome');

  // Session Management
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // Default Settings
  const [settings, setSettings] = useState<SalesSettings>({
    mode: 'strategy',
    persona: 'The Skeptic (Needs Proof)',
    intensity: 'normal'
  });

  // User Profile State
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: "",
    title: "",
    company: "",
    email: "",
    coachingStyle: "Direct",
    voicePreference: "Female"
  });

  // Documents
  const [documents, setDocuments] = useState<UserDocument[]>([]);

  // Load data when user is authenticated
  useEffect(() => {
    if (user) {
      fetchProfile(user.id);
      fetchDocuments(user.id);
    } else {
      // Reset state on logout
      setViewMode('welcome');
      setActiveSessionId(null);
      setDocuments([]);
    }
  }, [user]);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
      }

      if (data) {
        setUserProfile({
          name: data.full_name || '',
          title: data.title || '',
          company: data.company || '',
          email: data.email || '',
          coachingStyle: (data.coaching_style as any) || 'Direct',
          voicePreference: (data.voice_preference as any) || 'Female'
        });
      } else {
        // Fallback for new users
        setUserProfile(prev => ({ ...prev, email: user?.email || '' }));
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const fetchDocuments = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('user_documents')
        .select('*')
        .eq('user_id', userId);
      if (data) setDocuments(data);
    } catch (e) {
      console.error("Error fetching docs", e);
    }
  };

  const handleUpdateProfile = async (newProfile: UserProfile) => {
    // Optimistic Update
    setUserProfile(newProfile);

    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: newProfile.name,
          title: newProfile.title,
          company: newProfile.company,
          email: user.email, // Keep email synced with Auth
          coaching_style: newProfile.coachingStyle,
          voice_preference: newProfile.voicePreference
        });

      if (error) throw error;
    } catch (err) {
      console.error('Error updating profile:', err);
    }
  };

  const handleReset = () => {
    setIsSidebarOpen(false);
    // When resetting, we create a new session if we are in a mode
    if (viewMode !== 'welcome' && viewMode !== 'profile') {
      createNewSession(settings.mode);
    }
  };

  const handleOpenProfile = () => {
    if (user) fetchDocuments(user.id); // Refresh docs when opening profile
    setViewMode('profile');
    setIsSidebarOpen(false);
  };

  const handleOpenDashboard = () => {
    setViewMode('dashboard');
    setIsSidebarOpen(false);
  };

  const handleSignOut = async () => {
    setIsSidebarOpen(false);
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    }

    // Force immediate state reset to ensure UI updates
    setViewMode('welcome');
    setActiveSessionId(null);
    setDocuments([]);
    setUserProfile({
      name: "",
      title: "",
      company: "",
      email: "",
      coachingStyle: "Direct",
      voicePreference: "Female"
    });
    setSettings({
      mode: 'strategy',
      persona: 'The Skeptic (Needs Proof)',
      intensity: 'normal'
    });
  };

  const createNewSession = async (mode: TrainingMode) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('sessions')
        .insert({
          user_id: user.id,
          mode: mode,
          persona: mode === 'coaching' ? 'Sales Architect' : settings.persona
        })
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setActiveSessionId(data.id);
      }
    } catch (err) {
      console.error("Error creating session:", err);
    }
  };

  const handleModeSelect = async (mode: TrainingMode) => {
    setSettings(prev => ({ ...prev, mode }));

    await createNewSession(mode);

    if (mode === 'strategy') {
      setViewMode('text');
    } else {
      setViewMode('voice');
    }
  };

  const handleLoadSession = (sessionId: string, mode: TrainingMode, persona: string) => {
    setActiveSessionId(sessionId);
    setSettings(prev => ({ ...prev, mode, persona }));
    // Always open in text mode to review history/transcript
    setViewMode('text');
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full bg-gemini-dark items-center justify-center text-gemini-blue">
        <Loader2 className="w-10 h-10 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <AuthView onAuthSuccess={() => { }} />;
  }

  // If in Welcome Mode, render the launcher screen full width
  if (viewMode === 'welcome') {
    return <WelcomeView onSelectMode={handleModeSelect} />;
  }

  return (
    <AppLayout
      isSidebarOpen={isSidebarOpen}
      onSidebarChange={setIsSidebarOpen}
      viewMode={viewMode}
      settings={settings}
      onSettingsChange={setSettings}
      onReset={handleReset}
      onOpenProfile={handleOpenProfile}
      onOpenDashboard={handleOpenDashboard}
      onSignOut={handleSignOut}
      onModeSelect={handleModeSelect}
    >
      {viewMode === 'text' ? (
        <ChatView
          settings={settings}
          onSwitchToVoice={() => setViewMode('voice')}
          sessionId={activeSessionId}
          documents={documents}
        />
      ) : viewMode === 'voice' ? (
        <VoiceView
          settings={settings}
          onClose={() => setViewMode('text')}
          voicePreference={userProfile.voicePreference || 'Female'}
          sessionId={activeSessionId}
          documents={documents}
        />
      ) : viewMode === 'dashboard' ? (
        <DashboardView />
      ) : (
        <UserProfileView
          profile={userProfile}
          onUpdateProfile={handleUpdateProfile}
          onClose={() => setViewMode('text')}
          onLoadSession={handleLoadSession}
        />
      )}
    </AppLayout>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;