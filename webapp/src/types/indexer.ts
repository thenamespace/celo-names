// Types based on the GraphQL schema from the indexer

export interface Record {
  id: string;
  addresses?: Array<{
    coin: number;
    value: string;
    name?: string;
  }>;
  texts?: Array<{
    key: string;
    value: string;
  }>;
  contenthash?: {
    codec: string;
    decoded: string;
    encoded: string;
  };
}

export interface Registration {
  id: string;
  price_wei: string; // BigInt as string
  tx_hash: string;
  block_number: string; // BigInt as string
  registrar_contract: string;
  tx_sender: string;
}

export interface Name {
  id: string;
  label: string;
  full_name: string;
  expiry: string; // BigInt as string
  owner: string;
  records?: Record;
  registration?: Registration;
}

export interface NamePage {
  items: Name[];
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor?: string;
    endCursor?: string;
  };
  totalCount: number;
}

export interface NamesQueryVariables {
  where?: {
    owner?: string;
    owner_in?: string[];
  };
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  limit?: number;
}
