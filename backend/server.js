import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import authRoutes    from './routes/auth.js';
import yearsRoutes   from './routes/years.js';
import subjectsRoutes from './routes/subjects.js';
import eventsRoutes  from './routes/events.js';
import linksRoutes   from './routes/links.js';
import notesRoutes   from './routes/notes.js';
import filesRoutes   from './routes/files.js';
import gradesRoutes  from './routes/grades.js';

const app = express();

// CORS_ORIGIN puede ser una URL o una lista separada por comas
// Ejemplo: CORS_ORIGIN=https://mi-app.netlify.app,http://localhost:5173
const allowedOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:5173').split(',').map(s => s.trim());
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
}));

// Parsea el body de las requests como JSON automáticamente
app.use(express.json());

// ── Rutas ────────────────────────────────────────────────────────────────────
// Cada router maneja todo lo que empiece con ese prefijo
app.use('/api/auth',     authRoutes);
app.use('/api/years',    yearsRoutes);
app.use('/api/subjects', subjectsRoutes);
app.use('/api/events',   eventsRoutes);
app.use('/api/links',    linksRoutes);
app.use('/api/notes',    notesRoutes);
app.use('/api/files',    filesRoutes);
app.use('/api/grades',   gradesRoutes);

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// ── Error handler global ─────────────────────────────────────────────────────
// Cualquier error no manejado llega aquí. Los 4 parámetros son obligatorios para que Express
// lo reconozca como error handler.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✓ Backend corriendo en http://localhost:${PORT}`);
  console.log(`  Health: http://localhost:${PORT}/api/health`);
});
