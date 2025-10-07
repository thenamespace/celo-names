// Environment configuration
export const ENV = {
  INDEXER_URL: import.meta.env.VITE_INDEXER_URL || 'https://celo-indexer.namespace.ninja',
  PARENT_NAME: import.meta.env.PARENT_NAME || "celoo.eth"
} as const;
