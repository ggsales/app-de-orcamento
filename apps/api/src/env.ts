import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3333),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  // Chave que assina os tokens de login. Mínimo de 32 caracteres para ser difícil de adivinhar.
  JWT_SECRET: z.string().min(32, 'JWT_SECRET precisa ter pelo menos 32 caracteres'),
  // Tempo de validade do token, em minutos (inteiro positivo).
  JWT_EXPIRES_IN_MINUTES: z.coerce.number().int().positive().default(60),
});

export const env = envSchema.parse(process.env);