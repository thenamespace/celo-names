import { onchainTable, relations } from "ponder";

// Records table - resolver data for a node
export const records = onchainTable("records", (t) => ({
  id: t.text().primaryKey(), // node from event (one-to-one with names)
  addresses: t.json(), // Array of { coin: number, value: string }
  texts: t.json(), // Array of { key: string, value: string }
  contenthash: t.text(),
}));

// Names table - basic name information
export const names = onchainTable("names", (t) => ({
  id: t.text().primaryKey(), // node from event ( namehash of name )
  label: t.text().notNull(),
  full_name: t.text().notNull(),
  expiry: t.bigint().notNull(),
  owner: t.text().notNull(),
}));

export const registrations = onchainTable("registrations", (t) => ({
  id: t.text().primaryKey(), // node from event ( namehash of name )
  price_wei: t.bigint().notNull(),
  tx_hash: t.text().notNull(),
  block_number: t.bigint().notNull(),
  registrar_contract: t.text().notNull(),
  tx_sender: t.text().notNull()
}))

// Define relationships
export const namesRelations = relations(names, ({ one }) => ({
  record: one(records, { fields: [names.id], references: [records.id] }),
  registration: one(registrations, { fields: [names.id], references: [registrations.id] }),
}));

export const recordsRelations = relations(records, ({ one }) => ({
  name: one(names, { fields: [records.id], references: [names.id] }),
}));