import { hash } from '@node-rs/argon2';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { db, pool } from './client.js';
import { clients, proposalItems, proposals, users } from './schema.js';

const seedEnvSchema = z.object({
  SEED_USER_EMAIL: z.email(),
  SEED_USER_PASSWORD: z.string().min(12, 'precisa ter pelo menos 12 caracteres'),
});

// Data no formato AAAA-MM-DD, daqui a N dias.
function daysFromNow(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('O seed não pode rodar em produção.');
  }

  const parsed = seedEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Variáveis do seed inválidas:\n${z.prettifyError(parsed.error)}`);
  }

  const email = parsed.data.SEED_USER_EMAIL.toLowerCase();

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing.length > 0) {
    console.log('Seed ignorado: o usuário de exemplo já existe.');
    return;
  }

  // Argon2id com os parâmetros padrão da biblioteca.
  const passwordHash = await hash(parsed.data.SEED_USER_PASSWORD);

  await db.transaction(async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({ name: 'Usuário Demo', email, passwordHash })
      .returning({ id: users.id });

    if (!user) {
      throw new Error('Não foi possível criar o usuário de exemplo.');
    }

    const [clientA, clientB] = await tx
      .insert(clients)
      .values([
        {
          userId: user.id,
          name: 'Maria Souza',
          email: 'maria@exemplo.com',
          company: 'Ateliê Maria Souza',
        },
        {
          userId: user.id,
          name: 'Carlos Lima',
          email: 'carlos@exemplo.com',
          company: 'Lima Cafés',
        },
      ])
      .returning({ id: clients.id });

    if (!clientA || !clientB) {
      throw new Error('Não foi possível criar os clientes de exemplo.');
    }

    const [siteProposal, shopProposal, maintenanceProposal] = await tx
      .insert(proposals)
      .values([
        {
          userId: user.id,
          clientId: clientA.id,
          title: 'Site institucional',
          description: 'Site de 5 páginas com formulário de contato.',
          status: 'sent',
          discountPercent: 10,
          validUntil: daysFromNow(15),
          sentAt: new Date(),
        },
        {
          userId: user.id,
          clientId: clientB.id,
          title: 'Loja virtual',
          status: 'draft',
          discountPercent: 0,
        },
        {
          userId: user.id,
          clientId: clientA.id,
          title: 'Manutenção mensal',
          status: 'accepted',
          discountPercent: 5,
          sentAt: new Date(),
          decidedAt: new Date(),
        },
      ])
      .returning({ id: proposals.id });

    if (!siteProposal || !shopProposal || !maintenanceProposal) {
      throw new Error('Não foi possível criar as propostas de exemplo.');
    }

    await tx.insert(proposalItems).values([
      {
        proposalId: siteProposal.id,
        description: 'Design das páginas',
        quantity: 1,
        unitPriceCents: 250000,
        position: 0,
      },
      {
        proposalId: siteProposal.id,
        description: 'Desenvolvimento front-end',
        quantity: 1,
        unitPriceCents: 450000,
        position: 1,
      },
      {
        proposalId: siteProposal.id,
        description: 'Hospedagem (12 meses)',
        quantity: 12,
        unitPriceCents: 4900,
        position: 2,
      },
      {
        proposalId: shopProposal.id,
        description: 'Configuração da loja',
        quantity: 1,
        unitPriceCents: 380000,
        position: 0,
      },
      {
        proposalId: shopProposal.id,
        description: 'Integração de pagamento',
        quantity: 1,
        unitPriceCents: 120000,
        position: 1,
      },
      {
        proposalId: maintenanceProposal.id,
        description: 'Horas de manutenção',
        quantity: 10,
        unitPriceCents: 15000,
        position: 0,
      },
    ]);
  });

  console.log(`Seed concluído: usuário ${email}, 2 clientes e 3 propostas com itens.`);
}

void main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());