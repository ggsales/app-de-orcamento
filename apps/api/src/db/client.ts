import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { env } from '../env.js';
import * as schema from './schema.js';

// Pool = um grupo de conexões reutilizáveis com o banco.
// Abrir uma conexão nova a cada requisição seria lento.
export const pool = new Pool({ connectionString: env.DATABASE_URL });

// Evita que a API caia por um erro numa conexão ociosa do pool.
pool.on('error', (error) => {
  console.error('Erro inesperado no pool do banco de dados:', error);
});

export const db = drizzle({ client: pool, schema });