
import React from 'react';
import { Briefcase, User, X, Settings, Headphones, LogOut, LayoutDashboard } from 'lucide-react';
import { SalesSettings, TrainingMode, Intensity } from '../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SalesSettings;
  onSettingsChange: (newSettings: SalesSettings) => void;
  onReset: () => void;
  onOpenProfile: () => void;
  onOpenDashboard: () => void;
  onSignOut: () => void;
  onModeSelect: (mode: TrainingMode) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, settings, onSettingsChange, onReset, onOpenProfile, onOpenDashboard, onSignOut, onModeSelect }) => {
  const personas = [
    "The Skeptic (Needs Proof)",
    "The Budget Hawk (Price Focused)",
    "The Champion (Internal Advocate)",
    "The Executive (Big Picture)"
  ];

  return (
    <div className={`fixed inset-y-0 left-0 z-50 w-80 bg-gemini-dark border-r border-gemini-highlight transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>

      {/* Header - Fixed Height */}
      <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gemini-highlight">
        <div className="flex items-center gap-2 text-gemini-blue">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span className="font-bold text-xl tracking-wider text-white">ARCHITECT</span>
        </div>
        <button onClick={onClose} className="text-gemini-muted hover:text-white transition-colors">
          <X size={24} />
        </button>
      </div>

      {/* Scrollable Content Area - Takes remaining space */}
      <div className="flex-1 overflow-y-auto p-5 space-y-8">

        {/* Dashboard Section (Top Priority) */}
        <div>
          <h3 className="text-xs font-bold text-gemini-muted uppercase tracking-widest mb-4">Analytics</h3>
          <button
            onClick={onOpenDashboard}
            className="w-full p-4 rounded-lg bg-gemini-card hover:bg-gemini-highlight border border-transparent hover:border-gemini-highlight transition-all text-left flex items-center gap-3 text-gemini-text group"
          >
            <div className="p-2 bg-gemini-dark rounded-full border border-gemini-highlight group-hover:border-gemini-blue/50">
              <LayoutDashboard size={18} className="text-gemini-blue" />
            </div>
            <div>
              <div className="font-semibold text-sm group-hover:text-white">My Dashboard</div>
              <div className="text-xs opacity-70">View Performance Stats</div>
            </div>
          </button>
        </div>

        {/* Training Mode Section */}
        <div>
          <h3 className="text-xs font-bold text-gemini-muted uppercase tracking-widest mb-4">Training Mode</h3>
          <div className="space-y-3">
            <button
              onClick={() => onModeSelect('strategy')}
              className={`w-full p-4 rounded-lg border text-left flex items-center gap-3 transition-all ${settings.mode === 'strategy'
                ? 'bg-blue-600/10 border-blue-500 text-gemini-text'
                : 'bg-gemini-card border-transparent text-gemini-muted hover:border-gemini-highlight hover:text-gemini-text'
                }`}
            >
              <Briefcase size={20} className={settings.mode === 'strategy' ? 'text-blue-400' : ''} />
              <div>
                <div className="font-semibold text-sm">Strategy Coach</div>
                <div className="text-xs opacity-70">Critique & Advice</div>
              </div>
            </button>

            <button
              onClick={() => onModeSelect('coaching')}
              className={`w-full p-4 rounded-lg border text-left flex items-center gap-3 transition-all ${settings.mode === 'coaching'
                ? 'bg-amber-600/10 border-amber-500 text-gemini-text'
                : 'bg-gemini-card border-transparent text-gemini-muted hover:border-gemini-highlight hover:text-gemini-text'
                }`}
            >
              <Headphones size={20} className={settings.mode === 'coaching' ? 'text-amber-400' : ''} />
              <div>
                <div className="font-semibold text-sm">Live Coaching</div>
                <div className="text-xs opacity-70">Voice Consultation</div>
              </div>
            </button>
          </div>
        </div>

        {/* Account Section */}
        <div className="pb-4">
          <h3 className="text-xs font-bold text-gemini-muted uppercase tracking-widest mb-4">Account</h3>
          <div className="space-y-3">
            <button
              onClick={onOpenProfile}
              className="w-full p-4 rounded-lg bg-gemini-card hover:bg-gemini-highlight border border-transparent hover:border-gemini-highlight transition-all text-left flex items-center gap-3 text-gemini-text"
            >
              <div className="p-2 bg-gemini-dark rounded-full border border-gemini-highlight">
                <Settings size={18} className="text-gemini-text" />
              </div>
              <div>
                <div className="font-semibold text-sm">User Settings</div>
                <div className="text-xs opacity-70">Profile, History & Knowledge</div>
              </div>
            </button>

            <button
              onClick={onSignOut}
              className="w-full p-4 rounded-lg bg-gemini-card hover:bg-red-500/10 border border-transparent hover:border-red-500/30 transition-all text-left flex items-center gap-3 text-gemini-text group"
            >
              <div className="p-2 bg-gemini-dark rounded-full border border-gemini-highlight group-hover:border-red-500/30">
                <LogOut size={18} className="text-gemini-muted group-hover:text-red-400" />
              </div>
              <div>
                <div className="font-semibold text-sm group-hover:text-red-400">Sign Out</div>
                <div className="text-xs opacity-70">End session</div>
              </div>
            </button>
          </div>
        </div>

      </div>

      {/* Footer - Fixed Height */}
      <div className="flex-shrink-0 w-full p-4 border-t border-gemini-highlight bg-gemini-dark">
        <button
          onClick={onReset}
          className="w-full py-3 rounded-lg border border-gemini-highlight text-gemini-text hover:bg-gemini-highlight transition-colors flex items-center justify-center gap-2 text-sm font-medium">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Reset Session
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
