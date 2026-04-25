import jwt from 'jsonwebtoken';

// Este middleware se pone delante de cualquier ruta que requiera login.
// Verifica el token JWT que el frontend manda en el header Authorization.
export function requireAuth(req, res, next) {
  const header = req.headers.authorization;

  // El header debe ser: "Bearer <token>"
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  try {
    const token = header.slice(7); // quita "Bearer "
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.userId; // disponible en la ruta como req.userId
    next(); // pasa al siguiente handler
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
}
