import React, { useState, useEffect } from 'react';
import { X, Plus, Save, Key, UserCheck, ShieldAlert, Lock, RefreshCw } from 'lucide-react';
import { getUsers, addUser, removeUser, updateSettings, getSettings } from '../utils/auth';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ isOpen, onClose }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [newUser, setNewUser] = useState('');
  const [newPass, setNewPass] = useState('');
  const [settings, setLocalSettings] = useState(getSettings());
  const [loading, setLoading] = useState(false);

  // Cargar usuarios de la nube al abrir
  useEffect(() => {
    if (isOpen) loadUsers();
  }, [isOpen]);

  const loadUsers = async () => {
    setLoading(true);
    const data = await getUsers();
    setUsers(data);
    setLoading(false);
  };

  const handleAddUser = async () => {
    if (newUser.trim()) {
      setLoading(true);
      await addUser(newUser.trim(), newPass.trim() || '123');
      await loadUsers(); // Recargar lista
      setNewUser('');
      setNewPass('');
      setLoading(false);
    }
  };

  const handleRemoveUser = async (username: string) => {
    if (confirm(`Delete user ${username}?`)) {
        setLoading(true);
        await removeUser(username);
        await loadUsers();
        setLoading(false);
    }
  };

  const toggleMetric = () => {
    const newSettings = { ...settings, showMetricsToOperator: !settings.showMetricsToOperator };
    updateSettings(newSettings);
    setLocalSettings(newSettings);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white">
          <X size={24} />
        </button>
        
        <div className="p-8 border-b border-slate-800 bg-slate-950">
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <ShieldAlert className="text-emerald-500" />
            PANEL DE CONTROL
          </h2>
          <p className="text-slate-500 text-sm mt-1 uppercase tracking-widest">Configuración del Sistema</p>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          <section>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                <UserCheck size={14} /> Operarios en la Nube
                </h3>
                <button onClick={loadUsers} disabled={loading} className="text-xs text-emerald-500 hover:text-white flex gap-1 items-center">
                    <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
                </button>
            </div>
            
            <div className="bg-slate-950 border border-slate-800 p-4 mb-4">
              <div className="flex gap-2">
                <input type="text" value={newUser} onChange={(e) => setNewUser(e.target.value)} placeholder="Usuario..." className="flex-1 bg-slate-900 border border-slate-700 px-4 py-2 text-slate-200 outline-none focus:border-emerald-500"/>
                <div className="relative w-1/3">
                    <Lock size={14} className="absolute left-3 top-3 text-slate-500"/>
                    <input type="text" value={newPass} onChange={(e) => setNewPass(e.target.value)} placeholder="Clave" className="w-full bg-slate-900 border border-slate-700 pl-9 pr-2 py-2 text-slate-200 outline-none focus:border-emerald-500 text-sm"/>
                </div>
                <button onClick={handleAddUser} disabled={loading} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 font-bold disabled:opacity-50">
                  <Plus size={20} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto">
              {loading ? <div className="text-slate-500 text-xs p-4">Sincronizando con base de datos...</div> : 
               users.map((u: any) => (
                <div key={u.username} className="flex items-center justify-between bg-slate-800/50 border border-slate-800 p-3 px-4">
                  <div>
                      <span className="font-mono text-emerald-400 block">{u.username}</span>
                      <span className="text-[10px] text-slate-500">****</span>
                  </div>
                  {u.role !== 'ADMIN' && (
                    <button onClick={() => handleRemoveUser(u.username)} className="text-slate-600 hover:text-red-500"><X size={16} /></button>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2"><Key size={14} /> Configuración</h3>
            <div className="bg-slate-950 border border-slate-800 p-6 flex items-center justify-between">
              <div><div className="text-slate-200 font-bold">Mostrar Métricas</div><div className="text-slate-500 text-xs mt-1">Permitir ver consumo a operarios.</div></div>
              <button onClick={toggleMetric} className={`w-12 h-6 rounded-full p-1 transition-colors ${settings.showMetricsToOperator ? 'bg-emerald-600' : 'bg-slate-700'}`}><div className={`w-4 h-4 bg-white rounded-full transition-transform ${settings.showMetricsToOperator ? 'translate-x-6' : 'translate-x-0'}`}></div></button>
            </div>
          </section>
        </div>

        <div className="p-6 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button onClick={onClose} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-bold"><Save size={18} /> CERRAR</button>
        </div>
      </div>
    </div>
  );
};
