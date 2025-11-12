// Environment configuration
export const ENV = {
  INDEXER_URL: import.meta.env.VITE_INDEXER_URL || 'https://celo-indexer-reader.namespace.ninja',
  PARENT_NAME: import.meta.env.PARENT_NAME || "celo.eth",
  ALCHEMY_TOKEN: import.meta.env.ALCHEMY_TOKEN || "R1Z1EUyNCo6VGghfuACAC",
  MAX_SELF_CLAIM_COUNT: import.meta.env.MAX_SELF_CLAIM_COUNT ? Number(import.meta.env.MAX_SELF_CLAIM_COUNT) : 1,
  SET_DEFAULT_IMAGE_RECORDS: import.meta.env.SET_DEFAULT_IMAGE_RECORDS ? Boolean(import.meta.env.SET_DEFAULT_IMAGE_RECORDS) : true
} as const;
