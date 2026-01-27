import React, { useState, useEffect } from 'react';
import { X, RefreshCw, Eye, EyeOff, FileText, AlertTriangle } from 'lucide-react';
import { globalReset, getHistory, getSettings, updateSettings, AppSettings, ExportRecord } from '../utils/auth';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ isOpen, onClose }) => {
  const [history, setHistory] = useState<ExportRecord[]>([]);
  const [settings, setSettings] = useState<AppSettings>({ showMetricsToOperator: false });
  const [resetConfirm, setResetConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setHistory(getHistory());
      setSettings(getSettings());
      setResetConfirm(false);
    }
  }, [isOpen]);

  const handleGlobalReset = () => {
    if (resetConfirm) {
      globalReset();
      window.location.reload(); // Force reload to apply logout
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
          
          {/* Pillar 1: Global Reset */}
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

          {/* Pillar 2: Material Control */}
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

          {/* Pillar 3: Supervision */}
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

        </div>
      </div>
    </div>
  );
};
