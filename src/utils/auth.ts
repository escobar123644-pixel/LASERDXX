// src/utils/auth.ts

export const MASTER_KEY = 'master_admin_2026';
export const DEFAULT_OPERATOR_KEY = 'laseruserbeta';
export const OPERATOR_KEYS_STORAGE_KEY = 'dxf_pro_operators';
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

// Initialize default operator keys if not present
const initOperatorKeys = () => {
  const keys = localStorage.getItem(OPERATOR_KEYS_STORAGE_KEY);
  if (!keys) {
    localStorage.setItem(OPERATOR_KEYS_STORAGE_KEY, JSON.stringify([DEFAULT_OPERATOR_KEY]));
  }
};

export const getOperatorKeys = (): string[] => {
  initOperatorKeys();
  const keys = localStorage.getItem(OPERATOR_KEYS_STORAGE_KEY);
  return keys ? JSON.parse(keys) : [];
};

export const addOperatorKey = (key: string) => {
  const keys = getOperatorKeys();
  if (!keys.includes(key)) {
    keys.push(key);
    localStorage.setItem(OPERATOR_KEYS_STORAGE_KEY, JSON.stringify(keys));
  }
};

export const authenticate = (key: string): UserSession | null => {
  initOperatorKeys();
  
  if (key === MASTER_KEY) {
    return createSession('ADMIN', 'Master Admin');
  }

  const operatorKeys = getOperatorKeys();
  if (operatorKeys.includes(key)) {
    return createSession('OPERATOR', 'Operator'); // In a real app we might want unique IDs
  }

  return null;
};

const createSession = (role: 'ADMIN' | 'OPERATOR', username: string): UserSession => {
  const session: UserSession = {
    role,
    token: Math.random().toString(36).substring(2) + Date.now().toString(36),
    expiry: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    username
  };
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  return session;
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
  localStorage.removeItem(SESSION_STORAGE_KEY);
  // localStorage.removeItem(OPERATOR_KEYS_STORAGE_KEY); // Spec says "invalidate all sessions", removing keys might be too aggressive, but removing session is key.
  // Actually "Global Reset" usually implies resetting everything or logging everyone out.
  // The spec says: "Button to immediately invalidate all sessions and force logout".
  // Since we use local storage, we can't easily invalidate *other* browser sessions without a backend.
  // But we can simulate it by adding a "session version" or "valid since" timestamp in a real backend.
  // For this client-side only app, we will just clear the current session.
  // However, to truly "invalidate all sessions" in a client-side only app is impossible across devices.
  // We will assume this is a terminal running on a specific machine.
  localStorage.clear(); 
  // Re-init defaults
  initOperatorKeys();
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
  history.unshift(record); // Add to beginning
  localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
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
