
import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, Shield, Headphones, Activity, Trophy, TrendingUp, AlertTriangle, Sparkles, MessageSquare } from 'lucide-react';
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { Message, SalesSettings, SessionMetrics, UserDocument } from '../types';
import { SALES_KNOWLEDGE_BASE } from '../utils/knowledgeBase';
import { supabase } from '../supabaseClient';

interface ChatViewProps {
  settings: SalesSettings;
  onSwitchToVoice: () => void;
  sessionId: string | null;
  documents: UserDocument[];
}

const UserIcon = () => (
  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const ChatView: React.FC<ChatViewProps> = ({ settings, onSwitchToVoice, sessionId, documents }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const [sessionMetrics, setSessionMetrics] = useState<SessionMetrics | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Ref to hold the Chat session instance to maintain context
  const chatSessionRef = useRef<Chat | null>(null);
  const recognitionRef = useRef<any>(null);

  // Load History & Metrics from DB
  useEffect(() => {
    if (!sessionId) {
      // If no session ID, revert to default welcome message
      setMessages([
        {
          id: 'init',
          role: 'model',
          text: "I am Sales Architect. Ready to close more deals? You can practice a pitch with me, ask for a script critique, or roleplay a tough negotiation. What's our focus today?",
          timestamp: new Date()
        }
      ]);
      setSessionMetrics(null);
      return;
    }

    const loadData = async () => {
      // 1. Fetch Messages
      const { data: msgData } = await supabase
        .from('messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (msgData && msgData.length > 0) {
        setMessages(msgData.map(m => ({
          id: m.id,
          role: m.role as 'user' | 'model',
          text: m.content,
          timestamp: new Date(m.created_at)
        })));
      } else {
        // New session
        setMessages([
          {
            id: 'init',
            role: 'model',
            text: "I am Sales Architect. Ready to close more deals? You can practice a pitch with me, ask for a script critique, or roleplay a tough negotiation. What's our focus today?",
            timestamp: new Date()
          }
        ]);
      }

      // 2. Fetch Metrics (if any)
      const { data: metricsData } = await supabase
        .from('session_metrics')
        .select('*')
        .eq('session_id', sessionId)
        .single();

      if (metricsData) {
        setSessionMetrics({
          engagementScore: metricsData.engagement_score,
          objectionsHandled: metricsData.objections_handled,
          conversionProbability: metricsData.conversion_probability,
          feedback: metricsData.feedback
        });
      } else {
        setSessionMetrics(null);
      }
    };

    loadData();
  }, [sessionId]);


  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(prev => {
          // Append with space if needed
          const spacer = prev && !prev.endsWith(' ') ? ' ' : '';
          return prev + spacer + transcript;
        });
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

      setIsSpeechSupported(true);
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.error("Error starting speech recognition:", e);
        setIsListening(false);
      }
    }
  };

  // Initialize or Reset chat when settings change significantly
  useEffect(() => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
      setConfigError("Missing Gemini API Key. Please set VITE_GEMINI_API_KEY in your Vercel Environment Variables.");
      return;
    }

    setConfigError(null);

    try {
      const ai = new GoogleGenAI({ apiKey });

      // Prepare User Context from Documents
      const userContext = documents.length > 0
        ? `\n*** USER PROVIDED COMPANY CONTEXT ***\nThe user has uploaded the following documents about their company/product. Use this information to tailor your advice and roleplay specifics.\n\n${documents.map(d => `--- Document: ${d.filename} ---\n${d.content}\n`).join('\n')}\n*************************************`
        : "";

      // Construct system instruction based on settings
      const systemInstruction = `
          You are Sales Architect, a world-class sales coach using a specific proprietary methodology.

          PRIMARY DIRECTIVES:
          1. STRICT GROUNDING: You MUST reference the "PROPRIETARY SALES METHODOLOGY" provided below to answer technical/theoretical questions. 
             - If the answer is in the text, use it.
             - If the specific concept is NOT in the text, say: "That specific concept is not detailed in our current proprietary training materials. Based on our framework, here is the closest related advice on [related topic]."
             - Do not invent external frameworks (like Sandler or Challenger) unless explicitly asked to compare.

          2. PERSONA: Highly experienced, results-oriented sales leader. Confident, practical, encouraging.
          
          3. FORMATTING (CRITICAL):
             - Use bullet points (•) for lists.
             - Use numbered lists (1.) for steps.
             - Use whitespace (double line breaks) to separate ideas.
             - NO MARKDOWN SYMBOLS: Do NOT use asterisks (**bold**) or hashtags (# headers). Keep text clean and plain.
             - Short paragraphs (max 3 sentences).

          CONTEXT:
          Current Mode: ${settings.mode === 'strategy' ? 'Strategy Coach' : 'Roleplay'}.
          Prospect Persona: ${settings.persona}.
          Intensity Level: ${settings.intensity}.

          *** PROPRIETARY SALES METHODOLOGY ***
          ${SALES_KNOWLEDGE_BASE}
          *************************************

          ${userContext}
          
          INSTRUCTIONS:
          1. If Mode is 'Strategy Coach': 
             - Act as the Mentor. 
             - When explaining a framework (like 'Be Useful Now'), use the definitions from the text above.
             - Always provide a concrete example.
          
          2. If Mode is 'Roleplay': 
             - ACT AS THE PROSPECT defined in the settings. 
             - Do not break character. 
             - React naturally to the user's attempt to use the frameworks above.
             - Use the User Provided Company Context to understand what the user is selling, but only reveal knowledge of it if the prospect would reasonably know it (e.g., price, public features).
        `;

      chatSessionRef.current = ai.chats.create({
        model: 'gemini-2.0-flash', // Upgraded to Flash 2.0
        config: {
          systemInstruction: systemInstruction,
        }
      });
    } catch (e) {
      console.error("Failed to initialize Gemini Client", e);
      setConfigError("Failed to initialize AI Client.");
    }

  }, [settings, documents]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping, sessionMetrics, configError]);

  const saveMessageToDb = async (role: 'user' | 'model', content: string) => {
    if (!sessionId) return;
    try {
      await supabase.from('messages').insert({
        session_id: sessionId,
        role,
        content
      });
    } catch (e) {
      console.error("Error saving message", e);
    }
  };

  const handleSend = async (textOverride?: string) => {
    const textToSend = textOverride || input;
    if (!textToSend.trim() || !chatSessionRef.current) return;

    const userMsg: Message = {
      id: Date.now().toString(), // Temp ID
      role: 'user',
      text: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Fire and forget save
    saveMessageToDb('user', textToSend);

    try {
      const resultStream = await chatSessionRef.current.sendMessageStream({
        message: userMsg.text
      });

      const modelMsgId = (Date.now() + 1).toString();
      let fullText = '';
      let hasAddedMessage = false;

      for await (const chunk of resultStream) {
        const c = chunk as GenerateContentResponse;
        const chunkText = c.text;

        if (chunkText) {
          fullText += chunkText;

          if (!hasAddedMessage) {
            setIsTyping(false);
            hasAddedMessage = true;
            // Add initial message with first chunk
            setMessages(prev => [
              ...prev,
              {
                id: modelMsgId,
                role: 'model',
                text: fullText,
                timestamp: new Date()
              }
            ]);
          } else {
            // Update existing message
            setMessages(prev =>
              prev.map(msg =>
                msg.id === modelMsgId
                  ? { ...msg, text: fullText }
                  : msg
              )
            );
          }
        }
      }

      // Save full response to DB
      saveMessageToDb('model', fullText);

    } catch (error) {
      console.error("Chat Error:", error);
      setIsTyping(false);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: "Sorry, I encountered an error connecting to the sales database. Please try again.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    }
  };

  const quickActions = [
    { label: "Analyze Email", prompt: "Here is a sales email I wrote. Please analyze it for clarity, persuasion, and call-to-action strength." },
    { label: "Handle Pricing", prompt: "I'm in a negotiation and the prospect just said 'It's too expensive'. How should I respond?" },
    { label: "Closing Help", prompt: "Give me 3 strong closing techniques for a hesitant enterprise buyer." }
  ];

  return (
    <div className="flex flex-col h-full bg-gemini-dark relative">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8 pb-40 custom-scrollbar" ref={scrollRef}>

        {configError && (
          <div className="mx-auto max-w-2xl p-5 bg-red-500/10 border border-red-500/50 rounded-2xl animate-fade-in flex items-start gap-3">
            <AlertTriangle className="text-red-400 shrink-0" />
            <div>
              <h3 className="font-bold text-red-400">Configuration Error</h3>
              <p className="text-red-200 text-sm mt-1">{configError}</p>
            </div>
          </div>
        )}

        {/* Session Metrics Header (if viewing old voice session) */}
        {sessionMetrics && (
          <div className="mx-auto max-w-2xl p-6 glass-card rounded-2xl animate-fade-in">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="text-gemini-blue" size={16} />
              <h3 className="text-xs font-bold text-gemini-blue uppercase tracking-widest">Past Session Scorecard</h3>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="flex flex-col items-center p-3 bg-gemini-dark/50 rounded-xl border border-gemini-highlight/30">
                <Activity className="text-gemini-cyan mb-2" size={20} />
                <span className="text-2xl font-bold text-white">{sessionMetrics.engagementScore}%</span>
                <span className="text-[10px] text-gemini-muted uppercase tracking-wider">Engage</span>
              </div>
              <div className="flex flex-col items-center p-3 bg-gemini-dark/50 rounded-xl border border-gemini-highlight/30">
                <Trophy className="text-purple-400 mb-2" size={20} />
                <span className="text-2xl font-bold text-white">{sessionMetrics.conversionProbability}%</span>
                <span className="text-[10px] text-gemini-muted uppercase tracking-wider">Win Prob</span>
              </div>
              <div className="flex flex-col items-center p-3 bg-gemini-dark/50 rounded-xl border border-gemini-highlight/30">
                <TrendingUp className="text-emerald-400 mb-2" size={20} />
                <span className="text-2xl font-bold text-white">{sessionMetrics.objectionsHandled}</span>
                <span className="text-[10px] text-gemini-muted uppercase tracking-wider">Objections</span>
              </div>
            </div>
            <div className="text-sm text-gray-300 italic border-l-2 border-gemini-blue/50 pl-4 py-1">
              "{sessionMetrics.feedback}"
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
            <div className={`flex max-w-[85%] md:max-w-[70%] gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>

              {/* Avatar */}
              <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-lg ring-2 ring-opacity-50 ${msg.role === 'user'
                  ? 'bg-gradient-to-br from-blue-600 to-blue-700 ring-blue-500'
                  : 'bg-gradient-to-br from-gemini-card to-gemini-highlight ring-gemini-highlight'
                }`}>
                {msg.role === 'user' ? <UserIcon /> : <Shield size={20} className="text-gemini-cyan" />}
              </div>

              {/* Bubble */}
              <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`p-5 text-[15px] leading-relaxed whitespace-pre-wrap shadow-xl backdrop-blur-sm ${msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm'
                    : 'glass-panel text-gemini-text rounded-2xl rounded-tl-sm'
                  }`}>
                  {msg.text}
                </div>
                <span className="text-[11px] text-gemini-muted mt-2 px-1 font-medium opacity-60">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start animate-fade-in">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gemini-card flex items-center justify-center shadow-lg border border-gemini-highlight">
                <Shield size={20} className="text-gemini-cyan" />
              </div>
              <div className="glass-panel p-5 rounded-2xl rounded-tl-sm shadow-lg">
                <div className="flex gap-1.5 items-center h-full">
                  <span className="w-2 h-2 bg-gemini-muted rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-gemini-muted rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                  <span className="w-2 h-2 bg-gemini-muted rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Input Area with Blur Backdrop */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-gemini-dark via-gemini-dark/95 to-transparent pt-12 pb-6 px-6">
        <div className="max-w-4xl mx-auto space-y-4">

          {/* Quick Actions */}
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none mask-fade-sides">
            {quickActions.map((action, i) => (
              <button
                key={i}
                onClick={() => handleSend(action.prompt)}
                disabled={!!configError}
                className="whitespace-nowrap px-4 py-2.5 bg-gemini-card/80 hover:bg-gemini-highlight border border-gemini-highlight hover:border-gemini-blue/50 rounded-xl text-xs font-medium text-gemini-text hover:text-white transition-all shadow-sm backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 group"
              >
                <MessageSquare size={14} className="text-gemini-blue group-hover:text-white transition-colors" />
                {action.label}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <div className="relative flex items-center gap-3">
            <div className="flex-1 relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl opacity-20 group-hover:opacity-40 transition duration-500 blur"></div>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                disabled={!!configError}
                placeholder={configError ? "Configuration Error - Check Settings" : "Ask for advice, paste a script, or describe a deal..."}
                className="relative w-full bg-gemini-card border border-gemini-highlight text-gemini-text placeholder-gemini-muted rounded-xl py-4 pl-6 pr-28 focus:outline-none focus:border-gemini-blue focus:ring-1 focus:ring-gemini-blue transition-all shadow-2xl text-base disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {/* Dictation Button */}
                {isSpeechSupported && (
                  <button
                    onClick={toggleListening}
                    disabled={!!configError}
                    className={`p-2.5 rounded-lg transition-all ${isListening ? 'text-red-500 animate-pulse bg-red-500/10' : 'text-gemini-muted hover:text-white hover:bg-gemini-highlight'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    title="Dictate with voice"
                  >
                    <Mic size={20} />
                  </button>
                )}

                {/* Send Button */}
                <button
                  onClick={() => handleSend()}
                  disabled={!!configError}
                  className={`p-2.5 rounded-lg transition-all ${input.trim() ? 'bg-gemini-blue text-white shadow-lg shadow-blue-500/20 hover:bg-blue-600' : 'text-gemini-muted hover:text-white hover:bg-gemini-highlight'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <Send size={20} />
                </button>
              </div>
            </div>

            {/* Live Roleplay Switcher */}
            <button
              onClick={onSwitchToVoice}
              disabled={!!configError}
              className="flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-gemini-card to-gemini-highlight border border-gemini-highlight hover:border-gemini-blue text-gemini-text flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-xl group relative disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              title="Start Live Roleplay"
            >
              <div className="absolute inset-0 bg-blue-500/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <Headphones size={24} className="group-hover:text-gemini-cyan transition-colors relative z-10" />
            </button>
          </div>

          <div className="text-center">
            <p className="text-[10px] text-gemini-muted font-medium flex items-center justify-center gap-2">
              <Sparkles size={10} className="text-gemini-blue" />
              Sales Architect AI • Gemini 2.0 Flash • Confidential Coaching
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatView;