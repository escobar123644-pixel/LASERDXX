import React, { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  Upload, Download, Layers, Settings, LogOut, 
  FileCode, Ruler, Scissors, ScanLine, User 
} from 'lucide-react';
import { DxfViewer } from './components/DxfViewer';
import { Login } from './components/Login';
import { AdminPanel } from './components/AdminPanelNew';
import { processDxf, generateR12 } from './utils/dxfUtils';
import { getSession, logout, getSettings, addLog, updateMachineDistance } from './utils/auth';

function App() {
  const [session, setSession] = useState(getSession());
  const [data, setData] = useState<any>(null);
  const [originalContent, setOriginalContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [settings, setSettings] = useState(getSettings());
  const [preserveFrame, setPreserveFrame] = useState(true);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'application/dxf': ['.dxf'] },
    onDrop: (acceptedFiles) => {
      const file = acceptedFiles[0];
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setOriginalContent(content);
        try {
          const result = processDxf(content, { preserveFrame, enableLabeling: settings.enableLabeling });
          setData(result);
        } catch (error) {
          alert("Error al leer DXF.");
        }
      };
      reader.readAsText(file);
    }
  });

  const handleCloseAdmin = () => {
      setIsAdminOpen(false);
      setSettings(getSettings()); 
  };

  useEffect(() => {
    if (originalContent) {
      const result = processDxf(originalContent, { preserveFrame, enableLabeling: settings.enableLabeling });
      setData(result);
    }
  }, [preserveFrame, settings.enableLabeling]);

  const handleToggleLayer = (index: number) => {
      if (!data) return;
      const newData = { ...data };
      const poly = newData.polylines[index];
      poly.layer = poly.layer === 'CUT' ? 'BOARDS' : 'CUT';
      setData(newData);
  };

  // --- EXPORTACIÓN CON NOMBRE ORIGINAL ---
  const handleExport = async (type: 'ALL' | 'CUT' | 'BOARDS') => {
    if (!data) return;

    let linesToExport = data.polylines;
    let labelsToExport = data.labels;
    let suffix = "";

    if (type === 'CUT') {
      linesToExport = data.polylines.filter((p: any) => p.layer === 'CUT');
      labelsToExport = [];
      suffix = "_CUT_ONLY";
    } else if (type === 'BOARDS') {
      linesToExport = data.polylines.filter((p: any) => p.layer === 'BOARDS');
      suffix = "_INTERNAL_ONLY";
    } else {
      suffix = "_FULL";
    }

    const r12 = generateR12(linesToExport, labelsToExport);
    const blob = new Blob([r12], { type: 'application/dxf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    // AQUÍ ESTÁ EL CAMBIO: Usar el nombre original
    // Quitamos la extensión .dxf original para no duplicarla (ej: archivo.dxf_FULL.dxf)
    const baseName = fileName.replace(/\.dxf$/i, '') || 'LASERDXX';
    a.download = `${baseName}${suffix}.dxf`;
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    if (session) {
        const yards = data.stats.materialWidthYards.toFixed(2);
        await addLog('EXPORT', `Exportado ${type}: ${a.download} (${yards} yd)`, session.username);
        if (session.machineId) {
            await updateMachineDistance(session.machineId, data.stats.materialWidthYards);
        }
    }
  };

  const handleLogout = () => { logout(); setSession(null); setData(null); };

  if (!session) return <Login onLogin={() => setSession(getSession())} />;

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 font-sans overflow-hidden selection:bg-emerald-500/30">
      
      {/* BARRA LATERAL */}
      <aside className="w-80 flex flex-col border-r border-slate-800 bg-slate-900/50 backdrop-blur-md z-20 shadow-2xl">
        
        <div className="p-5 border-b border-slate-800 flex items-center gap-3 bg-slate-900">
          <div className="w-8 h-8 bg-emerald-600 rounded flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <ScanLine size={18} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-white tracking-wider text-sm">LASERDXX PRO</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className="text-[10px] text-emerald-500 font-mono">SYSTEM ONLINE</span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
          
          <div {...getRootProps()} className={`
            border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer relative overflow-hidden group
            ${isDragActive ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-700 hover:border-slate-500 hover:bg-slate-800/50'}
          `}>
            <input {...getInputProps()} />
            <div className="relative z-10 flex flex-col items-center gap-2">
              <div className="p-3 bg-slate-800 rounded-full group-hover:scale-110 transition-transform">
                <Upload size={20} className={isDragActive ? 'text-emerald-400' : 'text-slate-400'} />
              </div>
              <p className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                {isDragActive ? 'SOLTAR AHORA' : 'CARGAR DXF'}
              </p>
            </div>
          </div>

          {data && (
            <div className="animate-in fade-in slide-in-from-left-4 duration-500 space-y-6">
              
              <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900/50 p-2 rounded border border-slate-800">
                <FileCode size={14} />
                <span className="truncate flex-1 font-mono">{fileName}</span>
              </div>

              <div className="bg-slate-800/80 p-5 rounded-lg border border-emerald-500/20 shadow-lg shadow-emerald-900/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-10"><Ruler size={60}/></div>
                <div className="flex items-center gap-2 text-emerald-400 mb-2">
                  <Ruler size={16} />
                  <span className="text-xs font-bold uppercase tracking-widest">Consumo (Largo)</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-white font-mono tracking-tight">
                    {data.stats.materialWidthYards.toFixed(2)}
                  </span>
                  <span className="text-sm font-medium text-slate-400">yardas</span>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-700/50 flex justify-between items-center text-[10px] text-slate-500">
                   <span>Alto (Ancho tela):</span>
                   <span className="font-mono text-slate-300">{data.stats.materialHeightYards.toFixed(2)} yd</span>
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-700 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3 text-emerald-500">
                  <Layers size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Lógica</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer w-full justify-between group">
                  <span className="text-xs font-medium text-slate-300 group-hover:text-white transition-colors">Detectar Marco</span>
                  <div className="relative">
                    <input type="checkbox" className="sr-only peer" checked={preserveFrame} onChange={(e) => setPreserveFrame(e.target.checked)} />
                    <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500 shadow-inner"></div>
                  </div>
                </label>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-800">
                <button onClick={() => handleExport('ALL')} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/20 group text-sm">
                  <Download size={18} className="group-hover:-translate-y-0.5 transition-transform" />
                  EXPORTAR TODO
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => handleExport('CUT')} className="bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-emerald-500/50 text-emerald-400 font-bold py-2 px-2 rounded-lg flex items-center justify-center gap-2 transition-all text-[10px] uppercase">
                    <Scissors size={14} /> Solo Corte
                  </button>
                  <button onClick={() => handleExport('BOARDS')} className="bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-red-500/50 text-red-400 font-bold py-2 px-2 rounded-lg flex items-center justify-center gap-2 transition-all text-[10px] uppercase">
                    <ScanLine size={14} /> Internos
                  </button>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-4 border-t border-slate-800 bg-slate-950">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity">
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                <User size={16} />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white uppercase">{session.username}</span>
                <span className="text-[10px] text-slate-500">{session.role}</span>
              </div>
            </div>
            <button onClick={handleLogout} className="text-slate-500 hover:text-red-400 transition-colors p-2" title="Salir">
              <LogOut size={18} />
            </button>
          </div>
          {session.role === 'ADMIN' && (
            <button onClick={() => setIsAdminOpen(true)} className="w-full mt-3 text-[10px] flex items-center justify-center gap-2 text-slate-500 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-600 py-1.5 rounded transition-all">
              <Settings size={12} /> PANEL ADMINISTRADOR
            </button>
          )}
        </div>
      </aside>

      {/* VISOR */}
      <main className="flex-1 flex flex-col relative bg-black">
        <div className="flex-1 overflow-hidden relative">
          {data ? (
            <DxfViewer 
                data={data} 
                containerHeight="100%" 
                onToggleLayer={handleToggleLayer}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-700 opacity-20 pointer-events-none select-none">
                <ScanLine size={120} strokeWidth={1} />
                <h2 className="text-4xl font-black mt-4 tracking-tighter">NO SIGNAL</h2>
            </div>
          )}
        </div>
      </main>

      <AdminPanel isOpen={isAdminOpen} onClose={handleCloseAdmin} />
    </div>
  );
}

export default App;