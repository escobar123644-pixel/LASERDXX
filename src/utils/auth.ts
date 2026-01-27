// src/utils/auth.ts

// Claves Maestras del Sistema
export const MASTER_KEY = 'master_admin_2026';
export const DEFAULT_OPERATOR_KEY = 'laseruserbeta';

// Keys para LocalStorage (Sesión local y caché)
export const SESSION_STORAGE_KEY = 'dxf_pro_session';
export const HISTORY_STORAGE_KEY = 'dxf_pro_history';
export const SETTINGS_STORAGE_KEY = 'dxf_pro_settings';

export interface UserSession {
  role: 'ADMIN' | 'OPERATOR';
  token: string;
  expiry: number;
  username: string;
}

export interface ExportRecord {
  id: string;
  timestamp: number;
  operator: string;
  filename: string;
  consumptionYards: number;
  consumptionYardsX?: number;
}

export interface AppSettings {
  showMetricsToOperator: boolean;
}

/**
 * Nueva función de autenticación:
 * Ahora recibe el NOMBRE (username) seleccionado de Upstash y la LLAVE (key)
 */
export const authenticate = (username: string, key: string): UserSession | null => {
  // 1. Validar si es Admin
  if (key === MASTER_KEY) {
    return createSession('ADMIN', username || 'Master Admin');
  }

  // 2. Validar si es Operador (usando la clave genérica)
  if (key === DEFAULT_OPERATOR_KEY) {
    return createSession('OPERATOR', username || 'Operator');
  }

  return null;
};

const createSession = (role: 'ADMIN' | 'OPERATOR', username: string): UserSession => {
  const session: UserSession = {
    role,
    token: Math.random().toString(36).substring(2) + Date.now().toString(36),
    expiry: Date.now() + 24 * 60 * 60 * 1000, // 24 horas de duración
    username: username.toUpperCase()
  };
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  return session;
};

// Función de ayuda para el componente Login
export const login = (username: string, key: string): boolean => {
  return authenticate(username, key) !== null;
};

export const getSession = (): UserSession | null => {
  const sessionStr = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!sessionStr) return null;

  try {
    const session: UserSession = JSON.parse(sessionStr);
    if (Date.now() > session.expiry) {
      logout();
      return null;
    }
    return session;
  } catch (e) {
    logout();
    return null;
  }
};

export const logout = () => {
  localStorage.removeItem(SESSION_STORAGE_KEY);
};

export const globalReset = () => {
  localStorage.clear();
};

export const logExport = (filename: string, consumptionYards: number, consumptionYardsX?: number) => {
  const session = getSession();
  const record: ExportRecord = {
    id: Math.random().toString(36).substring(2),
    timestamp: Date.now(),
    operator: session ? session.username : 'Unknown',
    filename,
    consumptionYards,
    consumptionYardsX
  };
  
  const historyStr = localStorage.getItem(HISTORY_STORAGE_KEY);
  const history: ExportRecord[] = historyStr ? JSON.parse(historyStr) : [];
  history.unshift(record);
  localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history.slice(0, 50))); // Guardar últimos 50
};

export const getHistory = (): ExportRecord[] => {
  const historyStr = localStorage.getItem(HISTORY_STORAGE_KEY);
  return historyStr ? JSON.parse(historyStr) : [];
};

export const getSettings = (): AppSettings => {
  const settingsStr = localStorage.getItem(SETTINGS_STORAGE_KEY);
  return settingsStr ? JSON.parse(settingsStr) : { showMetricsToOperator: false };
};

export const updateSettings = (settings: AppSettings) => {
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
};
