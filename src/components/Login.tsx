import React, { useState, useEffect } from 'react';
import { Redis } from '@upstash/redis';
import { authenticate } from '../utils/auth';
import { Terminal, Loader2, ChevronRight } from 'lucide-react';

// Conexión a Upstash
const redis = new Redis({
  url: import.meta.env.VITE_UPSTASH_REDIS_REST_URL,
  token: import.meta.env.VITE_UPSTASH_REDIS_REST_TOKEN,
});

interface LoginProps {
  onLogin: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [bootSequence, setBootSequence] = useState<string[]>([]);
  const [showInput, setShowInput] = useState(false);
  
  // Estados para Upstash
  const [operarios, setOperarios] = useState<string[]>([]);
  const [selectedOp, setSelectedOp] = useState('');
  const [loadingOps, setLoadingOps] = useState(true);

  useEffect(() => {
    // 1. Cargar Operarios de la base de datos
    const fetchOps = async () => {
      try {
        const data = await redis.get<string[]>('lista_operarios');
        if (data) setOperarios(data);
      } catch (err) {
        console.error("DB_CONNECT_ERROR");
      } finally {
        setLoadingOps(false);
      }
    };
    fetchOps();

    // 2. Simular secuencia de arranque (Boot)
    const lines = [
      'INITIALIZING DXF PRO CORE...',
      'LOADING GEOMETRY ENGINE...',
      'ESTABLISHING DATABASE LINK...',
      'UPSTASH_CLOUD_READY...',
      'SYSTEM_ACCESS_GRANTED.'
    ];
    
    let delay = 0;
    lines.forEach((line, index) => {
      delay += Math.random() * 400 + 150;
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
    if (!selectedOp) {
      setError('ERROR: NO OPERATOR SELECTED');
      return;
    }

    // Usamos authenticate con el nombre seleccionado y la key
    const session = authenticate(selectedOp, key);
    if (session) {
      setError('');
      onLogin();
    } else {
      setError('ACCESS DENIED: INVALID SYSTEM KEY');
      setKey('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-mono overflow-hidden relative">
      {/* CRT Effects */}
      <div className="absolute inset-0 pointer-events-none opacity-10 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 bg-[length:100%_4px,3px_100%]"></div>
      <div className="absolute inset-0 pointer-events-none opacity-5 animate-pulse bg-emerald-500/10 z-0"></div>

      <div className="max-w-md w-full bg-slate-900 border border-slate-700 shadow-[0_0_20px_rgba(16,185,129,0.2)] p-8 relative z-20 rounded-sm">
        <div className="flex items-center gap-3 mb-6 text-emerald-500 border-b border-slate-800 pb-4">
          <Terminal size={24} />
          <h1 className="text-xl font-bold tracking-wider italic">ALBERPROYEC // LOGIN</h1>
        </div>

        {/* Boot Sequence Display */}
        <div className="space-y-2 mb-8 h-32 overflow-y-auto text-xs text-slate-400 font-mono">
          {bootSequence.map((line, i) => (
            <div key={i} className="flex">
              <span className="mr-2 text-slate-600">[{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}]</span>
              <span className="text-emerald-500/80 uppercase">{line}</span>
            </div>
          ))}
          {showInput && <div className="animate-pulse text-emerald-500">_</div>}
        </div>

        {showInput && (
          <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in duration-700">
            {/* SELECTOR DE OPERARIOS ESTILO TERMINAL */}
            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-2">
                Identify Operator
              </label>
              <div className="relative">
                {loadingOps ? (
                  <div className="w-full bg-slate-950 border border-slate-700 text-slate-600 p-3 text-sm flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin" /> FETCHING_DATALINK...
                  </div>
                ) : (
                  <select
                    value={selectedOp}
                    onChange={(e) => setSelectedOp(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-emerald-500 p-3 outline-none focus:border-emerald-500 transition-all font-mono text-sm uppercase appearance-none cursor-pointer"
                  >
                    <option value="">-- SELECT IDENTITY --</option>
                    {operarios.map(op => (
                      <option key={op} value={op}>{op}</option>
                    ))}
                    <option value="ADMIN">ADMINISTRATOR</option>
                  </select>
                )}
              </div>
            </div>

            {/* PASSWORD ESTILO TERMINAL */}
            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-2">
                System Passkey
              </label>
              <input
                type="password"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-emerald-500 p-3 outline-none focus:border-emerald-500 focus:shadow-[0_0_10px_rgba(16,185,129,0.1)] transition-all font-mono text-lg"
                placeholder="••••••••"
              />
            </div>
            
            {error && (
              <div className="text-red-500 text-xs font-bold animate-pulse bg-red-900/10 p-2 border border-red-900/30">
                {`>> ${error}`}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-emerald-900/20 border border-emerald-500/40 text-emerald-400 py-4 hover:bg-emerald-500 hover:text-slate-900 transition-all uppercase tracking-[0.3em] font-black text-xs flex items-center justify-center gap-2"
            >
              Execute Login <ChevronRight size={14} />
            </button>
          </form>
        )}
        
        <div className="mt-8 text-center border-t border-slate-800 pt-4">
            <p className="text-[9px] text-slate-600 uppercase tracking-widest">
              Secure Link: <span className="text-emerald-900">Encrypted_AES_256</span>
            </p>
        </div>
      </div>
    </div>
  );
};
