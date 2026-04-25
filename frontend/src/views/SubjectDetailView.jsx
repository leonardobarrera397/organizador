import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../api.js';
import { useToast } from '../context/ToastContext.jsx';
import { navigate } from '../router.jsx';
import Modal from '../components/Modal.jsx';
import ColorPicker from '../components/ColorPicker.jsx';

// ── Constants ───────────────────────────────────────────────────
const EVENT_TYPES = [
  { value:'exam',    label:'Examen',       color:'#ef4444' },
  { value:'parcial', label:'Parcial',      color:'#f59e0b' },
  { value:'final',   label:'Final',        color:'#a78bfa' },
  { value:'tp',      label:'TP / Práctica',color:'#22c55e' },
  { value:'other',   label:'Otro',         color:'#60a5fa' },
];
const ec = t => EVENT_TYPES.find(e => e.value === t)?.color ?? '#60a5fa';
const el = t => EVENT_TYPES.find(e => e.value === t)?.label ?? t;
const NOTE_COLORS    = ['#fef08a','#86efac','#93c5fd','#f9a8d4','#c4b5fd','#fed7aa'];
const SUBJECT_COLORS = ['#00e5b4','#f59e0b','#a78bfa','#fb7185','#60a5fa','#34d399','#f97316','#e879f9'];

function daysUntil(d) { return Math.ceil((new Date(d) - new Date(new Date().toDateString())) / 86400000); }
function fmtDate(d)   { return new Date(d + 'T12:00:00').toLocaleDateString('es-AR',{weekday:'short',day:'numeric',month:'short',year:'numeric'}); }
function fileIcon(t)  { if(t?.includes('pdf')) return '📄'; if(t?.includes('word')||t?.includes('doc')) return '📝'; if(t?.includes('image')) return '🖼'; return '📁'; }
function humanSize(b) { return b<1024?b+' B':b<1048576?(b/1024).toFixed(1)+' KB':(b/1048576).toFixed(1)+' MB'; }

function exportICS(events, name) {
  if (!events.length) return;
  const lines = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//UniOrg//ES','CALSCALE:GREGORIAN'];
  events.forEach(e => {
    const d = e.date.replace(/-/g,'');
    const next = new Date(e.date); next.setDate(next.getDate()+1);
    lines.push('BEGIN:VEVENT',`UID:${e.id}@uniorg`,`DTSTART;VALUE=DATE:${d}`,
      `DTEND;VALUE=DATE:${next.toISOString().slice(0,10).replace(/-/g,'')}`,
      `SUMMARY:${e.title} — ${name}`,`DESCRIPTION:${e.description||el(e.type)}`,'END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([lines.join('\r\n')],{type:'text/calendar'}));
  a.download = `${name.replace(/\s+/g,'_')}.ics`; a.click();
}

// ── Post-it component ───────────────────────────────────────────
function PostIt({ note, onUpdate, onDelete }) {
  const [pos, setPos]         = useState({ x: note.x, y: note.y });
  const [content, setContent] = useState(note.content);
  const drag = useRef(null);

  const onMouseDown = useCallback(e => {
    e.preventDefault();
    drag.current = { mx: e.clientX, my: e.clientY, ox: pos.x, oy: pos.y };
    const move = e2 => {
      const nx = Math.max(0, drag.current.ox + e2.clientX - drag.current.mx);
      const ny = Math.max(0, drag.current.oy + e2.clientY - drag.current.my);
      setPos({ x: nx, y: ny });
    };
    const up = e2 => {
      const nx = Math.max(0, drag.current.ox + e2.clientX - drag.current.mx);
      const ny = Math.max(0, drag.current.oy + e2.clientY - drag.current.my);
      onUpdate(note.id, { x: nx, y: ny });
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
    };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  }, [pos, note.id, onUpdate]);

  return (
    <div className="postit" style={{ left: pos.x, top: pos.y, background: note.color }}>
      <div className="postit-header">
        <div className="postit-drag-handle" onMouseDown={onMouseDown}>⠿</div>
        <button className="postit-delete btn-icon" onClick={() => onDelete(note.id)}>✕</button>
      </div>
      <textarea className="postit-text" value={content} placeholder="Escribí tu nota..."
        onChange={e => setContent(e.target.value)}
        onBlur={() => onUpdate(note.id, { content })} />
    </div>
  );
}

// ── Main view ───────────────────────────────────────────────────
export default function SubjectDetailView({ subjectId }) {
  const { showToast } = useToast();
  const [tab,  setTab]  = useState('info');
  const [tick, setTick] = useState(0);
  const refresh = () => setTick(t => t + 1);

  const [subject, setSubject] = useState(null);
  const [year,    setYear]    = useState(null);
  const [events,  setEvents]  = useState([]);
  const [links,   setLinks]   = useState([]);
  const [files,   setFiles]   = useState([]);
  const [notes,   setNotes]   = useState([]);
  const [grades,  setGrades]  = useState([]);

  // Todos los hooks deben declararse antes de cualquier return condicional
  const [showAddEvent,    setShowAddEvent]    = useState(false);
  const [showAddLink,     setShowAddLink]     = useState(false);
  const [showAddGrade,    setShowAddGrade]    = useState(false);
  const [showEditSubject, setShowEditSubject] = useState(false);

  const today = new Date().toISOString().slice(0,10);
  const [evtForm,  setEvtForm]  = useState({ title:'', date:today, type:'exam', description:'' });
  const [lkForm,   setLkForm]   = useState({ title:'', url:'' });
  const [grForm,   setGrForm]   = useState({ name:'', score:'', maxScore:'10', weight:'1' });
  const [editForm, setEditForm] = useState({ name:'', code:'', professor:'', color:'' });

  const [selectedNoteColor, setSelectedNoteColor] = useState(NOTE_COLORS[0]);
  const fileInputRef = useRef(null);

  useEffect(() => {
    api.getSubject(subjectId)
      .then(async sub => {
        if (!sub) { navigate('/years'); return; }
        setSubject(sub);
        // Inicializa el form de edición con los datos reales
        setEditForm({ name: sub.name, code: sub.code??'', professor: sub.professor??'', color: sub.color });
        const [yrs, evts, lks, fls, nts, grs] = await Promise.all([
          api.getYears(),
          api.getEvents(sub.id),
          api.getSubjectLinks(sub.id),
          api.getFiles(sub.id),
          api.getNotes(sub.id),
          api.getGrades(sub.id),
        ]);
        setYear(yrs.find(y => y.id === sub.year_id || y.id === sub.yearId) ?? null);
        setEvents(evts.sort((a,b) => new Date(a.date) - new Date(b.date)));
        setLinks(lks); setFiles(fls); setNotes(nts); setGrades(grs);
      })
      .catch(() => navigate('/years'));
  }, [subjectId, tick]);

  if (!subject) return null;

  const upcoming = events.filter(e => new Date(e.date) >= new Date());
  const past     = events.filter(e => new Date(e.date) < new Date());

  // ── Handlers ──────────────────────────────────────────────────
  const saveEvent = async e => {
    e.preventDefault();
    if (!evtForm.title || !evtForm.date) { showToast('Título y fecha requeridos', 'error'); return; }
    try {
      await api.createEvent({ subjectId: subject.id, ...evtForm });
      setShowAddEvent(false); setEvtForm({ title:'', date:today, type:'exam', description:'' }); refresh();
      showToast('Fecha guardada', 'success');
    } catch (err) { showToast(err.message, 'error'); }
  };

  const saveLink = async e => {
    e.preventDefault();
    if (!lkForm.title || !lkForm.url) { showToast('Nombre y URL requeridos', 'error'); return; }
    try {
      await api.createSubjectLink({ subjectId: subject.id, ...lkForm });
      setShowAddLink(false); setLkForm({ title:'', url:'' }); refresh();
      showToast('Link guardado', 'success');
    } catch (err) { showToast(err.message, 'error'); }
  };

  const saveGrade = async e => {
    e.preventDefault();
    if (!grForm.name || grForm.score === '') { showToast('Nombre y nota requeridos', 'error'); return; }
    try {
      await api.createGrade({ subjectId: subject.id, ...grForm });
      setShowAddGrade(false); setGrForm({ name:'', score:'', maxScore:'10', weight:'1' }); refresh();
      showToast('Nota guardada', 'success');
    } catch (err) { showToast(err.message, 'error'); }
  };

  const saveEdit = async e => {
    e.preventDefault();
    if (!editForm.name) { showToast('El nombre es requerido', 'error'); return; }
    try {
      await api.updateSubject(subject.id, editForm);
      setSubject(s => ({ ...s, ...editForm }));
      setShowEditSubject(false);
      showToast('Materia actualizada', 'success');
    } catch (err) { showToast(err.message, 'error'); }
  };

  const handleFiles = async fileList => {
    try {
      await Promise.all([...fileList].map(f => api.uploadFile(subject.id, f)));
      refresh(); showToast(`${fileList.length} archivo(s) guardado(s)`, 'success');
    } catch (err) { showToast(err.message, 'error'); }
  };

  const downloadFile = async (id, name, mimeType) => {
    try {
      const blob = await api.downloadFile(id);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name ?? 'archivo'; a.click();
    } catch (err) { showToast(err.message, 'error'); }
  };

  const addNote = async () => {
    try {
      await api.createNote({ subjectId: subject.id, content: '', color: selectedNoteColor, x: 20 + Math.random()*200, y: 20 + Math.random()*150 });
      refresh();
    } catch (err) { showToast(err.message, 'error'); }
  };

  // Grade average
  const calcAvg = gs => { if (!gs.length) return 0; const tw=gs.reduce((a,g)=>a+g.weight,0); return gs.reduce((a,g)=>a+(g.score/g.maxScore)*10*g.weight,0)/tw; };
  const avg = calcAvg(grades);

  const TABS = [
    { id:'info',     label:'ℹ Info' },
    { id:'fechas',   label:'📅 Fechas' },
    { id:'links',    label:'🔗 Links' },
    { id:'archivos', label:'📁 Archivos' },
    { id:'notas',    label:'📝 Post-its' },
    { id:'califs',   label:'🧮 Notas' },
  ];

  return (
    <div className="subject-detail">
      {/* Header */}
      <div className="subject-detail-header" style={{ '--sc': subject.color }}>
        <div className="subject-header-top">
          <button className="btn-back" onClick={() => year ? navigate('/years/' + year.id) : navigate('/years')}>← {year?.name ?? 'Volver'}</button>
        </div>
        <div className="subject-header-body">
          <div className="subject-color-bar" style={{ background: subject.color }} />
          <div>
            {subject.code && <span className="subject-code-badge" style={{ background: subject.color+'25', color: subject.color }}>{subject.code}</span>}
            <h1 className="subject-detail-title">{subject.name}</h1>
            {subject.professor && <p className="subject-detail-prof">👨‍🏫 {subject.professor}</p>}
          </div>
        </div>
        <div className="subject-quick-stats">
          <span className="q-stat">📅 {events.length} eventos</span>
          <span className="q-stat">🔗 {links.length} links</span>
          <span className="q-stat">📁 {files.length} archivos</span>
          <span className="q-stat">📝 {notes.length} notas</span>
          {upcoming[0] && <span className="q-stat urgent">⏰ {upcoming[0].title} ({daysUntil(upcoming[0].date) === 0 ? 'Hoy' : daysUntil(upcoming[0].date)+'d'})</span>}
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {TABS.map(t => <button key={t.id} className={`tab ${tab === t.id ? 'tab-active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>)}
      </div>

      {/* ── INFO ── */}
      {tab === 'info' && (
        <div className="info-grid">
          <div className="card">
            <h3 className="card-title" style={{marginBottom:12}}>Datos de la materia</h3>
            <div className="info-fields">
              {[['Materia', subject.name], subject.code && ['Código', subject.code], subject.professor && ['Profesor', subject.professor], ['Año', year?.name??'-']].filter(Boolean).map(([k,v]) => (
                <div key={k} className="info-row"><span className="info-key">{k}</span><span className="info-val">{v}</span></div>
              ))}
            </div>
            <button className="btn btn-sm btn-outline" style={{marginTop:16}} onClick={() => setShowEditSubject(true)}>✏ Editar</button>
          </div>
          <div className="card">
            <h3 className="card-title" style={{marginBottom:12}}>Resumen académico</h3>
            {grades.length === 0
              ? <p className="empty-state">Sin notas registradas aún</p>
              : <div className={`grade-average ${avg >= 6 ? 'pass' : 'fail'}`}>
                  <span className="grade-num">{avg.toFixed(1)}</span>
                  <span className="grade-label">Promedio ponderado</span>
                </div>}
          </div>
        </div>
      )}

      {/* ── FECHAS ── */}
      {tab === 'fechas' && (
        <div>
          <div className="fechas-header">
            <button className="btn btn-primary" onClick={() => setShowAddEvent(true)}>+ Agregar fecha</button>
            {events.length > 0 && <button className="btn btn-sm btn-ghost" onClick={() => { exportICS(events, subject.name); showToast('Archivo .ics descargado', 'success'); }}>📅 Exportar .ics</button>}
          </div>
          {events.length === 0 && <div className="empty-card"><div className="empty-icon">📅</div><h3>Sin fechas</h3><p>Agregá exámenes, parciales y entregas</p></div>}
          {upcoming.length > 0 && <>
            <h3 className="section-heading">Próximos</h3>
            <div className="events-list">{upcoming.map(e => <EventItem key={e.id} event={e} onDelete={async id=>{await api.deleteEvent(id);refresh();showToast('Evento eliminado','info');}} />)}</div>
          </>}
          {past.length > 0 && <>
            <h3 className="section-heading muted">Pasados</h3>
            <div className="events-list past">{past.map(e => <EventItem key={e.id} event={e} onDelete={async id=>{await api.deleteEvent(id);refresh();showToast('Evento eliminado','info');}} />)}</div>
          </>}
        </div>
      )}

      {/* ── LINKS ── */}
      {tab === 'links' && (
        <div>
          <div className="fechas-header">
            <button className="btn btn-primary" onClick={() => setShowAddLink(true)}>+ Agregar link</button>
          </div>
          {links.length === 0
            ? <div className="empty-card"><div className="empty-icon">🔗</div><h3>Sin links</h3><p>Guardá aulas virtuales, repositorios, recursos</p></div>
            : <div className="links-grid">
                {links.map(l => (
                  <div key={l.id} className="link-card">
                    <a href={l.url} target="_blank" rel="noopener" className="link-card-inner">
                      <span className="link-favicon">🔗</span>
                      <div className="link-info">
                        <span className="link-title">{l.title}</span>
                        <span className="link-url">{l.url.replace(/^https?:\/\//,'').slice(0,40)}</span>
                      </div>
                    </a>
                    <button className="btn-icon" onClick={async () => { await api.deleteSubjectLink(l.id); refresh(); showToast('Link eliminado','info'); }}>🗑</button>
                  </div>
                ))}
              </div>}
        </div>
      )}

      {/* ── ARCHIVOS ── */}
      {tab === 'archivos' && (
        <div>
          <div className="fechas-header">
            <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()}>↑ Subir archivo</button>
            <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.txt,.pptx,.xlsx,.zip,.rar" multiple style={{display:'none'}} onChange={e => handleFiles([...e.target.files])} />
          </div>
          <div className="dropzone" onDragOver={e=>{e.preventDefault();e.currentTarget.classList.add('dz-over')}}
            onDragLeave={e=>e.currentTarget.classList.remove('dz-over')}
            onDrop={e=>{e.preventDefault();e.currentTarget.classList.remove('dz-over');handleFiles([...e.dataTransfer.files]);}}
            onClick={() => fileInputRef.current?.click()}>
            <span className="dropzone-icon">📂</span>
            <p>Arrastrá archivos aquí o hacé click</p>
            <p className="dropzone-hint">PDF, Word, PPTX, ZIP...</p>
          </div>
          {files.length > 0 && (
            <div className="files-list">
              {files.map(f => (
                <div key={f.id} className="file-item">
                  <span className="file-icon">{fileIcon(f.mime_type ?? f.type)}</span>
                  <div className="file-info">
                    <span className="file-name">{f.name}</span>
                    <span className="file-meta">{humanSize(f.size)} · {new Date(f.created_at * 1000).toLocaleDateString('es-AR')}</span>
                  </div>
                  <button className="btn btn-sm btn-ghost" onClick={() => downloadFile(f.id, f.name, f.mime_type)}>↓ Descargar</button>
                  <button className="btn-icon" onClick={async()=>{await api.deleteFile(f.id);refresh();showToast('Archivo eliminado','info');}}>🗑</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── POST-ITS ── */}
      {tab === 'notas' && (
        <div>
          <div className="postits-toolbar">
            <button className="btn btn-primary" onClick={addNote}>+ Nueva nota</button>
            <div className="note-colors">
              {NOTE_COLORS.map(c => (
                <button key={c} type="button" className={`note-color-pick ${selectedNoteColor===c?'ncp-active':''}`}
                  style={{background:c}} onClick={()=>setSelectedNoteColor(c)} />
              ))}
            </div>
          </div>
          <div className="postits-board">
            {notes.length === 0 && <p className="board-empty">Agregá post-its con notas rápidas, recordatorios, ideas...</p>}
            {notes.map(n => (
              <PostIt key={n.id} note={n}
                onUpdate={async (id, data) => { await api.updateNote(id, data); }}
                onDelete={async id => { await api.deleteNote(id); refresh(); }} />
            ))}
          </div>
        </div>
      )}

      {/* ── CALIFICACIONES ── */}
      {tab === 'califs' && (
        <div>
          <div className="fechas-header">
            <button className="btn btn-primary" onClick={() => setShowAddGrade(true)}>+ Agregar nota</button>
          </div>
          {grades.length > 0 && (
            <div className={`grade-avg-banner ${avg>=6?'pass':'fail'}`}>
              <span className="grade-avg-num">{avg.toFixed(2)}</span>
              <span className="grade-avg-label">Promedio ponderado / 10</span>
            </div>
          )}
          {grades.length === 0
            ? <div className="empty-card"><div className="empty-icon">🧮</div><h3>Sin notas</h3><p>Registrá tus calificaciones para calcular el promedio</p></div>
            : <table className="grade-tbl">
                <thead><tr><th>Evaluación</th><th>Nota</th><th>Sobre</th><th>Peso</th><th>%</th><th></th></tr></thead>
                <tbody>
                  {grades.map(g => (
                    <tr key={g.id}>
                      <td>{g.name}</td>
                      <td className={g.score>=(g.maxScore??g.max_score)*0.6?'grade-pass':'grade-fail'}>{g.score}</td>
                      <td>{g.maxScore ?? g.max_score}</td>
                      <td>{g.weight}x</td>
                      <td>{((g.score/(g.maxScore??g.max_score))*100).toFixed(0)}%</td>
                      <td><button className="btn-icon" onClick={async()=>{await api.deleteGrade(g.id);refresh();showToast('Nota eliminada','info');}}>🗑</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>}
        </div>
      )}

      {/* ── Modals ── */}
      {showAddEvent && (
        <Modal title="Nueva fecha importante" onClose={() => setShowAddEvent(false)}
          footer={<><button className="btn btn-ghost" onClick={()=>setShowAddEvent(false)}>Cancelar</button><button className="btn btn-primary" form="evt-form" type="submit">Guardar</button></>}>
          <form id="evt-form" onSubmit={saveEvent}>
            <div className="form-group"><label className="form-label">Título</label>
              <input className="form-input" placeholder="ej: Parcial 1er cuatrimestre" value={evtForm.title} onChange={e=>setEvtForm(f=>({...f,title:e.target.value}))} required /></div>
            <div className="form-group"><label className="form-label">Fecha</label>
              <input className="form-input" type="date" value={evtForm.date} onChange={e=>setEvtForm(f=>({...f,date:e.target.value}))} required /></div>
            <div className="form-group"><label className="form-label">Tipo</label>
              <select className="form-input" value={evtForm.type} onChange={e=>setEvtForm(f=>({...f,type:e.target.value}))}>
                {EVENT_TYPES.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
              </select></div>
            <div className="form-group"><label className="form-label">Descripción (opcional)</label>
              <textarea className="form-input" rows={3} value={evtForm.description} onChange={e=>setEvtForm(f=>({...f,description:e.target.value}))} /></div>
          </form>
        </Modal>
      )}
      {showAddLink && (
        <Modal title="Nuevo link" onClose={()=>setShowAddLink(false)}
          footer={<><button className="btn btn-ghost" onClick={()=>setShowAddLink(false)}>Cancelar</button><button className="btn btn-primary" form="lk-form" type="submit">Guardar</button></>}>
          <form id="lk-form" onSubmit={saveLink}>
            <div className="form-group"><label className="form-label">Nombre</label>
              <input className="form-input" placeholder="ej: Aula virtual" value={lkForm.title} onChange={e=>setLkForm(f=>({...f,title:e.target.value}))} required /></div>
            <div className="form-group"><label className="form-label">URL</label>
              <input className="form-input" type="url" placeholder="https://..." value={lkForm.url} onChange={e=>setLkForm(f=>({...f,url:e.target.value}))} required /></div>
          </form>
        </Modal>
      )}
      {showAddGrade && (
        <Modal title="Registrar nota" onClose={()=>setShowAddGrade(false)}
          footer={<><button className="btn btn-ghost" onClick={()=>setShowAddGrade(false)}>Cancelar</button><button className="btn btn-primary" form="gr-form" type="submit">Guardar</button></>}>
          <form id="gr-form" onSubmit={saveGrade}>
            <div className="form-group"><label className="form-label">Evaluación</label>
              <input className="form-input" placeholder="ej: Parcial 1" value={grForm.name} onChange={e=>setGrForm(f=>({...f,name:e.target.value}))} required /></div>
            <div className="form-grid-2">
              <div className="form-group"><label className="form-label">Nota obtenida</label>
                <input className="form-input" type="number" min="0" max="10" step="0.25" placeholder="7" value={grForm.score} onChange={e=>setGrForm(f=>({...f,score:e.target.value}))} required /></div>
              <div className="form-group"><label className="form-label">Nota máxima</label>
                <input className="form-input" type="number" min="1" step="0.5" value={grForm.maxScore} onChange={e=>setGrForm(f=>({...f,maxScore:e.target.value}))} /></div>
            </div>
            <div className="form-group"><label className="form-label">Peso (1 = normal, 2 = doble)</label>
              <input className="form-input" type="number" min="0.1" step="0.1" value={grForm.weight} onChange={e=>setGrForm(f=>({...f,weight:e.target.value}))} /></div>
          </form>
        </Modal>
      )}
      {showEditSubject && (
        <Modal title="Editar materia" onClose={()=>setShowEditSubject(false)}
          footer={<><button className="btn btn-ghost" onClick={()=>setShowEditSubject(false)}>Cancelar</button><button className="btn btn-primary" form="edit-form" type="submit">Guardar</button></>}>
          <form id="edit-form" onSubmit={saveEdit}>
            <div className="form-group"><label className="form-label">Nombre</label>
              <input className="form-input" value={editForm.name} onChange={e=>setEditForm(f=>({...f,name:e.target.value}))} required /></div>
            <div className="form-group"><label className="form-label">Código</label>
              <input className="form-input" value={editForm.code} onChange={e=>setEditForm(f=>({...f,code:e.target.value}))} /></div>
            <div className="form-group"><label className="form-label">Profesor</label>
              <input className="form-input" value={editForm.professor} onChange={e=>setEditForm(f=>({...f,professor:e.target.value}))} /></div>
            <div className="form-group"><label className="form-label">Color</label>
              <ColorPicker colors={SUBJECT_COLORS} value={editForm.color} onChange={c=>setEditForm(f=>({...f,color:c}))} /></div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ── EventItem sub-component ─────────────────────────────────────
function EventItem({ event: e, onDelete }) {
  const du = daysUntil(e.date);
  const isUpcoming = du >= 0;
  return (
    <div className={`event-item ${du <= 3 && isUpcoming ? 'event-urgent' : ''}`}>
      <div className="event-color-bar" style={{ background: ec(e.type) }} />
      <div className="event-body">
        <div className="event-row-1">
          <span className="event-type-badge" style={{ background: ec(e.type)+'20', color: ec(e.type) }}>{el(e.type)}</span>
          <h4 className="event-title">{e.title}</h4>
          {isUpcoming && <span className="event-countdown">{du===0?'Hoy':du===1?'Mañana':`en ${du}d`}</span>}
        </div>
        <p className="event-date">{fmtDate(e.date)}</p>
        {e.description && <p className="event-desc">{e.description}</p>}
      </div>
      <button className="btn-icon" onClick={() => onDelete(e.id)}>🗑</button>
    </div>
  );
}
