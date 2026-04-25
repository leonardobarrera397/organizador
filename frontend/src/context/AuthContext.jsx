import { createContext, useContext, useState } from 'react';
import { auth } from '../auth.js';
import { navigate } from '../router.jsx';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => auth.getUser());

  // Llamado desde LoginView con los datos que devuelve el backend
  const login = (userData, token) => {
    auth.save(token, userData);
    setUser(userData);
  };

  const logout = () => {
    auth.clear();
    setUser(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
