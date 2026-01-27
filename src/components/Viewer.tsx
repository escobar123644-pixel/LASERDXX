import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Polyline } from '../utils/dxfUtils';

interface ViewerProps {
  polylines: Polyline[];
  onPolylinesChange: (newPolylines: Polyline[]) => void;
}

export const Viewer: React.FC<ViewerProps> = ({ polylines, onPolylinesChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  // Viewport State
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMouse, setLastMouse] = useState({ x: 0, y: 0 });

  // Coordinate transforms
  const worldToScreen = useCallback((x: number, y: number, width: number, height: number) => {
    return {
      x: (x - pan.x) * zoom + width / 2,
      y: -(y - pan.y) * zoom + height / 2 // Flip Y for DXF
    };
  }, [zoom, pan]);

  // Fit to content on initial load (or when polylines change significantly?)
  // We'll just do it once when polylines are first populated
  useEffect(() => {
    if (polylines.length > 0 && zoom === 1 && pan.x === 0 && pan.y === 0) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      polylines.forEach(p => p.points.forEach(v => {
        if (v.x < minX) minX = v.x;
        if (v.y < minY) minY = v.y;
        if (v.x > maxX) maxX = v.x;
        if (v.y > maxY) maxY = v.y;
      }));
      
      if (minX !== Infinity) {
        const width = maxX - minX;
        const height = maxY - minY;
        const centerX = minX + width / 2;
        const centerY = minY + height / 2;
        
        // Auto zoom
        const container = containerRef.current;
        if (container) {
          const scaleX = (container.clientWidth - 40) / width;
          const scaleY = (container.clientHeight - 40) / height;
          const newZoom = Math.min(scaleX, scaleY, 10); // Cap zoom
          
          setPan({ x: centerX, y: centerY });
          setZoom(newZoom);
        }
      }
    }
  }, [polylines]);

  // Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.fillStyle = '#0f172a'; // Slate-900
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid
    ctx.strokeStyle = '#1e293b'; // Slate-800
    ctx.lineWidth = 1;
    ctx.beginPath();
    
    // Draw simple grid (not infinite, just covering view)
    // Actually simpler to just draw static grid if optimized, but dynamic is nicer.
    // Skip grid for now to save complexity, or draw simple axes.
    const origin = worldToScreen(0, 0, canvas.width, canvas.height);
    
    // Draw Origin
    ctx.strokeStyle = '#334155';
    ctx.beginPath();
    ctx.moveTo(0, origin.y);
    ctx.lineTo(canvas.width, origin.y);
    ctx.moveTo(origin.x, 0);
    ctx.lineTo(origin.x, canvas.height);
    ctx.stroke();

    // Draw Polylines
    polylines.forEach(poly => {
      ctx.beginPath();
      const first = worldToScreen(poly.points[0].x, poly.points[0].y, canvas.width, canvas.height);
      ctx.moveTo(first.x, first.y);
      
      for (let i = 1; i < poly.points.length; i++) {
        const p = worldToScreen(poly.points[i].x, poly.points[i].y, canvas.width, canvas.height);
        ctx.lineTo(p.x, p.y);
      }
      
      if (poly.closed) {
        ctx.closePath();
      }

      // Styles
      const isSelected = poly.id === selectedId;
      
      if (isSelected) {
        ctx.strokeStyle = '#fbbf24'; // Amber-400
        ctx.lineWidth = 3;
      } else if (poly.layer === 'BOARDS') {
        ctx.strokeStyle = '#ef4444'; // Red-500
        ctx.lineWidth = 1.5;
      } else {
        ctx.strokeStyle = '#10b981'; // Emerald-500
        ctx.lineWidth = 1.5;
      }
      
      ctx.stroke();
      
      // Draw Start Point for direction check
      if (isSelected) {
          ctx.fillStyle = '#fbbf24';
          ctx.fillRect(first.x - 3, first.y - 3, 6, 6);
      }
    });

  }, [polylines, zoom, pan, selectedId, worldToScreen]);

  // Interaction Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setLastMouse({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const dx = e.clientX - lastMouse.x;
      const dy = e.clientY - lastMouse.y;
      setPan(prev => ({
        x: prev.x - dx / zoom, // Pan moves world opposite to mouse
        y: prev.y + dy / zoom  // Y inverted
      }));
      setLastMouse({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleWheel = (e: React.WheelEvent) => {
    const scaleFactor = 1.1;
    const newZoom = e.deltaY < 0 ? zoom * scaleFactor : zoom / scaleFactor;
    setZoom(Math.max(0.1, Math.min(newZoom, 500)));
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isDragging || Math.hypot(e.clientX - lastMouse.x, e.clientY - lastMouse.y) > 5) return;
    
    // Hit Test
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    
    // Simple point-to-line distance check for selection
    let foundId: string | null = null;
    let minDist = 10; // pixels

    polylines.forEach(poly => {
      for (let i = 0; i < poly.points.length - 1; i++) {
        const p1 = worldToScreen(poly.points[i].x, poly.points[i].y, canvas.width, canvas.height);
        const p2 = worldToScreen(poly.points[i+1].x, poly.points[i+1].y, canvas.width, canvas.height);
        
        // dist from point (mx,my) to segment p1-p2
        const l2 = (p1.x - p2.x)**2 + (p1.y - p2.y)**2;
        if (l2 === 0) continue;
        let t = ((mx - p1.x) * (p2.x - p1.x) + (my - p1.y) * (p2.y - p1.y)) / l2;
        t = Math.max(0, Math.min(1, t));
        const px = p1.x + t * (p2.x - p1.x);
        const py = p1.y + t * (p2.y - p1.y);
        const d = Math.hypot(mx - px, my - py);
        
        if (d < minDist) {
            minDist = d;
            foundId = poly.id;
        }
      }
    });
    
    setSelectedId(foundId);
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 't' && selectedId) {
        // Toggle Layer
        const newPolylines = polylines.map(p => {
            if (p.id === selectedId) {
                return { ...p, layer: p.layer === 'BOARDS' ? 'CUT' : 'BOARDS' };
            }
            return p;
        });
        onPolylinesChange(newPolylines);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, polylines, onPolylinesChange]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full relative cursor-crosshair overflow-hidden"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onClick={handleClick}
    >
      <canvas ref={canvasRef} className="block" />
      
      {/* HUD */}
      <div className="absolute top-4 left-4 text-xs font-mono text-slate-500 pointer-events-none select-none">
        <div>ZOOM: {(zoom * 100).toFixed(0)}%</div>
        <div>PAN: {pan.x.toFixed(1)}, {pan.y.toFixed(1)}</div>
        <div className="mt-2 text-emerald-500">
           {selectedId ? `SELECTED: ${selectedId}` : 'NO SELECTION'}
        </div>
        {selectedId && <div className="text-amber-500 animate-pulse">PRESS 'T' TO TOGGLE LAYER</div>}
      </div>
    </div>
  );
};
