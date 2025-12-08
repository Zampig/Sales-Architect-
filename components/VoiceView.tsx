
import React, { useEffect, useRef, useState } from 'react';
import { X, Mic, MicOff, MoreHorizontal, Activity, CheckCircle, TrendingUp, Loader2, Sparkles, Volume2, AlertTriangle } from 'lucide-react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { SalesSettings, SessionMetrics, UserDocument } from '../types';
import { createPcmBlob, decodeAudioData } from '../utils/audioUtils';
import { SALES_KNOWLEDGE_BASE } from '../utils/knowledgeBase';
import { supabase } from '../supabaseClient';

interface VoiceViewProps {
  settings: SalesSettings;
  onClose: () => void;
  voicePreference: 'Male' | 'Female';
  sessionId: string | null;
  documents: UserDocument[];
}

const VoiceView: React.FC<VoiceViewProps> = ({ settings, onClose, voicePreference, sessionId, documents }) => {
  const [viewState, setViewState] = useState<'connecting' | 'active' | 'analyzing' | 'summary'>('connecting');
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(0);
  const [metrics, setMetrics] = useState<SessionMetrics | null>(null);

  // Audio Context Refs
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  // Gemini Session Refs
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  // Transcription State
  const transcriptRef = useRef<{ role: 'user' | 'model', text: string }[]>([]);
  const currentInputTransRef = useRef<string>('');
  const currentOutputTransRef = useRef<string>('');

  // Cleanup function to stop audio and close connections
  const cleanupAudio = () => {
    // Stop all playing audio
    audioSourcesRef.current.forEach(source => {
      try { source.stop(); } catch (e) { }
    });
    audioSourcesRef.current.clear();

    // Close Gemini session
    if (sessionPromiseRef.current) {
      sessionPromiseRef.current.then(session => {
        try { session.close(); } catch (e) { }
      });
    }

    // Stop Mic Stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    // Disconnect Nodes
    if (sourceRef.current) sourceRef.current.disconnect();
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current.onaudioprocess = null;
    }

    // Close Contexts
    if (inputContextRef.current && inputContextRef.current.state !== 'closed') inputContextRef.current.close();
    if (outputContextRef.current && outputContextRef.current.state !== 'closed') outputContextRef.current.close();
  };

  useEffect(() => {
    // Reset transcript on new session
    transcriptRef.current = [];

    const startSession = async () => {
      try {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (!apiKey) {
          setError("VITE_GEMINI_API_KEY is missing from environment variables.");
          return;
        }

        const ai = new GoogleGenAI({ apiKey });

        // 1. Setup Audio Contexts
        inputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        outputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

        // 2. Get Mic Permission & Stream
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        // 3. Connect to Gemini Live
        let systemInstruction = "";

        // Prepare User Context from Documents
        const userContext = documents.length > 0
          ? `\n*** USER PROVIDED COMPANY CONTEXT ***\nThe user has uploaded the following documents about their company/product. Use this information to tailor your advice and roleplay specifics.\n\n${documents.map(d => `--- Document: ${d.filename} ---\n${d.content}\n`).join('\n')}\n*************************************`
          : "";

        // SUPER PROMPT: Mentor + Dynamic Roleplay
        systemInstruction = `
            You are the Sales Architect, a master sales coach.
            
            PRIMARY MODE: MENTOR
            - You are an encouraging, punchy, and direct sales mentor.
            - Listen to the user, ask clarifying questions, and provide advice based on the KNOWLEDGE BASE below.
            - Use short, conversational sentences.
            
            DYNAMIC ROLEPLAY CAPABILITY:
            - If the user asks to "roleplay", "practice a pitch", or "simulate a call", you must IMMEDIATELY switch to the persona of the prospect described by the user (or a standard difficult prospect if not specified).
            - When in Roleplay Mode:
              - Stay in character 100%.
              - Be challenging but realistic.
              - Do not break character until the user says "stop", "pause", or "feedback".
            - When the roleplay ends, revert to MENTOR mode and provide specific feedback based on the methodology.

            KNOWLEDGE BASE:
            ${SALES_KNOWLEDGE_BASE}

            ${userContext}
           `;

        // Determine voice name based on preference
        const voiceName = voicePreference === 'Male' ? 'Fenrir' : 'Zephyr';

        const config = {
          model: 'gemini-2.0-flash-exp', // Using Flash 2.0 Exp for best latency
          callbacks: {
            onopen: () => {
              console.log('Gemini Live Connected');
              setViewState('active');

              // Start streaming audio Input *after* connection is open
              if (!inputContextRef.current) return;

              const source = inputContextRef.current.createMediaStreamSource(stream);
              sourceRef.current = source;

              const processor = inputContextRef.current.createScriptProcessor(4096, 1, 1);
              processorRef.current = processor;

              processor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);

                let sum = 0;
                for (let i = 0; i < inputData.length; i += 100) sum += Math.abs(inputData[i]);
                setVolume(Math.min(1, (sum / (inputData.length / 100)) * 5));

                const pcmBlob = createPcmBlob(inputData);

                if (sessionPromiseRef.current) {
                  sessionPromiseRef.current.then(session => {
                    session.sendRealtimeInput({ media: pcmBlob });
                  });
                }
              };

              source.connect(processor);
              processor.connect(inputContextRef.current.destination);
            },
            onmessage: async (message: LiveServerMessage) => {
              // Handle Transcription
              if (message.serverContent?.outputTranscription) {
                currentOutputTransRef.current += message.serverContent.outputTranscription.text;
              } else if (message.serverContent?.inputTranscription) {
                currentInputTransRef.current += message.serverContent.inputTranscription.text;
              }

              if (message.serverContent?.turnComplete) {
                if (currentInputTransRef.current) {
                  transcriptRef.current.push({ role: 'user', text: currentInputTransRef.current });
                  currentInputTransRef.current = '';
                }
                if (currentOutputTransRef.current) {
                  transcriptRef.current.push({ role: 'model', text: currentOutputTransRef.current });
                  currentOutputTransRef.current = '';
                }
              }

              // Handle Audio Output
              const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;

              if (base64Audio && outputContextRef.current) {
                const ctx = outputContextRef.current;
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);

                try {
                  const audioBuffer = await decodeAudioData(
                    new Uint8Array(atob(base64Audio).split('').map(c => c.charCodeAt(0))),
                    ctx,
                    24000
                  );

                  const source = ctx.createBufferSource();
                  source.buffer = audioBuffer;
                  source.connect(ctx.destination);
                  source.addEventListener('ended', () => {
                    audioSourcesRef.current.delete(source);
                  });

                  source.start(nextStartTimeRef.current);
                  nextStartTimeRef.current += audioBuffer.duration;
                  audioSourcesRef.current.add(source);
                } catch (e) {
                  console.error("Audio Decode Error", e);
                }
              }

              if (message.serverContent?.interrupted) {
                audioSourcesRef.current.forEach(src => src.stop());
                audioSourcesRef.current.clear();
                nextStartTimeRef.current = 0;
                // Clear pending output transcript on interrupt as it might be cut off
                currentOutputTransRef.current = '';
              }
            },
            onclose: () => {
              console.log("Gemini Live Closed");
            },
            onerror: (err: any) => {
              console.error("Gemini Live Error", err);
              setError("Connection Error");
              setViewState('connecting'); // Or error state
            }
          },
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName } }
            },
            systemInstruction: systemInstruction,
            inputAudioTranscription: {}, // Enable transcription
            outputAudioTranscription: {}
          }
        };

        sessionPromiseRef.current = ai.live.connect(config);

      } catch (err) {
        console.error("Setup Error", err);
        setError("Microphone access denied or connection failed.");
      }
    };

    startSession();

    return () => {
      cleanupAudio();
    };
  }, [settings, voicePreference, documents]); // Re-run if docs change

  const handleEndSession = async () => {
    // 1. Stop Audio immediately
    cleanupAudio();
    setViewState('analyzing');

    // 2. Compile full transcript
    // Flush any remaining partials
    if (currentInputTransRef.current) transcriptRef.current.push({ role: 'user', text: currentInputTransRef.current });
    if (currentOutputTransRef.current) transcriptRef.current.push({ role: 'model', text: currentOutputTransRef.current });

    const fullTranscript = transcriptRef.current.map(t => `${t.role}: ${t.text}`).join('\n');
    console.log("Full Transcript for Analysis:", fullTranscript);

    if (fullTranscript.length < 50) {
      // Not enough data for analysis
      onClose();
      return;
    }

    try {
      // SAVE TRANSCRIPT TO SUPABASE
      if (sessionId && transcriptRef.current.length > 0) {
        const messagesToInsert = transcriptRef.current.map(t => ({
          session_id: sessionId,
          role: t.role,
          content: t.text
        }));

        // Fire and forget save for transcript
        supabase.from('messages').insert(messagesToInsert).then(({ error }) => {
          if (error) console.error("Error saving transcript:", error);
        });
      }

      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) throw new Error("Missing API Key");

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: `Analyze this sales transcript.
            Mode: ${settings.mode === 'coaching' ? 'Coaching Session (Mentor & Mentee)' : 'Roleplay (Prospect & Salesperson)'}
            
            Use the following PROPRIETARY KNOWLEDGE BASE:
            ${SALES_KNOWLEDGE_BASE}
            
            Transcript:
            ${fullTranscript}
            
            Return a JSON object with:
            - engagementScore: number (0-100)
            - objectionsHandled: number
            - conversionProbability: number (0-100)
            - feedback: string (2 sentences plain text advice).
            `,
        config: {
          responseMimeType: "application/json"
        }
      });

      const text = response.text;
      if (text) {
        const data = JSON.parse(text);
        const metricsData = data as SessionMetrics;
        setMetrics(metricsData);

        // SAVE METRICS TO SUPABASE
        if (sessionId) {
          await supabase.from('session_metrics').insert({
            session_id: sessionId,
            engagement_score: metricsData.engagementScore,
            objections_handled: metricsData.objectionsHandled,
            conversion_probability: metricsData.conversionProbability,
            feedback: metricsData.feedback
          });
        }

        setViewState('summary');
      } else {
        onClose(); // Fallback
      }

    } catch (e) {
      console.error("Analysis failed", e);
      onClose();
    }
  };

  if (viewState === 'summary' && metrics) {
    return (
      <div className="flex flex-col h-full bg-gemini-dark p-8 overflow-y-auto">
        <div className="max-w-3xl mx-auto w-full space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-sm font-bold text-gemini-blue tracking-widest uppercase flex items-center justify-center gap-2">
              <CheckCircle size={16} /> Session Complete
            </h2>
            <h1 className="text-4xl font-bold text-white">Performance Report</h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-card p-6 rounded-2xl flex flex-col items-center gap-3 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <Activity className="text-gemini-cyan mb-2" size={32} />
              <span className="text-5xl font-light text-white">{metrics.engagementScore}%</span>
              <span className="text-xs text-gemini-muted uppercase tracking-wider font-medium">Engagement</span>
            </div>
            <div className="glass-card p-6 rounded-2xl flex flex-col items-center gap-3 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <CheckCircle className="text-emerald-400 mb-2" size={32} />
              <span className="text-5xl font-light text-white">{metrics.objectionsHandled}</span>
              <span className="text-xs text-gemini-muted uppercase tracking-wider font-medium">Objections Handled</span>
            </div>
            <div className="glass-card p-6 rounded-2xl flex flex-col items-center gap-3 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <TrendingUp className="text-purple-400 mb-2" size={32} />
              <span className="text-5xl font-light text-white">{metrics.conversionProbability}%</span>
              <span className="text-xs text-gemini-muted uppercase tracking-wider font-medium">Win Probability</span>
            </div>
          </div>

          <div className="glass-panel p-8 rounded-2xl border border-gemini-highlight/50 relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500 rounded-t-2xl"></div>
            <h3 className="text-gemini-blue font-bold mb-4 text-sm uppercase tracking-wide flex items-center gap-2">
              <Sparkles size={16} /> Coach Feedback
            </h3>
            <p className="text-gray-200 leading-relaxed text-xl font-light italic">"{metrics.feedback}"</p>
          </div>

          <button
            onClick={onClose}
            className="w-full py-4 rounded-xl bg-gemini-blue hover:bg-blue-600 text-white font-bold text-lg transition-all shadow-lg hover:shadow-blue-500/25"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gemini-dark relative overflow-hidden">

      {/* Background Ambient Effect */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none">
        <div className={`w-[600px] h-[600px] rounded-full blur-[120px] transition-all duration-1000 
            ${settings.mode === 'coaching' ? 'bg-amber-500/10' : 'bg-blue-500/10'} 
            ${viewState === 'active' ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`} />

        <div className={`absolute w-[400px] h-[400px] rounded-full blur-[90px] transition-all duration-500 
            ${settings.mode === 'coaching' ? 'bg-orange-500/10' : 'bg-cyan-500/10'} 
            ${volume > 0.1 ? 'scale-150' : 'scale-100'}`} />
      </div>

      {/* Header Actions */}
      <div className="absolute top-6 right-6 z-20">
        <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 rounded-full text-white backdrop-blur-md transition-colors border border-white/10">
          <X size={24} />
        </button>
      </div>

      {/* Main Visualizer */}
      <div className="flex-1 flex flex-col items-center justify-center z-10 p-8 space-y-16">

        <div className="text-center space-y-3 animate-fade-in">
          <h2 className={`text-sm font-bold tracking-[0.2em] uppercase flex items-center justify-center gap-2 ${settings.mode === 'coaching' ? 'text-amber-500' : 'text-gemini-blue'}`}>
            <div className={`w-2 h-2 rounded-full animate-pulse ${settings.mode === 'coaching' ? 'bg-amber-500' : 'bg-gemini-blue'}`}></div>
            {settings.mode === 'coaching' ? 'Live Coaching' : 'Live Roleplay'}
          </h2>
          <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70">
            {settings.mode === 'coaching' ? 'Sales Architect' : settings.persona}
          </h1>
          <p className="text-gemini-muted text-lg font-light">
            {viewState === 'connecting' ? 'Establishing secure connection...' :
              viewState === 'analyzing' ? 'Analyzing Session Performance...' :
                settings.mode === 'coaching' ? 'Listening to your question...' : 'Listening...'}
          </p>
        </div>

        {/* Orb Visualizer or Loader */}
        <div className="relative w-64 h-64 flex items-center justify-center">
          {viewState === 'analyzing' ? (
            <div className="relative">
              <div className="absolute inset-0 bg-gemini-blue/20 blur-xl rounded-full"></div>
              <Loader2 className="w-24 h-24 text-gemini-blue animate-spin relative z-10" />
            </div>
          ) : (
            <>
              {/* Ripples */}
              {viewState === 'active' && (
                <>
                  <div className={`absolute inset-0 rounded-full border-2 animate-ping ${settings.mode === 'coaching' ? 'border-amber-500/20' : 'border-blue-500/20'}`} style={{ animationDuration: '3s' }}></div>
                  <div className={`absolute inset-0 rounded-full border-2 animate-ping ${settings.mode === 'coaching' ? 'border-orange-500/10' : 'border-cyan-500/10'}`} style={{ animationDuration: '2s', animationDelay: '0.5s' }}></div>
                </>
              )}

              {/* Core Orb */}
              <div className={`relative w-40 h-40 rounded-full bg-gradient-to-br shadow-[0_0_80px_rgba(0,0,0,0.6)] flex items-center justify-center transition-all duration-100 
                    ${settings.mode === 'coaching'
                  ? 'from-amber-500 to-orange-600 shadow-amber-500/40'
                  : 'from-blue-500 to-cyan-600 shadow-blue-500/40'} 
                    ${volume > 0.05 ? 'scale-110 brightness-110' : 'scale-100'}`}>

                {viewState === 'connecting' ? (
                  <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <div className="relative">
                    <Mic size={48} className="text-white drop-shadow-lg relative z-10" />
                    {volume > 0.1 && (
                      <div className="absolute inset-0 bg-white/50 blur-lg animate-pulse"></div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-200 px-6 py-3 rounded-xl text-sm flex items-center gap-2 animate-fade-in">
            <AlertTriangle size={16} />
            {error}
          </div>
        )}

      </div>

      {/* Controls */}
      {viewState !== 'analyzing' && (
        <div className="h-40 flex items-center justify-center gap-8 pb-10 z-20">
          <button
            onClick={() => {
              if (streamRef.current) {
                const audioTrack = streamRef.current.getAudioTracks()[0];
                if (audioTrack) {
                  audioTrack.enabled = !audioTrack.enabled;
                  // Force re-render to show state if we had one, 
                  // but for now just toggling functionality
                }
              }
            }}
            className="p-5 rounded-full bg-white/5 text-gemini-muted hover:text-white hover:bg-white/10 transition-all hover:scale-110 active:scale-95 backdrop-blur-sm border border-white/5"
          >
            <MicOff size={28} />
          </button>

          <button
            onClick={handleEndSession}
            className="px-10 py-5 rounded-full bg-red-500/20 text-red-100 hover:bg-red-500 hover:text-white border border-red-500/30 transition-all font-bold text-lg hover:shadow-lg hover:shadow-red-500/20 hover:scale-105 active:scale-95 backdrop-blur-sm"
          >
            End Session
          </button>

          <button
            onClick={() => {
              if (outputContextRef.current) {
                if (outputContextRef.current.state === 'running') {
                  outputContextRef.current.suspend();
                } else {
                  outputContextRef.current.resume();
                }
              }
            }}
            className="p-5 rounded-full bg-white/5 text-gemini-muted hover:text-white hover:bg-white/10 transition-all hover:scale-110 active:scale-95 backdrop-blur-sm border border-white/5"
          >
            <Volume2 size={28} />
          </button>
        </div>
      )}
    </div>
  );
};

export default VoiceView;