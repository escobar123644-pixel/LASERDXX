import { Redis } from '@upstash/redis';

// Tipos
export type Role = 'ADMIN' | 'OPERATOR';

export interface UserSession {
  username: string;
  role: Role;
}

export interface AppSettings {
  showMetricsToOperator: boolean;
}

// Configuración por defecto
const DEFAULT_USERS = [
  { username: 'admin', password: '123', role: 'ADMIN' },
  { username: 'corte', password: '123', role: 'OPERATOR' }
];

const MASTER_KEY = 'admin2026';
const USERS_KEY = 'dxf_pro_users';
const SETTINGS_KEY = 'dxf_pro_settings';
const SESSION_KEY = 'dxf_pro_session';

// --- DIAGNÓSTICO DE CONEXIÓN ---
const url = import.meta.env.VITE_UPSTASH_REDIS_REST_URL;
const token = import.meta.env.VITE_UPSTASH_REDIS_REST_TOKEN;

console.log("--- DIAGNÓSTICO DE NUBE ---");
console.log("URL Detectada:", url ? "SÍ (Oculta)" : "NO / UNDEFINED");
console.log("Token Detectado:", token ? "SÍ (Oculto)" : "NO / UNDEFINED");

let redis: Redis | null = null;

try {
  if (url && token) {
    redis = new Redis({
      url: url,
      token: token,
    });
    console.log("✅ Cliente Redis inicializado correctamente.");
  } else {
    console.warn("⚠️ Faltan variables de entorno. Usando Modo Local.");
  }
} catch (e) {
  console.error("❌ Error CRÍTICO al iniciar Redis:", e);
}

// --- FUNCIONES ASÍNCRONAS (Nube) ---

export const getUsers = async () => {
  // 1. Intentar leer de la nube
  if (redis) {
    try {
      console.log("☁️ Intentando leer usuarios de la nube...");
      const data = await redis.get(USERS_KEY);
      if (data) {
        console.log("✅ Datos recibidos de Upstash");
        return data as any[];
      }
      // Si está vacío en la nube, subimos los por defecto
      console.log("☁️ Base de datos vacía, subiendo usuarios por defecto...");
      await redis.set(USERS_KEY, JSON.stringify(DEFAULT_USERS));
      return DEFAULT_USERS;
    } catch (e) {
      console.error("❌ Error de conexión con Upstash:", e);
      console.log("⚠️ Cayendo a modo local por error de red.");
    }
  } else {
    console.log("⚠️ Redis es NULL. Usando modo local directo.");
  }
  
  // 2. Fallback local
  const local = localStorage.getItem(USERS_KEY);
  return local ? JSON.parse(local) : DEFAULT_USERS;
};

export const addUser = async (username: string, password?: string) => {
  const users = await getUsers();
  if (!users.find((u: any) => u.username === username)) {
    users.push({ 
        username, 
        password: password || '123', 
        role: 'OPERATOR' 
    });
    
    if (redis) {
        try {
            await redis.set(USERS_KEY, JSON.stringify(users));
            console.log("✅ Usuario guardado en NUBE.");
        } catch(e) {
            console.error("❌ Error guardando en nube:", e);
        }
    }
    localStorage.setItem(USERS_KEY, JSON.stringify(users)); // Backup local
  }
};

export const removeUser = async (username: string) => {
  if (username === 'admin') return;
  let users = await getUsers();
  users = users.filter((u: any) => u.username !== username);
  
  if (redis) await redis.set(USERS_KEY, JSON.stringify(users));
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

export const login = async (username: string, pass: string): Promise<boolean> => {
  // 1. Llave Maestra (Siempre funciona, sin internet)
  if (pass === MASTER_KEY) {
      const session: UserSession = { username: 'MASTER ADMIN', role: 'ADMIN' };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      return true;
  }

  // 2. Buscar usuario (en nube o local)
  console.log(`🔍 Intentando login para: ${username}`);
  const users = await getUsers();
  const user = users.find((u: any) => u.username.toLowerCase() === username.toLowerCase().trim() && u.password === pass);
  
  if (user) {
    const session: UserSession = { username: user.username, role: user.role };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return true;
  }
  return false;
};

// --- Sincronas (Sesión local) ---

export const logout = () => { localStorage.removeItem(SESSION_KEY); };

export const getSession = (): UserSession | null => {
  if (typeof window === 'undefined') return null;
  const sess = localStorage.getItem(SESSION_KEY);
  return sess ? JSON.parse(sess) : null;
};

export const getSettings = (): AppSettings => {
  const local = localStorage.getItem(SETTINGS_KEY);
  return local ? JSON.parse(local) : { showMetricsToOperator: false };
};

export const updateSettings = (newSettings: AppSettings) => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
};

export const logExport = (filename: string, height: number, width: number) => {
  console.log(`[EXPORT] ${filename} (${height}x${width})`);
};
