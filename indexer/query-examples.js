// Example usage of GraphQL queries for Names and Records
// This file demonstrates how to fetch and match names with their records

// Example 1: Get all names and their matching records - THE MAIN QUERY YOU WANTED!
const getAllNamesWithRecords = `
  query GetAllNamesWithRecords {
    namess {
      items {
        id
        label
        expiry
        owner
        blockNumber
        txHash
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      totalCount
    }
    recordss {
      items {
        id
        addresses
        texts
        contenthash
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

// Example 2: Get a specific name with its record data
const getCompleteNameData = `
  query GetCompleteNameData($nodeId: String!) {
    name: names(id: $nodeId) {
      id
      label
      expiry
      owner
      blockNumber
      txHash
    }
    record: records(id: $nodeId) {
      id
      addresses
      texts
      contenthash
    }
  }
`;

// Example 3: Get names by owner
const getNamesByOwner = `
  query GetNamesByOwner($owner: String!) {
    namess(where: { owner: { equals: $owner } }) {
      items {
        id
        label
        expiry
        owner
        blockNumber
        txHash
      }
      totalCount
    }
  }
`;

// Example 4: Get active names (not expired)
const getActiveNames = `
  query GetActiveNames($currentTime: BigInt!) {
    namess(where: { expiry: { gt: $currentTime } }) {
      items {
        id
        label
        expiry
        owner
        blockNumber
        txHash
      }
      totalCount
    }
  }
`;

// Example 5: Search names by label pattern
const searchNamesByLabel = `
  query SearchNamesByLabel($pattern: String!) {
    namess(where: { label: { contains: $pattern } }) {
      items {
        id
        label
        expiry
        owner
        blockNumber
        txHash
      }
      totalCount
    }
  }
`;

// Example 6: Get names with specific text records
const getNamesWithTextRecords = `
  query GetNamesWithTextRecords($textKey: String!) {
    recordss(where: { texts: { contains: $textKey } }) {
      items {
        id
        addresses
        texts
        contenthash
      }
      totalCount
    }
  }
`;

// Example 7: Get names with address records for a specific coin type
const getNamesWithAddressRecords = `
  query GetNamesWithAddressRecords($coinType: Int!) {
    recordss(where: { addresses: { contains: $coinType } }) {
      items {
        id
        addresses
        texts
        contenthash
      }
      totalCount
    }
  }
`;

// Example 8: Get recent names with pagination
const getRecentNames = `
  query GetRecentNames($limit: Int) {
    namess(limit: $limit, orderBy: "blockNumber", orderDirection: "desc") {
      items {
        id
        label
        expiry
        owner
        blockNumber
        txHash
      }
      totalCount
    }
  }
`;

// Example 9: Get names created in a specific block range
const getNamesByBlockRange = `
  query GetNamesByBlockRange($fromBlock: Int!, $toBlock: Int!) {
    namess(where: { 
      AND: [
        { blockNumber: { gte: $fromBlock } },
        { blockNumber: { lte: $toBlock } }
      ]
    }) {
      items {
        id
        label
        expiry
        owner
        blockNumber
        txHash
      }
      totalCount
    }
  }
`;

// Example 10: Get names with content hash
const getNamesWithContentHash = `
  query GetNamesWithContentHash {
    recordss(where: { contenthash_not: null }) {
      items {
        id
        addresses
        texts
        contenthash
      }
      totalCount
    }
  }
`;

// Helper function to match names with their records
function matchNamesWithRecords(names, records) {
  const recordsMap = new Map();
  records.forEach(record => {
    recordsMap.set(record.id, record);
  });
  
  return names.map(name => ({
    ...name,
    record: recordsMap.get(name.id) || null
  }));
}

// Example usage with fetch
async function fetchAllNamesWithRecords() {
  try {
    const response = await fetch('http://localhost:42069/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: getAllNamesWithRecords,
      }),
    });
    
    const data = await response.json();
    
    if (data.errors) {
      console.error('GraphQL errors:', data.errors);
      return;
    }
    
    // Match names with their records
    const namesWithRecords = matchNamesWithRecords(
      data.data.namess.items,
      data.data.recordss.items
    );
    
    console.log('Names with records:', namesWithRecords);
    return namesWithRecords;
  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

// Example usage for a specific name
async function fetchCompleteNameData(nodeId) {
  try {
    const response = await fetch('http://localhost:42069/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: getCompleteNameData,
        variables: { nodeId },
      }),
    });
    
    const data = await response.json();
    
    if (data.errors) {
      console.error('GraphQL errors:', data.errors);
      return;
    }
    
    const completeData = {
      name: data.data.name,
      record: data.data.record
    };
    
    console.log('Complete name data:', completeData);
    return completeData;
  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

// Export for use in other files
module.exports = {
  getAllNamesWithRecords,
  getCompleteNameData,
  getNamesByOwner,
  getActiveNames,
  searchNamesByLabel,
  getNamesWithTextRecords,
  getNamesWithAddressRecords,
  getRecentNames,
  getNamesByBlockRange,
  getNamesWithContentHash,
  matchNamesWithRecords,
  fetchAllNamesWithRecords,
  fetchCompleteNameData
};