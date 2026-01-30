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

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'DASHBOARD' | 'FLEET' | 'USERS' | 'REPORTS' | 'NESTING' | 'CONFIG' | 'SECURITY';

export const AdminPanel: React.FC<AdminPanelProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<Tab>('DASHBOARD');
  
  // Estados de Datos
  const [users, setUsers] = useState<any[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Inputs Formularios
  const [newUser, setNewUser] = useState('');
  const [newPass, setNewPass] = useState('');
  const [selectedMachineForUser, setSelectedMachineForUser] = useState('');
  const [newMachineName, setNewMachineName] = useState('');
  const [broadcastMsg, setBroadcastMsg] = useState('');
  
  // Inputs Reportes
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');

  // Configuración
  const [localSettings, setLocalSettings] = useState(getSettings());

  // Nesting
  const [nestingProcessing, setNestingProcessing] = useState(false);
  const [showNestingResult, setShowNestingResult] = useState(false);

  useEffect(() => {
    if (isOpen) {
        loadData();
    }
  }, [isOpen]);

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

  // --- HANDLERS (ACCIONES) ---

  const handleAddUser = async () => {
    if (!newUser.trim()) return;
    setLoading(true);
    await addUser(newUser.trim(), newPass.trim() || '123', selectedMachineForUser);
    await loadData();
    setNewUser('');
    setNewPass('');
    setSelectedMachineForUser('');
    setLoading(false);
  };

  const handleRemoveUser = async (username: string) => {
    if (confirm(`¿Eliminar usuario ${username}?`)) {
        setLoading(true);
        await removeUser(username);
        await loadData();
        setLoading(false);
    }
  };

  const handleAddMachine = async () => {
      if(!newMachineName) return;
      setLoading(true);
      await addMachine(newMachineName);
      await loadData();
      setNewMachineName('');
      setLoading(false);
  };

  const handleResetMachine = async (id: string) => {
      if(confirm("¿Confirmas el mantenimiento? El contador volverá a 0.")) {
          setLoading(true);
          await resetMachineCounter(id);
          await loadData();
          setLoading(false);
      }
  };

  const handleBroadcast = async () => {
      setLoading(true);
      await setBroadcastMessage(broadcastMsg);
      alert("Mensaje enviado a todas las terminales.");
      setBroadcastMsg('');
      setLoading(false);
  };

  const handleDownloadReport = () => {
      const filteredLogs = logs.filter(l => {
          if (!dateStart || !dateEnd) return true;
          const logDate = new Date(l.timestamp);
          return logDate >= new Date(dateStart) && logDate <= new Date(dateEnd);
      });
      
      const csvContent = "data:text/csv;charset=utf-8," 
          + "FECHA,TIPO,MENSAJE,USUARIO\n"
          + filteredLogs.map(e => `${e.timestamp},${e.type},${e.message},${e.user}`).join("\n");
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "reporte_produccion.csv");
      document.body.appendChild(link);
      link.click();
  };

  const handleNesting = () => {
      setNestingProcessing(true);
      setTimeout(() => {
          setNestingProcessing(false);
          setShowNestingResult(true);
      }, 2500);
  };

  const applyNesting = () => {
      setShowNestingResult(false);
      alert("Trazo optimizado aplicado. (Simulación)");
      onClose();
  };

  if (!isOpen) return null;

  const SidebarItem = ({ id, icon: Icon, label, alert }: any) => (
    <button 
      onClick={() => setActiveTab(id)}
      className={`w-full flex items-center gap-3 px-4 py-3 text-[10px] font-bold uppercase tracking-widest transition-all
        ${activeTab === id 
          ? 'bg-slate-800 text-emerald-400 border-r-2 border-emerald-500' 
          : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900'
        }`}
    >
      <Icon size={16} />
      <span className="flex-1 text-left">{label}</span>
      {alert && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>}
    </button>
  );

  const getMachineName = (id?: string) => {
      const m = machines.find(m => m.id === id);
      return m ? m.name : 'Sin Asignar';
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-slate-950 border border-slate-800 w-full max-w-5xl h-[85vh] flex shadow-2xl overflow-hidden rounded-lg relative">
        
        {/* MODAL DE NESTING */}
        {showNestingResult && (
            <div className="absolute inset-0 bg-black/95 z-50 flex flex-col items-center justify-center text-center p-8 animate-in fade-in zoom-in duration-300">
                <CheckCircle size={64} className="text-emerald-500 mb-6" />
                <h3 className="text-3xl font-black text-white mb-2">¡OPTIMIZACIÓN COMPLETADA!</h3>
                <p className="text-slate-400 mb-8">La inteligencia artificial ha encontrado una mejor distribución.</p>
                <div className="grid grid-cols-2 gap-8 mb-8 w-full max-w-lg">
                    <div className="bg-slate-900 p-6 rounded border border-slate-800">
                        <div className="text-xs text-slate-500 uppercase font-bold">Consumo Original</div>
                        <div className="text-2xl text-slate-300 line-through decoration-red-500">125.40 yd</div>
                    </div>
                    <div className="bg-emerald-900/20 p-6 rounded border border-emerald-500/50">
                        <div className="text-xs text-emerald-400 uppercase font-bold">Consumo Optimizado</div>
                        <div className="text-4xl text-white font-black">119.85 yd</div>
                        <div className="text-xs text-emerald-400 mt-1">▼ 4.4% AHORRO</div>
                    </div>
                </div>
                <div className="flex gap-4">
                    <button onClick={() => setShowNestingResult(false)} className="px-6 py-3 rounded border border-slate-700 text-slate-300 hover:text-white hover:border-white transition-all font-bold text-xs uppercase">Descartar</button>
                    <button onClick={applyNesting} className="px-8 py-3 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase shadow-lg shadow-emerald-900/50 hover:scale-105 transition-all">Aplicar Cambios</button>
                </div>
            </div>
        )}

        {/* SIDEBAR */}
        <div className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col overflow-y-auto">
          <div className="p-6 border-b border-slate-800">
            <h2 className="text-lg font-black text-white flex items-center gap-2 tracking-tighter">
              <ShieldAlert className="text-emerald-500" size={20} /> ADMIN <span className="text-slate-600">v2.5</span>
            </h2>
          </div>
          <div className="flex-1 py-4 space-y-1">
            <div className="px-4 text-[10px] font-bold text-slate-600 mb-2 mt-2">GENERAL</div>
            <SidebarItem id="DASHBOARD" icon={Activity} label="Monitor Live" />
            <SidebarItem id="REPORTS" icon={FileText} label="Reportes PDF" />
            
            <div className="px-4 text-[10px] font-bold text-slate-600 mb-2 mt-6">OPERACIÓN</div>
            <SidebarItem id="NESTING" icon={Layout} label="Nesting AI (Beta)" />
            <SidebarItem id="FLEET" icon={Cpu} label="Flota Máquinas" alert={machines.some(m => m.status !== 'OK')} />
            <SidebarItem id="USERS" icon={Users} label="Operarios" />
            
            <div className="px-4 text-[10px] font-bold text-slate-600 mb-2 mt-6">SISTEMA</div>
            <SidebarItem id="CONFIG" icon={Settings} label="Configuración" />
            <SidebarItem id="SECURITY" icon={Database} label="Seguridad" />
          </div>
          <div className="p-4 border-t border-slate-800">
            <button onClick={onClose} className="w-full flex items-center justify-center gap-2 text-xs font-bold text-slate-500 hover:text-white py-2">
              <X size={14} /> CERRAR
            </button>
          </div>
        </div>

        {/* CONTENIDO PRINCIPAL */}
        <div className="flex-1 bg-black/50 flex flex-col min-w-0">
            
            <div className="h-16 border-b border-slate-800 flex items-center justify-between px-8 bg-slate-900/50">
                <h3 className="text-xl font-bold text-white tracking-wide">
                    {activeTab === 'DASHBOARD' && 'PANEL DE CONTROL'}
                    {activeTab === 'FLEET' && 'MANTENIMIENTO DE MÁQUINAS'}
                    {activeTab === 'USERS' && 'GESTIÓN DE USUARIOS'}
                    {activeTab === 'REPORTS' && 'REPORTES DE PRODUCCIÓN'}
                    {activeTab === 'NESTING' && 'OPTIMIZACIÓN DE TRAZO'}
                    {activeTab === 'CONFIG' && 'AJUSTES GLOBALES'}
                    {activeTab === 'SECURITY' && 'BITÁCORA DE SEGURIDAD'}
                </h3>
                <div className="flex items-center gap-4">
                     <button onClick={loadData} disabled={loading} className="text-slate-500 hover:text-white transition-colors">
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                     </button>
                     <span className="flex items-center gap-2 text-[10px] font-mono text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                        <Radio size={12} className="animate-pulse"/> DATABASE LINKED
                     </span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                
                {/* --- DASHBOARD + BROADCAST --- */}
                {activeTab === 'DASHBOARD' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-slate-900 p-5 rounded border border-slate-800">
                                <div className="text-slate-500 text-xs font-bold uppercase mb-2">Máquinas Activas</div>
                                <div className="text-3xl font-mono text-white">{machines.length}</div>
                            </div>
                            <div className="bg-slate-900 p-5 rounded border border-slate-800">
                                <div className="text-slate-500 text-xs font-bold uppercase mb-2">Operarios Registrados</div>
                                <div className="text-3xl font-mono text-emerald-400">{users.length}</div>
                            </div>
                            <div className="bg-slate-900 p-5 rounded border border-slate-800">
                                <div className="text-slate-500 text-xs font-bold uppercase mb-2">Eventos Hoy</div>
                                <div className="text-3xl font-mono text-amber-400">{logs.length}</div>
                            </div>
                        </div>
                        
                        <div className="bg-slate-900 rounded border border-slate-800 p-6 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-10"><Megaphone size={80} /></div>
                            <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-4 flex gap-2 items-center">📢 Sistema de Anuncios (Broadcast)</h4>
                            <div className="flex gap-2">
                                <input value={broadcastMsg} onChange={e => setBroadcastMsg(e.target.value)} type="text" placeholder="Ej: PARADA DE PLANTA EN 5 MINUTOS..." className="flex-1 bg-black border border-slate-700 p-3 text-sm text-white rounded outline-none focus:border-emerald-500 placeholder:text-slate-600" />
                                <button onClick={handleBroadcast} disabled={loading || !broadcastMsg} className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 font-bold text-xs rounded uppercase transition-all shadow-lg shadow-emerald-900/20">Enviar Alerta</button>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-2">Este mensaje aparecerá instantáneamente en las pantallas de todos los operarios activos.</p>
                        </div>
                    </div>
                )}

                {/* --- REPORTES --- */}
                {activeTab === 'REPORTS' && (
                    <div className="space-y-6">
                        <div className="bg-slate-900 p-8 rounded border border-slate-800 flex flex-col items-center text-center">
                            <FileText size={48} className="text-slate-700 mb-4" />
                            <h3 className="text-xl font-bold text-white mb-2">Generador de Reportes de Producción</h3>
                            <p className="text-sm text-slate-400 max-w-md mb-8">Selecciona el rango de fechas para generar el informe detallado de consumo, actividad de usuarios y estado de maquinaria.</p>
                            
                            <div className="flex gap-4 items-end bg-black p-4 rounded border border-slate-800 mb-6">
                                <div>
                                    <label className="text-[10px] text-slate-500 font-bold block mb-1">FECHA INICIO</label>
                                    <input type="date" value={dateStart} onChange={e => setDateStart(e.target.value)} className="bg-slate-900 border border-slate-700 text-white p-2 rounded text-xs outline-none focus:border-emerald-500"/>
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-500 font-bold block mb-1">FECHA FIN</label>
                                    <input type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)} className="bg-slate-900 border border-slate-700 text-white p-2 rounded text-xs outline-none focus:border-emerald-500"/>
                                </div>
                            </div>

                            <button onClick={handleDownloadReport} className="bg-slate-100 hover:bg-white text-slate-900 px-8 py-3 rounded font-bold text-sm flex items-center gap-2 transition-all shadow-xl hover:scale-105">
                                <Download size={18} /> DESCARGAR REPORTE (CSV/PDF)
                            </button>
                        </div>
                    </div>
                )}

                {/* --- NESTING --- */}
                {activeTab === 'NESTING' && (
                    <div className="h-full flex flex-col">
                        <div className="flex-1 bg-slate-900 rounded border border-slate-800 relative overflow-hidden flex items-center justify-center">
                            {nestingProcessing ? (
                                <div className="text-center">
                                    <RefreshCw size={48} className="text-emerald-500 animate-spin mx-auto mb-4" />
                                    <h3 className="text-lg font-bold text-white animate-pulse">OPTIMIZANDO TRAZO...</h3>
                                    <p className="text-xs text-emerald-400 font-mono mt-2">Calculando geometría...</p>
                                </div>
                            ) : (
                                <div className="text-center opacity-50 hover:opacity-100 transition-opacity">
                                    <Layout size={64} className="text-slate-600 mx-auto mb-4" />
                                    <h3 className="text-2xl font-black text-slate-300">NESTING AI ENGINE</h3>
                                    <p className="text-sm text-slate-500 mt-2">Sube un archivo para optimizar el consumo de tela.</p>
                                </div>
                            )}
                        </div>
                        <div className="mt-4 flex justify-end">
                            <button onClick={handleNesting} disabled={nestingProcessing} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-4 rounded font-bold text-sm flex items-center gap-3 shadow-lg shadow-indigo-900/20 transition-all">
                                <Play size={18} fill="currentColor" /> INICIAR OPTIMIZACIÓN (BETA)
                            </button>
                        </div>
                    </div>
                )}

                {/* --- FLEET (FORMULARIO RESTAURADO) --- */}
                {activeTab === 'FLEET' && (
                    <div className="space-y-6">
                         <div className="flex gap-2 mb-6 p-4 bg-slate-900/50 border border-slate-800 rounded">
                            <input 
                                type="text" 
                                value={newMachineName}
                                onChange={(e) => setNewMachineName(e.target.value)}
                                placeholder="Nombre de nueva máquina (Ej: Láser Corte 01)" 
                                className="flex-1 bg-black border border-slate-700 p-2 text-sm text-white rounded outline-none focus:border-emerald-500" 
                            />
                            <button onClick={handleAddMachine} disabled={loading} className="bg-slate-800 hover:bg-emerald-600 text-emerald-400 hover:text-white px-4 text-xs font-bold rounded uppercase flex items-center gap-2 transition-colors">
                                <Plus size={14} /> Agregar
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {machines.length === 0 && <div className="text-slate-500 text-sm p-4">No hay máquinas registradas.</div>}
                            
                            {machines.map(m => (
                                <div key={m.id} className={`bg-slate-900 border p-5 rounded transition-colors ${m.status === 'OK' ? 'border-slate-800 hover:border-slate-600' : 'border-amber-900/50 hover:border-amber-500'}`}>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="font-bold text-white text-sm flex items-center gap-2">
                                            <Cpu size={16} className={m.status === 'OK' ? 'text-emerald-500' : 'text-amber-500'} />
                                            {m.name}
                                        </div>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${m.status === 'OK' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                            {m.status}
                                        </span>
                                    </div>
                                    <div className="mb-2 flex justify-between text-[10px] text-slate-500 uppercase font-bold">
                                        <span>Salud / Mantenimiento</span>
                                        <span>{m.distance.toFixed(1)} / {m.limit} m</span>
                                    </div>
                                    <div className="w-full h-2 bg-black rounded-full overflow-hidden mb-4">
                                        <div 
                                            className={`h-full ${m.status === 'OK' ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                                            style={{ width: `${Math.min((m.distance / m.limit) * 100, 100)}%` }}
                                        ></div>
                                    </div>
                                    <button onClick={() => handleResetMachine(m.id)} className="w-full py-2 border border-slate-700 hover:bg-slate-800 text-slate-400 hover:text-white text-[10px] font-bold uppercase rounded transition-colors">
                                        Resetear Contador
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* --- USERS (FORMULARIO RESTAURADO) --- */}
                {activeTab === 'USERS' && (
                    <div className="space-y-6">
                        <div className="bg-slate-900 border border-slate-800 p-5 rounded">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Registrar Nuevo Operario</h4>
                            <div className="grid grid-cols-12 gap-3">
                                <div className="col-span-4">
                                    <label className="text-[10px] text-slate-500 block mb-1">USUARIO</label>
                                    <input type="text" value={newUser} onChange={(e) => setNewUser(e.target.value)} className="w-full bg-black border border-slate-700 p-2 text-sm text-white rounded outline-none focus:border-emerald-500" placeholder="Ej: Juan" />
                                </div>
                                <div className="col-span-3">
                                    <label className="text-[10px] text-slate-500 block mb-1">CLAVE</label>
                                    <input type="text" value={newPass} onChange={(e) => setNewPass(e.target.value)} className="w-full bg-black border border-slate-700 p-2 text-sm text-white rounded outline-none focus:border-emerald-500" placeholder="***" />
                                </div>
                                <div className="col-span-4">
                                    <label className="text-[10px] text-slate-500 block mb-1">ASIGNAR A MÁQUINA</label>
                                    <select 
                                        value={selectedMachineForUser}
                                        onChange={(e) => setSelectedMachineForUser(e.target.value)}
                                        className="w-full bg-black border border-slate-700 p-2 text-sm text-white rounded outline-none focus:border-emerald-500"
                                    >
                                        <option value="">-- Sin Asignar --</option>
                                        {machines.map(m => (
                                            <option key={m.id} value={m.id}>{m.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-span-1 flex items-end">
                                    <button onClick={handleAddUser} disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white h-[38px] rounded flex items-center justify-center">
                                        <Plus size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-900 border border-slate-800 rounded overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-black text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                    <tr>
                                        <th className="p-4">Usuario</th>
                                        <th className="p-4">Rol</th>
                                        <th className="p-4">Máquina Asignada</th>
                                        <th className="p-4 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm text-slate-300 divide-y divide-slate-800">
                                    {users.map((u: any) => (
                                        <tr key={u.username} className="hover:bg-slate-800/50">
                                            <td className="p-4 font-mono text-white">{u.username}</td>
                                            <td className="p-4"><span className="bg-slate-800 px-2 py-1 rounded text-[10px] font-bold">{u.role}</span></td>
                                            <td className="p-4 text-emerald-400 text-xs">
                                                {u.machineId ? getMachineName(u.machineId) : <span className="text-slate-600 opacity-50">--</span>}
                                            </td>
                                            <td className="p-4 text-right">
                                                {u.role !== 'ADMIN' && (
                                                    <button onClick={() => handleRemoveUser(u.username)} className="text-slate-500 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* --- CONFIG --- */}
                {activeTab === 'CONFIG' && (
                    <div className="space-y-6">
                        <div className="bg-slate-900 p-6 rounded border border-slate-800">
                            <h4 className="text-sm font-bold text-white mb-6 flex items-center gap-2"><Settings size={16}/> Preferencias de Procesamiento</h4>
                            
                            <div className="flex items-center justify-between p-4 bg-black/30 rounded border border-slate-800 mb-4">
                                <div>
                                    <div className="text-slate-200 font-bold text-sm">Etiquetado de Tallas</div>
                                    <div className="text-slate-500 text-xs">Detectar y dibujar textos de tallas (S, M, L) en el visor.</div>
                                </div>
                                <button 
                                    onClick={() => toggleSetting('enableLabeling')}
                                    className={`w-12 h-6 rounded-full p-1 transition-colors ${localSettings.enableLabeling ? 'bg-emerald-600' : 'bg-slate-700'}`}
                                >
                                    <div className={`w-4 h-4 bg-white rounded-full transition-transform ${localSettings.enableLabeling ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                </button>
                            </div>

                            <div className="opacity-50 pointer-events-none p-4 bg-black/30 rounded border border-slate-800">
                                <div className="text-slate-200 font-bold text-sm">Marca Blanca</div>
                                <div className="text-slate-500 text-xs">Personalización de logo y colores (Plan Enterprise).</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- SECURITY --- */}
                {activeTab === 'SECURITY' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="text-xs font-bold text-slate-500 uppercase">Bitácora de Eventos (Logs en Tiempo Real)</h4>
                            <button onClick={loadData} className="text-[10px] bg-slate-800 hover:bg-white hover:text-black text-white px-3 py-1 rounded transition-colors font-bold flex items-center gap-2">
                                <RefreshCw size={12} /> ACTUALIZAR
                            </button>
                        </div>
                        <div className="bg-black border border-slate-800 p-4 rounded font-mono text-xs h-96 overflow-y-auto custom-scrollbar shadow-inner">
                            {logs.length === 0 ? (
                                <div className="text-slate-600 text-center py-10">... bitácora vacía ...</div>
                            ) : (
                                logs.map((log) => (
                                    <div key={log.id} className="mb-1.5 border-b border-slate-900/50 pb-1 last:border-0 hover:bg-slate-900/30 px-2 -mx-2 rounded">
                                        <span className="text-slate-600 mr-3">[{log.timestamp}]</span>
                                        <span className={`font-bold mr-3 
                                            ${log.type === 'INFO' ? 'text-blue-400' : ''}
                                            ${log.type === 'WARN' ? 'text-amber-500' : ''}
                                            ${log.type === 'ERROR' ? 'text-red-500' : ''}
                                            ${log.type === 'EXPORT' ? 'text-emerald-400' : ''}
                                        `}>
                                            [{log.type}]
                                        </span>
                                        <span className="text-slate-300 mr-2">{log.message}</span>
                                        <span className="text-slate-600 italic">by {log.user}</span>
                                    </div>
                                ))
                            )}
                        </div>
                        
                        <div className="mt-8 pt-6 border-t border-slate-800">
                            <h4 className="text-xs font-bold text-red-500 uppercase mb-4 flex items-center gap-2"><Lock size={14}/> Zona de Peligro</h4>
                            <button className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/50 px-4 py-2 rounded text-xs font-bold transition-all">
                                CREAR COPIA DE SEGURIDAD (SNAPSHOT)
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </div>
      </div>
    </div>
  );
};
