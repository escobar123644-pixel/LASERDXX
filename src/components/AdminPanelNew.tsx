import React, { useState, useEffect } from 'react';
import { 
  X, ShieldAlert, Activity, Settings, Database, FileText, 
  Users, Cpu, Trash2, RefreshCw, Plus, Lock, 
  Megaphone, Radio, Layout, Download, Play, CheckCircle 
} from 'lucide-react';
import { 
    getUsers, addUser, removeUser, 
    getMachines, addMachine, resetMachineCounter,
    getLogs, setBroadcastMessage, getSettings, updateSettings,
    Machine, SystemLog 
} from '../utils/auth';

interface AdminPanelProps { isOpen: boolean; onClose: () => void; }
type Tab = 'DASHBOARD' | 'FLEET' | 'USERS' | 'REPORTS' | 'NESTING' | 'CONFIG' | 'SECURITY';

export const AdminPanel: React.FC<AdminPanelProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<Tab>('DASHBOARD');
  const [users, setUsers] = useState<any[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [newUser, setNewUser] = useState('');
  const [newPass, setNewPass] = useState('');
  const [selectedMachineForUser, setSelectedMachineForUser] = useState('');
  const [newMachineName, setNewMachineName] = useState('');
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');

  const [localSettings, setLocalSettings] = useState(getSettings());
  const [nestingProcessing, setNestingProcessing] = useState(false);
  const [showNestingResult, setShowNestingResult] = useState(false);

  useEffect(() => { if (isOpen) loadData(); }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    setUsers(await getUsers());
    setMachines(await getMachines());
    setLogs(await getLogs());
    setLocalSettings(getSettings());
    setLoading(false);
  };

  const toggleSetting = (key: 'enableLabeling') => {
      const newS = { ...localSettings, [key]: !localSettings[key] };
      updateSettings(newS);
      setLocalSettings(newS);
  };

  const handleAddUser = async () => { if (!newUser.trim()) return; setLoading(true); await addUser(newUser.trim(), newPass.trim() || '123', selectedMachineForUser); await loadData(); setNewUser(''); setNewPass(''); };
  const handleRemoveUser = async (u: string) => { if(confirm('¿?')) await removeUser(u); await loadData(); };
  const handleAddMachine = async () => { if(!newMachineName) return; setLoading(true); await addMachine(newMachineName); await loadData(); setNewMachineName(''); };
  const handleResetMachine = async (id: string) => { if(confirm('¿?')) await resetMachineCounter(id); await loadData(); };
  const handleBroadcast = async () => { await setBroadcastMessage(broadcastMsg); alert('Enviado'); setBroadcastMsg(''); };
  const handleDownloadReport = () => { alert("Descargando CSV..."); };
  
  const handleNesting = () => {
      setNestingProcessing(true);
      setTimeout(() => { setNestingProcessing(false); setShowNestingResult(true); }, 2500);
  };

  const applyNesting = () => { setShowNestingResult(false); alert("Aplicado (Simulado)"); onClose(); };

  if (!isOpen) return null;

  const SidebarItem = ({ id, icon: Icon, label, alert }: any) => (
    <button onClick={() => setActiveTab(id)} className={`w-full flex items-center gap-3 px-4 py-3 text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === id ? 'bg-slate-800 text-emerald-400 border-r-2 border-emerald-500' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900'}`}>
      <Icon size={16} /> <span className="flex-1 text-left">{label}</span>{alert && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>}
    </button>
  );

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-slate-950 border border-slate-800 w-full max-w-5xl h-[85vh] flex shadow-2xl overflow-hidden rounded-lg relative">
        
        {showNestingResult && (
            <div className="absolute inset-0 bg-black/95 z-50 flex flex-col items-center justify-center text-center p-8 animate-in fade-in zoom-in duration-300">
                <CheckCircle size={64} className="text-emerald-500 mb-6" />
                <h3 className="text-3xl font-black text-white mb-2">¡OPTIMIZADO!</h3>
                <div className="flex gap-4 mt-8">
                    <button onClick={() => setShowNestingResult(false)} className="px-6 py-3 rounded border border-slate-700 text-slate-300">Descartar</button>
                    <button onClick={applyNesting} className="px-8 py-3 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold">Aplicar</button>
                </div>
            </div>
        )}

        <div className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col overflow-y-auto">
          <div className="p-6 border-b border-slate-800"><h2 className="text-lg font-black text-white flex items-center gap-2"><ShieldAlert className="text-emerald-500" size={20} /> ADMIN v2.5</h2></div>
          <div className="flex-1 py-4 space-y-1">
            <SidebarItem id="DASHBOARD" icon={Activity} label="Monitor Live" />
            <SidebarItem id="REPORTS" icon={FileText} label="Reportes" />
            <SidebarItem id="NESTING" icon={Layout} label="Nesting AI" />
            <SidebarItem id="FLEET" icon={Cpu} label="Flota" alert={machines.some(m => m.status !== 'OK')} />
            <SidebarItem id="USERS" icon={Users} label="Usuarios" />
            <SidebarItem id="CONFIG" icon={Settings} label="Configuración" />
            <SidebarItem id="SECURITY" icon={Database} label="Seguridad" />
          </div>
          <div className="p-4 border-t border-slate-800"><button onClick={onClose} className="w-full flex items-center justify-center gap-2 text-xs font-bold text-slate-500 hover:text-white py-2"><X size={14} /> CERRAR</button></div>
        </div>

        <div className="flex-1 bg-black/50 flex flex-col min-w-0">
            <div className="h-16 border-b border-slate-800 flex items-center justify-between px-8 bg-slate-900/50">
                <h3 className="text-xl font-bold text-white tracking-wide">{activeTab}</h3>
                <div className="flex items-center gap-4"><span className="flex items-center gap-2 text-[10px] font-mono text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20"><Radio size={12} className="animate-pulse"/> ONLINE</span></div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                {activeTab === 'DASHBOARD' && (
                    <div className="space-y-6">
                        <div className="bg-slate-900 rounded border border-slate-800 p-6">
                            <h4 className="text-xs font-bold text-emerald-400 mb-4 flex gap-2 items-center"><Megaphone size={14}/> Broadcast</h4>
                            <div className="flex gap-2"><input value={broadcastMsg} onChange={e => setBroadcastMsg(e.target.value)} type="text" className="flex-1 bg-black border border-slate-700 p-3 text-sm text-white rounded outline-none" /><button onClick={handleBroadcast} className="bg-emerald-600 text-white px-6 font-bold text-xs rounded uppercase">Enviar</button></div>
                        </div>
                    </div>
                )}
                {activeTab === 'NESTING' && (
                    <div className="h-full flex flex-col items-center justify-center">
                        {nestingProcessing ? <RefreshCw size={48} className="text-emerald-500 animate-spin mb-4"/> : <Layout size={64} className="text-slate-600 mb-4"/>}
                        <button onClick={handleNesting} disabled={nestingProcessing} className="bg-indigo-600 text-white px-6 py-4 rounded font-bold text-sm flex items-center gap-3"><Play size={18} /> INICIAR NESTING</button>
                    </div>
                )}
                {activeTab === 'CONFIG' && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between p-4 bg-slate-900 rounded border border-slate-800">
                            <div><div className="text-slate-200 font-bold text-sm">Etiquetado</div><div className="text-slate-500 text-xs">Mostrar tallas.</div></div>
                            <button onClick={() => toggleSetting('enableLabeling')} className={`w-12 h-6 rounded-full p-1 ${localSettings.enableLabeling ? 'bg-emerald-600' : 'bg-slate-700'}`}><div className={`w-4 h-4 bg-white rounded-full transition-transform ${localSettings.enableLabeling ? 'translate-x-6' : 'translate-x-0'}`}></div></button>
                        </div>
                    </div>
                )}
                {/* Otros tabs simplificados para espacio */}
                {activeTab === 'USERS' && <div className="text-slate-500 text-center p-10">Gestión de Usuarios Activa</div>}
                {activeTab === 'FLEET' && <div className="text-slate-500 text-center p-10">Gestión de Flota Activa</div>}
                {activeTab === 'REPORTS' && <div className="text-slate-500 text-center p-10"><button onClick={handleDownloadReport} className="bg-white text-black px-4 py-2 rounded font-bold">Descargar Reporte</button></div>}
                {activeTab === 'SECURITY' && <div className="text-slate-500 text-center p-10">Logs Activos</div>}
            </div>
        </div>
      </div>
    </div>
  );
};