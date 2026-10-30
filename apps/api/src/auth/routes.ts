import { Router } from 'express';
import { z } from 'zod';

import { db } from '../db/client.js';
import { users } from '../db/schema.js';
import { registerSchema } from './schemas.js';
import { hashPassword } from './security.js';

export const authRouter = Router();

// Código do Postgres para violação de unique (e-mail já cadastrado).
const UNIQUE_VIOLATION = '23505';

// O driver pode lançar o erro direto ou embrulhado em outro (campo cause).
function isUniqueViolation(error: unknown): boolean {
  const candidates = [error, error instanceof Error ? error.cause : undefined];

  return candidates.some(
    (candidate) =>
      typeof candidate === 'object' &&
      candidate !== null &&
      'code' in candidate &&
      candidate.code === UNIQUE_VIOLATION,
  );
}

authRouter.post('/register', async (req, res, next) => {
  const parsed = registerSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      error: 'Dados inválidos',
      details: z.flattenError(parsed.error).fieldErrors,
    });
    return;
  }

  const { name, email, password } = parsed.data;

  try {
    const passwordHash = await hashPassword(password);

    const [user] = await db
      .insert(users)
      .values({ name, email, passwordHash })
      .returning({ id: users.id, name: users.name, email: users.email });

    res.status(201).json({ user });
  } catch (error) {
    if (isUniqueViolation(error)) {
      res.status(409).json({ error: 'E-mail já cadastrado' });
      return;
    }

    next(error);
  }
});