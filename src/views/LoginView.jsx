import { useState } from 'react';
import { auth } from '../auth.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { navigate } from '../router.jsx';

export default function LoginView() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const { login } = useAuth();
  const { showToast } = useToast();

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = e => {
    e.preventDefault();
    const result = mode === 'login'
      ? auth.login(form.email, form.password)
      : auth.register(form.name, form.email, form.password);
    if (result.success) {
      login();
      showToast(`Bienvenido, ${result.user.name}!`, 'success');
      navigate('/dashboard');
    } else {
      showToast(result.error, 'error');
    }
  };

  const loadDemo = () => {
    const r = auth.login('demo@uniorg.dev', 'demo1234');
    if (r.success) { login(); navigate('/dashboard'); return; }
    const r2 = auth.register('Demo User', 'demo@uniorg.dev', 'demo1234');
    if (r2.success) { login(); navigate('/dashboard'); }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg" />
      <div className="auth-card">
        <div className="auth-logo">
          <span className="logo-text">Uni<span className="logo-accent">Org</span></span>
          <span className="logo-cursor">_</span>
        </div>
        <p className="auth-subtitle">Organizador para universitarios de programación</p>

        <div className="auth-tabs">
          {['login','register'].map(m => (
            <button key={m} className={`auth-tab ${mode === m ? 'auth-tab-active' : ''}`} onClick={() => setMode(m)}>
              {m === 'login' ? 'Ingresar' : 'Registrarse'}
            </button>
          ))}
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className="form-group">
              <label className="form-label">Nombre completo</label>
              <input className="form-input" type="text" placeholder="Juan Pérez" value={form.name} onChange={set('name')} required autoComplete="name" />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" placeholder="juan@universidad.edu" value={form.email} onChange={set('email')} required autoComplete="email" />
          </div>
          <div className="form-group">
            <label className="form-label">Contraseña</label>
            <input className="form-input" type="password" placeholder="••••••••" value={form.password} onChange={set('password')} required minLength={6} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
          </div>
          <button type="submit" className="btn btn-primary btn-full">
            {mode === 'login' ? 'Ingresar al sistema' : 'Crear cuenta'}
          </button>
        </form>

        <div className="auth-demo">
          <button className="btn-link" onClick={loadDemo}>Usar cuenta demo →</button>
        </div>
      </div>
    </div>
  );
}
