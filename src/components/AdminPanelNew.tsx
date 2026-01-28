import React, { useState } from 'react';
import { X, Plus, Save, Key, UserCheck, ShieldAlert, Lock } from 'lucide-react';
import { getUsers, addUser, removeUser, updateSettings, getSettings } from '../utils/auth';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ isOpen, onClose }) => {
  const [users, setUsers] = useState(getUsers());
  const [newUser, setNewUser] = useState('');
  const [newPass, setNewPass] = useState(''); // Campo para la contraseña
  const [settings, setLocalSettings] = useState(getSettings());

  const handleAddUser = () => {
    if (newUser.trim()) {
      // Guardamos usuario con la contraseña elegida
      addUser(newUser.trim(), newPass.trim() || '123'); 
      setUsers(getUsers());
      setNewUser('');
      setNewPass('');
    }
  };

  const handleRemoveUser = (username: string) => {
    removeUser(username);
    setUsers(getUsers());
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
          {/* Gestión de Usuarios */}
          <section>
            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
              <UserCheck size={14} /> Gestión de Operarios
            </h3>
            
            <div className="bg-slate-950 border border-slate-800 p-4 mb-4">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={newUser}
                  onChange={(e) => setNewUser(e.target.value)}
                  placeholder="Nombre de Usuario..."
                  className="flex-1 bg-slate-900 border border-slate-700 px-4 py-2 text-slate-200 outline-none focus:border-emerald-500"
                />
                <div className="relative w-1/3">
                    <Lock size={14} className="absolute left-3 top-3 text-slate-500"/>
                    <input 
                    type="text" 
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    placeholder="Clave (Opcional)"
                    className="w-full bg-slate-900 border border-slate-700 pl-9 pr-2 py-2 text-slate-200 outline-none focus:border-emerald-500 text-sm"
                    />
                </div>
                <button 
                  onClick={handleAddUser}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 font-bold"
                >
                  <Plus size={20} />
                </button>
              </div>
              <p className="text-[10px] text-slate-500 mt-2">* Si dejas la clave vacía, será '123' por defecto.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {users.map((u: any) => (
                <div key={u.username} className="flex items-center justify-between bg-slate-800/50 border border-slate-800 p-3 px-4">
                  <div>
                      <span className="font-mono text-emerald-400 block">{u.username}</span>
                      <span className="text-[10px] text-slate-500">Clave: {u.password}</span>
                  </div>
                  {u.role !== 'ADMIN' && (
                    <button onClick={() => handleRemoveUser(u.username)} className="text-slate-600 hover:text-red-500">
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Configuración Global */}
          <section>
            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
              <Key size={14} /> Permisos Globales
            </h3>
            
            <div className="bg-slate-950 border border-slate-800 p-6 flex items-center justify-between">
              <div>
                <div className="text-slate-200 font-bold">Mostrar Consumo a Operarios</div>
                <div className="text-slate-500 text-xs mt-1">Permite que los operarios vean el gasto de material en yardas.</div>
              </div>
              
              <button 
                onClick={toggleMetric}
                className={`w-12 h-6 rounded-full p-1 transition-colors ${settings.showMetricsToOperator ? 'bg-emerald-600' : 'bg-slate-700'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full transition-transform ${settings.showMetricsToOperator ? 'translate-x-6' : 'translate-x-0'}`}></div>
              </button>
            </div>
          </section>
        </div>

        <div className="p-6 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button onClick={onClose} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-bold">
            <Save size={18} />
            CERRAR PANEL
          </button>
        </div>
      </div>
    </div>
  );
};
