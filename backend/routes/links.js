import { Router } from 'express';
import { randomUUID } from 'crypto';
import db from '../db/database.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

// ── Links de materias ────────────────────────────────────────────────────────

router.get('/subject', async (req, res) => {
  try {
    const { subjectId } = req.query;
    if (!subjectId) return res.status(400).json({ error: 'subjectId es requerido' });
    res.json(await db.getAll('SELECT * FROM subject_links WHERE subject_id = $1 AND user_id = $2', [subjectId, req.userId]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/subject', async (req, res) => {
  try {
    const { subjectId, title, url } = req.body;
    if (!subjectId || !title || !url) return res.status(400).json({ error: 'subjectId, title y url son requeridos' });

    const rec = await db.getOne(
      'INSERT INTO subject_links (id, subject_id, user_id, title, url) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [randomUUID(), subjectId, req.userId, title, url]
    );
    res.status(201).json(rec);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/subject/:id', async (req, res) => {
  try {
    const existing = await db.getOne('SELECT id FROM subject_links WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    if (!existing) return res.status(404).json({ error: 'No encontrado' });
    await db.run('DELETE FROM subject_links WHERE id = $1', [req.params.id]);
    res.status(204).end();
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Links del dashboard ───────────────────────────────────────────────────────

const DEFAULT_TOOLS = [
  { title: 'GitHub',        url: 'https://github.com',            icon: '🐙', color: '#6e40c9' },
  { title: 'Stack Overflow',url: 'https://stackoverflow.com',     icon: '📚', color: '#f58025' },
  { title: 'MDN Web Docs',  url: 'https://developer.mozilla.org', icon: '🦊', color: '#e66000' },
  { title: 'LeetCode',      url: 'https://leetcode.com',          icon: '⚡', color: '#ffa116' },
  { title: 'ChatGPT',       url: 'https://chat.openai.com',       icon: '🤖', color: '#10a37f' },
  { title: 'Excalidraw',    url: 'https://excalidraw.com',        icon: '✏️', color: '#6965db' },
  { title: 'Replit',        url: 'https://replit.com',            icon: '🔴', color: '#f26207' },
  { title: 'DevDocs',       url: 'https://devdocs.io',            icon: '📖', color: '#3d9e68' },
];

router.get('/dashboard', async (req, res) => {
  try {
    let links = await db.getAll('SELECT * FROM dashboard_links WHERE user_id = $1 ORDER BY created_at ASC', [req.userId]);

    if (links.length === 0) {
      for (const t of DEFAULT_TOOLS) {
        await db.run(
          'INSERT INTO dashboard_links (id, user_id, title, url, icon, color) VALUES ($1, $2, $3, $4, $5, $6)',
          [randomUUID(), req.userId, t.title, t.url, t.icon, t.color]
        );
      }
      links = await db.getAll('SELECT * FROM dashboard_links WHERE user_id = $1 ORDER BY created_at ASC', [req.userId]);
    }

    res.json(links);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/dashboard', async (req, res) => {
  try {
    const { title, url, icon, color } = req.body;
    if (!title || !url) return res.status(400).json({ error: 'title y url son requeridos' });

    const rec = await db.getOne(
      'INSERT INTO dashboard_links (id, user_id, title, url, icon, color) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [randomUUID(), req.userId, title, url, icon ?? '🔗', color ?? '#4a6080']
    );
    res.status(201).json(rec);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/dashboard/:id', async (req, res) => {
  try {
    const existing = await db.getOne('SELECT id FROM dashboard_links WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    if (!existing) return res.status(404).json({ error: 'No encontrado' });
    await db.run('DELETE FROM dashboard_links WHERE id = $1', [req.params.id]);
    res.status(204).end();
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
