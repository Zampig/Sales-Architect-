import React from 'react';
import { MessageSquare, User, Headphones, ArrowRight, Shield } from 'lucide-react';
import { TrainingMode } from '../types';

interface WelcomeViewProps {
  onSelectMode: (mode: TrainingMode) => void;
}

const WelcomeView: React.FC<WelcomeViewProps> = ({ onSelectMode }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gemini-dark text-gemini-text p-6 relative overflow-hidden animate-fade-in">

      {/* Background Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-4xl w-full flex flex-col items-center text-center">

        {/* Logo / Header */}
        <div className="mb-12 space-y-6">
          <div className="w-20 h-20 bg-gemini-card border border-gemini-highlight rounded-2xl flex items-center justify-center mx-auto shadow-2xl shadow-blue-900/20">
            <Shield className="w-10 h-10 text-gemini-blue" />
          </div>
          <div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white mb-4">
              I am <span className="text-gemini-blue">Sales Architect</span>
            </h1>
            <p className="text-lg md:text-xl text-gemini-muted max-w-2xl mx-auto leading-relaxed">
              I hold all the knowledge of the Chris Jennings Group.
              <br />
              What would you like to do today?
            </p>
          </div>
        </div>

        {/* Action Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">

          {/* Card 1: Strategy Chat */}
          <button
            onClick={() => onSelectMode('strategy')}
            className="group relative flex flex-col items-start p-8 bg-gemini-card border border-gemini-highlight rounded-2xl hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 transition-all text-left h-full"
          >
            <div className="p-4 bg-blue-500/10 rounded-xl mb-6 group-hover:bg-blue-500 group-hover:text-white transition-colors text-blue-400">
              <MessageSquare size={28} />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Strategy Coach</h3>
            <p className="text-sm text-gemini-muted leading-relaxed mb-8 flex-1">
              Text-based advice, script critiques, and objection handling strategies.
            </p>
            <div className="flex items-center text-blue-400 text-sm font-medium group-hover:gap-2 transition-all">
              Start Chat <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 ml-1 transition-opacity" />
            </div>
          </button>

          {/* Card 2: Live Coaching */}
          <button
            onClick={() => onSelectMode('coaching')}
            className="group relative flex flex-col items-start p-8 bg-gemini-card border border-gemini-highlight rounded-2xl hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/10 transition-all text-left h-full"
          >
            <div className="p-4 bg-amber-500/10 rounded-xl mb-6 group-hover:bg-amber-500 group-hover:text-white transition-colors text-amber-400">
              <Headphones size={28} />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Live Coaching</h3>
            <p className="text-sm text-gemini-muted leading-relaxed mb-8 flex-1">
              Voice consultation with your mentor. Can also run dynamic roleplays on request.
            </p>
            <div className="flex items-center text-amber-400 text-sm font-medium group-hover:gap-2 transition-all">
              Talk to Coach <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 ml-1 transition-opacity" />
            </div>
          </button>

        </div>

        <div className="mt-16 text-xs text-gemini-muted opacity-50">
          Powered by Gemini 2.5 • Proprietary Knowledge Base
        </div>
      </div>
    </div>
  );
};

export default WelcomeView;