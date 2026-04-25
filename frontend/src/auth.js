// Manejo simple del token JWT y datos del usuario en localStorage
export const auth = {
  getUser:  () => { const s = localStorage.getItem('uniorg_user'); return s ? JSON.parse(s) : null; },
  getToken: () => localStorage.getItem('uniorg_token') ?? '',
  save: (token, user) => {
    localStorage.setItem('uniorg_token', token);
    localStorage.setItem('uniorg_user', JSON.stringify(user));
  },
  clear: () => {
    localStorage.removeItem('uniorg_token');
    localStorage.removeItem('uniorg_user');
  },
};
