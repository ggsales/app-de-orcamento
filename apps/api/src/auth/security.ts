import { hash, verify } from '@node-rs/argon2';
import { SignJWT, jwtVerify } from 'jose';
import { env } from '../env.js';

const secret = new TextEncoder().encode(env.JWT_SECRET);

// Parâmetros do Argon2id conforme recomendação da OWASP (19 MiB, 2 passadas, 1 thread).
const argonOptions = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

export async function hashPassword(password: string): Promise<string> {
  return hash(password, argonOptions);
}

// Retorna false se o hash armazenado for inválido, sem lançar erro.
export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

export async function signAccessToken(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${env.JWT_EXPIRES_IN_MINUTES}m`)
    .sign(secret);
}

// Retorna o id do usuário se o token for válido; null se for inválido ou estiver expirado.
export async function verifyAccessToken(token: string): Promise<string | null> {
  try {
    // Restringe o algoritmo aceito para evitar troca de assinatura.
    const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] });
    return payload.sub ?? null;
  } catch {
    return null;
  }
}