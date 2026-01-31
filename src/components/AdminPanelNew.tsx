import React, { useState, useEffect } from 'react';
import { 
  X, ShieldAlert, Activity, Settings, Database, FileText, 
  Users, Cpu, Trash2, RefreshCw, Plus, Lock, 
  Megaphone, Radio, Layout, Download, Play, CheckCircle, 
  Eye, EyeOff // <--- NUEVOS ICONOS
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
  
  // Datos
  const [users, setUsers] = useState<any[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Inputs
  const [newUser, setNewUser] = useState('');
  const [newPass, setNewPass] = useState('');
  const [selectedMachineForUser, setSelectedMachineForUser] = useState('');
  const [newMachineName, setNewMachineName] = useState('');
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');

  // Configuración
  const [localSettings, setLocalSettings] = useState(getSettings());

  // Nesting
  const [nestingProcessing, setNestingProcessing] = useState(false);
  const [showNestingResult, setShowNestingResult] = useState(false);

  // --- NUEVO: Estado para ocultar/mostrar contraseñas individualmente ---
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());

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

  // --- FUNCIÓN PARA MOSTRAR/OCULTAR CLAVE ---
  const togglePasswordVisibility = (username: string) => {
      const newSet = new Set(visiblePasswords);
      if (newSet.has(username)) {
          newSet.delete(username); // Ocultar
      } else {
          newSet.add(username); // Mostrar
      }
      setVisiblePasswords(newSet);
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
  const getMachineName = (id?: string) => { const m = machines.find(m => m.id === id); return m ? m.name : 'Sin Asignar'; };

  if (!isOpen) return null;

  const SidebarItem = ({ id, icon: Icon, label, alert }: any) => (
    <button onClick={() => setActiveTab(id)} className={`w-full flex items-center gap-3 px-4 py-3 text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === id ? 'bg-slate-800 text-emerald-400 border-r-2 border-emerald-500' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900'}`}>
      <Icon size={16} /> <span className="flex-1 text-left">{label}</span>{alert && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>}
    </button>
  );

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-slate-950 border border-slate-800 w-full max-w-5xl h-[85vh] flex shadow-2xl overflow-hidden rounded-lg relative">
        
        {/* MODAL DE NESTING */}
        {showNestingResult && (
            <div className="absolute inset-0 bg-black/95 z-50 flex flex-col items-center justify-center text-center p-8 animate-in fade-in zoom-in duration-300">
                <CheckCircle size={64} className="text-emerald-500 mb-6" />
                <h3 className="text-3xl font-black text-white mb-2">¡OPTIMIZACIÓN COMPLETADA!</h3>
                <div className="flex gap-4 mt-8"><button onClick={() => setShowNestingResult(false)} className="px-6 py-3 rounded border border-slate-700 text-slate-300">Descartar</button><button onClick={applyNesting} className="px-8 py-3 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold">Aplicar</button></div>
            </div>
        )}

        {/* SIDEBAR */}
        <div className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col overflow-y-auto">
          <div className="p-6 border-b border-slate-800"><h2 className="text-lg font-black text-white flex items-center gap-2"><ShieldAlert className="text-emerald-500" size={20} /> ADMIN v2.5</h2></div>
          <div className="flex-1 py-4 space-y-1">
            <SidebarItem id="DASHBOARD" icon={Activity} label="Monitor Live" />
            <SidebarItem id="REPORTS" icon={FileText} label="Reportes PDF" />
            <SidebarItem id="NESTING" icon={Layout} label="Nesting AI (Beta)" />
            <SidebarItem id="FLEET" icon={Cpu} label="Flota Máquinas" alert={machines.some(m => m.status !== 'OK')} />
            <SidebarItem id="USERS" icon={Users} label="Usuarios" />
            <SidebarItem id="CONFIG" icon={Settings} label="Configuración" />
            <SidebarItem id="SECURITY" icon={Database} label="Seguridad" />
          </div>
          <div className="p-4 border-t border-slate-800"><button onClick={onClose} className="w-full flex items-center justify-center gap-2 text-xs font-bold text-slate-500 hover:text-white py-2"><X size={14} /> CERRAR</button></div>
        </div>

        {/* CONTENIDO PRINCIPAL */}
        <div className="flex-1 bg-black/50 flex flex-col min-w-0">
            <div className="h-16 border-b border-slate-800 flex items-center justify-between px-8 bg-slate-900/50">
                <h3 className="text-xl font-bold text-white tracking-wide">{activeTab}</h3>
                <div className="flex items-center gap-4"><span className="flex items-center gap-2 text-[10px] font-mono text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20"><Radio size={12} className="animate-pulse"/> ONLINE</span></div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                
                {/* 1. DASHBOARD */}
                {activeTab === 'DASHBOARD' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-slate-900 p-5 rounded border border-slate-800"><div className="text-slate-500 text-xs font-bold uppercase mb-2">Máquinas</div><div className="text-3xl font-mono text-white">{machines.length}</div></div>
                            <div className="bg-slate-900 p-5 rounded border border-slate-800"><div className="text-slate-500 text-xs font-bold uppercase mb-2">Operarios</div><div className="text-3xl font-mono text-emerald-400">{users.length}</div></div>
                            <div className="bg-slate-900 p-5 rounded border border-slate-800"><div className="text-slate-500 text-xs font-bold uppercase mb-2">Logs</div><div className="text-3xl font-mono text-amber-400">{logs.length}</div></div>
                        </div>
                        <div className="bg-slate-900 rounded border border-slate-800 p-6 relative overflow-hidden group">
                            <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-4 flex gap-2 items-center"><Megaphone size={14}/> Anuncios</h4>
                            <div className="flex gap-2"><input value={broadcastMsg} onChange={e => setBroadcastMsg(e.target.value)} type="text" className="flex-1 bg-black border border-slate-700 p-3 text-sm text-white rounded outline-none" /><button onClick={handleBroadcast} className="bg-emerald-600 text-white px-6 font-bold text-xs rounded uppercase">Enviar</button></div>
                        </div>
                    </div>
                )}

                {/* 2. REPORTES */}
                {activeTab === 'REPORTS' && (
                    <div className="space-y-6">
                        <div className="bg-slate-900 p-8 rounded border border-slate-800 flex flex-col items-center text-center">
                            <FileText size={48} className="text-slate-700 mb-4" />
                            <h3 className="text-xl font-bold text-white mb-2">Generador de Reportes</h3>
                            <div className="flex gap-4 items-end bg-black p-4 rounded border border-slate-800 mb-6">
                                <div><label className="text-[10px] text-slate-500 font-bold block mb-1">INICIO</label><input type="date" value={dateStart} onChange={e => setDateStart(e.target.value)} className="bg-slate-900 border border-slate-700 text-white p-2 rounded text-xs"/></div>
                                <div><label className="text-[10px] text-slate-500 font-bold block mb-1">FIN</label><input type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)} className="bg-slate-900 border border-slate-700 text-white p-2 rounded text-xs"/></div>
                            </div>
                            <button onClick={handleDownloadReport} className="bg-slate-100 hover:bg-white text-slate-900 px-8 py-3 rounded font-bold text-sm flex items-center gap-2"><Download size={18} /> DESCARGAR CSV</button>
                        </div>
                    </div>
                )}

                {/* 3. NESTING */}
                {activeTab === 'NESTING' && (
                    <div className="h-full flex flex-col items-center justify-center bg-slate-900 rounded border border-slate-800">
                        {nestingProcessing ? <RefreshCw size={48} className="text-emerald-500 animate-spin mb-4"/> : <Layout size={64} className="text-slate-600 mb-4"/>}
                        <button onClick={handleNesting} disabled={nestingProcessing} className="bg-indigo-600 text-white px-6 py-4 rounded font-bold text-sm flex items-center gap-3"><Play size={18} /> INICIAR NESTING</button>
                    </div>
                )}

                {/* 4. FLEET */}
                {activeTab === 'FLEET' && (
                    <div className="space-y-6">
                         <div className="flex gap-2 mb-6 p-4 bg-slate-900/50 border border-slate-800 rounded">
                            <input type="text" value={newMachineName} onChange={(e) => setNewMachineName(e.target.value)} placeholder="Nombre máquina..." className="flex-1 bg-black border border-slate-700 p-2 text-sm text-white rounded outline-none focus:border-emerald-500" />
                            <button onClick={handleAddMachine} disabled={loading} className="bg-slate-800 hover:bg-emerald-600 text-emerald-400 hover:text-white px-4 text-xs font-bold rounded uppercase flex items-center gap-2 transition-colors"><Plus size={14} /> Agregar</button>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            {machines.map(m => (
                                <div key={m.id} className="bg-slate-900 border border-slate-800 p-5 rounded">
                                    <div className="flex justify-between mb-4"><div className="font-bold text-white text-sm flex items-center gap-2"><Cpu size={16} className={m.status === 'OK' ? 'text-emerald-500' : 'text-amber-500'} />{m.name}</div><span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400">{m.status}</span></div>
                                    <div className="mb-2 flex justify-between text-[10px] text-slate-500 font-bold"><span>Salud</span><span>{m.distance.toFixed(1)} / {m.limit} m</span></div>
                                    <div className="w-full h-2 bg-black rounded-full overflow-hidden mb-4"><div className={`h-full ${m.status === 'OK' ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${Math.min((m.distance / m.limit) * 100, 100)}%` }}></div></div>
                                    <button onClick={() => handleResetMachine(m.id)} className="w-full py-2 border border-slate-700 hover:bg-slate-800 text-slate-400 text-[10px] font-bold uppercase rounded">Resetear</button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 5. USERS (AHORA CON CLAVES OCULTAS) */}
                {activeTab === 'USERS' && (
                    <div className="space-y-6">
                        <div className="bg-slate-900 border border-slate-800 p-5 rounded">
                            <h4 className="text-xs font-bold text-slate-400 uppercase mb-4">Nuevo Operario</h4>
                            <div className="grid grid-cols-12 gap-3">
                                <div className="col-span-4"><input type="text" value={newUser} onChange={(e) => setNewUser(e.target.value)} className="w-full bg-black border border-slate-700 p-2 text-sm text-white rounded outline-none focus:border-emerald-500" placeholder="Usuario" /></div>
                                <div className="col-span-3"><input type="text" value={newPass} onChange={(e) => setNewPass(e.target.value)} className="w-full bg-black border border-slate-700 p-2 text-sm text-white rounded outline-none focus:border-emerald-500" placeholder="Clave" /></div>
                                <div className="col-span-4"><select value={selectedMachineForUser} onChange={(e) => setSelectedMachineForUser(e.target.value)} className="w-full bg-black border border-slate-700 p-2 text-sm text-white rounded outline-none focus:border-emerald-500"><option value="">-- Máquina --</option>{machines.map(m => (<option key={m.id} value={m.id}>{m.name}</option>))}</select></div>
                                <div className="col-span-1"><button onClick={handleAddUser} disabled={loading} className="w-full bg-emerald-600 text-white h-[38px] rounded flex items-center justify-center"><Plus size={18} /></button></div>
                            </div>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 rounded overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-black text-[10px] text-slate-500 font-bold uppercase">
                                    <tr>
                                        <th className="p-4">Usuario</th>
                                        <th className="p-4">Clave</th>
                                        <th className="p-4">Rol</th>
                                        <th className="p-4">Máquina</th>
                                        <th className="p-4 text-right">Acción</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm text-slate-300 divide-y divide-slate-800">
                                    {users.map((u: any) => (
                                        <tr key={u.username}>
                                            <td className="p-4 font-mono">{u.username}</td>
                                            <td className="p-4">
                                                {/* SISTEMA DE OCULTAR CLAVES */}
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-amber-400">
                                                        {visiblePasswords.has(u.username) ? u.password : '••••••'}
                                                    </span>
                                                    <button 
                                                        onClick={() => togglePasswordVisibility(u.username)}
                                                        className="text-slate-500 hover:text-white transition-colors"
                                                        title="Mostrar/Ocultar"
                                                    >
                                                        {visiblePasswords.has(u.username) ? <EyeOff size={14}/> : <Eye size={14}/>}
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="p-4">{u.role}</td>
                                            <td className="p-4 text-emerald-400 text-xs">{getMachineName(u.machineId)}</td>
                                            <td className="p-4 text-right">
                                                {u.role!=='ADMIN'&&(<button onClick={()=>handleRemoveUser(u.username)} className="text-slate-500 hover:text-red-500"><Trash2 size={16}/></button>)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* 6. CONFIG & SECURITY */}
                {(activeTab === 'CONFIG' || activeTab === 'SECURITY') && (
                    <div className="bg-slate-900 p-6 rounded border border-slate-800">
                        {activeTab === 'CONFIG' ? (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between p-4 bg-black/30 rounded border border-slate-800">
                                    <div><div className="text-slate-200 font-bold text-sm">Etiquetado</div><div className="text-slate-500 text-xs">Mostrar tallas.</div></div>
                                    <button onClick={() => toggleSetting('enableLabeling')} className={`w-12 h-6 rounded-full p-1 ${localSettings.enableLabeling ? 'bg-emerald-600' : 'bg-slate-700'}`}><div className={`w-4 h-4 bg-white rounded-full transition-transform ${localSettings.enableLabeling ? 'translate-x-6' : 'translate-x-0'}`}></div></button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <h4 className="text-sm font-bold text-white">Bitácora de Eventos</h4>
                                <div className="bg-black border border-slate-800 p-4 rounded font-mono text-xs h-96 overflow-y-auto custom-scrollbar">
                                    {logs.map(l => (
                                        <div key={l.id} className="mb-1 text-slate-400"><span className="text-emerald-500">[{l.type}]</span> {l.message} <span className="text-slate-600">({l.timestamp})</span></div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

            </div>
        </div>
      </div>
    </div>
  );
};