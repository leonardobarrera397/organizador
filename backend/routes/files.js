import { Router } from 'express';
import { randomUUID } from 'crypto';
import { createReadStream, unlinkSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import db from '../db/database.js';
import { requireAuth } from '../middleware/auth.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = join(__dirname, '..', 'uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename:    (req, file, cb) => cb(null, randomUUID()),
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const { subjectId } = req.query;
    if (!subjectId) return res.status(400).json({ error: 'subjectId es requerido' });
    res.json(await db.getAll('SELECT * FROM files WHERE subject_id = $1 AND user_id = $2', [subjectId, req.userId]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', upload.single('file'), async (req, res) => {
  try {
    const { subjectId } = req.body;
    if (!subjectId || !req.file) return res.status(400).json({ error: 'subjectId y archivo son requeridos' });

    const rec = await db.getOne(
      'INSERT INTO files (id, subject_id, user_id, name, mime_type, size) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [req.file.filename, subjectId, req.userId, req.file.originalname, req.file.mimetype, req.file.size]
    );
    res.status(201).json(rec);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id/download', async (req, res) => {
  try {
    const file = await db.getOne('SELECT * FROM files WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    if (!file) return res.status(404).json({ error: 'No encontrado' });

    const filePath = join(UPLOADS_DIR, file.id);
    if (!existsSync(filePath)) return res.status(404).json({ error: 'Archivo no encontrado en disco' });

    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.name)}"`);
    res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
    createReadStream(filePath).pipe(res);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const file = await db.getOne('SELECT * FROM files WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    if (!file) return res.status(404).json({ error: 'No encontrado' });

    const filePath = join(UPLOADS_DIR, file.id);
    if (existsSync(filePath)) unlinkSync(filePath);
    await db.run('DELETE FROM files WHERE id = $1', [file.id]);
    res.status(204).end();
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
