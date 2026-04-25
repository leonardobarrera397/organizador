import { useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { navigate } from '../router.jsx';

export default function LoginView() {
  const [mode, setMode]       = useState('login');
  const [form, setForm]       = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login }   = useAuth();
  const { showToast } = useToast();

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = mode === 'login'
        ? await api.login(form.email, form.password)
        : await api.register(form.name, form.email, form.password);
      login(result.user, result.token);
      showToast(`Bienvenido, ${result.user.name}!`, 'success');
      navigate('/dashboard');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadDemo = async () => {
    setLoading(true);
    try {
      let result;
      try       { result = await api.login('demo@uniorg.dev', 'demo1234'); }
      catch (_) { result = await api.register('Demo User', 'demo@uniorg.dev', 'demo1234'); }
      login(result.user, result.token);
      navigate('/dashboard');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
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
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Cargando...' : mode === 'login' ? 'Ingresar al sistema' : 'Crear cuenta'}
          </button>
        </form>

        <div className="auth-demo">
          <button className="btn-link" onClick={loadDemo} disabled={loading}>Usar cuenta demo →</button>
        </div>
      </div>
    </div>
  );
}
