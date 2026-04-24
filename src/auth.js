import { db } from './db.js';

export const auth = {
  login(email, password) {
    const user = db.getUsers().find(u => u.email === email && u.password === password);
    if (!user) return { success: false, error: 'Email o contraseña incorrectos' };
    db.setSession({ userId: user.id, email: user.email, name: user.name });
    return { success: true, user };
  },

  register(name, email, password) {
    if (db.getUsers().find(u => u.email === email))
      return { success: false, error: 'El email ya está registrado' };
    const user = db.createUser({ name, email, password });
    db.setSession({ userId: user.id, email: user.email, name: user.name });
    return { success: true, user };
  },

  logout() {
    db.clearSession();
    window.location.hash = '#/login';
  },

  getUser() {
    return db.getSession();
  },

  requireAuth() {
    const user = db.getSession();
    if (!user) { window.location.hash = '#/login'; return null; }
    return user;
  },
};
