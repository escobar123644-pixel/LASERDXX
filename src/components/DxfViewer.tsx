import React, { useMemo, useState, useEffect, useRef } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { ZoomIn, ZoomOut, Maximize, MousePointer2, AlertTriangle, Ruler } from 'lucide-react';

interface Point { x: number; y: number; }
interface Polyline { points: Point[]; closed: boolean; layer?: string; id?: string; }
interface TextEntity { x: number; y: number; text: string; layer: string; height: number; }

interface DxfViewerProps {
  data: {
    polylines: Polyline[];
    labels: TextEntity[];
    stats: {
      bounds: { minX: number; minY: number; maxX: number; maxY: number };
      materialHeightYards: number;
      materialWidthYards: number;
    };
  };
  containerHeight?: string;
  onToggleLayer?: (index: number) => void;
}

export const DxfViewer: React.FC<DxfViewerProps> = ({ data, onToggleLayer }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Escuchar Tecla A
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'a' || e.key === 'A') && hoveredIndex !== null && onToggleLayer) {
        onToggleLayer(hoveredIndex);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hoveredIndex, onToggleLayer]);

  const renderData = useMemo(() => {
    if (!data || !data.stats || !data.stats.bounds) return null;
    let { minX, minY, maxX, maxY } = data.stats.bounds;
    
    if (!Number.isFinite(minX) || !Number.isFinite(maxX)) { minX = 0; maxX = 100; }
    if (!Number.isFinite(minY) || !Number.isFinite(maxY)) { minY = 0; maxY = 100; }

    let width = maxX - minX;
    let height = maxY - minY;
    if (width <= 0) width = 100;
    if (height <= 0) height = 100;

    const padding = Math.max(width, height) * 0.05;
    const viewBox = `${minX - padding} ${minY - padding} ${width + padding * 2} ${height + padding * 2}`;

    return { viewBox, valid: true };
  }, [data]);

  if (!renderData || !renderData.valid) return <div className="text-red-500 flex items-center justify-center h-full"><AlertTriangle /> Error</div>;

  return (
    <div ref={containerRef} className="relative w-full h-full bg-slate-950 overflow-hidden flex flex-col group focus:outline-none" tabIndex={0}>
      
      {/* Aviso */}
      <div className="absolute top-4 right-4 z-40 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-black/60 backdrop-blur px-3 py-1 rounded text-[10px] text-slate-400 border border-slate-800">
              [A] Cambiar Capa
          </div>
      </div>

      {/* Info Consumo (Largo) */}
      <div className="absolute top-4 left-4 z-50 pointer-events-none">
        <div className="bg-black/80 backdrop-blur-md border-l-4 border-emerald-500 text-white px-4 py-2 rounded shadow-2xl">
          <div className="flex items-center gap-2 text-slate-400 text-[10px] uppercase tracking-wider mb-1"><Ruler size={12} /> Consumo (Largo)</div>
          <div className="font-mono text-xl font-bold">{data.stats.materialWidthYards.toFixed(2)} <span className="text-sm text-emerald-500">yd</span></div>
        </div>
      </div>

      <TransformWrapper initialScale={1} minScale={0.1} maxScale={100} centerOnInit={true} wheel={{ step: 0.2 }}>
        {({ zoomIn, zoomOut, resetTransform, state }) => (
            <>
              {/* Controles Zoom */}
              <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-50">
                <div className="bg-slate-800 text-slate-200 rounded-lg shadow-xl border border-slate-700 overflow-hidden flex flex-col">
                  <button onClick={() => zoomIn()} className="p-3 hover:bg-slate-700"><ZoomIn size={20} /></button>
                  <button onClick={() => zoomOut()} className="p-3 hover:bg-slate-700"><ZoomOut size={20} /></button>
                  <button onClick={() => resetTransform()} className="p-3 hover:bg-slate-700"><Maximize size={20} /></button>
                </div>
              </div>

              <div className="absolute bottom-6 left-6 z-50 pointer-events-none opacity-50">
                  <div className="bg-black/50 px-2 py-1 rounded text-[10px] font-mono text-emerald-500 flex items-center gap-2"><MousePointer2 size={10} /> {Math.round((state?.scale || 1) * 100)}%</div>
              </div>

              <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full">
                <svg viewBox={renderData.viewBox} className="w-full h-full block" preserveAspectRatio="xMidYMid meet">
                  
                  {data.polylines.map((poly, i) => {
                      const isHovered = hoveredIndex === i;
                      const isCut = poly.layer === 'CUT';
                      const color = isCut ? '#10b981' : '#ef4444';
                      // Grosor de hilo (0.5), pero si pasas el mouse se hace un poco más grueso (2) para ver cuál seleccionas
                      const strokeWidth = isHovered ? "2" : "0.5"; 
                      
                      return (
                        <path
                            key={i}
                            d={`M ${poly.points.map(p => `${p.x},${p.y}`).join(' ')} ${poly.closed ? 'Z' : ''}`}
                            fill="transparent"
                            stroke={color}
                            strokeWidth={strokeWidth}
                            vectorEffect="non-scaling-stroke"
                            className="transition-all cursor-pointer"
                            onMouseEnter={() => setHoveredIndex(i)}
                            onMouseLeave={() => setHoveredIndex(null)}
                        />
                      );
                  })}

                  {data.labels.map((lbl, i) => (
                    <text key={`t-${i}`} x={lbl.x} y={lbl.y} fill="#fbbf24" fontSize={lbl.height * 1.5} textAnchor="middle" fontFamily="monospace" className="select-none font-bold pointer-events-none">
                      {lbl.text}
                    </text>
                  ))}
                </svg>
              </TransformComponent>
            </>
        )}
      </TransformWrapper>
    </div>
  );
};