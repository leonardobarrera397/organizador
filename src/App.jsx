import { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext.jsx';
import { useHash, navigate } from './router.jsx';
import Navbar from './components/Navbar.jsx';
import Pomodoro from './components/Pomodoro.jsx';
import Search from './components/Search.jsx';
import NotificationBanner from './components/NotificationBanner.jsx';
import LoginView from './views/LoginView.jsx';
import DashboardView from './views/DashboardView.jsx';
import YearsView from './views/YearsView.jsx';
import SubjectDetailView from './views/SubjectDetailView.jsx';

function AppShell({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen]   = useState(false);

  useEffect(() => {
    const handler = e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(o => !o); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const closeSearch = () => setSearchOpen(false);

  return (
    <div className="app-shell">
      <button className="hamburger" onClick={() => setSidebarOpen(o => !o)}>☰</button>

      <Navbar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSearchOpen={() => setSearchOpen(true)}
      />

      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      <main className="main-content">{children}</main>

      <Pomodoro />
      <Search open={searchOpen} onClose={closeSearch} />
      <NotificationBanner />
    </div>
  );
}

export default function App() {
  const { user } = useAuth();
  const hash = useHash();

  if (!user) {
    if (hash !== '#/login') { navigate('/login'); return null; }
    return <LoginView />;
  }

  if (hash === '#/login' || hash === '#/') {
    navigate('/dashboard');
    return null;
  }

  let content;
  if (hash === '#/dashboard') {
    content = <DashboardView />;
  } else if (hash === '#/years') {
    content = <YearsView />;
  } else {
    const yearMatch = hash.match(/^#\/years\/([^/]+)$/);
    if (yearMatch) {
      content = <YearsView yearId={yearMatch[1]} />;
    } else {
      const subMatch = hash.match(/^#\/subjects\/([^/]+)$/);
      if (subMatch) content = <SubjectDetailView subjectId={subMatch[1]} />;
      else { navigate('/dashboard'); return null; }
    }
  }

  return <AppShell>{content}</AppShell>;
}
