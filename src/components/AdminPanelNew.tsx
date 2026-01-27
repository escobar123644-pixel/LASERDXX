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
          className="flex-1 bg-slate-950 border border-slate-700 p-2 text-emerald-500 text-sm outline-none
