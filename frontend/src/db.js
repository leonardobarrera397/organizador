// Data layer — swap fetch() calls here when Spring Boot backend is ready

const KEYS = {
  users: 'uniorg_users',
  session: 'uniorg_session',
  years: 'uniorg_years',
  subjects: 'uniorg_subjects',
  events: 'uniorg_events',
  subjectLinks: 'uniorg_subject_links',
  dashboardLinks: 'uniorg_dashboard_links',
  notes: 'uniorg_notes',
  fileMeta: 'uniorg_file_meta',
  grades: 'uniorg_grades',
};

const IDB_NAME = 'uniorg_files';
const IDB_STORE = 'files';

function uid() {
  return crypto.randomUUID ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
      });
}

function load(key) {
  try { return JSON.parse(localStorage.getItem(key)) ?? []; } catch { return []; }
}
function loadObj(key, def = null) {
  try { return JSON.parse(localStorage.getItem(key)) ?? def; } catch { return def; }
}
function save(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}

// ── IndexedDB for file binaries ────────────────────────────────────────────
let _idb = null;
function openIDB() {
  if (_idb) return Promise.resolve(_idb);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = e => {
      e.target.result.createObjectStore(IDB_STORE, { keyPath: 'id' });
    };
    req.onsuccess = e => { _idb = e.target.result; resolve(_idb); };
    req.onerror = e => reject(e.target.error);
  });
}

// ── DEFAULT DASHBOARD LINKS ───────────────────────────────────────────────
const DEFAULT_TOOLS = [
  { title: 'GitHub', url: 'https://github.com', icon: '🐙', color: '#6e40c9' },
  { title: 'Stack Overflow', url: 'https://stackoverflow.com', icon: '📚', color: '#f58025' },
  { title: 'MDN Web Docs', url: 'https://developer.mozilla.org', icon: '🦊', color: '#e66000' },
  { title: 'LeetCode', url: 'https://leetcode.com', icon: '⚡', color: '#ffa116' },
  { title: 'ChatGPT', url: 'https://chat.openai.com', icon: '🤖', color: '#10a37f' },
  { title: 'Excalidraw', url: 'https://excalidraw.com', icon: '✏️', color: '#6965db' },
  { title: 'Replit', url: 'https://replit.com', icon: '🔴', color: '#f26207' },
  { title: 'DevDocs', url: 'https://devdocs.io', icon: '📖', color: '#3d9e68' },
];

export const db = {
  // ── USERS ────────────────────────────────────────────────────────────────
  getUsers() { return load(KEYS.users); },
  getUserById(id) { return this.getUsers().find(u => u.id === id) ?? null; },
  createUser({ name, email, password }) {
    const user = { id: uid(), name, email, password, createdAt: Date.now() };
    const users = this.getUsers();
    users.push(user);
    save(KEYS.users, users);
    return user;
  },

  // ── SESSION ──────────────────────────────────────────────────────────────
  getSession() { return loadObj(KEYS.session); },
  setSession(data) { save(KEYS.session, data); },
  clearSession() { localStorage.removeItem(KEYS.session); },

  // ── YEARS ────────────────────────────────────────────────────────────────
  getYears(userId) { return load(KEYS.years).filter(y => y.userId === userId); },
  getYearById(id) { return load(KEYS.years).find(y => y.id === id) ?? null; },
  createYear({ userId, name, year, color }) {
    const rec = { id: uid(), userId, name, year, color, createdAt: Date.now() };
    const all = load(KEYS.years);
    all.push(rec);
    save(KEYS.years, all);
    return rec;
  },
  updateYear(id, data) {
    const all = load(KEYS.years);
    const idx = all.findIndex(y => y.id === id);
    if (idx === -1) return null;
    all[idx] = { ...all[idx], ...data };
    save(KEYS.years, all);
    return all[idx];
  },
  deleteYear(id) {
    save(KEYS.years, load(KEYS.years).filter(y => y.id !== id));
    // cascade delete subjects
    const subjects = load(KEYS.subjects).filter(s => s.yearId === id);
    subjects.forEach(s => this.deleteSubject(s.id));
    save(KEYS.subjects, load(KEYS.subjects).filter(s => s.yearId !== id));
  },

  // ── SUBJECTS ─────────────────────────────────────────────────────────────
  getSubjects(yearId) { return load(KEYS.subjects).filter(s => s.yearId === yearId); },
  getAllSubjects(userId) { return load(KEYS.subjects).filter(s => s.userId === userId); },
  getSubjectById(id) { return load(KEYS.subjects).find(s => s.id === id) ?? null; },
  createSubject({ yearId, userId, name, professor, code, color }) {
    const rec = { id: uid(), yearId, userId, name, professor: professor ?? '', code: code ?? '', color, createdAt: Date.now() };
    const all = load(KEYS.subjects);
    all.push(rec);
    save(KEYS.subjects, all);
    return rec;
  },
  updateSubject(id, data) {
    const all = load(KEYS.subjects);
    const idx = all.findIndex(s => s.id === id);
    if (idx === -1) return null;
    all[idx] = { ...all[idx], ...data };
    save(KEYS.subjects, all);
    return all[idx];
  },
  deleteSubject(id) {
    save(KEYS.subjects, load(KEYS.subjects).filter(s => s.id !== id));
    save(KEYS.events, load(KEYS.events).filter(e => e.subjectId !== id));
    save(KEYS.subjectLinks, load(KEYS.subjectLinks).filter(l => l.subjectId !== id));
    save(KEYS.notes, load(KEYS.notes).filter(n => n.subjectId !== id));
    const metas = load(KEYS.fileMeta).filter(f => f.subjectId === id);
    metas.forEach(m => this.deleteFileContent(m.id));
    save(KEYS.fileMeta, load(KEYS.fileMeta).filter(f => f.subjectId !== id));
  },

  // ── EVENTS / FECHAS ──────────────────────────────────────────────────────
  getEvents(subjectId) { return load(KEYS.events).filter(e => e.subjectId === subjectId); },
  getAllUserEvents(userId) { return load(KEYS.events).filter(e => e.userId === userId); },
  createEvent({ subjectId, userId, title, date, type, description }) {
    const rec = { id: uid(), subjectId, userId, title, date, type, description: description ?? '', createdAt: Date.now() };
    const all = load(KEYS.events);
    all.push(rec);
    save(KEYS.events, all);
    return rec;
  },
  updateEvent(id, data) {
    const all = load(KEYS.events);
    const idx = all.findIndex(e => e.id === id);
    if (idx === -1) return null;
    all[idx] = { ...all[idx], ...data };
    save(KEYS.events, all);
    return all[idx];
  },
  deleteEvent(id) {
    save(KEYS.events, load(KEYS.events).filter(e => e.id !== id));
  },

  // ── SUBJECT LINKS ────────────────────────────────────────────────────────
  getSubjectLinks(subjectId) { return load(KEYS.subjectLinks).filter(l => l.subjectId === subjectId); },
  createSubjectLink({ subjectId, userId, title, url }) {
    const rec = { id: uid(), subjectId, userId, title, url, createdAt: Date.now() };
    const all = load(KEYS.subjectLinks);
    all.push(rec);
    save(KEYS.subjectLinks, all);
    return rec;
  },
  deleteSubjectLink(id) {
    save(KEYS.subjectLinks, load(KEYS.subjectLinks).filter(l => l.id !== id));
  },

  // ── DASHBOARD LINKS (TOOLS) ───────────────────────────────────────────────
  getDashboardLinks(userId) {
    const all = load(KEYS.dashboardLinks).filter(l => l.userId === userId);
    if (all.length > 0) return all;
    // seed defaults
    const defaults = DEFAULT_TOOLS.map(t => ({ ...t, id: uid(), userId, createdAt: Date.now() }));
    save(KEYS.dashboardLinks, [...load(KEYS.dashboardLinks), ...defaults]);
    return defaults;
  },
  createDashboardLink({ userId, title, url, icon, color }) {
    const rec = { id: uid(), userId, title, url, icon: icon ?? '🔗', color: color ?? '#4a6080', createdAt: Date.now() };
    const all = load(KEYS.dashboardLinks);
    all.push(rec);
    save(KEYS.dashboardLinks, all);
    return rec;
  },
  updateDashboardLink(id, data) {
    const all = load(KEYS.dashboardLinks);
    const idx = all.findIndex(l => l.id === id);
    if (idx === -1) return null;
    all[idx] = { ...all[idx], ...data };
    save(KEYS.dashboardLinks, all);
    return all[idx];
  },
  deleteDashboardLink(id) {
    save(KEYS.dashboardLinks, load(KEYS.dashboardLinks).filter(l => l.id !== id));
  },

  // ── NOTES (POST-ITS) ──────────────────────────────────────────────────────
  getNotes(subjectId) { return load(KEYS.notes).filter(n => n.subjectId === subjectId); },
  createNote({ subjectId, userId, content, color, x, y }) {
    const rec = { id: uid(), subjectId, userId, content, color: color ?? '#fef08a', x: x ?? 20, y: y ?? 20, createdAt: Date.now() };
    const all = load(KEYS.notes);
    all.push(rec);
    save(KEYS.notes, all);
    return rec;
  },
  updateNote(id, data) {
    const all = load(KEYS.notes);
    const idx = all.findIndex(n => n.id === id);
    if (idx === -1) return null;
    all[idx] = { ...all[idx], ...data };
    save(KEYS.notes, all);
    return all[idx];
  },
  deleteNote(id) {
    save(KEYS.notes, load(KEYS.notes).filter(n => n.id !== id));
  },

  // ── FILES (META IN localStorage, BINARY IN IndexedDB) ────────────────────
  getFileMeta(subjectId) { return load(KEYS.fileMeta).filter(f => f.subjectId === subjectId); },
  createFileMeta({ subjectId, userId, name, type, size }) {
    const rec = { id: uid(), subjectId, userId, name, type, size, createdAt: Date.now() };
    const all = load(KEYS.fileMeta);
    all.push(rec);
    save(KEYS.fileMeta, all);
    return rec;
  },
  deleteFileMeta(id) {
    save(KEYS.fileMeta, load(KEYS.fileMeta).filter(f => f.id !== id));
  },
  async saveFileContent(id, arrayBuffer) {
    const idb = await openIDB();
    return new Promise((resolve, reject) => {
      const tx = idb.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put({ id, data: arrayBuffer });
      tx.oncomplete = () => resolve();
      tx.onerror = e => reject(e.target.error);
    });
  },
  async getFileContent(id) {
    const idb = await openIDB();
    return new Promise((resolve, reject) => {
      const tx = idb.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(id);
      req.onsuccess = e => resolve(e.target.result?.data ?? null);
      req.onerror = e => reject(e.target.error);
    });
  },
  async deleteFileContent(id) {
    const idb = await openIDB();
    return new Promise((resolve, reject) => {
      const tx = idb.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = e => reject(e.target.error);
    });
  },

  // ── GRADES ───────────────────────────────────────────────────────────────
  getGrades(subjectId) { return load(KEYS.grades).filter(g => g.subjectId === subjectId); },
  createGrade({ subjectId, userId, name, score, maxScore, weight }) {
    const rec = { id: uid(), subjectId, userId, name, score: parseFloat(score), maxScore: parseFloat(maxScore ?? 10), weight: parseFloat(weight ?? 1), createdAt: Date.now() };
    const all = load(KEYS.grades);
    all.push(rec);
    save(KEYS.grades, all);
    return rec;
  },
  deleteGrade(id) {
    save(KEYS.grades, load(KEYS.grades).filter(g => g.id !== id));
  },
};
