import React, { useState, useEffect } from 'react';
import { Redis } from '@upstash/redis';
import { 
  Users, 
  Settings as SettingsIcon, 
  Database, 
  Trash2, 
  Plus, 
  AlertTriangle,
  Save,
  ShieldCheck
} from 'lucide-react';
import { 
  getSettings, 
  updateSettings, 
  globalReset,
  AppSettings 
} from '../utils/auth';

const redis = new Redis({
  url: import.meta.env.VITE_UPSTASH_REDIS_REST_URL,
  token: import.meta.env.VITE_UPSTASH_REDIS_REST_TOKEN,
});

export const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'operators' | 'settings' | 'system'>('operators');
  const [operarios, setOperarios] = useState<string[]>([]);
  const [newOpName, setNewOpName] = useState('');
  const [settings, setSettings] = useState<AppSettings>(getSettings());
  const [statusMsg, setStatusMsg] = useState('');

  // Cargar operarios desde Upstash
  useEffect(() => {
    fetchOperarios();
  }, []);

  const fetchOperarios = async () => {
    try {
      const data = await redis.get<string[]>('lista_operarios');
      setOperarios(data || []);
    } catch (err) {
      console.error("Error fetching ops:", err);
    }
  };

  const addOperario = async () => {
    if (!newOpName.trim()) return;
    const updatedOps = [...operarios, newOpName.trim().toUpperCase()];
    try {
      await redis.set('lista_operarios', updatedOps);
      setOperarios(updatedOps);
      setNewOpName('');
      showStatus('OPERATOR ADDED SUCCESSFULLY');
    } catch (err) {
      showStatus('ERROR SAVING TO CLOUD');
    }
  };

  const removeOperario = async (name: string) => {
    const updatedOps = operarios.filter(op => op !== name);
    try {
      await redis.set('lista_operarios', updatedOps);
      setOperarios(updatedOps);
      showStatus('OPERATOR REMOVED');
    } catch (err) {
      showStatus('ERROR REMOVING OPERATOR');
    }
  };

  const showStatus = (msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(''), 3000);
  };

  const handleSaveSettings = () => {
    updateSettings(settings);
    showStatus('SETTINGS UPDATED');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2 text-emerald-500">
          <ShieldCheck size={24} />
          <h2 className="text-xl font-bold tracking-tight">SYSTEM ADMINISTRATION</h2>
        </div>
        {statusMsg && (
          <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-3 py-1 border border-emerald-500/20 animate-pulse">
            {statusMsg}
          </span>
        )}
      </div>

      <div className="flex gap-2">
        <button 
          onClick={() => setActiveTab('operators')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold transition-all ${activeTab === 'operators' ? 'bg-emerald-500 text-slate-900' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
        >
          <Users size={14} /> OPERATIVE PERSONNEL
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold transition-all ${activeTab === 'settings' ? 'bg-emerald-500 text-slate-900' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
        >
          <SettingsIcon size={14} /> APP SETTINGS
        </button>
        <button 
          onClick={() => setActiveTab('system')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold transition-all ${activeTab === 'system' ? 'bg-red-900/20 text-red-500 border border-red-900/30' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
        >
          <Database size={14} /> MAINTENANCE
        </button>
      </div>

      <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-sm">
        {activeTab === 'operators' && (
          <div className="space-y-6">
            <div className="flex gap-4">
              <input 
                type="text"
                value={newOpName}
                onChange={(e) => setNewOpName(e.target.value)}
                placeholder="ENTER NEW OPERATOR NAME..."
                className="flex-1 bg-slate-950 border border-slate-700 p-3 text-emerald-500 outline-none focus:border-emerald-500 font-mono text-sm"
              />
              <button 
                onClick={addOperario}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 font-bold flex items-center gap-2 transition-colors"
              >
                <Plus size={18} /> ADD
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {operarios.map((op) => (
                <div key={op} className="flex items-center justify-between bg-slate-950 p-3 border border-slate-800 group">
                  <span className="text-slate-300 font-mono text-sm">{op}</span>
                  <button 
                    onClick={() => removeOperario(op)}
                    className="text-slate-600 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800">
              <div>
                <h4 className="text-emerald-500 font-bold text-sm">OPERATOR METRICS</h4>
                <p className="text-slate-500 text-[10px] uppercase">Allow operators to view material consumption data</p>
              </div>
              <input 
                type="checkbox"
                checked={settings.showMetricsToOperator}
                onChange={(e) => setSettings({...settings, showMetricsToOperator: e.target.checked})}
                className="w-5 h-5 accent-emerald-500"
              />
            </div>
            <button 
              onClick={handleSaveSettings}
              className="w-full bg-emerald-600/20 border border-emerald-500 text-emerald-500 py-3 font-bold text-xs hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center gap-2"
            >
              <Save size={16} /> SAVE CONFIGURATION
            </button>
          </div>
        )}

        {activeTab === 'system' && (
          <div className="p-8 border border-red-900/30 bg-red-900/5 text-center space-y-4">
            <AlertTriangle className="mx-auto text-red-500" size={48} />
            <h3 className="text-red-500 font-bold italic text-lg tracking-widest uppercase">Emergency System Reset</h3>
            <p className="text-slate-400 text-xs max-w-sm mx-auto uppercase leading-relaxed">
              This action will clear all local session data and force a full system logout. Operator list in cloud will persist.
            </p>
            <button 
              onClick={() => {
                if(confirm('PROCEED WITH GLOBAL RESET?')) {
                  globalReset();
                  window.location.reload();
                }
              }}
              className="bg-red-600 hover:bg-red-500 text-white px-8 py-3 font-bold text-xs transition-all uppercase tracking-widest"
            >
              Execute Global Reset
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 text-[9px] text-slate-700 uppercase tracking-[0.2em] flex justify-between">
        <span>Admin_Console_v2.1</span>
        <span>Secure_Node_Active</span>
      </div>
    </div>
  );
};
