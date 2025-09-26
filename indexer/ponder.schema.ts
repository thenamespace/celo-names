import { onchainTable, relations } from "ponder";

// Records table - resolver data for a node
export const record = onchainTable("records", (t) => ({
  id: t.text().primaryKey(), // node from event (one-to-one with names)
  addresses: t.json(), // Array of { coin: number, value: string, name?:string }
  texts: t.json(), // Array of { key: string, value: string }
  contenthash: t.json(), // { codec: string, decoded: string, encoded: string }
}));

// Names table - basic name information
export const name = onchainTable("names", (t) => ({
  id: t.text().primaryKey(), // node from event ( namehash of name )
  label: t.text().notNull(),
  full_name: t.text().notNull(),
  expiry: t.bigint().notNull(),
  owner: t.text().notNull(),
  created_at: t.bigint().notNull()
}));

export const registration = onchainTable("registrations", (t) => ({
  id: t.text().primaryKey(), // node from event ( namehash of name )
  price_wei: t.bigint().notNull(),
  tx_hash: t.text().notNull(),
  block_number: t.bigint().notNull(),
  registrar_contract: t.text().notNull(),
  tx_sender: t.text().notNull(),
  block_timestamp: t.bigint().notNull()
}))

// Define relationships
export const namesRelations = relations(name, ({ one }) => ({
  records: one(record, { fields: [name.id], references: [record.id] }),
  registration: one(registration, { fields: [name.id], references: [registration.id] }),
}));

export const recordsRelations = relations(record, ({ one }) => ({
  name: one(name, { fields: [record.id], references: [name.id] }),
}));