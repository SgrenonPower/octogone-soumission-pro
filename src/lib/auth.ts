// Authentification simple par code d'accès
const ACCESS_CODE = 'octogone2025';
const STORAGE_KEY = 'octogone_access';

export const isAuthenticated = (): boolean => {
  return localStorage.getItem(STORAGE_KEY) === 'true';
};

export const login = (code: string): boolean => {
  if (code === ACCESS_CODE) {
    localStorage.setItem(STORAGE_KEY, 'true');
    return true;
  }
  return false;
};

export const logout = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};
