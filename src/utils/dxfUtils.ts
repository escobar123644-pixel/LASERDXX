import DxfParser from 'dxf-parser';

// --- Types ---

export interface Point { x: number; y: number; }
export interface Polyline {
  points: Point[]; closed: boolean; layer?: string; id: string; originalLayer?: string;
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

// --- Constants ---
const HEAL_TOLERANCE = 0.05;
const MIN_ENTITY_LENGTH = 3.0;
const GERBER_MIN_LENGTH = 0.5; // Para aberturas internas
const TEXT_SIZE = 0.5; // Tamaño de la letra (ajustable según tus unidades)
const TEXT_OFFSET = 0.2; // Distancia de separación hacia arriba
const YARDS_DIVISOR = 36.0;

// Regex para detectar tallas comunes
const SIZE_REGEX = /\b(XS|S|M|L|XL|2XL|3XL|4XL|YS|YM|YL|YXL|[\d]+T|[\d]+Y)\b/i;

// --- Helper Functions ---
const distance = (p1: Point, p2: Point) => Math.hypot(p1.x - p2.x, p1.y - p2.y);

const isCollinear = (p1: Point, p2: Point, p3: Point) => {
  const area = p1.x * (p2.y - p3.y) + p2.x * (p3.y - p1.y) + p3.x * (p1.y - p2.y);
  return Math.abs(area) < 1e-6;
};

const getPolylineLength = (points: Point[], closed: boolean): number => {
  let len = 0;
  for (let i = 0; i < points.length - 1; i++) len += distance(points[i], points[i + 1]);
  if (closed && points.length > 0) len += distance(points[points.length - 1], points[0]);
  return len;
};

// --- Core Logic ---

const extractData = (dxf: any) => {
  const polylines: Polyline[] = [];
  const rawTexts: {x:number, y:number, text:string}[] = [];

  if (!dxf || !dxf.entities) return { polylines, rawTexts };

  dxf.entities.forEach((entity: any) => {
    // 1. Extraer Texto Potencial (Solo guardamos lo que parece una talla)
    if (entity.type === 'TEXT' || entity.type === 'MTEXT') {
        const content = (entity.text || '').trim();
        const match = content.match(SIZE_REGEX);
        if (match) {
            rawTexts.push({
                x: entity.startPoint.x,
                y: entity.startPoint.y,
                text: match[0].toUpperCase()
            });
        }
        return; // No procesar texto como línea
    }

    // 2. Extraer Geometría
    let points: Point[] = [];
    let closed = false;

    if (entity.type === 'LINE') {
      points = [{ x: entity.vertices[0].x, y: entity.vertices[0].y }, { x: entity.vertices[1].x, y: entity.vertices[1].y }];
    } else if (entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE') {
      points = entity.vertices.map((v: any) => ({ x: v.x, y: v.y }));
      closed = entity.shape === true || (entity.vertices.length > 2 && distance(points[0], points[points.length - 1]) < 0.001);
      if (closed && points.length > 0 && distance(points[0], points[points.length - 1]) > 0.001) points.push({ ...points[0] });
    }

    if (points.length > 0) {
      polylines.push({ points, closed, id: Math.random().toString(36).substr(2, 9), originalLayer: entity.layer });
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
          const tStart = target.points[0]; const tEnd = target.points[target.points.length - 1];
          if (distance(end, tStart) <= HEAL_TOLERANCE) { current.points = [...current.points, ...target.points.slice(1)]; used.add(j); merged = true; break; }
          if (distance(end, tEnd) <= HEAL_TOLERANCE) { current.points = [...current.points, ...target.points.reverse().slice(1)]; used.add(j); merged = true; break; }
          if (distance(start, tEnd) <= HEAL_TOLERANCE) { current.points = [...target.points, ...current.points.slice(1)]; used.add(j); merged = true; break; }
          if (distance(start, tStart) <= HEAL_TOLERANCE) { current.points = [...target.points.reverse(), ...current.points.slice(1)]; used.add(j); merged = true; break; }
        }
        if (distance(current.points[0], current.points[current.points.length - 1]) <= HEAL_TOLERANCE) { current.closed = true; current.points[current.points.length - 1] = { ...current.points[0] }; }
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
      if (!isCollinear(poly.points[i - 1], poly.points[i], poly.points[i + 1])) newPoints.push(poly.points[i]);
    }
    newPoints.push(poly.points[poly.points.length - 1]);
    return { ...poly, points: newPoints };
  });
};

const filterDebris = (polylines: Polyline[], isGerber: boolean): Polyline[] => {
  return polylines.filter(poly => {
    const length = getPolylineLength(poly.points, poly.closed);
    const tolerance = (isGerber && poly.originalLayer === 'T001L001') ? GERBER_MIN_LENGTH : MIN_ENTITY_LENGTH;
    return length >= tolerance;
  });
};

const getPolylineBounds = (points: Point[]) => {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  points.forEach(p => {
    if (p.x < minX) minX = p.x; if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x; if (p.y > maxY) maxY = p.y;
  });
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
};

const detectFrame = (polylines: Polyline[]): string | null => {
  let maxArea = 0;
  let frameId: string | null = null;
  polylines.forEach(poly => {
    if (!poly.closed) return;
    const bounds = getPolylineBounds(poly.points);
    const area = bounds.width * bounds.height;
    if (area > maxArea) {
      const isInchScale = bounds.width > 50 && bounds.width < 70;
      const isMmScale = bounds.width > 1270 && bounds.width < 1780;
      if (isInchScale || isMmScale) { maxArea = area; frameId = poly.id; }
    }
  });
  return frameId;
};

const isPointInPolygon = (p: Point, polygon: Point[]) => {
  let wn = 0;
  for (let i = 0; i < polygon.length - 1; i++) {
    const p1 = polygon[i]; const p2 = polygon[i + 1];
    if (p1.y <= p.y) { if (p2.y > p.y && (p2.x - p1.x) * (p.y - p1.y) - (p2.y - p1.y) * (p.x - p1.x) > 0) wn++; } 
    else { if (p2.y <= p.y && (p2.x - p1.x) * (p.y - p1.y) - (p2.y - p1.y) * (p.x - p1.x) < 0) wn--; }
  }
  return wn !== 0;
};

const assignLayers = (polylines: Polyline[], frameId: string | null): Polyline[] => {
  return polylines.map((poly, i) => {
    if (frameId && poly.id === frameId) return { ...poly, layer: 'BOARDS' };
    const testPoint = poly.points[0];
    let nestingLevel = 0;
    for (let j = 0; j < polylines.length; j++) {
      if (i === j) continue;
      if (!polylines[j].closed) continue;
      if (frameId && polylines[j].id === frameId) continue;
      if (isPointInPolygon(testPoint, polylines[j].points)) nestingLevel++;
    }
    const layer = nestingLevel % 2 !== 0 ? 'BOARDS' : 'CUT';
    if (!poly.closed && layer === 'CUT' && nestingLevel > 0) return { ...poly, layer: 'BOARDS' };
    return { ...poly, layer };
  });
};

// --- LOGICA DE ETIQUETADO INTELIGENTE ---
const generateSmartLabels = (polylines: Polyline[], rawTexts: {x:number, y:number, text:string}[]): TextEntity[] => {
    const labels: TextEntity[] = [];
    const pieces = polylines.filter(p => p.closed && p.layer === 'CUT'); // Solo piezas de corte

    pieces.forEach(piece => {
        // 1. Buscamos si esta pieza tenía texto original dentro
        const bounds = getPolylineBounds(piece.points);
        const internalText = rawTexts.find(t => isPointInPolygon({x: t.x, y: t.y}, piece.points));

        if (internalText) {
            // 2. Calculamos la posición: CENTRO SUPERIOR
            const centerX = (bounds.minX + bounds.maxX) / 2;
            const topY = bounds.maxY + TEXT_OFFSET; // Un poco más arriba del límite

            labels.push({
                x: centerX,
                y: topY,
                text: internalText.text, // Usamos la talla encontrada (S, M, L...)
                layer: 'BOARDS',         // MISMA CAPA QUE INTERNOS (Rojo)
                height: TEXT_SIZE
            });
        }
    });
    return labels;
};

export const processDxf = (dxfString: string): ProcessedResult => {
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
  
  const frameId = detectFrame(processed);
  processed = assignLayers(processed, frameId);
  
  // GENERAR ETIQUETAS SI ES GERBER
  let finalLabels: TextEntity[] = [];
  if (isGerber && rawTexts.length > 0) {
      finalLabels = generateSmartLabels(processed, rawTexts);
  }

  let minX=Infinity, minY=Infinity, maxX=-Infinity, maxY=-Infinity;
  let hasContent = false;
  processed.forEach(p => {
    if (frameId && p.id === frameId) return;
    hasContent = true;
    p.points.forEach(v => {
      minX = Math.min(minX, v.x); minY = Math.min(minY, v.y);
      maxX = Math.max(maxX, v.x); maxY = Math.max(maxY, v.y);
    });
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

  // GEOMETRÍA
  sorted.forEach(poly => {
    const layerName = poly.layer || 'CUT';
    const color = layerName === 'BOARDS' ? 1 : 3; // Rojo=1, Verde=3
    output += `  0\nPOLYLINE\n  8\n${layerName}\n 62\n${color}\n 66\n1\n 70\n${poly.closed?1:0}\n 10\n0\n 20\n0\n 30\n0\n`;
    poly.points.forEach(p => output += `  0\nVERTEX\n  8\n${layerName}\n 10\n${p.x.toFixed(6)}\n 20\n${p.y.toFixed(6)}\n 30\n0\n`);
    output += `  0\nSEQEND\n`;
  });

  // ETIQUETAS (Texto de Talla)
  if (labels && labels.length > 0) {
      labels.forEach(lbl => {
          output += `  0\nTEXT\n`;
          output += `  8\nBOARDS\n`; // MISMA CAPA QUE LOS INTERNOS
          output += ` 62\n1\n`;       // COLOR ROJO (1)
          output += ` 10\n${lbl.x.toFixed(6)}\n`;
          output += ` 20\n${lbl.y.toFixed(6)}\n`;
          output += ` 30\n0.0\n`;
          output += ` 40\n${lbl.height.toFixed(6)}\n`;
          output += `  1\n${lbl.text}\n`;
          output += ` 72\n1\n`; // Alineación Horizontal: Centro
          output += ` 11\n${lbl.x.toFixed(6)}\n`; // Punto de alineación
          output += ` 21\n${lbl.y.toFixed(6)}\n`; 
      });
  }

  output += `  0\nENDSEC\n  0\nEOF\n`;
  return output;
};
