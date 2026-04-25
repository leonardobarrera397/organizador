import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { Pool } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));

// Pool de conexiones a PostgreSQL
// En producción, DATABASE_URL viene de Supabase/Render como variable de entorno
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Crea las tablas al arrancar (IF NOT EXISTS hace que sea seguro correrlo varias veces)
const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
pool.query(schema).catch(err => console.error('Error iniciando schema:', err.message));

// Helpers para que los routes sean más legibles
const db = {
  // Devuelve la primera fila o null
  getOne: async (text, params = []) => {
    const r = await pool.query(text, params);
    return r.rows[0] ?? null;
  },
  // Devuelve todas las filas
  getAll: async (text, params = []) => {
    const r = await pool.query(text, params);
    return r.rows;
  },
  // Ejecuta sin retornar filas (INSERT sin RETURNING, DELETE, etc.)
  run: async (text, params = []) => pool.query(text, params),
};

export default db;
