import DxfParser from 'dxf-parser';

// --- Types ---
export interface Point { x: number; y: number; }
export interface Polyline {
  points: Point[]; closed: boolean; layer?: string; id: string; originalLayer?: string;
  area?: number; bbox?: { minX: number; minY: number; maxX: number; maxY: number };
}
export interface TextEntity {
  x: number; y: number; text: string; layer: string; height: number;
}
export interface ProcessedResult {
  polylines: Polyline[];
  labels: TextEntity[];
  stats: {
    originalCount: number; healedCount: number; debrisRemoved: number;
    bounds: { minX: number; minY: number; maxX: number; maxY: number };
    materialHeightYards: number; materialWidthYards: number;
  };
}

export interface ProcessOptions {
    preserveFrame: boolean;
    enableLabeling: boolean;
}

// --- CONSTANTES ---
const HEAL_TOLERANCE = 0.1; // Muy estricto
const MIN_ENTITY_LENGTH = 0.1; // Muy sensible
const TEXT_SIZE = 2.5; 
const TEXT_OFFSET = 0.5;
const YARDS_DIVISOR = 36.0;
const SIZE_REGEX = /\b(XS|S|M|L|XL|2XL|3XL|YXS|YS|YM|YL|YXL|Y2XL|Y3XL|XSR|YSR|YMR|YLR|YXLR|Y2XLR)\b/i;

// --- Helper Functions ---
const distance = (p1: Point, p2: Point) => Math.hypot(p1.x - p2.x, p1.y - p2.y);

const isCollinear = (p1: Point, p2: Point, p3: Point) => {
  // Área del triángulo formado por los 3 puntos. Si es cerca de 0, son colineales.
  const area = p1.x * (p2.y - p3.y) + p2.x * (p3.y - p1.y) + p3.x * (p1.y - p2.y);
  return Math.abs(area) < 1e-4; // Tolerancia fina
};

const getPolylineLength = (points: Point[], closed: boolean): number => {
  let len = 0;
  for (let i = 0; i < points.length - 1; i++) len += distance(points[i], points[i + 1]);
  if (closed && points.length > 0) len += distance(points[points.length - 1], points[0]);
  return len;
};

const calculatePolygonArea = (points: Point[]): number => {
    let area = 0;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        area += (points[j].x + points[i].x) * (points[j].y - points[i].y);
    }
    return Math.abs(area / 2);
};

const getPolylineBounds = (points: Point[]) => {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  points.forEach(p => {
    minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
  });
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
};

// Algoritmo Ray Casting Robusto
const isPointInPolygon = (p: Point, polygon: Point[]) => {
  let inside = false;
  const x = p.x, y = p.y;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;
      
      const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
  }
  return inside;
};

// Verificación estricta: BBox + Punto
const isPolyInsidePoly = (inner: Polyline, outer: Polyline): boolean => {
    const bIn = inner.bbox!; const bOut = outer.bbox!;
    
    // 1. Descarte rápido por caja (Bounding Box)
    // Si la caja de adentro se sale aunque sea un poco de la caja de afuera, NO está dentro.
    if (bIn.minX < bOut.minX - 0.001 || bIn.maxX > bOut.maxX + 0.001 || 
        bIn.minY < bOut.minY - 0.001 || bIn.maxY > bOut.maxY + 0.001) return false;
    
    // 2. Verificación precisa (Ray Casting) con el primer punto
    return isPointInPolygon(inner.points[0], outer.points);
};

// --- CORE LOGIC ---

const extractData = (dxf: any) => {
  const polylines: Polyline[] = [];
  const rawTexts: {x:number, y:number, text:string}[] = [];

  if (!dxf || !dxf.entities) return { polylines, rawTexts };

  dxf.entities.forEach((entity: any) => {
    if (entity.type === 'TEXT' || entity.type === 'MTEXT') {
        const content = (entity.text || '').trim();
        const match = content.match(SIZE_REGEX);
        if (match) {
            rawTexts.push({ x: entity.startPoint.x, y: entity.startPoint.y, text: match[0].toUpperCase() });
        }
        return; 
    }

    let points: Point[] = [];
    let closed = false;

    if (entity.type === 'LINE') {
      points = [{ x: entity.vertices[0].x, y: entity.vertices[0].y }, { x: entity.vertices[1].x, y: entity.vertices[1].y }];
    } else if (entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE') {
      points = entity.vertices.map((v: any) => ({ x: v.x, y: v.y }));
      // Detectar cierre por flag o por proximidad
      closed = entity.shape === true || (entity.vertices.length > 2 && distance(points[0], points[points.length - 1]) < HEAL_TOLERANCE);
      // Si está cerrado visualmente pero los puntos no son idénticos, cerrar explícitamente
      if (closed && points.length > 0 && distance(points[0], points[points.length - 1]) > 0.0001) {
          points.push({ ...points[0] });
      }
    }

    if (points.length > 0) {
      // Limpieza de puntos duplicados consecutivos (ruido)
      const cleanPoints = [points[0]];
      for(let i=1; i<points.length; i++) {
          if (distance(points[i], cleanPoints[cleanPoints.length-1]) > 0.0001) {
              cleanPoints.push(points[i]);
          }
      }
      
      polylines.push({ points: cleanPoints, closed, id: Math.random().toString(36).substr(2, 9), originalLayer: entity.layer });
    }
  });
  return { polylines, rawTexts };
};

const healPolylines = (input: Polyline[]): Polyline[] => {
  let polylines = [...input];
  let changed = true;
  while (changed) {
    changed = false;
    const nextPolylines: Polyline[] = [];
    const used = new Set<number>();
    
    for (let i = 0; i < polylines.length; i++) {
      if (used.has(i)) continue;
      let current = polylines[i];
      used.add(i);
      
      if (current.closed) { nextPolylines.push(current); continue; }
      
      let merged = true;
      while (merged) {
        merged = false;
        const start = current.points[0]; 
        const end = current.points[current.points.length - 1];
        
        for (let j = 0; j < polylines.length; j++) {
          if (used.has(j)) continue;
          const target = polylines[j];
          if (target.closed) continue;
          
          const tStart = target.points[0]; 
          const tEnd = target.points[target.points.length - 1];
          
          // Fusión estricta
          if (distance(end, tStart) <= HEAL_TOLERANCE) { 
              current.points = [...current.points, ...target.points.slice(1)]; used.add(j); merged = true; break; 
          }
          if (distance(end, tEnd) <= HEAL_TOLERANCE) { 
              current.points = [...current.points, ...target.points.reverse().slice(1)]; used.add(j); merged = true; break; 
          }
          if (distance(start, tEnd) <= HEAL_TOLERANCE) { 
              current.points = [...target.points, ...current.points.slice(1)]; used.add(j); merged = true; break; 
          }
          if (distance(start, tStart) <= HEAL_TOLERANCE) { 
              current.points = [...target.points.reverse(), ...current.points.slice(1)]; used.add(j); merged = true; break; 
          }
        }
        
        // Auto-cierre
        if (distance(current.points[0], current.points[current.points.length - 1]) <= HEAL_TOLERANCE) { 
            current.closed = true; 
            current.points[current.points.length - 1] = { ...current.points[0] }; 
        }
      }
      nextPolylines.push(current);
    }
    if (nextPolylines.length < polylines.length) changed = true;
    polylines = nextPolylines;
  }
  return polylines;
};

const removeCollinearKnots = (polylines: Polyline[]): Polyline[] => {
  return polylines.map(poly => {
    if (poly.points.length < 3) return poly;
    const newPoints = [poly.points[0]];
    for (let i = 1; i < poly.points.length - 1; i++) {
      if (!isCollinear(poly.points[i - 1], poly.points[i], poly.points[i + 1])) {
          newPoints.push(poly.points[i]);
      }
    }
    newPoints.push(poly.points[poly.points.length - 1]);
    return { ...poly, points: newPoints };
  });
};

const filterDebris = (polylines: Polyline[], isGerber: boolean): Polyline[] => {
  return polylines.filter(poly => {
    const length = getPolylineLength(poly.points, poly.closed);
    // Filtro unificado a 0.1mm (o lo que definimos arriba) para no perder piquetes
    return length >= MIN_ENTITY_LENGTH;
  });
};

const detectFrame = (polylines: Polyline[]): string | null => {
  let maxArea = 0;
  let frameId: string | null = null;
  polylines.forEach(poly => {
    if (!poly.closed) return;
    const bounds = getPolylineBounds(poly.points);
    const area = bounds.width * bounds.height;
    // Un marco debe ser significativamente grande
    if (area > maxArea && bounds.width > 50) { 
      maxArea = area;
      frameId = poly.id;
    }
  });
  
  // Validación extra: El marco debe contener al menos otra pieza
  if (frameId) {
      const frame = polylines.find(p => p.id === frameId);
      const hasChildren = polylines.some(p => p.id !== frameId && isPointInPolygon(p.points[0], frame!.points));
      if (!hasChildren) return null;
  }
  return frameId;
};

// --- ÁRBOL DE JERARQUÍA ---
interface TreeNode { poly: Polyline; children: TreeNode[]; }

const assignLayers = (polylines: Polyline[], frameId: string | null): Polyline[] => {
    const enrichedPolylines = polylines.map(p => ({
        ...p,
        bbox: getPolylineBounds(p.points),
        area: p.closed ? calculatePolygonArea(p.points) : 0
    }));

    const result: Polyline[] = [];

    // 1. Marco -> ROJO
    const frame = enrichedPolylines.find(p => p.id === frameId);
    if (frame) result.push({ ...frame, layer: 'BOARDS' }); 

    // 2. Líneas Abiertas -> ROJO (Siempre)
    const openLines = enrichedPolylines.filter(p => !p.closed && p.id !== frameId).map(p => ({
        ...p, layer: 'BOARDS'
    }));
    result.push(...openLines);

    // 3. Contornos Cerrados -> ÁRBOL LÓGICO
    const closedLines = enrichedPolylines.filter(p => p.closed && p.id !== frameId);
    
    // Ordenar Mayor a Menor (CRUCIAL)
    closedLines.sort((a, b) => b.area! - a.area!);

    const roots: TreeNode[] = [];

    // Inserción recursiva
    const insertIntoTree = (node: TreeNode, siblings: TreeNode[]): boolean => {
        for (const sibling of siblings) {
            if (isPolyInsidePoly(node.poly, sibling.poly)) {
                if (!insertIntoTree(node, sibling.children)) {
                    sibling.children.push(node);
                }
                return true; 
            }
        }
        return false;
    };

    closedLines.forEach(poly => {
        const node: TreeNode = { poly, children: [] };
        // Intentar meter en raíces existentes
        if (!insertIntoTree(node, roots)) {
            roots.push(node);
        }
    });

    // Coloreado por profundidad (Par=Corte, Impar=Interno)
    const traverseAndColor = (nodes: TreeNode[], depth: number) => {
        nodes.forEach(node => {
            const layer = depth % 2 === 0 ? 'CUT' : 'BOARDS';
            result.push({ ...node.poly, layer });
            traverseAndColor(node.children, depth + 1);
        });
    };

    traverseAndColor(roots, 0);

    return result;
};

const groupLabelsByZones = (polylines: Polyline[], rawTexts: {x:number, y:number, text:string}[]): TextEntity[] => {
    // ... (Logica de etiquetas igual) ...
    // Para ahorrar espacio, dejo esto igual ya que funciona bien
    const dividers: number[] = [];
    polylines.forEach(p => {
        if (!p.bbox) p.bbox = getPolylineBounds(p.points);
        if (p.bbox.height > 40 && p.bbox.width < 0.5) dividers.push(p.bbox.minX);
    });
    dividers.sort((a, b) => a - b);
    let globalMinX = Infinity, globalMaxX = -Infinity;
    polylines.forEach(p => {
        const b = p.bbox || getPolylineBounds(p.points);
        if (b.minX < globalMinX) globalMinX = b.minX;
        if (b.maxX > globalMaxX) globalMaxX = b.maxX;
    });
    const zones = [globalMinX, ...dividers, globalMaxX];
    const finalLabels: TextEntity[] = [];
    for (let i = 0; i < zones.length - 1; i++) {
        const startX = zones[i]; const endX = zones[i+1];
        if ((endX - startX) < 2) continue;
        const textInZone = rawTexts.find(t => t.x >= startX && t.x <= endX);
        if (textInZone) {
            const sizeLabel = textInZone.text;
            let largestPiece: Polyline | null = null;
            let maxArea = 0;
            const piecesInZone = polylines.filter(p => {
                const pb = p.bbox!;
                const centerX = (pb.minX + pb.maxX) / 2;
                return p.closed && p.layer === 'CUT' && centerX >= startX && centerX <= endX;
            });
            piecesInZone.forEach(p => {
                const pb = p.bbox!;
                const area = pb.width * pb.height;
                if (area > maxArea) { maxArea = area; largestPiece = p; }
            });
            if (largestPiece) {
                const pb = largestPiece!.bbox!;
                finalLabels.push({ x: (pb.minX + pb.maxX) / 2, y: pb.maxY + TEXT_OFFSET, text: sizeLabel, layer: 'BOARDS', height: TEXT_SIZE });
            }
        }
    }
    return finalLabels;
};

// --- MAIN PROCESS ---
export const processDxf = (dxfString: string, options: ProcessOptions = { preserveFrame: true, enableLabeling: true }): ProcessedResult => {
  const isGerber = dxfString.includes("Gerber Technology");
  const parser = new DxfParser();
  let dxf;
  try { dxf = parser.parseSync(dxfString); } catch(e) { throw new Error("Invalid DXF"); }

  const { polylines: rawPolylines, rawTexts } = extractData(dxf);
  const originalCount = rawPolylines.length;

  let processed = healPolylines(rawPolylines);
  processed = removeCollinearKnots(processed);
  const healedCount = processed.length;
  
  processed = filterDebris(processed, isGerber);
  const debrisRemoved = healedCount - processed.length;
  
  const frameId = options.preserveFrame ? detectFrame(processed) : null;
  processed = assignLayers(processed, frameId);
  
  let finalLabels: TextEntity[] = [];
  if (options.enableLabeling && isGerber && rawTexts.length > 0) {
      finalLabels = groupLabelsByZones(processed, rawTexts);
  }

  let minX=Infinity, minY=Infinity, maxX=-Infinity, maxY=-Infinity;
  let hasContent = false;
  processed.forEach(p => {
    if (frameId && p.id === frameId) return;
    hasContent = true;
    const b = p.bbox || getPolylineBounds(p.points);
    minX = Math.min(minX, b.minX); minY = Math.min(minY, b.minY);
    maxX = Math.max(maxX, b.maxX); maxY = Math.max(maxY, b.maxY);
  });
  if (!hasContent) { minX=0; minY=0; maxX=0; maxY=0; }

  return {
    polylines: processed,
    labels: finalLabels,
    stats: {
      originalCount, healedCount: processed.length, debrisRemoved,
      bounds: { minX, minY, maxX, maxY },
      materialHeightYards: (maxY - minY) / YARDS_DIVISOR,
      materialWidthYards: (maxX - minX) / YARDS_DIVISOR
    }
  };
};

export const generateR12 = (polylines: Polyline[], labels: TextEntity[] = []): string => {
  const sorted = [...polylines].sort((a, b) => {
    if (a.layer === 'BOARDS' && b.layer !== 'BOARDS') return -1;
    if (a.layer !== 'BOARDS' && b.layer === 'BOARDS') return 1;
    return 0;
  });
  let output = `  0\nSECTION\n  2\nHEADER\n  0\nENDSEC\n  0\nSECTION\n  2\nTABLES\n  0\nENDSEC\n  0\nSECTION\n  2\nENTITIES\n`;
  sorted.forEach(poly => {
    const layerName = poly.layer || 'CUT';
    const color = layerName === 'BOARDS' ? 1 : 3; 
    output += `  0\nPOLYLINE\n  8\n${layerName}\n 62\n${color}\n 66\n1\n 70\n${poly.closed?1:0}\n 10\n0\n 20\n0\n 30\n0\n`;
    poly.points.forEach(p => output += `  0\nVERTEX\n  8\n${layerName}\n 10\n${p.x.toFixed(6)}\n 20\n${p.y.toFixed(6)}\n 30\n0\n`);
    output += `  0\nSEQEND\n`;
  });
  if (labels && labels.length > 0) {
      labels.forEach(lbl => {
          output += `  0\nTEXT\n`; output += `  8\nBOARDS\n`; output += ` 62\n1\n`;       
          output += ` 10\n${lbl.x.toFixed(6)}\n`; output += ` 20\n${lbl.y.toFixed(6)}\n`; output += ` 30\n0.0\n`;
          output += ` 40\n${lbl.height.toFixed(6)}\n`; output += `  1\n${lbl.text}\n`;
          output += ` 72\n4\n`; output += ` 11\n${lbl.x.toFixed(6)}\n`; output += ` 21\n${lbl.y.toFixed(6)}\n`; 
      });
  }
  output += `  0\nENDSEC\n  0\nEOF\n`;
  return output;
};