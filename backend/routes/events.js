import { Router } from 'express';
import { randomUUID } from 'crypto';
import db from '../db/database.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/all', async (req, res) => {
  try {
    const events = await db.getAll('SELECT * FROM events WHERE user_id = $1 ORDER BY date ASC', [req.userId]);
    res.json(events);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/', async (req, res) => {
  try {
    const { subjectId } = req.query;
    if (!subjectId) return res.status(400).json({ error: 'subjectId es requerido' });
    const events = await db.getAll(
      'SELECT * FROM events WHERE subject_id = $1 AND user_id = $2 ORDER BY date ASC',
      [subjectId, req.userId]
    );
    res.json(events);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { subjectId, title, date, type, description } = req.body;
    if (!subjectId || !title || !date) return res.status(400).json({ error: 'subjectId, title y date son requeridos' });

    const rec = await db.getOne(
      'INSERT INTO events (id, subject_id, user_id, title, date, type, description) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [randomUUID(), subjectId, req.userId, title, date, type ?? 'other', description ?? '']
    );
    res.status(201).json(rec);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const existing = await db.getOne('SELECT id FROM events WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    if (!existing) return res.status(404).json({ error: 'No encontrado' });

    const { title, date, type, description } = req.body;
    const updated = await db.getOne(
      'UPDATE events SET title = COALESCE($1, title), date = COALESCE($2, date), type = COALESCE($3, type), description = COALESCE($4, description) WHERE id = $5 RETURNING *',
      [title, date, type, description, req.params.id]
    );
    res.json(updated);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const existing = await db.getOne('SELECT id FROM events WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    if (!existing) return res.status(404).json({ error: 'No encontrado' });

    await db.run('DELETE FROM events WHERE id = $1', [req.params.id]);
    res.status(204).end();
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
