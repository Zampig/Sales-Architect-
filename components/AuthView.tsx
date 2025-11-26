
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Shield, Mail, Lock, Loader2, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';

interface AuthViewProps {
  onAuthSuccess: () => void;
}

const AuthView: React.FC<AuthViewProps> = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        onAuthSuccess();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
          },
        });
        
        if (error) throw error;
        
        // If "Confirm Email" is disabled in Supabase, data.session will exist and we can auto-login
        if (data.session) {
          onAuthSuccess();
        } else {
          // If "Confirm Email" is enabled but user wants to skip visual check, 
          // or if session just isn't ready immediately, redirect to login view.
          setIsLogin(true);
          setSuccessMessage("Account created! Please sign in.");
          setPassword(''); // Clear password for security/UX
        }
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gemini-dark items-center justify-center p-4">
      
      {/* Background Ambient Glow */}
      <div className="absolute w-[800px] h-[800px] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md bg-gemini-card border border-gemini-highlight rounded-2xl shadow-2xl relative z-10 overflow-hidden animate-fade-in">
        
        {/* Header */}
        <div className="p-8 pb-6 text-center border-b border-gemini-highlight bg-gemini-dark/50">
          <div className="w-16 h-16 bg-gemini-card border border-gemini-highlight rounded-xl flex items-center justify-center mx-auto shadow-lg mb-4">
             <Shield className="w-8 h-8 text-gemini-blue" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Sales Architect</h1>
          <p className="text-gemini-muted text-sm">Sign in to access your coaching dashboard.</p>
        </div>

        {/* Form */}
        <div className="p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-200">{error}</p>
            </div>
          )}

          {successMessage && (
            <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-emerald-200">{successMessage}</p>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            
            {!isLogin && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-gemini-muted uppercase tracking-wider ml-1">Full Name</label>
                <div className="relative">
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="w-full bg-gemini-dark border border-gemini-highlight rounded-xl p-3 pl-10 text-white focus:border-gemini-blue focus:ring-1 focus:ring-gemini-blue outline-none transition-all"
                    placeholder="Alex Salesman"
                  />
                  <div className="absolute left-3 top-3.5 text-gemini-muted">
                    <Shield size={18} />
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-gemini-muted uppercase tracking-wider ml-1">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-gemini-dark border border-gemini-highlight rounded-xl p-3 pl-10 text-white focus:border-gemini-blue focus:ring-1 focus:ring-gemini-blue outline-none transition-all"
                  placeholder="alex@company.com"
                />
                <div className="absolute left-3 top-3.5 text-gemini-muted">
                  <Mail size={18} />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gemini-muted uppercase tracking-wider ml-1">Password</label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full bg-gemini-dark border border-gemini-highlight rounded-xl p-3 pl-10 text-white focus:border-gemini-blue focus:ring-1 focus:ring-gemini-blue outline-none transition-all"
                  placeholder="••••••••"
                />
                <div className="absolute left-3 top-3.5 text-gemini-muted">
                  <Lock size={18} />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 mt-4 bg-gemini-blue hover:bg-blue-600 text-white rounded-xl font-semibold transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  {isLogin ? 'Sign In' : 'Create Account'}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-gemini-muted text-sm">
              {isLogin ? "Don't have an account?" : "Already have an account?"}
              <button
                onClick={() => {
                   setIsLogin(!isLogin);
                   setError(null);
                   setSuccessMessage(null);
                }}
                className="ml-2 text-gemini-blue hover:text-white font-medium transition-colors"
              >
                {isLogin ? 'Sign Up' : 'Log In'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthView;
