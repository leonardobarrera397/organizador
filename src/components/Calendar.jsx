import { useState } from 'react';

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DAYS   = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const EVENT_COLORS = { exam:'#ef4444', parcial:'#f59e0b', final:'#a78bfa', tp:'#22c55e', other:'#60a5fa' };

function buildMap(events) {
  return events.reduce((m, e) => {
    const d = e.date?.slice(0, 10);
    if (d) { m[d] = m[d] ?? []; m[d].push(e); }
    return m;
  }, {});
}

export default function Calendar({ events = [], onDayClick }) {
  const [cur, setCur] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const today = new Date().toISOString().slice(0, 10);
  const map = buildMap(events);

  const year = cur.getFullYear(), month = cur.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const str = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    cells.push({ d, str, evts: map[str] ?? [] });
  }

  const prev = () => setCur(c => new Date(c.getFullYear(), c.getMonth() - 1, 1));
  const next = () => setCur(c => new Date(c.getFullYear(), c.getMonth() + 1, 1));

  return (
    <div className="calendar">
      <div className="cal-header">
        <button className="cal-nav" onClick={prev}>‹</button>
        <span className="cal-title">{MONTHS[month]} {year}</span>
        <button className="cal-nav" onClick={next}>›</button>
      </div>
      <div className="cal-grid-header">
        {DAYS.map(d => <div key={d} className="cal-dow">{d}</div>)}
      </div>
      <div className="cal-grid">
        {cells.map((cell, i) =>
          cell == null
            ? <div key={`e${i}`} className="cal-cell cal-empty" />
            : (
              <div
                key={cell.str}
                className={`cal-cell ${cell.str === today ? 'cal-today' : ''} ${cell.evts.length ? 'cal-has-events' : ''}`}
                onClick={() => cell.evts.length && onDayClick?.(cell.str, cell.evts)}
              >
                <span className="cal-day-num">{cell.d}</span>
                <div className="cal-dots">
                  {cell.evts.slice(0, 4).map((e, j) => (
                    <span key={j} className="cal-dot" style={{ background: EVENT_COLORS[e.type] ?? EVENT_COLORS.other }} title={e.title} />
                  ))}
                </div>
              </div>
            )
        )}
      </div>
    </div>
  );
}
