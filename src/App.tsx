import React, { useState, useEffect, useRef } from 'react';
import { Upload, Download, Settings, LogOut, FileCode, Shield, Layers, Scissors, Trash2 } from 'lucide-react';
import { Login } from './components/Login';
import { Viewer } from './components/Viewer';
import { AdminPanel } from './components/AdminPanel';
import { getSession, logout, UserSession, logExport, getSettings } from './utils/auth';
import { processDxf, generateR12, Polyline, ProcessedResult } from './utils/dxfUtils';

function App() {
  const [session, setSession] = useState<UserSession | null>(null);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [polylines, setPolylines] = useState<Polyline[]>([]);
  const [stats, setStats] = useState<ProcessedResult['stats'] | null>(null);
  const [filename, setFilename] = useState<string>('');
  const [showMetrics, setShowMetrics] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const sess = getSession();
    if (sess) {
      setSession(sess);
      const settings = getSettings();
      setShowMetrics(sess.role === 'ADMIN' || settings.showMetricsToOperator);
    }
  }, []);

  const handleLogin = () => {
    const sess = getSession();
    setSession(sess);
    const settings = getSettings();
    setShowMetrics(sess && (sess.role === 'ADMIN' || settings.showMetricsToOperator) || false);
  };

  const handleLogout = () => {
    logout();
    setSession(null);
    setPolylines([]);
    setStats(null);
    setFilename('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFilename(file.name.replace(/\.dxf$/i, ''));
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      try {
        const result = processDxf(text);
        setPolylines(result.polylines);
        setStats(result.stats);
      } catch (err) {
        alert('Error processing DXF file. Ensure it is a valid text DXF.');
        console.error(err);
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  const handleExport = () => {
    if (polylines.length === 0) return;
    
    const output = generateR12(polylines);
    const blob = new Blob([output], { type: 'application/dxf' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `SUMMA_READY_${filename || 'export'}.dxf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Log Export
    if (stats) {
      logExport(filename, stats.materialHeightYards, stats.materialWidthYards);
    }
  };

  if (!session) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-slate-300 overflow-hidden font-sans">
      {/* Header */}
      <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 shrink-0 z-30 relative shadow-md">
        <div className="flex items-center gap-4">
          <div className="bg-slate-800 p-2 rounded text-emerald-500">
            <Shield size={24} />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-wider text-slate-100">DXF PRO <span className="text-emerald-500">//</span> SMART TERMINAL</h1>
            <div className="flex items-center gap-2 text-[10px] uppercase font-mono text-slate-500">
              <span className={`w-2 h-2 rounded-full ${session ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
              CONNECTED AS {session.username}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <input 
            type="file" 
            accept=".dxf" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
          />
          
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-sm border border-slate-700 transition-all text-sm font-medium"
          >
            <Upload size={18} />
            LOAD DXF
          </button>

          <button 
            onClick={handleExport}
            disabled={polylines.length === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-sm border transition-all text-sm font-bold tracking-wide
              ${polylines.length > 0 
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]' 
                : 'bg-slate-800 text-slate-600 border-slate-800 cursor-not-allowed'
              }`}
          >
            <Download size={18} />
            EXPORT R12
          </button>

          <div className="w-px h-8 bg-slate-800 mx-2"></div>

          {session.role === 'ADMIN' && (
            <button 
              onClick={() => setIsAdminOpen(true)}
              className="p-2 text-slate-400 hover:text-emerald-400 transition-colors"
              title="Admin Settings"
            >
              <Settings size={20} />
            </button>
          )}

          <button 
            onClick={handleLogout}
            className="p-2 text-slate-400 hover:text-red-400 transition-colors"
            title="Logout"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar / Info Panel */}
        <aside className="w-80 bg-slate-900 border-r border-slate-800 flex flex-col z-20 shadow-xl">
          <div className="p-6 border-b border-slate-800">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">File Statistics</h2>
            {stats ? (
              <div className="space-y-4 font-mono text-sm">
                 <div className="flex justify-between items-center text-slate-400">
                    <span className="flex items-center gap-2"><FileCode size={14} /> Entities</span>
                    <span className="text-slate-200">{stats.originalCount}</span>
                 </div>
                 <div className="flex justify-between items-center text-emerald-400">
                    <span className="flex items-center gap-2"><Scissors size={14} /> Healed</span>
                    <span className="font-bold">{stats.healedCount}</span>
                 </div>
                 <div className="flex justify-between items-center text-amber-500">
                    <span className="flex items-center gap-2"><Trash2 size={14} /> Debris</span>
                    <span>{stats.debrisRemoved}</span>
                 </div>
                 
                 {showMetrics && (
                   <div className="mt-6 pt-4 border-t border-slate-800 space-y-3">
                     <div>
                       <div className="text-xs text-slate-500 mb-1">CONSUMPTION (Y-AXIS)</div>
                       <div className="text-2xl font-bold text-slate-100">{stats.materialHeightYards.toFixed(2)} <span className="text-sm font-normal text-slate-500">Yds</span></div>
                       <div className="text-[10px] text-slate-600">Based on Height</div>
                     </div>
                     <div>
                       <div className="text-xs text-slate-500 mb-1">CONSUMPTION (X-AXIS)</div>
                       <div className="text-2xl font-bold text-slate-100">{stats.materialWidthYards.toFixed(2)} <span className="text-sm font-normal text-slate-500">Yds</span></div>
                       <div className="text-[10px] text-slate-600">Based on Width</div>
                     </div>
                   </div>
                 )}
              </div>
            ) : (
              <div className="text-slate-600 text-sm italic py-4 text-center border border-dashed border-slate-800 rounded">
                No file loaded.
              </div>
            )}
          </div>

          <div className="p-6 flex-1 overflow-y-auto">
             <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Layer Legend</h2>
             <div className="space-y-3 font-mono text-xs">
                <div className="flex items-center gap-3">
                   <div className="w-4 h-4 border border-emerald-500 bg-emerald-500/10"></div>
                   <div>
                      <div className="text-emerald-500 font-bold">CUT</div>
                      <div className="text-slate-500">Outer Contours</div>
                   </div>
                </div>
                <div className="flex items-center gap-3">
                   <div className="w-4 h-4 border border-red-500 bg-red-500/10"></div>
                   <div>
                      <div className="text-red-500 font-bold">BOARDS</div>
                      <div className="text-slate-500">Internal Holes</div>
                   </div>
                </div>
                <div className="flex items-center gap-3">
                   <div className="w-4 h-4 border border-amber-400 bg-amber-400/10"></div>
                   <div>
                      <div className="text-amber-400 font-bold">SELECTED</div>
                      <div className="text-slate-500">Active Entity</div>
                   </div>
                </div>
             </div>

             <div className="mt-8 p-4 bg-slate-950/50 border border-slate-800 rounded text-slate-400 text-xs">
                <div className="flex items-center gap-2 mb-2 text-slate-300 font-bold">
                    <Layers size={14} /> QUICK TIP
                </div>
                Select an entity in the viewer and press <span className="bg-slate-700 text-white px-1 rounded font-mono">T</span> to toggle its layer manually.
             </div>
          </div>
        </aside>

        {/* Viewer Area */}
        <main className="flex-1 relative bg-slate-950">
           {polylines.length > 0 ? (
             <Viewer polylines={polylines} onPolylinesChange={setPolylines} />
           ) : (
             <div className="absolute inset-0 flex items-center justify-center text-slate-700">
                <div className="text-center">
                    <Upload size={48} className="mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">Ready for input</p>
                    <p className="text-sm">Upload a DXF file to begin optimization</p>
                </div>
             </div>
           )}
        </main>
      </div>

      <AdminPanel isOpen={isAdminOpen} onClose={() => setIsAdminOpen(false)} />
    </div>
  );
}

export default App;
