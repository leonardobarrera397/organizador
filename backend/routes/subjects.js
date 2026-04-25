import { Router } from 'express';
import { randomUUID } from 'crypto';
import db from '../db/database.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/all', async (req, res) => {
  try {
    const subjects = await db.getAll('SELECT * FROM subjects WHERE user_id = $1 ORDER BY name ASC', [req.userId]);
    res.json(subjects);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/', async (req, res) => {
  try {
    const { yearId } = req.query;
    if (!yearId) return res.status(400).json({ error: 'yearId es requerido' });
    const subjects = await db.getAll(
      'SELECT * FROM subjects WHERE year_id = $1 AND user_id = $2 ORDER BY name ASC',
      [yearId, req.userId]
    );
    res.json(subjects);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const subject = await db.getOne('SELECT * FROM subjects WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    if (!subject) return res.status(404).json({ error: 'No encontrado' });
    res.json(subject);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { yearId, name, professor, code, color } = req.body;
    if (!yearId || !name) return res.status(400).json({ error: 'yearId y nombre son requeridos' });

    const rec = await db.getOne(
      'INSERT INTO subjects (id, year_id, user_id, name, professor, code, color) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [randomUUID(), yearId, req.userId, name, professor ?? '', code ?? '', color ?? '#00e5b4']
    );
    res.status(201).json(rec);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const existing = await db.getOne('SELECT id FROM subjects WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    if (!existing) return res.status(404).json({ error: 'No encontrado' });

    const { name, professor, code, color } = req.body;
    const updated = await db.getOne(
      'UPDATE subjects SET name = COALESCE($1, name), professor = COALESCE($2, professor), code = COALESCE($3, code), color = COALESCE($4, color) WHERE id = $5 RETURNING *',
      [name, professor, code, color, req.params.id]
    );
    res.json(updated);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const existing = await db.getOne('SELECT id FROM subjects WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    if (!existing) return res.status(404).json({ error: 'No encontrado' });

    await db.run('DELETE FROM subjects WHERE id = $1', [req.params.id]);
    res.status(204).end();
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
