import { createContext, useContext, useState } from 'react';
import { auth } from '../auth.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => auth.getUser());

  const login = () => setUser(auth.getUser());
  const logout = () => { auth.logout(); setUser(null); };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
