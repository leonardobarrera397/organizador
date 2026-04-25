import { useState, useEffect, useRef, useCallback } from 'react';

const MODES = {
  work:       { label: 'Trabajo',        duration: 25 * 60, color: '#ef4444', emoji: '🍅' },
  shortBreak: { label: 'Descanso corto', duration:  5 * 60, color: '#22c55e', emoji: '☕' },
  longBreak:  { label: 'Descanso largo', duration: 15 * 60, color: '#60a5fa', emoji: '🌿' },
};
const CIRC = 2 * Math.PI * 38;

function pad(n) { return String(n).padStart(2, '0'); }
function fmt(s) { return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`; }
function beep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start(); osc.stop(ctx.currentTime + 0.5);
  } catch {}
}

export default function Pomodoro() {
  const [mode, setMode]         = useState('work');
  const [remaining, setRemaining] = useState(MODES.work.duration);
  const [running, setRunning]   = useState(false);
  const [sessions, setSessions] = useState(0);
  const [min, setMin]           = useState(false);

  // Refs to avoid stale closures in effect
  const modeRef     = useRef(mode);     modeRef.current = mode;
  const sessionsRef = useRef(sessions); sessionsRef.current = sessions;

  const handleComplete = useCallback(() => {
    beep();
    setRunning(false);
    const m = modeRef.current, s = sessionsRef.current;
    const newS = s + (m === 'work' ? 1 : 0);
    const next = m === 'work' ? (newS % 4 === 0 ? 'longBreak' : 'shortBreak') : 'work';
    setSessions(newS);
    setMode(next);
    setRemaining(MODES[next].duration);
    if (Notification.permission === 'granted') {
      new Notification(m === 'work' ? '🍅 ¡Pomodoro listo!' : '☕ ¡Descanso terminado!', {
        body: m === 'work' ? MODES[next].label : '¡A trabajar! 💪', icon: '/favicon.svg',
      });
    }
  }, []);

  // Countdown using setTimeout to avoid stale interval
  useEffect(() => {
    if (!running) return;
    if (remaining <= 0) { handleComplete(); return; }
    const id = setTimeout(() => setRemaining(r => r - 1), 1000);
    return () => clearTimeout(id);
  }, [running, remaining, handleComplete]);

  const toggle   = () => setRunning(r => !r);
  const reset    = () => { setRunning(false); setRemaining(MODES[mode].duration); };
  const skip     = () => { setRunning(false); handleComplete(); };
  const switchTo = (m) => { setRunning(false); setMode(m); setRemaining(MODES[m].duration); };

  const m = MODES[mode];
  const offset = CIRC * (remaining / m.duration);

  if (min) return (
    <div id="pomodoro-container">
      <div className="pom-pill" onClick={() => setMin(false)} title="Expandir Pomodoro">
        <span>{m.emoji}</span>
        <span className="pom-pill-time" style={{ color: m.color }}>{fmt(remaining)}</span>
        {running && <span className="pom-pulse" />}
      </div>
    </div>
  );

  const sessionLabel = mode === 'work'
    ? `Sesión ${(sessions % 4) + 1} de 4`
    : `${sessions % 4 || 4} sesiones completadas`;

  return (
    <div id="pomodoro-container">
      <div className="pomodoro">
        <div className="pomodoro-titlebar">
          <span className="pomodoro-name">{m.emoji} Pomodoro</span>
          <button className="btn-icon pom-min-btn" onClick={() => setMin(true)} title="Minimizar">−</button>
        </div>

        <div className="pom-ring-wrap">
          <svg className="pom-svg" viewBox="0 0 84 84">
            <circle cx="42" cy="42" r="38" fill="none" stroke="var(--border-b)" strokeWidth="5" />
            <circle cx="42" cy="42" r="38" fill="none" stroke={m.color} strokeWidth="5"
              strokeDasharray={`${CIRC.toFixed(2)}`}
              strokeDashoffset={`${offset.toFixed(2)}`}
              strokeLinecap="round"
              transform="rotate(-90 42 42)"
              style={{ transition: 'stroke-dashoffset .8s ease' }}
            />
          </svg>
          <span className="pom-time">{fmt(remaining)}</span>
        </div>

        <div className="pom-label" style={{ color: m.color }}>{m.label}</div>
        <div className="pom-session">{sessionLabel}</div>

        <div className="pom-actions">
          <button className={`btn btn-sm ${running ? 'btn-ghost' : 'btn-primary'} pom-wide`} onClick={toggle}>
            {running ? '⏸ Pausar' : '▶ Iniciar'}
          </button>
          <button className="btn btn-sm btn-ghost btn-icon" onClick={reset} title="Reiniciar">↺</button>
          <button className="btn btn-sm btn-ghost btn-icon" onClick={skip}  title="Saltar">⏭</button>
        </div>

        <div className="pom-mode-row">
          {Object.entries(MODES).map(([key, val]) => (
            <button key={key}
              className={`pom-mode-btn ${mode === key ? 'pom-mode-active' : ''}`}
              style={{ '--mc': val.color }}
              onClick={() => switchTo(key)}
              title={val.label}
            >
              {val.emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
