import { useState } from 'react';
import { db } from '../db.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { navigate } from '../router.jsx';
import Calendar from '../components/Calendar.jsx';
import Modal from '../components/Modal.jsx';

const EVENT_COLORS = { exam:'#ef4444', parcial:'#f59e0b', final:'#a78bfa', tp:'#22c55e', other:'#60a5fa' };
const EVENT_LABELS = { exam:'Examen', parcial:'Parcial', final:'Final', tp:'TP', other:'Otro' };
const du = d => Math.ceil((new Date(d) - new Date(new Date().toDateString())) / 86400000);

function initToolForm() { return { title: '', url: '', icon: '🔗', color: '#00e5b4' }; }

export default function DashboardView() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [tick, setTick] = useState(0);
  const refresh = () => setTick(t => t + 1);
  const [toolModal, setToolModal] = useState(false);
  const [toolForm, setToolForm] = useState(initToolForm());
  const [dayModal, setDayModal] = useState(null); // { date, evts }

  const tools    = db.getDashboardLinks(user.userId);
  const allEvts  = db.getAllUserEvents(user.userId);
  const subjects = db.getAllSubjects(user.userId);
  const subMap   = Object.fromEntries(subjects.map(s => [s.id, s]));
  const years    = db.getYears(user.userId);

  const upcoming = allEvts
    .filter(e => { const d = du(e.date); return d >= 0 && d <= 30; })
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map(e => ({ ...e, du: du(e.date), subject: subMap[e.subjectId] }));

  const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Buenos días' : h < 18 ? 'Buenas tardes' : 'Buenas noches'; };

  const addTool = e => {
    e.preventDefault();
    if (!toolForm.title || !toolForm.url) { showToast('Nombre y URL son requeridos', 'error'); return; }
    db.createDashboardLink({ userId: user.userId, ...toolForm });
    setToolModal(false); setToolForm(initToolForm()); refresh();
    showToast('Herramienta agregada', 'success');
  };

  return (
    <div>
      <div className="view-header">
        <div>
          <h1 className="view-title">{greeting()}, <span className="accent">{user.name.split(' ')[0]}</span></h1>
          <p className="view-subtitle">{new Date().toLocaleDateString('es-AR', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}</p>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-main">
          <div className="card">
            <div className="card-header"><h2 className="card-title">📅 Calendario</h2></div>
            <Calendar events={allEvts} onDayClick={(date, evts) => setDayModal({ date, evts })} />
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="card-title">🔧 Herramientas</h2>
              <button className="btn btn-sm btn-ghost" onClick={() => setToolModal(true)}>+ Agregar</button>
            </div>
            <div className="tools-grid">
              {tools.map(t => (
                <div key={t.id} className="tool-card">
                  <a href={t.url} target="_blank" rel="noopener" className="tool-link">
                    <span className="tool-icon" style={{ background: t.color + '25', color: t.color }}>{t.icon}</span>
                    <span className="tool-title">{t.title}</span>
                  </a>
                  <button className="tool-delete btn-icon" onClick={() => { db.deleteDashboardLink(t.id); refresh(); }}>✕</button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="dashboard-aside">
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">⏰ Próximos eventos</h2>
              <span className="badge">{upcoming.length}</span>
            </div>
            <div className="upcoming-list">
              {upcoming.length === 0 && <p className="empty-state">Sin eventos próximos</p>}
              {upcoming.slice(0, 10).map(e => {
                const urg = e.du <= 3 ? 'urgent' : e.du <= 7 ? 'soon' : '';
                return (
                  <div key={e.id} className={`upcoming-item ${urg}`} style={{ cursor: 'pointer' }} onClick={() => navigate('/subjects/' + e.subjectId)}>
                    <div className="event-type-dot" style={{ background: EVENT_COLORS[e.type] ?? EVENT_COLORS.other }} />
                    <div className="upcoming-info">
                      <span className="upcoming-title">{e.title}</span>
                      <span className="upcoming-meta">{e.subject?.name ?? ''} · {e.du === 0 ? 'Hoy' : e.du === 1 ? 'Mañana' : `en ${e.du} días`}</span>
                    </div>
                    <span className={`upcoming-badge ${urg}`}>{EVENT_LABELS[e.type] ?? e.type}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card">
            <h2 className="card-title" style={{ marginBottom: 12 }}>📊 Resumen</h2>
            <div className="stats-grid">
              {[
                { num: years.length,    label: 'Años' },
                { num: subjects.length, label: 'Materias' },
                { num: allEvts.length,  label: 'Eventos' },
                { num: upcoming.length, label: 'Próximos', accent: true },
              ].map(s => (
                <div key={s.label} className="stat-item">
                  <span className={`stat-num ${s.accent ? 'accent' : ''}`}>{s.num}</span>
                  <span className="stat-label">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* Add tool modal */}
      {toolModal && (
        <Modal title="Agregar herramienta" onClose={() => setToolModal(false)}
          footer={<><button className="btn btn-ghost" onClick={() => setToolModal(false)}>Cancelar</button><button className="btn btn-primary" form="tool-form" type="submit">Guardar</button></>}
        >
          <form id="tool-form" onSubmit={addTool}>
            <div className="form-group"><label className="form-label">Nombre</label>
              <input className="form-input" placeholder="GitHub" value={toolForm.title} onChange={e => setToolForm(f=>({...f,title:e.target.value}))} required /></div>
            <div className="form-group"><label className="form-label">URL</label>
              <input className="form-input" type="url" placeholder="https://github.com" value={toolForm.url} onChange={e => setToolForm(f=>({...f,url:e.target.value}))} required /></div>
            <div className="form-group"><label className="form-label">Ícono (emoji)</label>
              <input className="form-input" placeholder="🔗" maxLength={2} value={toolForm.icon} onChange={e => setToolForm(f=>({...f,icon:e.target.value}))} /></div>
            <div className="form-group"><label className="form-label">Color</label>
              <input className="form-input" type="color" value={toolForm.color} onChange={e => setToolForm(f=>({...f,color:e.target.value}))} /></div>
          </form>
        </Modal>
      )}

      {/* Day events modal */}
      {dayModal && (
        <Modal title={new Date(dayModal.date + 'T12:00:00').toLocaleDateString('es-AR', { weekday:'long', day:'numeric', month:'long' })} onClose={() => setDayModal(null)}>
          {dayModal.evts.map(e => (
            <div key={e.id} className="event-detail-item">
              <span className="event-dot" style={{ background: EVENT_COLORS[e.type] ?? '#60a5fa' }} />
              <div>
                <strong>{e.title}</strong>
                <p style={{ margin:'2px 0 0', color:'var(--text-2)', fontSize:'.85rem' }}>{subMap[e.subjectId]?.name ?? ''} — {EVENT_LABELS[e.type] ?? e.type}</p>
                {e.description && <p style={{ margin:'4px 0 0', fontSize:'.82rem', color:'var(--text-2)' }}>{e.description}</p>}
              </div>
            </div>
          ))}
        </Modal>
      )}
    </div>
  );
}
