import { z } from 'zod';

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(255, 'E-mail deve ter no máximo 255 caracteres')
  .pipe(z.email({ error: 'E-mail inválido' }));

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Nome é obrigatório')
    .max(120, 'Nome deve ter no máximo 120 caracteres'),
  email: emailSchema,
  // Limite superior evita hashing de entradas gigantes (Argon2 é intencionalmente custoso).
  password: z
    .string()
    .min(8, 'Senha deve ter no mínimo 8 caracteres')
    .max(128, 'Senha deve ter no máximo 128 caracteres'),
});

export const loginSchema = z.object({
  email: emailSchema,
  // No login não se aplica a regra de tamanho mínimo, para não invalidar contas antigas.
  password: z.string().min(1, 'Senha é obrigatória').max(128),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;