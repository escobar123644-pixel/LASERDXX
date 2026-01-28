import React, { useState, useEffect } from 'react';
import { login } from '../utils/auth'; // Cambiamos 'authenticate' por 'login'
import { Terminal } from 'lucide-react';

interface LoginProps {
  onLogin: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Efecto de tipeo para el título
  const [typedTitle, setTypedTitle] = useState('');
  const fullTitle = 'DXF PRO // TERMINAL ACCESS';

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setTypedTitle(fullTitle.slice(0, i));
      i++;
      if (i > fullTitle.length) clearInterval(interval);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simular un pequeño retraso de red para efecto realista
    setTimeout(() => {
      if (login(username, password)) {
        onLogin();
      } else {
        setError('ACCESS DENIED: Invalid credentials');
        setIsLoading(false);
      }
    }, 600);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-mono text-slate-300 relative overflow-hidden">
      {/* Fondo con efecto de grilla */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20 pointer-events-none"></div>

      <div className="w-full max-w-md bg-slate-900 border border-slate-700 shadow-2xl relative z-10">
        {/* Header de la terminal */}
        <div className="bg-slate-800 p-3 flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Terminal size={16} className="text-emerald-500" />
            <span className="text-xs font-bold tracking-widest text-slate-400">SECURE LOGIN</span>
          </div>
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/50"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/50"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50"></div>
          </div>
        </div>

        <div className="p-8">
          <div className="mb-8 text-center">
            <h1 className="text-xl font-bold text-white mb-2 h-8">{typedTitle}<span className="animate-pulse text-emerald-500">_</span></h1>
            <p className="text-xs text-slate-500 uppercase tracking-widest">Authorized Personnel Only</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-emerald-500 uppercase tracking-wider block">Operator ID</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 p-3 text-slate-200 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-slate-700"
                placeholder="ENTER USERNAME..."
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-emerald-500 uppercase tracking-wider block">Access Key</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 p-3 text-slate-200 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-slate-700"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/50 text-red-400 text-xs flex items-center gap-2 animate-pulse">
                <span className="font-bold">ERROR:</span> {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 uppercase tracking-widest transition-all ${isLoading ? 'opacity-70 cursor-wait' : ''}`}
            >
              {isLoading ? 'Authenticating...' : 'Initialize Session'}
            </button>
          </form>

          <div className="mt-6 text-center">
             <p className="text-[10px] text-slate-600">
               System Version 2.1.0 // Build 2024.05.20
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};
