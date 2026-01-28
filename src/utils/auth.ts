export type Role = 'ADMIN' | 'OPERATOR';

export interface UserSession {
  username: string;
  role: Role;
}

export interface AppSettings {
  showMetricsToOperator: boolean;
}

// AQUÍ AGREGAMOS TUS USUARIOS FIJOS PARA QUE FUNCIONEN EN NETLIFY HOY
const DEFAULT_USERS = [
  { username: 'admin', password: '123', role: 'ADMIN' },
  { username: 'corte', password: '123', role: 'OPERATOR' }, // Operario global
  { username: 'taller', password: '123', role: 'OPERATOR' }  // Otro ejemplo
];

const DEFAULT_SETTINGS: AppSettings = { showMetricsToOperator: false };

const USERS_KEY = 'dxf_pro_users';
const SETTINGS_KEY = 'dxf_pro_settings';
const SESSION_KEY = 'dxf_pro_session';
const MASTER_KEY = 'admin2026'; // <--- TU LLAVE MAESTRA

const initStore = () => {
  if (typeof window === 'undefined') return;
  if (!localStorage.getItem(USERS_KEY)) localStorage.setItem(USERS_KEY, JSON.stringify(DEFAULT_USERS));
  if (!localStorage.getItem(SETTINGS_KEY)) localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
};

export const login = (username: string, pass: string): boolean => {
  initStore();

  // 1. LOGIN MAESTRO: Entras directo con la clave maestra
  if (pass === MASTER_KEY) {
      const session: UserSession = { username: 'MASTER ADMIN', role: 'ADMIN' };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      return true;
  }

  // 2. Login normal (busca en usuarios fijos o creados)
  const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  const user = users.find((u: any) => u.username.toLowerCase() === username.toLowerCase().trim() && u.password === pass);
  
  if (user) {
    const session: UserSession = { username: user.username, role: user.role };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return true;
  }
  return false;
};

export const logout = () => { localStorage.removeItem(SESSION_KEY); };

export const getSession = (): UserSession | null => {
  if (typeof window === 'undefined') return null;
  const sess = localStorage.getItem(SESSION_KEY);
  return sess ? JSON.parse(sess) : null;
};

export const getUsers = () => {
  initStore();
  return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
};

// Permite crear usuarios con contraseña personalizada
export const addUser = (username: string, password?: string) => {
  const users = getUsers();
  if (!users.find((u: any) => u.username === username)) {
    users.push({ 
        username, 
        password: password || '123', 
        role: 'OPERATOR' 
    });
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }
};

export const removeUser = (username: string) => {
  if (username === 'admin') return;
  let users = getUsers();
  users = users.filter((u: any) => u.username !== username);
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

export const getSettings = (): AppSettings => {
  initStore();
  return JSON.parse(localStorage.getItem(SETTINGS_KEY) || JSON.stringify(DEFAULT_SETTINGS));
};

export const updateSettings = (newSettings: AppSettings) => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
};

export const logExport = (filename: string, height: number, width: number) => {
  console.log(`[EXPORT] ${filename} (${height}x${width})`);
};
