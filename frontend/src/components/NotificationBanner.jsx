import { useState, useEffect } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';

const DISMISSED_KEY = 'uniorg_notif_dismissed';

function daysUntil(d) { return Math.ceil((new Date(d) - new Date(new Date().toDateString())) / 86400000); }

async function fireNotifs() {
  const [subjects, events] = await Promise.all([api.getAllSubjects(), api.getAllEvents()]);
  const subMap = Object.fromEntries(subjects.map(s => [s.id, s]));
  const thresholds = new Set([0, 1, 3, 7]);
  for (const e of events) {
    const du = daysUntil(e.date);
    if (!thresholds.has(du)) continue;
    const label = du === 0 ? '¡Hoy!' : du === 1 ? 'Mañana' : `En ${du} días`;
    const subId = e.subject_id ?? e.subjectId;
    new Notification(`${label} — ${e.title}`, { body: subMap[subId]?.name ?? '', icon: '/favicon.svg', tag: e.id });
    await new Promise(r => setTimeout(r, 300));
  }
}

export default function NotificationBanner() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (localStorage.getItem(DISMISSED_KEY)) return;
    if (Notification.permission === 'default') { setTimeout(() => setVisible(true), 2000); return; }
    if (Notification.permission === 'granted') {
      const key = 'uniorg_notif_date';
      const today = new Date().toISOString().slice(0, 10);
      if (sessionStorage.getItem(key) !== today) { sessionStorage.setItem(key, today); fireNotifs(); }
    }
  }, [user]);

  if (!visible) return null;

  const allow = async () => {
    const perm = await Notification.requestPermission();
    setVisible(false);
    if (perm === 'granted') fireNotifs();
  };
  const dismiss = () => { localStorage.setItem(DISMISSED_KEY, '1'); setVisible(false); };

  return (
    <div className="notif-banner notif-banner-visible">
      <span>🔔 Activá notificaciones para recordatorios de exámenes</span>
      <div className="notif-banner-actions">
        <button className="btn btn-sm btn-primary" onClick={allow}>Activar</button>
        <button className="btn btn-sm btn-ghost" onClick={dismiss}>No, gracias</button>
      </div>
    </div>
  );
}
