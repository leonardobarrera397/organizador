import { useState, useEffect, useRef } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { navigate } from '../router.jsx';

const TYPE_META = {
  subject: { icon: '📚', label: 'Materias' },
  event:   { icon: '📅', label: 'Eventos' },
  note:    { icon: '📝', label: 'Post-its' },
  link:    { icon: '🔗', label: 'Links' },
};

// Búsqueda sincrónica sobre datos precargados
function runQuery(q, cache) {
  if (!q.trim() || !cache) return [];
  const lq = q.toLowerCase();
  const { subjects, events, notesBySubject, linksBySubject } = cache;
  const subMap = Object.fromEntries(subjects.map(s => [s.id, s]));
  const out = [];

  subjects.forEach(s => {
    if ([s.name, s.professor, s.code].some(v => v?.toLowerCase().includes(lq)))
      out.push({ type:'subject', title:s.name, sub:s.professor??'', color:s.color, action:()=>navigate('/subjects/'+s.id) });
  });
  events.forEach(e => {
    if ([e.title, e.description].some(v => v?.toLowerCase().includes(lq))) {
      const du = Math.ceil((new Date(e.date)-new Date())/86400000);
      out.push({ type:'event', title:e.title, sub:`${subMap[e.subject_id??e.subjectId]?.name??''} · ${du>0?`en ${du}d`:'pasado'}`, color:subMap[e.subject_id??e.subjectId]?.color, action:()=>navigate('/subjects/'+(e.subject_id??e.subjectId)) });
    }
  });
  subjects.forEach(s => {
    (notesBySubject[s.id]??[]).forEach(n => {
      if (n.content.toLowerCase().includes(lq))
        out.push({ type:'note', title:n.content.slice(0,80).replace(/\n/g,' '), sub:s.name, color:n.color, action:()=>navigate('/subjects/'+s.id) });
    });
    (linksBySubject[s.id]??[]).forEach(l => {
      if ([l.title,l.url].some(v=>v.toLowerCase().includes(lq)))
        out.push({ type:'link', title:l.title, sub:s.name, url:l.url, action:()=>window.open(l.url,'_blank') });
    });
  });
  return out.slice(0, 24);
}

function hl(text, q) {
  if (!q.trim()) return text;
  const esc = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${esc})`, 'gi'));
  return parts.map((p, i) =>
    new RegExp(esc, 'i').test(p) ? <mark key={i} className="search-highlight">{p}</mark> : p
  );
}

export default function Search({ open, onClose }) {
  const { user } = useAuth();
  const [q,         setQ]         = useState('');
  const [results,   setResults]   = useState([]);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [cache,     setCache]     = useState(null);
  const inputRef = useRef(null);

  // Precarga todos los datos cuando se abre el buscador
  useEffect(() => {
    if (!open || !user) return;
    setCache(null);
    api.getAllSubjects().then(async subjects => {
      const [events, ...perSubject] = await Promise.all([
        api.getAllEvents(),
        ...subjects.map(s => Promise.all([api.getNotes(s.id), api.getSubjectLinks(s.id)]).then(([n, l]) => ({ id: s.id, n, l }))),
      ]);
      const notesBySubject  = Object.fromEntries(perSubject.map(x => [x.id, x.n]));
      const linksBySubject  = Object.fromEntries(perSubject.map(x => [x.id, x.l]));
      setCache({ subjects, events, notesBySubject, linksBySubject });
    }).catch(() => {});
  }, [open, user]);

  useEffect(() => {
    if (open) { setQ(''); setResults([]); setActiveIdx(-1); setTimeout(() => inputRef.current?.focus(), 30); }
  }, [open]);

  useEffect(() => {
    const r = runQuery(q, cache);
    setResults(r);
    setActiveIdx(r.length ? 0 : -1);
  }, [q, cache]);

  useEffect(() => {
    if (!open) return;
    const handler = e => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i+1, results.length-1)); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => Math.max(i-1, 0)); }
      if (e.key === 'Enter' && activeIdx >= 0) { results[activeIdx]?.action(); onClose(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, results, activeIdx, onClose]);

  if (!open) return null;

  const groups = results.reduce((g, item, i) => {
    (g[item.type] ??= []).push({ ...item, _i: i });
    return g;
  }, {});

  return (
    <div className="search-overlay search-open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="search-box">
        <div className="search-input-row">
          <span className="search-icon">🔍</span>
          <input ref={inputRef} className="search-input" value={q} onChange={e => setQ(e.target.value)}
            placeholder="Buscar materias, eventos, notas, links..." autoComplete="off" />
          <kbd className="search-esc">Esc</kbd>
        </div>
        <div className="search-results">
          {!cache && <p className="search-empty">Cargando...</p>}
          {cache && !q && <p className="search-empty">Empezá a escribir...</p>}
          {cache && q && !results.length && <p className="search-empty">Sin resultados para "{q}"</p>}
          {Object.entries(groups).map(([type, items]) => (
            <div key={type} className="search-group">
              <div className="search-group-title">{TYPE_META[type]?.label}</div>
              {items.map(item => (
                <div key={item._i}
                  className={`search-item ${activeIdx === item._i ? 'search-item-active' : ''}`}
                  onMouseEnter={() => setActiveIdx(item._i)}
                  onClick={() => { item.action(); onClose(); }}
                >
                  <span className="search-item-icon">{TYPE_META[type]?.icon}</span>
                  <div className="search-item-body">
                    <span className="search-item-title">{hl(item.title, q)}</span>
                    <span className="search-item-sub">{item.sub}</span>
                  </div>
                  {item.color && <span className="search-item-dot" style={{ background: item.color }} />}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
