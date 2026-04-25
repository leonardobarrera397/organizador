import { Router } from 'express';
import { randomUUID } from 'crypto';
import db from '../db/database.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const years = await db.getAll('SELECT * FROM years WHERE user_id = $1 ORDER BY year ASC', [req.userId]);
    res.json(years);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { name, year, color } = req.body;
    if (!name) return res.status(400).json({ error: 'El nombre es requerido' });

    const rec = await db.getOne(
      'INSERT INTO years (id, user_id, name, year, color) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [randomUUID(), req.userId, name, year ?? null, color ?? '#00e5b4']
    );
    res.status(201).json(rec);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const existing = await db.getOne('SELECT id FROM years WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    if (!existing) return res.status(404).json({ error: 'No encontrado' });

    const { name, year, color } = req.body;
    const updated = await db.getOne(
      'UPDATE years SET name = COALESCE($1, name), year = COALESCE($2, year), color = COALESCE($3, color) WHERE id = $4 RETURNING *',
      [name, year, color, req.params.id]
    );
    res.json(updated);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const existing = await db.getOne('SELECT id FROM years WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    if (!existing) return res.status(404).json({ error: 'No encontrado' });

    await db.run('DELETE FROM years WHERE id = $1', [req.params.id]);
    res.status(204).end();
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
