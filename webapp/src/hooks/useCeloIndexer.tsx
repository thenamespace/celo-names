import { useState, useCallback } from 'react';
import type { Name, NamePage, NamesQueryVariables } from '@/types/indexer';
import { ENV } from '@/constants/environment';

// GraphQL query to get names by owner
const GET_OWNER_NAMES_QUERY = `
  query GetOwnerNames($where: nameFilter, $orderBy: String, $orderDirection: String, $limit: Int) {
    names(where: $where, orderBy: $orderBy, orderDirection: $orderDirection, limit: $limit) {
      items {
        id
        label
        full_name
        expiry
        owner
        records {
          id
          addresses
          texts
          contenthash
        }
        registration {
          id
          price_wei
          tx_hash
          block_number
          registrar_contract
          tx_sender
        }
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      totalCount
    }
  }
`;

// Indexer URL from environment configuration
const INDEXER_URL = `${ENV.INDEXER_URL}/graphql`;

export const useCeloIndexer = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getOwnerNames = useCallback(async (owner: string): Promise<Name[]> => {
    setLoading(true);
    setError(null);

    try {
      const variables: NamesQueryVariables = {
        where: {
          owner: owner.toLowerCase()
        },
        orderBy: 'created_at',
        orderDirection: 'desc',
        limit: 100
      };

      const response = await fetch(INDEXER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: GET_OWNER_NAMES_QUERY,
          variables,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.errors) {
        throw new Error(result.errors[0]?.message || 'GraphQL error');
      }

      const namePage: NamePage = result.data.names;
      return namePage.items;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error fetching owner names:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    getOwnerNames,
    loading,
    error,
  };
};
