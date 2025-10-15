// Environment configuration
export const ENV = {
  INDEXER_URL: import.meta.env.VITE_INDEXER_URL || 'https://celo-indexer.namespace.ninja',
  PARENT_NAME: import.meta.env.PARENT_NAME || "celoo.eth",
  ALCHEMY_TOKEN: import.meta.env.ALCHEMY_TOKEN || "EjvYbGgrdl2B82Ada3HY0"
} as const;
