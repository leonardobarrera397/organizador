// En desarrollo usa localhost. En producción Vite inyecta VITE_API_URL desde .env
const BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:3001') + '/api';

function token() { return localStorage.getItem('uniorg_token') ?? ''; }

async function req(method, path, body) {
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` };
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Error del servidor');
  return data;
}

export const api = {
  // ── Auth ──────────────────────────────────────────────────────────────────
  login:    (email, password) => req('POST', '/auth/login',    { email, password }),
  register: (name, email, password) => req('POST', '/auth/register', { name, email, password }),

  // ── Years ─────────────────────────────────────────────────────────────────
  getYears:    ()        => req('GET',    '/years'),
  createYear:  (data)    => req('POST',   '/years', data),
  updateYear:  (id, data)=> req('PUT',    `/years/${id}`, data),
  deleteYear:  (id)      => req('DELETE', `/years/${id}`),

  // ── Subjects ──────────────────────────────────────────────────────────────
  getAllSubjects: ()        => req('GET',    '/subjects/all'),
  getSubjects:   (yearId)  => req('GET',    `/subjects?yearId=${yearId}`),
  getSubject:    (id)      => req('GET',    `/subjects/${id}`),
  createSubject: (data)    => req('POST',   '/subjects', data),
  updateSubject: (id, data)=> req('PUT',    `/subjects/${id}`, data),
  deleteSubject: (id)      => req('DELETE', `/subjects/${id}`),

  // ── Events ────────────────────────────────────────────────────────────────
  getAllEvents: ()        => req('GET',    '/events/all'),
  getEvents:   (subjId)  => req('GET',    `/events?subjectId=${subjId}`),
  createEvent: (data)    => req('POST',   '/events', data),
  updateEvent: (id, data)=> req('PUT',    `/events/${id}`, data),
  deleteEvent: (id)      => req('DELETE', `/events/${id}`),

  // ── Links ─────────────────────────────────────────────────────────────────
  getSubjectLinks:    (subjId) => req('GET',    `/links/subject?subjectId=${subjId}`),
  createSubjectLink:  (data)   => req('POST',   '/links/subject', data),
  deleteSubjectLink:  (id)     => req('DELETE', `/links/subject/${id}`),
  getDashboardLinks:  ()       => req('GET',    '/links/dashboard'),
  createDashboardLink:(data)   => req('POST',   '/links/dashboard', data),
  deleteDashboardLink:(id)     => req('DELETE', `/links/dashboard/${id}`),

  // ── Notes ─────────────────────────────────────────────────────────────────
  getNotes:    (subjId)  => req('GET',    `/notes?subjectId=${subjId}`),
  createNote:  (data)    => req('POST',   '/notes', data),
  updateNote:  (id, data)=> req('PUT',    `/notes/${id}`, data),
  deleteNote:  (id)      => req('DELETE', `/notes/${id}`),

  // ── Files ─────────────────────────────────────────────────────────────────
  getFiles: (subjId) => req('GET', `/files?subjectId=${subjId}`),

  uploadFile: async (subjectId, file) => {
    const fd = new FormData();
    fd.append('subjectId', subjectId);
    fd.append('file', file);
    const res = await fetch(`${BASE}/files`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token()}` },
      body: fd,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Error al subir archivo');
    return data;
  },

  downloadFile: async (id) => {
    const res = await fetch(`${BASE}/files/${id}/download`, {
      headers: { Authorization: `Bearer ${token()}` },
    });
    if (!res.ok) throw new Error('Error al descargar archivo');
    return res.blob();
  },

  deleteFile: (id) => req('DELETE', `/files/${id}`),

  // ── Grades ────────────────────────────────────────────────────────────────
  getGrades:    (subjId) => req('GET',    `/grades?subjectId=${subjId}`),
  createGrade:  (data)   => req('POST',   '/grades', data),
  deleteGrade:  (id)     => req('DELETE', `/grades/${id}`),

  // ── Account ───────────────────────────────────────────────────────────────
  deleteAccount: () => req('DELETE', '/auth/me'),
};
