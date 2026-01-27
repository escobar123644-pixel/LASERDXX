import React, { useState, useEffect } from 'react';
import { Redis } from '@upstash/redis';
import { Users, Trash2, Plus, ShieldCheck } from 'lucide-react';

const redis = new Redis({
  url: import.meta.env.VITE_UPSTASH_REDIS_REST_URL,
  token: import.meta.env.VITE_UPSTASH_REDIS_REST_TOKEN,
});

export const AdminPanel: React.FC = () => {
  const [operarios, setOperarios] = useState<string[]>([]);
  const [newOpName, setNewOpName] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    fetchOps();
  }, []);

  const fetchOps = async () => {
    try {
      const data = await redis.get<string[]>('lista_operarios');
      if (data) setOperarios(data);
    } catch (e) {
      console.error(e);
    }
  };

  const addOp = async () => {
    if (!newOpName.trim()) return;
    const newOps = [...operarios, newOpName.trim().toUpperCase()];
    await redis.set('lista_operarios', newOps);
    setOperarios(newOps);
    setNewOpName('');
    setStatus('OPERATOR ADDED');
    setTimeout(() => setStatus(''), 2000);
  };

  const removeOp = async (name: string) => {
    const newOps = operarios.filter(op => op !== name);
    await redis.set('lista_operarios', newOps);
    setOperarios(newOps);
  };

  return (
    <div className="p-4 bg-slate-900 border border-slate-800 rounded-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 text-emerald-500 font-bold">
          <ShieldCheck size={20} /> <span>OPERATOR MANAGEMENT</span>
        </div>
        {status && <span className="text-[10px] text-emerald-500 animate-pulse">{status}</span>}
      </div>

      <div className="flex gap-2 mb-6">
        <input 
          type="text" 
          value={newOpName}
          onChange={(e) => setNewOpName(e.target.value)}
          placeholder="NEW NAME..."
          className="flex-1 bg-slate-950 border border-slate-700 p-2 text-emerald-500 text-sm outline-none"
        />
        <button onClick={addOp} className="bg-emerald-600 px-4 py-2 text-white text-xs font-bold hover:bg-emerald-500">
          <Plus size={16} />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {operarios.map(op => (
          <div key={op} className="flex justify-between p-2 bg-slate-950 border border-slate-800 text-sm">
            <span className="text-slate-300 font-mono">{op}</span>
            <button onClick={() => removeOp(op)} className="text-slate-600 hover:text-red-500">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {operarios.length === 0 && <p className="text-center text-slate-600 text-[10px]">NO OPERATORS IN CLOUD</p>}
      </div>
    </div>
  );
};
