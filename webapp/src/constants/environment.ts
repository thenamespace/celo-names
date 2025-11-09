// Environment configuration
export const ENV = {
  INDEXER_URL: import.meta.env.VITE_INDEXER_URL || 'https://celo-indexer.namespace.ninja',
  PARENT_NAME: import.meta.env.PARENT_NAME || "celoo.eth",
  ALCHEMY_TOKEN: import.meta.env.ALCHEMY_TOKEN || "EjvYbGgrdl2B82Ada3HY0",
  MAX_SELF_CLAIM_COUNT: import.meta.env.MAX_SELF_CLAIM_COUNT ? Number(import.meta.env.MAX_SELF_CLAIM_COUNT) : 3,
  SET_DEFAULT_IMAGE_RECORDS: import.meta.env.SET_DEFAULT_IMAGE_RECORDS ? Boolean(import.meta.env.SET_DEFAULT_IMAGE_RECORDS) : true
} as const;
