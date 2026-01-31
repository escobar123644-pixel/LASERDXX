import { Redis } from '@upstash/redis';

// --- TIPOS ---
export type Role = 'ADMIN' | 'OPERATOR';

export interface UserSession {
  username: string;
  role: Role;
  machineId?: string;
}

export interface Machine {
  id: string;
  name: string;
  distance: number;
  limit: number;
  status: 'OK' | 'WARNING' | 'CRITICAL';
}

export interface SystemLog {
  id: string;
  timestamp: string;
  type: 'INFO' | 'WARN' | 'ERROR' | 'EXPORT';
  message: string;
  user: string;
}

export interface AppSettings {
  showMetricsToOperator: boolean;
  toleranceMm: number;
  enableLabeling: boolean; // <--- NUEVA OPCIÓN
}

const DEFAULT_USERS = [
];

const DEFAULT_MACHINES: Machine[] = [
    { id: 'm_default', name: 'Láser Principal', distance: 0, limit: 10000, status: 'OK' }
];

const USERS_KEY = 'dxf_pro_users';
const MACHINES_KEY = 'dxf_pro_machines';
const SETTINGS_KEY = 'dxf_pro_settings';
const LOGS_KEY = 'dxf_pro_logs'; 
const BROADCAST_KEY = 'dxf_pro_broadcast';
const SESSION_KEY = 'dxf_pro_session';
const MASTER_KEY = 'admin2026';

const url = import.meta.env.VITE_UPSTASH_REDIS_REST_URL;
const token = import.meta.env.VITE_UPSTASH_REDIS_REST_TOKEN;

let redis: Redis | null = null;
try { if (url && token) redis = new Redis({ url, token }); } catch (e) {}

// --- USUARIOS ---
export const getUsers = async () => {
  if (redis) {
    try {
      const data = await redis.get(USERS_KEY);
      if (data) return data as any[];
      await redis.set(USERS_KEY, JSON.stringify(DEFAULT_USERS));
      return DEFAULT_USERS;
    } catch (e) { return DEFAULT_USERS; }
  }
  const local = localStorage.getItem(USERS_KEY);
  return local ? JSON.parse(local) : DEFAULT_USERS;
};

export const addUser = async (username: string, password?: string, machineId?: string) => {
  const users = await getUsers();
  if (!users.find((u: any) => u.username === username)) {
    users.push({ username, password: password || '123', role: 'OPERATOR', machineId: machineId || '' });
    if (redis) { try { await redis.set(USERS_KEY, JSON.stringify(users)); } catch(e) {} }
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }
};

export const removeUser = async (username: string) => {
  if (username === 'admin') return;
  let users = await getUsers();
  users = users.filter((u: any) => u.username !== username);
  if (redis) { try { await redis.set(USERS_KEY, JSON.stringify(users)); } catch(e) {} }
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

// --- MÁQUINAS ---
export const getMachines = async (): Promise<Machine[]> => {
    if (redis) {
        try {
            const data = await redis.get(MACHINES_KEY);
            if (data) return data as Machine[];
            await redis.set(MACHINES_KEY, JSON.stringify(DEFAULT_MACHINES));
            return DEFAULT_MACHINES;
        } catch (e) { return DEFAULT_MACHINES; }
    }
    const local = localStorage.getItem(MACHINES_KEY);
    return local ? JSON.parse(local) : DEFAULT_MACHINES;
};

export const addMachine = async (name: string) => {
    const machines = await getMachines();
    const newMachine: Machine = { id: `m_${Date.now()}`, name, distance: 0, limit: 10000, status: 'OK' };
    machines.push(newMachine);
    if (redis) { try { await redis.set(MACHINES_KEY, JSON.stringify(machines)); } catch(e) {} }
    localStorage.setItem(MACHINES_KEY, JSON.stringify(machines));
};

export const updateMachineDistance = async (id: string, distanceToAdd: number) => {
    try {
        let machines = await getMachines();
        machines = machines.map(m => {
            if (m.id === id) {
                const newDist = m.distance + distanceToAdd;
                let status: Machine['status'] = 'OK';
                if (newDist >= m.limit) status = 'CRITICAL';
                else if (newDist >= m.limit * 0.8) status = 'WARNING';
                return { ...m, distance: newDist, status };
            }
            return m;
        });
        if (redis) await redis.set(MACHINES_KEY, JSON.stringify(machines));
        localStorage.setItem(MACHINES_KEY, JSON.stringify(machines));
    } catch(e) {}
};

export const resetMachineCounter = async (id: string) => {
    let machines = await getMachines();
    machines = machines.map(m => m.id === id ? { ...m, distance: 0, status: 'OK' } : m);
    if (redis) { try { await redis.set(MACHINES_KEY, JSON.stringify(machines)); } catch(e) {} }
    localStorage.setItem(MACHINES_KEY, JSON.stringify(machines));
};

// --- LOGS ---
export const getLogs = async (): Promise<SystemLog[]> => {
    if (redis) {
        try {
            const data = await redis.get(LOGS_KEY);
            return Array.isArray(data) ? (data as SystemLog[]) : [];
        } catch (e) { return []; }
    }
    const local = localStorage.getItem(LOGS_KEY);
    return local ? JSON.parse(local) : [];
};

export const addLog = async (type: SystemLog['type'], message: string, user: string) => {
    try {
        const logs = await getLogs();
        const newLog: SystemLog = {
            id: Date.now().toString(),
            timestamp: new Date().toLocaleString(),
            type,
            message,
            user
        };
        const updatedLogs = [newLog, ...logs].slice(0, 100); 
        if (redis) await redis.set(LOGS_KEY, JSON.stringify(updatedLogs));
        localStorage.setItem(LOGS_KEY, JSON.stringify(updatedLogs));
    } catch(e) {}
};

// --- BROADCAST ---
export const setBroadcastMessage = async (message: string) => {
    if (redis) { try { await redis.set(BROADCAST_KEY, message); } catch(e) {} }
    localStorage.setItem(BROADCAST_KEY, message);
};

export const getBroadcastMessage = async (): Promise<string> => {
    if (redis) {
        try {
            const msg = await redis.get(BROADCAST_KEY);
            return (msg as string) || '';
        } catch (e) {}
    }
    return localStorage.getItem(BROADCAST_KEY) || '';
};

// --- SESIÓN ---
export const login = async (username: string, pass: string): Promise<boolean> => {
  if (pass === MASTER_KEY) {
      const session: UserSession = { username: 'MASTER ADMIN', role: 'ADMIN' };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      addLog('INFO', 'Admin Master Login', 'MASTER');
      return true;
  }
  const users = await getUsers();
  const user = users.find((u: any) => u.username.toLowerCase() === username.toLowerCase().trim() && u.password === pass);
  if (user) {
    const session: UserSession = { username: user.username, role: user.role, machineId: user.machineId };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    addLog('INFO', `Usuario ${user.username} inició sesión`, user.username);
    return true;
  }
  addLog('WARN', `Intento fallido de login: ${username}`, 'ANONYMOUS');
  return false;
};

export const logout = () => { localStorage.removeItem(SESSION_KEY); };

export const getSession = (): UserSession | null => {
  if (typeof window === 'undefined') return null;
  const sess = localStorage.getItem(SESSION_KEY);
  return sess ? JSON.parse(sess) : null;
};

// --- CONFIGURACIÓN ---
export const getSettings = (): AppSettings => {
  const local = localStorage.getItem(SETTINGS_KEY);
  // Valor por defecto para enableLabeling es TRUE
  return local ? JSON.parse(local) : { showMetricsToOperator: false, toleranceMm: 3.0, enableLabeling: true };
};

export const updateSettings = (newSettings: AppSettings) => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
};

export const logExport = (filename: string, height: number, width: number) => {};