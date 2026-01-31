import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Ruler, AlertTriangle, MousePointer2 } from 'lucide-react';

interface Point { x: number; y: number; }
interface Polyline { points: Point[]; closed: boolean; layer?: string; }
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Guardamos las dimensiones anteriores para saber si es un archivo nuevo
  const prevBoundsRef = useRef<string>('');

  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });
  const cameraRef = useRef({ x: 0, y: 0, zoom: 1 });

  const [isDragging, setIsDragging] = useState(false);
  const [lastMouse, setLastMouse] = useState({ x: 0, y: 0 });
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const updateCamera = (newCam: { x: number; y: number; zoom: number }) => {
      setCamera(newCam);
      cameraRef.current = newCam;
  };

  // 1. Inicializar cámara (SOLO SI CAMBIA EL ARCHIVO)
  useEffect(() => {
    if (!data?.stats?.bounds || !containerRef.current) return;
    const { minX, minY, maxX, maxY } = data.stats.bounds;
    
    // --- CORRECCIÓN AQUÍ ---
    // Creamos una "huella digital" de las dimensiones actuales
    const currentBoundsId = `${minX.toFixed(4)},${minY.toFixed(4)},${maxX.toFixed(4)},${maxY.toFixed(4)}`;

    // Si las dimensiones son idénticas a la última vez, NO reseteamos la cámara.
    // Esto significa que solo cambiamos una capa (Tecla A).
    if (prevBoundsRef.current === currentBoundsId) {
        return; // Salimos sin tocar el zoom
    }

    // Si llegamos aquí, es un archivo nuevo. Guardamos la nueva huella.
    prevBoundsRef.current = currentBoundsId;

    // Calculamos el zoom inicial (Reset)
    const containerW = containerRef.current.clientWidth;
    const containerH = containerRef.current.clientHeight;
    const dataW = maxX - minX || 100;
    const dataH = maxY - minY || 100;
    const zoomX = (containerW * 0.9) / dataW;
    const zoomY = (containerH * 0.9) / dataH;
    const startZoom = Math.min(zoomX, zoomY);
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const startX = (containerW / 2) - (centerX * startZoom);
    const startY = (containerH / 2) - (centerY * -startZoom); 

    updateCamera({ x: startX, y: startY, zoom: startZoom });
  }, [data]); // Se ejecuta cuando 'data' cambia, pero el IF de adentro nos protege.

  // 2. Manejo de Zoom (Wheel)
  useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const handleNativeWheel = (e: WheelEvent) => {
          e.preventDefault(); 
          const currentCam = cameraRef.current;
          const scaleFactor = 1.1;
          const direction = e.deltaY > 0 ? 1 / scaleFactor : scaleFactor;
          const rect = canvas.getBoundingClientRect();
          const mouseX = e.clientX - rect.left;
          const mouseY = e.clientY - rect.top;
          let newZoom = currentCam.zoom * direction;
          if (newZoom < 0.001) newZoom = 0.001;
          if (newZoom > 500) newZoom = 500;
          const newX = mouseX - (mouseX - currentCam.x) * direction;
          const newY = mouseY - (mouseY - currentCam.y) * direction;
          updateCamera({ x: newX, y: newY, zoom: newZoom });
      };

      canvas.addEventListener('wheel', handleNativeWheel, { passive: false });
      return () => { canvas.removeEventListener('wheel', handleNativeWheel); };
  }, []);

  // 3. Renderizado
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (containerRef.current) {
        if (canvas.width !== containerRef.current.clientWidth || canvas.height !== containerRef.current.clientHeight) {
            canvas.width = containerRef.current.clientWidth;
            canvas.height = containerRef.current.clientHeight;
        }
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.zoom, -camera.zoom); 

    const hairLine = 1 / camera.zoom; 
    
    data.polylines.forEach((poly, i) => {
        if (poly.points.length < 2) return;
        const isHovered = hoveredIndex === i;
        const isCut = poly.layer === 'CUT';
        
        ctx.beginPath();
        ctx.moveTo(poly.points[0].x, poly.points[0].y);
        for (let j = 1; j < poly.points.length; j++) {
            ctx.lineTo(poly.points[j].x, poly.points[j].y);
        }
        if (poly.closed) ctx.lineTo(poly.points[0].x, poly.points[0].y);

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        if (isHovered) {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = hairLine * 2; 
        } else {
            ctx.strokeStyle = isCut ? '#10b981' : '#ef4444';
            ctx.lineWidth = hairLine; 
        }
        ctx.stroke(); 
    });

    ctx.scale(1, -1); 
    data.labels.forEach(lbl => {
        ctx.fillStyle = '#fbbf24';
        const fontSize = Math.max(lbl.height, 10 / camera.zoom); 
        ctx.font = `bold ${fontSize}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(lbl.text, lbl.x, -lbl.y);
    });

    ctx.restore();
  }, [data, camera, hoveredIndex]);

  useEffect(() => { requestAnimationFrame(render); }, [render]);

  // 4. Interacción
  const handleMouseDown = (e: React.MouseEvent) => {
      if (e.button === 0 || e.button === 1) { 
          setIsDragging(true);
          setLastMouse({ x: e.clientX, y: e.clientY });
      }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      if (isDragging) {
          const dx = e.clientX - lastMouse.x;
          const dy = e.clientY - lastMouse.y;
          updateCamera({ ...camera, x: camera.x + dx, y: camera.y + dy });
          setLastMouse({ x: e.clientX, y: e.clientY });
          return;
      }

      const rect = canvasRef.current!.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const worldX = (mouseX - camera.x) / camera.zoom;
      const worldY = -(mouseY - camera.y) / camera.zoom; 
      const threshold = 5 / camera.zoom; 
      
      let foundIndex: number | null = null;
      for (let i = 0; i < data.polylines.length; i++) {
          const poly = data.polylines[i];
          if (poly.bbox) {
             if (worldX < poly.bbox.minX - threshold || worldX > poly.bbox.maxX + threshold ||
                 worldY < poly.bbox.minY - threshold || worldY > poly.bbox.maxY + threshold) {
                 continue;
             }
          }
          for (let j = 0; j < poly.points.length - 1; j++) {
              const p1 = poly.points[j];
              const p2 = poly.points[j+1];
              if (distToSegment({x: worldX, y: worldY}, p1, p2) < threshold) {
                  foundIndex = i;
                  break;
              }
          }
          if (foundIndex !== null) break;
      }
      setHoveredIndex(foundIndex);
  };

  const handleMouseUp = () => setIsDragging(false);

  useEffect(() => {
      const handleKey = (e: KeyboardEvent) => {
          if ((e.key === 'a' || e.key === 'A') && hoveredIndex !== null && onToggleLayer) {
              onToggleLayer(hoveredIndex);
          }
      };
      window.addEventListener('keydown', handleKey);
      return () => window.removeEventListener('keydown', handleKey);
  }, [hoveredIndex, onToggleLayer]);

  if (!data) return <div className="h-full flex items-center justify-center text-red-500"><AlertTriangle /> Error Datos</div>;

  return (
    <div ref={containerRef} className="relative w-full h-full bg-slate-950 overflow-hidden cursor-crosshair">
        <div className="absolute top-4 left-4 z-50 pointer-events-none">
            <div className="bg-black/80 backdrop-blur-md border-l-4 border-emerald-500 text-white px-4 py-2 rounded shadow-2xl">
            <div className="flex items-center gap-2 text-slate-400 text-[10px] uppercase tracking-wider mb-1"><Ruler size={12} /> Consumo (Largo)</div>
            <div className="font-mono text-xl font-bold">{data.stats.materialWidthYards.toFixed(2)} <span className="text-sm text-emerald-500">yd</span></div>
            </div>
        </div>
        <div className="absolute bottom-4 left-4 z-50 pointer-events-none">
             <div className="bg-black/50 px-2 py-1 rounded text-[10px] font-mono text-emerald-500 flex items-center gap-2">
                <MousePointer2 size={10} /> {Math.round(camera.zoom * 100)}%
             </div>
        </div>
        <div className="absolute top-4 right-4 z-40 pointer-events-none bg-black/60 px-3 py-1 rounded text-[10px] text-slate-400 border border-slate-800">
            [A] Cambiar Capa | Rueda: Zoom | Click: Mover
        </div>
        <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="block touch-none w-full h-full"
        />
    </div>
  );
};

function distToSegment(p: Point, v: Point, w: Point) {
  const l2 = (v.x - w.x)**2 + (v.y - w.y)**2;
  if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
}
