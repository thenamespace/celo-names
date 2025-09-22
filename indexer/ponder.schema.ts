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
  id: t.text().primaryKey(), // node from event
  label: t.text().notNull(),
  expiry: t.bigint().notNull(),
  owner: t.text().notNull(),
  blockNumber: t.integer().notNull(),
  txHash: t.text().notNull(),
}));

// Define relationships
export const namesRelations = relations(names, ({ one }) => ({
  record: one(records, { fields: [names.id], references: [records.id] }),
}));

export const recordsRelations = relations(records, ({ one }) => ({
  name: one(names, { fields: [records.id], references: [names.id] }),
}));