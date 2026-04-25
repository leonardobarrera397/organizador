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
    res.json(await db.getAll('SELECT * FROM grades WHERE subject_id = $1 AND user_id = $2', [subjectId, req.userId]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { subjectId, name, score, maxScore, weight } = req.body;
    if (!subjectId || !name || score == null) return res.status(400).json({ error: 'subjectId, name y score son requeridos' });

    const rec = await db.getOne(
      'INSERT INTO grades (id, subject_id, user_id, name, score, max_score, weight) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [randomUUID(), subjectId, req.userId, name, parseFloat(score), parseFloat(maxScore ?? 10), parseFloat(weight ?? 1)]
    );
    res.status(201).json(rec);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const existing = await db.getOne('SELECT id FROM grades WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    if (!existing) return res.status(404).json({ error: 'No encontrado' });
    await db.run('DELETE FROM grades WHERE id = $1', [req.params.id]);
    res.status(204).end();
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
