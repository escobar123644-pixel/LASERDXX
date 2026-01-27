import React, { useState, useEffect } from 'react';
import { X, RefreshCw, Eye, EyeOff, FileText, AlertTriangle, UserPlus, Trash2, Users, Loader2 } from 'lucide-react';
import { globalReset, getHistory, getSettings, updateSettings, AppSettings, ExportRecord } from '../utils/auth';
import { Redis } from '@upstash/redis';

// Conexión a Upstash
const redis = new Redis({
  url: import.meta.env.VITE_UPSTASH_REDIS_REST_URL,
  token: import.meta.env.VITE_UPSTASH_REDIS_REST_TOKEN,
});

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ isOpen, onClose }) => {
  const [history, setHistory] = useState<ExportRecord[]>([]);
  const [settings, setSettings] = useState<AppSettings>({ showMetricsToOperator: false });
  const [resetConfirm, setResetConfirm] = useState(false);
  
  // Estados para Operarios (Upstash)
  const [operarios, setOperarios] = useState<string[]>([]);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setHistory(getHistory());
      setSettings(getSettings());
      setResetConfirm(false);
      cargarOperarios(); // Carga los operarios de la nube al abrir
    }
  }, [isOpen]);

  // Funciones de Operarios
  const cargarOperarios = async () => {
    try {
      const data = await redis.get<string[]>('lista_operarios');
      if (data) setOperarios(data);
    } catch (e) { console.error("Error cargando operarios"); }
  };

  const agregarOperario = async () => {
    if (!nuevoNombre.trim()) return;
    setCargando(true);
    const nuevaLista = [...operarios, nuevoNombre.trim().toUpperCase()];
    await redis.set('lista_operarios', nuevaLista);
    setOperarios(nuevaLista);
    setNuevoNombre('');
    setCargando(false);
  };

  const eliminarOperario = async (nombre: string) => {
    const nuevaLista = operarios.filter(op => op !== nombre);
    await redis.set('lista_operarios', nuevaLista);
    setOperarios(nuevaLista);
  };

  const handleGlobalReset = () => {
    if (resetConfirm) {
      globalReset();
      window.location.reload();
    } else {
      setResetConfirm(true);
    }
  };

  const toggleMetrics = () => {
    const newSettings = { ...settings, showMetricsToOperator: !settings.showMetricsToOperator };
    setSettings(newSettings);
    updateSettings(newSettings);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl rounded-sm">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-950">
          <div>
            <h2 className="text-xl font-bold text-slate-200 tracking-wider">ADMINISTRATION CONSOLE</h2>
            <p className="text-xs text-slate-500 uppercase mt-1">System Configuration & Audit</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* NUEVO Pillar: Gestión de Operarios */}
          <section className="bg-slate-950/50 p-6 border border-slate-800 rounded-sm">
            <h3 className="text-sm font-bold text-emerald-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Users size={16} /> Operative Personnel
            </h3>
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  placeholder="ENTER NEW OPERATOR NAME..."
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-sm px-4 py-2 text-slate-200 text-sm focus:border-emerald-500 outline-none uppercase font-mono"
                />
                <button
                  onClick={agregarOperario}
                  disabled={cargando}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-sm text-sm font-bold flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {cargando ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                  ADD
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
                {operarios.map((op) => (
                  <div key={op} className="flex justify-between items-center bg-slate-900/80 border border-slate-800 p-2 px-3 rounded-sm group hover:border-slate-600 transition-colors">
                    <span className="text-slate-300 font-mono text-sm">{op}</span>
                    <button onClick={() => eliminarOperario(op)} className="text-slate-600 hover:text-red-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Pillar 2: Privacy Controls */}
          <section className="bg-slate-950/50 p-6 border border-slate-800 rounded-sm">
            <h3 className="text-sm font-bold text-amber-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Eye size={16} /> Privacy Controls
            </h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-300 font-medium">Operator Metrics Visibility</p>
                <p className="text-slate-500 text-sm mt-1">Show material consumption (Yards) to standard operators.</p>
              </div>
              <button 
                onClick={toggleMetrics}
                className={`px-4 py-2 border transition-all text-sm font-bold uppercase tracking-wide flex items-center gap-2 w-32 justify-center
                  ${settings.showMetricsToOperator 
                    ? 'bg-emerald-950/30 border-emerald-900 text-emerald-500' 
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
              >
                {settings.showMetricsToOperator ? <Eye size={16} /> : <EyeOff size={16} />}
                {settings.showMetricsToOperator ? 'VISIBLE' : 'HIDDEN'}
              </button>
            </div>
          </section>

          {/* Pillar 3: Supervision (Audit Log) */}
          <section className="bg-slate-950/50 p-6 border border-slate-800 rounded-sm">
            <h3 className="text-sm font-bold text-emerald-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <FileText size={16} /> Audit Log
            </h3>
            <div className="overflow-x-auto border border-slate-800 rounded-sm">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-900 text-slate-400 uppercase text-xs">
                  <tr>
                    <th className="p-3 border-b border-slate-800">Timestamp</th>
                    <th className="p-3 border-b border-slate-800">Operator</th>
                    <th className="p-3 border-b border-slate-800">Filename</th>
                    <th className="p-3 border-b border-slate-800 text-right">Cons. Y (Yds)</th>
                    <th className="p-3 border-b border-slate-800 text-right">Cons. X (Yds)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {history.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-slate-600 italic">No records found.</td>
                    </tr>
                  ) : (
                    history.map((record) => (
                      <tr key={record.id} className="hover:bg-slate-900/50 transition-colors">
                        <td className="p-3 text-slate-400">{new Date(record.timestamp).toLocaleString()}</td>
                        <td className="p-3 text-emerald-400 font-mono">{record.operator}</td>
                        <td className="p-3 text-slate-300">{record.filename}</td>
                        <td className="p-3 text-right text-amber-500 font-mono">{record.consumptionYards.toFixed(4)}</td>
                        <td className="p-3 text-right text-amber-500 font-mono">
                          {record.consumptionYardsX ? record.consumptionYardsX.toFixed(4) : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Pillar 4: Global Reset */}
          <section className="bg-slate-950/50 p-6 border border-slate-800 rounded-sm">
            <h3 className="text-sm font-bold text-red-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <AlertTriangle size={16} /> Danger Zone
            </h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-300 font-medium">Global System Reset</p>
                <p className="text-slate-500 text-sm mt-1">Invalidate all active sessions and restore default security keys.</p>
              </div>
              <button 
                onClick={handleGlobalReset}
                className={`px-4 py-2 border transition-all text-sm font-bold uppercase tracking-wide flex items-center gap-2
                  ${resetConfirm 
                    ? 'bg-red-600 border-red-500 text-white animate-pulse' 
                    : 'bg-red-950/30 border-red-900 text-red-500 hover:bg-red-900/50'
                  }`}
              >
                <RefreshCw size={16} />
                {resetConfirm ? 'CONFIRM RESET' : 'FORCE RESET'}
              </button>
            </div>
          </section>

        </div>
        
        {/* Footer info personalizado */}
        <div className="bg-slate-950 p-2 flex justify-center">
          <p className="text-
