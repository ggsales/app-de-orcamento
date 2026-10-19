import { sql } from 'drizzle-orm';
import {
  check,
  date,
  foreignKey,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

// Os estados possíveis de uma proposta. O banco recusa qualquer outro valor.
export const proposalStatus = pgEnum('proposal_status', [
  'draft',
  'sent',
  'accepted',
  'rejected',
  'expired',
]);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 120 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const clients = pgTable(
  'clients',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    name: varchar('name', { length: 120 }).notNull(),
    email: varchar('email', { length: 255 }),
    phone: varchar('phone', { length: 30 }),
    company: varchar('company', { length: 120 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('clients_user_id_idx').on(table.userId),
    // Necessária para a chave estrangeira composta de proposals apontar para (id, user_id).
    unique('clients_id_user_id_unique').on(table.id, table.userId),
  ],
);

export const proposals = pgTable(
  'proposals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    clientId: uuid('client_id').notNull(),
    title: varchar('title', { length: 160 }).notNull(),
    description: text('description'),
    status: proposalStatus('status').notNull().default('draft'),
    discountPercent: integer('discount_percent').notNull().default(0),
    validUntil: date('valid_until'),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    decidedAt: timestamp('decided_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    // Garante que o cliente da proposta pertence ao MESMO usuário dono da proposta.
    foreignKey({
      name: 'proposals_client_user_fk',
      columns: [table.clientId, table.userId],
      foreignColumns: [clients.id, clients.userId],
    }).onDelete('restrict'),
    index('proposals_user_status_idx').on(table.userId, table.status),
    index('proposals_client_id_idx').on(table.clientId),
    check('proposals_discount_percent_range', sql`${table.discountPercent} BETWEEN 0 AND 100`),
  ],
);

export const proposalItems = pgTable(
  'proposal_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    proposalId: uuid('proposal_id')
      .notNull()
      .references(() => proposals.id, { onDelete: 'cascade' }),
    description: varchar('description', { length: 255 }).notNull(),
    quantity: integer('quantity').notNull().default(1),
    unitPriceCents: integer('unit_price_cents').notNull(),
    position: integer('position').notNull().default(0),
  },
  (table) => [
    index('proposal_items_proposal_id_idx').on(table.proposalId),
    check('proposal_items_quantity_range', sql`${table.quantity} BETWEEN 1 AND 100000`),
    check(
      'proposal_items_unit_price_range',
      sql`${table.unitPriceCents} BETWEEN 0 AND 100000000`,
    ),
    check('proposal_items_position_non_negative', sql`${table.position} >= 0`),
  ],
);

// Tipos TypeScript gerados a partir das tabelas (usaremos nas próximas etapas).
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;
export type Proposal = typeof proposals.$inferSelect;
export type NewProposal = typeof proposals.$inferInsert;
export type ProposalItem = typeof proposalItems.$inferSelect;
export type NewProposalItem = typeof proposalItems.$inferInsert;