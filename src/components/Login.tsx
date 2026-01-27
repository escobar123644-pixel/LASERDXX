import React, { useState, useEffect } from 'react';
import { authenticate } from '../utils/auth';
import { Terminal } from 'lucide-react';

interface LoginProps {
  onLogin: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [bootSequence, setBootSequence] = useState<string[]>([]);
  const [showInput, setShowInput] = useState(false);

  useEffect(() => {
    // Simulate boot sequence
    const lines = [
      'INITIALIZING DXF PRO CORE...',
      'LOADING GEOMETRY ENGINE...',
      'CHECKING SUMMA DRIVERS...',
      'ESTABLISHING SECURE CONNECTION...',
      'READY.'
    ];
    
    let delay = 0;
    lines.forEach((line, index) => {
      delay += Math.random() * 500 + 200;
      setTimeout(() => {
        setBootSequence(prev => [...prev, line]);
        if (index === lines.length - 1) {
          setShowInput(true);
        }
      }, delay);
    });
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const session = authenticate(key);
    if (session) {
      setError('');
      onLogin();
    } else {
      setError('ACCESS DENIED: INVALID KEY');
      setKey('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-mono overflow-hidden relative">
      {/* CRT Effects */}
      <div className="absolute inset-0 pointer-events-none opacity-10 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 bg-[length:100%_4px,3px_100%]"></div>
      <div className="absolute inset-0 pointer-events-none opacity-5 animate-pulse bg-green-500/10 z-0"></div>

      <div className="max-w-md w-full bg-slate-900 border border-slate-700 shadow-[0_0_20px_rgba(16,185,129,0.2)] p-8 relative z-20 rounded-sm">
        <div className="flex items-center gap-3 mb-6 text-emerald-500 border-b border-slate-800 pb-4">
          <Terminal size={24} />
          <h1 className="text-xl font-bold tracking-wider">DXF PRO // TERMINAL</h1>
        </div>

        <div className="space-y-2 mb-8 h-32 overflow-y-auto text-xs md:text-sm text-slate-400">
          {bootSequence.map((line, i) => (
            <div key={i} className="flex">
              <span className="mr-2 text-slate-600">[{new Date().toLocaleTimeString()}]</span>
              <span className="text-emerald-500/80">{line}</span>
            </div>
          ))}
          {showInput && <div className="animate-pulse text-emerald-500">_</div>}
        </div>

        {showInput && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-widest text-slate-500 mb-2">
                Enter Access Key
              </label>
              <input
                type="password"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-emerald-500 p-3 outline-none focus:border-emerald-500 focus:shadow-[0_0_10px_rgba(16,185,129,0.2)] transition-all font-mono text-lg"
                autoFocus
                placeholder="••••••••••••••"
              />
            </div>
            
            {error && (
              <div className="text-red-500 text-sm font-bold animate-pulse bg-red-900/10 p-2 border border-red-900/30">
                {`>> ${error}`}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-emerald-900/30 border border-emerald-500/50 text-emerald-400 py-3 hover:bg-emerald-500 hover:text-slate-900 transition-all uppercase tracking-widest font-bold text-sm"
            >
              Authenticate
            </button>
          </form>
        )}
        
        <div className="mt-8 text-center">
            <p className="text-[10px] text-slate-600 uppercase">System v2.0.4 | Secured by Summa Logic</p>
        </div>
      </div>
    </div>
  );
};
