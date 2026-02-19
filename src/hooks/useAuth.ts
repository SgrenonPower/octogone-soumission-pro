import { useState, useEffect } from 'react';
import { isAuthenticated, login, logout } from '@/lib/auth';

export const useAuth = () => {
  const [authenticated, setAuthenticated] = useState<boolean>(isAuthenticated());

  useEffect(() => {
    setAuthenticated(isAuthenticated());
  }, []);

  const handleLogin = (code: string): boolean => {
    const success = login(code);
    if (success) setAuthenticated(true);
    return success;
  };

  const handleLogout = () => {
    logout();
    setAuthenticated(false);
  };

  return { authenticated, login: handleLogin, logout: handleLogout };
};
