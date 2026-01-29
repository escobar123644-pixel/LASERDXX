import React, { useEffect, useRef, useState } from 'react';
import { ZoomIn, ZoomOut, Maximize, MousePointer2 } from 'lucide-react';
import { Polyline, TextEntity } from '../utils/dxfUtils';

interface ViewerProps {
  polylines: Polyline[];
  labels?: TextEntity[];
  onPolylinesChange: (polylines: Polyline[]) => void;
}

export const Viewer: React.FC<ViewerProps> = ({ polylines, labels = [], onPolylinesChange }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // FUNCIÓN CORREGIDA: Solo recalcula la posición, NO recarga la página
  const fitScreen = () => {
    if (polylines.length === 0 || !containerRef.current) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    // Calcular limites excluyendo el marco si es muy grande
    polylines.forEach(p => p.points.forEach(v => {
      minX = Math.min(minX, v.x); minY = Math.min(minY, v.y);
      maxX = Math.max(maxX, v.x); maxY = Math.max(maxY, v.y);
    }));

    if (minX === Infinity) return;

    const width = maxX - minX;
    const height = maxY - minY;
    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;

    const scaleX = (containerWidth * 0.95) / width;
    const scaleY = (containerHeight * 0.95) / height;
    const newScale = Math.min(scaleX, scaleY);

    setScale(newScale);
    setOffset({
      x: (containerWidth - width * newScale) / 2 - minX * newScale,
      y: containerHeight - (containerHeight - height * newScale) / 2 + minY * newScale 
    });
  };

  useEffect(() => {
    fitScreen();
  }, [polylines]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(s => Math.max(0.1, Math.min(s * zoomFactor, 200)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setLastPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - lastPos.x;
    const dy = e.clientY - lastPos.y;
    setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    setLastPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => setIsDragging(false);

  const toggleLayer = (id: string) => {
    const updated = polylines.map(p => 
      p.id === id ? { ...p, layer: p.layer === 'CUT' ? 'BOARDS' : 'CUT' } : p
    );
    onPolylinesChange(updated);
  };

  return (
    <div className="relative w-full h-full bg-slate-950 overflow-hidden select-none">
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
        <button onClick={() => setScale(s => s * 1.2)} className="p-2 bg-slate-800 text-slate-200 rounded hover:bg-slate-700 border border-slate-700 shadow"><ZoomIn size={20} /></button>
        <button onClick={() => setScale(s => s / 1.2)} className="p-2 bg-slate-800 text-slate-200 rounded hover:bg-slate-700 border border-slate-700 shadow"><ZoomOut size={20} /></button>
        <button onClick={fitScreen} className="p-2 bg-slate-800 text-emerald-400 rounded hover:bg-slate-700 border border-slate-700 shadow" title="Encajar Todo"><Maximize size={20} /></button>
      </div>

      <div 
        ref={containerRef}
        className="w-full h-full cursor-move"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg className="w-full h-full pointer-events-none">
          <g transform={`translate(${offset.x}, ${offset.y}) scale(${scale}, ${-scale})`}>
            {polylines.map((poly) => (
              <path
                key={poly.id}
                d={`M ${poly.points.map(p => `${p.x},${p.y}`).join(' L ')} ${poly.closed ? 'Z' : ''}`}
                fill={poly.layer === 'CUT' && poly.closed ? 'rgba(16, 185, 129, 0.05)' : 'transparent'}
                stroke={selectedId === poly.id ? '#fbbf24' : (poly.layer === 'BOARDS' ? '#ef4444' : '#10b981')}
                // ARREGLO DE CALIDAD: Grosor dinámico inverso al zoom para que siempre se vea fina
                strokeWidth={1.5 / scale} 
                className="pointer-events-auto cursor-pointer hover:opacity-80 transition-opacity"
                onClick={(e) => { e.stopPropagation(); setSelectedId(poly.id); }}
                onDoubleClick={(e) => { e.stopPropagation(); toggleLayer(poly.id); }}
              />
            ))}

            {labels && labels.map((lbl, idx) => (
              <text
                key={`lbl-${idx}`}
                x={lbl.x}
                y={lbl.y}
                fill="#ef4444" 
                fontSize={lbl.height * 10} // Tamaño ajustado
                textAnchor="middle"
                alignmentBaseline="middle"
                transform={`scale(1, -1) translate(0, ${-2 * lbl.y})`} 
                style={{ pointerEvents: 'none', userSelect: 'none', textShadow: '0px 0px 2px black' }}
              >
                {lbl.text}
              </text>
            ))}
          </g>
        </svg>
      </div>

      {selectedId && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-700 px-4 py-2 rounded-full text-xs text-slate-300 shadow-xl flex items-center gap-2">
          <MousePointer2 size={12} className="text-amber-400" />
          ID: <span className="font-mono text-emerald-400">{selectedId}</span>
        </div>
      )}
    </div>
  );
};
