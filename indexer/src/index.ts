import { ponder } from "ponder:registry";
import { names, records } from "ponder:schema";

// Helper function to get or create a record
async function getOrCreateRecord(context: any, node: string) {
  const existing = await context.db.find(records, { id: node });
  
  if (existing) {
    return existing;
  }
  
  // Create new record
  await context.db.insert(records).values({
    id: node,
    addresses: [],
    texts: [],
    contenthash: null,
  });
  
  return { id: node, addresses: [], texts: [], contenthash: null };
}

// Helper function to update record
async function updateRecord(context: any, node: string, updates: any) {
  await context.db
    .update(records, { id: node })
    .set(updates);
}


// NewName event handler
ponder.on("L2Registry:NewName", async ({ event, context }) => {
  const { label, expiry, owner, node } = event.args;
  const nodeStr = node;
  
  // Create name record
  await context.db.insert(names).values({
    id: nodeStr,
    label,
    expiry,
    owner,
    blockNumber: Number(event.block.number),
    txHash: event.transaction.hash,
  });
  
  // Create corresponding record
  await getOrCreateRecord(context, nodeStr);
  
  console.log(`NewName event: ${label} -> ${nodeStr} (owner: ${owner}, expiry: ${expiry})`);
});

// TextChanged event handler
ponder.on("L2Registry:TextChanged", async ({ event, context }) => {
  const { node, key, value } = event.args;
  const nodeStr = node;
  
  // Get or create record
  const record = await getOrCreateRecord(context, nodeStr);
  const texts = record.texts || [];
  
  // Update or add text record
  const existingTextIndex = texts.findIndex((t: any) => t.key === key);
  if (existingTextIndex >= 0) {
    texts[existingTextIndex].value = value;
  } else {
    texts.push({ key, value });
  }
  
  // Update record
  await updateRecord(context, nodeStr, {
    texts,
  });
  
  console.log(`TextChanged event: ${nodeStr} -> ${key}: ${value}`);
});

// AddrChanged event handler (legacy ETH address)
ponder.on("L2Registry:AddrChanged", async ({ event, context }) => {
  const { node, a } = event.args;
  const nodeStr = node;
  
  // Get or create record
  const record = await getOrCreateRecord(context, nodeStr);
  const addresses = record.addresses || [];
  
  // Update or add ETH address (coin type 60)
  const existingAddrIndex = addresses.findIndex((addr: any) => addr.coin === 60);
  if (existingAddrIndex >= 0) {
    addresses[existingAddrIndex].value = a;
  } else {
    addresses.push({ coin: 60, value: a });
  }
  
  // Update record
  await updateRecord(context, nodeStr, {
    addresses,
  });
  
  console.log(`AddrChanged event: ${nodeStr} -> ${a}`);
});

// AddressChanged event handler (multicoin)
ponder.on("L2Registry:AddressChanged", async ({ event, context }) => {
  const { node, coinType, newAddress } = event.args;
  const nodeStr = node;
  
  // Get or create record
  const record = await getOrCreateRecord(context, nodeStr);
  const addresses = record.addresses || [];
  
  // Update or add address for coin type
  const existingAddrIndex = addresses.findIndex((addr: any) => addr.coin === Number(coinType));
  if (existingAddrIndex >= 0) {
    addresses[existingAddrIndex].value = newAddress;
  } else {
    addresses.push({ coin: Number(coinType), value: newAddress });
  }
  
  // Update record
  await updateRecord(context, nodeStr, {
    addresses,
  });
  
  console.log(`AddressChanged event: ${nodeStr} -> coin ${coinType}: ${newAddress}`);
});

// ContenthashChanged event handler
ponder.on("L2Registry:ContenthashChanged", async ({ event, context }) => {
  const { node, hash } = event.args;
  const nodeStr = node;
  
  // Get or create record
  await getOrCreateRecord(context, nodeStr);
  
  // Update record
  await updateRecord(context, nodeStr, {
    contenthash: hash,
  });
  
  console.log(`ContenthashChanged event: ${nodeStr} -> ${hash}`);
});