import { useAuth } from '../context/AuthContext.jsx';
import { db } from '../db.js';
import { navigate, useHash } from '../router.jsx';

export default function Navbar({ open, onClose, onSearchOpen }) {
  const { user, logout } = useAuth();
  const hash = useHash();
  if (!user) return null;

  const isActive = path => hash === '#' + path ? 'nav-active' : '';
  const years = db.getYears(user.userId);

  return (
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
          const subjects = db.getSubjects(y.id);
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
        <div className="user-info">
          <div className="user-avatar">{user.name[0].toUpperCase()}</div>
          <div className="user-details">
            <span className="user-name">{user.name}</span>
            <span className="user-email">{user.email}</span>
          </div>
        </div>
        <button className="btn-logout" onClick={logout} title="Cerrar sesión">⏻</button>
      </div>
    </aside>
  );
}
