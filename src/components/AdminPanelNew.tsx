import React, { useState } from 'react';
import { X, Plus, Save, Key, UserCheck, ShieldAlert } from 'lucide-react';
import { getUsers, addUser, removeUser, updateSettings, getSettings } from '../utils/auth';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ isOpen, onClose }) => {
  const [users, setUsers] = useState(getUsers());
  const [newUser, setNewUser] = useState('');
  const [settings, setLocalSettings] = useState(getSettings());

  const handleAddUser = () => {
    if (newUser.trim()) {
      addUser(newUser.trim());
      setUsers(getUsers());
      setNewUser('');
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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white">
          <X size={24} />
        </button>
        
        <div className="p-8 border-b border-slate-800 bg-slate-950">
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <ShieldAlert className="text-emerald-500" />
            SYSTEM CONFIGURATION
          </h2>
          <p className="text-slate-500 text-sm mt-1 uppercase tracking-widest">Master Control Panel</p>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {/* User Management */}
          <section>
            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
              <UserCheck size={14} /> Authorized Operators
            </h3>
            
            <div className="bg-slate-950 border border-slate-800 p-4 mb-4">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={newUser}
                  onChange={(e) => setNewUser(e.target.value)}
                  placeholder="NEW OPERATOR ID..."
                  className="flex-1 bg-slate-900 border border-slate-700 px-4 py-2 text-slate-200 outline-none focus:border-emerald-500"
                />
                <button 
                  onClick={handleAddUser}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 font-bold"
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {users.map(u => (
                <div key={u.username} className="flex items-center justify-between bg-slate-800/50 border border-slate-800 p-3 px-4">
                  <span className="font-mono text-emerald-400">{u.username}</span>
                  {u.role !== 'ADMIN' && (
                    <button onClick={() => handleRemoveUser(u.username)} className="text-slate-600 hover:text-red-500">
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Global Settings */}
          <section>
            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
              <Key size={14} /> Global Constraints
            </h3>
            
            <div className="bg-slate-950 border border-slate-800 p-6 flex items-center justify-between">
              <div>
                <div className="text-slate-200 font-bold">Operator Metrics Visibility</div>
                <div className="text-slate-500 text-xs mt-1">Show consumption stats to standard operators</div>
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
          <button onClick={onClose} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
            <Save size={18} />
            SAVE & CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
