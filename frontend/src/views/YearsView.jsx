import { useState, useEffect } from 'react';
import { api } from '../api.js';
import { useToast } from '../context/ToastContext.jsx';
import { navigate } from '../router.jsx';
import Modal from '../components/Modal.jsx';
import ColorPicker from '../components/ColorPicker.jsx';

const YEAR_COLORS    = ['#00e5b4','#f59e0b','#a78bfa','#fb7185','#60a5fa','#34d399','#f97316','#e879f9'];
const SUBJECT_COLORS = ['#00e5b4','#f59e0b','#a78bfa','#fb7185','#60a5fa','#34d399','#f97316','#e879f9','#38bdf8','#4ade80'];

function initYearForm()    { return { name: '', year: new Date().getFullYear(), color: YEAR_COLORS[0] }; }
function initSubjectForm() { return { name: '', code: '', professor: '', color: SUBJECT_COLORS[0] }; }

export default function YearsView({ yearId }) {
  const { showToast } = useToast();
  const [tick, setTick] = useState(0);
  const refresh = () => setTick(t => t + 1);

  const [years,            setYears]           = useState([]);
  const [year,             setYear]            = useState(null);
  const [subjects,         setSubjects]        = useState([]);
  const [yearSubjectsMap,  setYearSubjectsMap] = useState({});  // yearId → subjects[]
  const [subjectEvtsMap,   setSubjectEvtsMap]  = useState({});  // subjectId → events[]

  const [yearModal,    setYearModal]    = useState(false);
  const [subjectModal, setSubjectModal] = useState(false);
  const [yearForm,     setYearForm]     = useState(initYearForm);
  const [subjectForm,  setSubjectForm]  = useState(initSubjectForm);

  useEffect(() => {
    if (yearId) {
      // Vista de materias de un año
      Promise.all([api.getYears(), api.getSubjects(yearId)]).then(async ([yrs, subs]) => {
        setYears(yrs);
        setYear(yrs.find(y => y.id === yearId) ?? null);
        setSubjects(subs);
        const evtMap = {};
        await Promise.all(subs.map(async s => { evtMap[s.id] = await api.getEvents(s.id); }));
        setSubjectEvtsMap(evtMap);
      });
    } else {
      // Vista de lista de años
      api.getYears().then(async yrs => {
        setYears(yrs);
        const subMap = {};
        await Promise.all(yrs.map(async y => { subMap[y.id] = await api.getSubjects(y.id); }));
        setYearSubjectsMap(subMap);
      });
    }
  }, [yearId, tick]);

  const setYF = k => e => setYearForm(f => ({ ...f, [k]: e.target.value }));
  const setSF = k => e => setSubjectForm(f => ({ ...f, [k]: e.target.value }));

  const addYear = async e => {
    e.preventDefault();
    if (!yearForm.name) { showToast('Ingresá un nombre', 'error'); return; }
    try {
      await api.createYear({ ...yearForm, year: parseInt(yearForm.year) });
      setYearModal(false); setYearForm(initYearForm()); refresh();
      showToast('Año creado', 'success');
    } catch (err) { showToast(err.message, 'error'); }
  };

  const addSubject = async e => {
    e.preventDefault();
    if (!subjectForm.name) { showToast('Ingresá un nombre', 'error'); return; }
    try {
      await api.createSubject({ yearId: year.id, ...subjectForm });
      setSubjectModal(false); setSubjectForm(initSubjectForm()); refresh();
      showToast('Materia creada', 'success');
    } catch (err) { showToast(err.message, 'error'); }
  };

  const deleteYear = async (id, e) => {
    e.stopPropagation();
    if (!confirm('¿Eliminar este año y todas sus materias?')) return;
    await api.deleteYear(id); refresh(); showToast('Año eliminado', 'info');
  };
  const deleteSubject = async (id, e) => {
    e.stopPropagation();
    if (!confirm('¿Eliminar esta materia?')) return;
    await api.deleteSubject(id); refresh(); showToast('Materia eliminada', 'info');
  };

  // ── Years list ────────────────────────────────────────────────
  if (!yearId) return (
    <div>
      <div className="view-header">
        <div>
          <h1 className="view-title">🎓 Mis Años</h1>
          <p className="view-subtitle">Organizá tus años académicos y materias</p>
        </div>
        <button className="btn btn-primary" onClick={() => setYearModal(true)}>+ Nuevo año</button>
      </div>

      <div className="years-grid">
        {years.length === 0 && (
          <div className="empty-card">
            <div className="empty-icon">🎓</div>
            <h3>Sin años académicos</h3>
            <p>Agregá tu primer año para comenzar</p>
            <button className="btn btn-primary" onClick={() => setYearModal(true)}>+ Agregar año</button>
          </div>
        )}
        {years.map(y => {
          const subs = yearSubjectsMap[y.id] ?? [];
          return (
            <div key={y.id} className="year-card" style={{ '--year-color': y.color }} onClick={() => navigate('/years/' + y.id)}>
              <div className="year-card-header">
                <div className="year-badge" style={{ background: y.color + '20', color: y.color }}>{y.year}</div>
                <div className="year-card-actions">
                  <button className="btn-icon" onClick={e => deleteYear(y.id, e)}>🗑</button>
                </div>
              </div>
              <h3 className="year-name">{y.name}</h3>
              <p className="year-meta">{subs.length} materia{subs.length !== 1 ? 's' : ''}</p>
              <div className="subject-pills">
                {subs.slice(0, 4).map(s => <span key={s.id} className="subject-pill" style={{ background: s.color + '30', color: s.color }}>{s.name}</span>)}
                {subs.length > 4 && <span className="subject-pill-more">+{subs.length - 4}</span>}
              </div>
              <button className="btn btn-sm btn-outline" style={{ '--c': y.color }}>Ver materias →</button>
            </div>
          );
        })}
      </div>

      {yearModal && (
        <Modal title="Nuevo año académico" onClose={() => setYearModal(false)}
          footer={<><button className="btn btn-ghost" onClick={() => setYearModal(false)}>Cancelar</button><button className="btn btn-primary" form="year-form" type="submit">Crear año</button></>}
        >
          <form id="year-form" onSubmit={addYear}>
            <div className="form-group"><label className="form-label">Nombre del año</label>
              <input className="form-input" placeholder="ej: Primer Año" value={yearForm.name} onChange={setYF('name')} required /></div>
            <div className="form-group"><label className="form-label">Año</label>
              <input className="form-input" type="number" min="2000" max="2100" value={yearForm.year} onChange={setYF('year')} /></div>
            <div className="form-group"><label className="form-label">Color</label>
              <ColorPicker colors={YEAR_COLORS} value={yearForm.color} onChange={c => setYearForm(f => ({...f, color: c}))} /></div>
          </form>
        </Modal>
      )}
    </div>
  );

  // ── Subjects for a year ───────────────────────────────────────
  if (!year) return null;

  return (
    <div>
      <div className="view-header">
        <div>
          <button className="btn-back" onClick={() => navigate('/years')}>← Mis Años</button>
          <h1 className="view-title" style={{ color: year.color }}>{year.name}</h1>
          <p className="view-subtitle">Año {year.year}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setSubjectModal(true)}>+ Nueva materia</button>
      </div>

      <div className="subjects-grid">
        {subjects.length === 0 && (
          <div className="empty-card">
            <div className="empty-icon">📚</div>
            <h3>Sin materias</h3>
            <p>Agregá tu primera materia para este año</p>
            <button className="btn btn-primary" onClick={() => setSubjectModal(true)}>+ Agregar materia</button>
          </div>
        )}
        {subjects.map(s => {
          const evts = subjectEvtsMap[s.id] ?? [];
          const next = evts.filter(e => new Date(e.date) >= new Date()).sort((a,b) => new Date(a.date)-new Date(b.date))[0];
          return (
            <div key={s.id} className="subject-card" onClick={() => navigate('/subjects/' + s.id)}>
              <div className="subject-card-color" style={{ background: s.color }} />
              <div className="subject-card-body">
                <div className="subject-card-header">
                  {s.code && <span className="subject-code">{s.code}</span>}
                  <button className="btn-icon subject-delete" onClick={e => deleteSubject(s.id, e)}>🗑</button>
                </div>
                <h3 className="subject-name">{s.name}</h3>
                {s.professor && <p className="subject-professor">👨‍🏫 {s.professor}</p>}
                <div className="subject-stats">
                  <span className="subject-stat">📅 {evts.length} evento{evts.length !== 1 ? 's' : ''}</span>
                  {next && <span className="subject-stat upcoming-pill">⏰ {next.title}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {subjectModal && (
        <Modal title="Nueva materia" onClose={() => setSubjectModal(false)}
          footer={<><button className="btn btn-ghost" onClick={() => setSubjectModal(false)}>Cancelar</button><button className="btn btn-primary" form="subject-form" type="submit">Crear materia</button></>}
        >
          <form id="subject-form" onSubmit={addSubject}>
            <div className="form-group"><label className="form-label">Nombre de la materia</label>
              <input className="form-input" placeholder="ej: Algoritmos I" value={subjectForm.name} onChange={setSF('name')} required /></div>
            <div className="form-group"><label className="form-label">Código (opcional)</label>
              <input className="form-input" placeholder="ej: ALG101" value={subjectForm.code} onChange={setSF('code')} /></div>
            <div className="form-group"><label className="form-label">Profesor</label>
              <input className="form-input" placeholder="ej: Dr. García" value={subjectForm.professor} onChange={setSF('professor')} /></div>
            <div className="form-group"><label className="form-label">Color</label>
              <ColorPicker colors={SUBJECT_COLORS} value={subjectForm.color} onChange={c => setSubjectForm(f => ({...f, color: c}))} /></div>
          </form>
        </Modal>
      )}
    </div>
  );
}
