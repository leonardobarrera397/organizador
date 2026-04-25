import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api.js';
import { navigate, useHash } from '../router.jsx';

// ── Modal de configuración ───────────────────────────────────────
function SettingsModal({ user, onClose, logout }) {
  const [step, setStep]       = useState('main');   // 'main' | 'confirm'
  const [emailInput, setEmailInput] = useState('');
  const [deleting, setDeleting]     = useState(false);
  const [error, setError]           = useState('');

  const emailMatch = emailInput.trim().toLowerCase() === user.email.toLowerCase();

  const handleDelete = async () => {
    if (!emailMatch) return;
    setDeleting(true);
    setError('');
    try {
      await api.deleteAccount();
      logout(); // limpia localStorage y redirige a /login
    } catch (err) {
      setError(err.message);
      setDeleting(false);
    }
  };

  return (
    <div className="modal-overlay modal-open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 440 }}>

        {/* ── Vista principal ── */}
        {step === 'main' && <>
          <div className="modal-header">
            <h2 className="modal-title">⚙ Configuración</h2>
            <button className="btn-icon" onClick={onClose}>✕</button>
          </div>
          <div className="modal-body">
            {/* Info del usuario */}
            <div style={{ display:'flex', alignItems:'center', gap:14, padding:'16px 0', borderBottom:'1px solid var(--border)' }}>
              <div className="user-avatar" style={{ width:48, height:48, fontSize:'1.3rem', flexShrink:0 }}>
                {user.name[0].toUpperCase()}
              </div>
              <div>
                <p style={{ fontWeight:700 }}>{user.name}</p>
                <p style={{ fontSize:'.83rem', color:'var(--text-2)' }}>{user.email}</p>
              </div>
            </div>

            {/* Zona de peligro */}
            <div style={{ marginTop:24, padding:16, borderRadius:'var(--radius-lg)', border:'1px solid rgba(239,68,68,.3)', background:'rgba(239,68,68,.05)' }}>
              <p style={{ fontFamily:'var(--font-mono)', fontSize:'.78rem', color:'var(--red)', fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:8 }}>
                ⚠ Zona de peligro
              </p>
              <p style={{ fontSize:'.85rem', color:'var(--text-2)', marginBottom:14 }}>
                Eliminar la cuenta borra permanentemente todos tus años, materias, eventos, archivos y notas. Esta acción no se puede deshacer.
              </p>
              <button
                className="btn btn-sm"
                style={{ background:'rgba(239,68,68,.15)', color:'var(--red)', border:'1px solid rgba(239,68,68,.3)' }}
                onClick={() => setStep('confirm')}
              >
                Eliminar mi cuenta
              </button>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={onClose}>Cerrar</button>
          </div>
        </>}

        {/* ── Confirmación con email ── */}
        {step === 'confirm' && <>
          <div className="modal-header">
            <h2 className="modal-title" style={{ color:'var(--red)' }}>Confirmar eliminación</h2>
            <button className="btn-icon" onClick={onClose}>✕</button>
          </div>
          <div className="modal-body">
            <p style={{ fontSize:'.9rem', marginBottom:20, lineHeight:1.6 }}>
              Para confirmar, escribí tu dirección de email:
            </p>
            <p style={{ fontFamily:'var(--font-mono)', fontSize:'.85rem', color:'var(--accent)', background:'var(--bg-s2)', padding:'8px 12px', borderRadius:'var(--radius)', marginBottom:16 }}>
              {user.email}
            </p>
            <div className="form-group">
              <input
                className="form-input"
                placeholder="Tu email"
                value={emailInput}
                onChange={e => { setEmailInput(e.target.value); setError(''); }}
                autoFocus
                style={{ borderColor: emailInput && !emailMatch ? 'var(--red)' : undefined }}
              />
            </div>
            {error && <p style={{ color:'var(--red)', fontSize:'.83rem', marginTop:4 }}>{error}</p>}
          </div>
          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={() => { setStep('main'); setEmailInput(''); setError(''); }}>
              Volver
            </button>
            <button
              className="btn"
              style={{ background: emailMatch ? 'var(--red)' : 'rgba(239,68,68,.2)', color: emailMatch ? '#fff' : 'rgba(239,68,68,.5)', cursor: emailMatch ? 'pointer' : 'not-allowed' }}
              onClick={handleDelete}
              disabled={!emailMatch || deleting}
            >
              {deleting ? 'Eliminando...' : 'Eliminar cuenta'}
            </button>
          </div>
        </>}

      </div>
    </div>
  );
}

// ── Navbar principal ─────────────────────────────────────────────
export default function Navbar({ open, onClose, onSearchOpen }) {
  const { user, logout } = useAuth();
  const hash = useHash();

  const [years,       setYears]       = useState([]);
  const [subjectsMap, setSubjectsMap] = useState({});
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (!user) return;
    api.getYears().then(async yrs => {
      setYears(yrs);
      const map = {};
      await Promise.all(yrs.map(async y => { map[y.id] = await api.getSubjects(y.id); }));
      setSubjectsMap(map);
    }).catch(() => {});
  }, [user, hash]);

  if (!user) return null;

  const isActive = path => hash === '#' + path ? 'nav-active' : '';

  return (
    <>
      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        <div className="sidebar-logo">
          <span className="logo-text">Uni<span className="logo-accent">Org</span></span>
          <span className="logo-cursor">_</span>
        </div>

        <div className="sidebar-search" onClick={onSearchOpen} title="Buscar (Ctrl+K)" role="button">
          <span className="search-bar-icon">🔍</span>
          <span className="search-bar-text">Buscar...</span>
          <kbd className="search-bar-kbd">Ctrl K</kbd>
        </div>

        <nav className="sidebar-nav">
          <a href="#/dashboard" className={`nav-item ${isActive('/dashboard')}`} onClick={onClose}>
            <span className="nav-icon">⊞</span> Dashboard
          </a>
          <a href="#/years" className={`nav-item ${isActive('/years')}`} onClick={onClose}>
            <span className="nav-icon">🎓</span> Mis Años
          </a>

          {years.length > 0 && <div className="nav-divider" />}

          {years.map(y => {
            const subjects = subjectsMap[y.id] ?? [];
            return (
              <div key={y.id} className="nav-year-group">
                <a href={`#/years/${y.id}`} className={`nav-year ${isActive('/years/' + y.id)}`} onClick={onClose}>
                  <span className="nav-icon">📅</span>
                  <span>{y.name}</span>
                </a>
                {subjects.map(s => (
                  <a key={s.id} href={`#/subjects/${s.id}`} className={`nav-sub-item ${isActive('/subjects/' + s.id)}`} onClick={onClose}>
                    <span className="subject-dot" style={{ background: s.color }} />
                    {s.name}
                  </a>
                ))}
              </div>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info" style={{ cursor:'pointer' }} onClick={() => setShowSettings(true)} title="Configuración">
            <div className="user-avatar">{user.name[0].toUpperCase()}</div>
            <div className="user-details">
              <span className="user-name">{user.name}</span>
              <span className="user-email">{user.email}</span>
            </div>
          </div>
          <button className="btn-icon" onClick={() => setShowSettings(true)} title="Configuración" style={{ fontSize:'1rem' }}>⚙</button>
          <button className="btn-logout" onClick={logout} title="Cerrar sesión">⏻</button>
        </div>
      </aside>

      {showSettings && (
        <SettingsModal user={user} logout={logout} onClose={() => setShowSettings(false)} />
      )}
    </>
  );
}
