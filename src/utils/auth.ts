// Tipos
export type Role = 'ADMIN' | 'OPERATOR';

export interface UserSession {
  username: string;
  role: Role;
}

export interface AppSettings {
  showMetricsToOperator: boolean;
}

// Datos por defecto (Usuario: admin / Clave: 123)
const DEFAULT_USERS = [
  { username: 'admin', password: '123', role: 'ADMIN' },
  { username: 'operator', password: '123', role: 'OPERATOR' }
];

const DEFAULT_SETTINGS: AppSettings = {
  showMetricsToOperator: false
};

const USERS_KEY = 'dxf_pro_users';
const SETTINGS_KEY = 'dxf_pro_settings';
const SESSION_KEY = 'dxf_pro_session';

// Inicializar almacenamiento si está vacío
const initStore = () => {
  if (typeof window === 'undefined') return; // Seguridad para SSR
  if (!localStorage.getItem(USERS_KEY)) {
    localStorage.setItem(USERS_KEY, JSON.stringify(DEFAULT_USERS));
  }
  if (!localStorage.getItem(SETTINGS_KEY)) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
  }
};

// --- Funciones de Sesión (Login/Logout) ---

export const login = (username: string, pass: string): boolean => {
  initStore();
  const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  const user = users.find((u: any) => u.username === username && u.password === pass);
  
  if (user) {
    const session: UserSession = { username: user.username, role: user.role };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return true;
  }
  return false;
};

export const logout = () => {
  localStorage.removeItem(SESSION_KEY);
};

export const getSession = (): UserSession | null => {
  if (typeof window === 'undefined') return null;
  const sess = localStorage.getItem(SESSION_KEY);
  return sess ? JSON.parse(sess) : null;
};

// --- Funciones de Administración (Faltaban estas) ---

export const getUsers = () => {
  initStore();
  return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
};

export const addUser = (username: string) => {
  const users = getUsers();
  // Contraseña por defecto '123' para nuevos operadores
  if (!users.find((u: any) => u.username === username)) {
    users.push({ username, password: '123', role: 'OPERATOR' });
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }
};

export const removeUser = (username: string) => {
  let users = getUsers();
  // No permitir borrar al admin principal
  if (username === 'admin') return;
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

// --- Logs ---
export const logExport = (filename: string, height: number, width: number) => {
  console.log(`[EXPORT] ${new Date().toISOString()} - File: ${filename}, Consumption: ${height}yd x ${width}yd`);
  // Aquí podrías guardar un historial en localStorage si quisieras
};
