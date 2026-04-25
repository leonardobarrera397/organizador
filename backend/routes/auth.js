import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import db from '../db/database.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: 'Nombre, email y contraseña son requeridos' });

    const exists = await db.getOne('SELECT id FROM users WHERE email = $1', [email]);
    if (exists) return res.status(409).json({ error: 'El email ya está registrado' });

    const hash = bcrypt.hashSync(password, 10);
    const id = randomUUID();
    await db.run('INSERT INTO users (id, name, email, password) VALUES ($1, $2, $3, $4)', [id, name, email, hash]);

    const token = jwt.sign({ userId: id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { userId: id, name, email } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });

    const user = await db.getOne('SELECT * FROM users WHERE email = $1', [email]);
    if (!user || !bcrypt.compareSync(password, user.password))
      return res.status(401).json({ error: 'Credenciales incorrectas' });

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { userId: user.id, name: user.name, email: user.email } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await db.getOne('SELECT id, name, email FROM users WHERE id = $1', [req.userId]);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ userId: user.id, name: user.name, email: user.email });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/me', requireAuth, async (req, res) => {
  try {
    await db.run('DELETE FROM users WHERE id = $1', [req.userId]);
    res.status(204).end();
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
