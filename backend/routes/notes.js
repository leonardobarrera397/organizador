import { Router } from 'express';
import { randomUUID } from 'crypto';
import db from '../db/database.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const { subjectId } = req.query;
    if (!subjectId) return res.status(400).json({ error: 'subjectId es requerido' });
    res.json(await db.getAll('SELECT * FROM notes WHERE subject_id = $1 AND user_id = $2', [subjectId, req.userId]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { subjectId, content, color, x, y } = req.body;
    if (!subjectId) return res.status(400).json({ error: 'subjectId es requerido' });

    const rec = await db.getOne(
      'INSERT INTO notes (id, subject_id, user_id, content, color, x, y) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [randomUUID(), subjectId, req.userId, content ?? '', color ?? '#fef08a', x ?? 20, y ?? 20]
    );
    res.status(201).json(rec);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const existing = await db.getOne('SELECT id FROM notes WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    if (!existing) return res.status(404).json({ error: 'No encontrado' });

    const { content, color, x, y } = req.body;
    const updated = await db.getOne(
      'UPDATE notes SET content = COALESCE($1, content), color = COALESCE($2, color), x = COALESCE($3, x), y = COALESCE($4, y) WHERE id = $5 RETURNING *',
      [content, color, x, y, req.params.id]
    );
    res.json(updated);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const existing = await db.getOne('SELECT id FROM notes WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    if (!existing) return res.status(404).json({ error: 'No encontrado' });
    await db.run('DELETE FROM notes WHERE id = $1', [req.params.id]);
    res.status(204).end();
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
