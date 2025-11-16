# Indexer Service

A blockchain event indexer using Ponder. Indexes contract events from Celo ENS contracts (Registry, Resolver, Registrar, SelfRegistrar) and provides a queryable GraphQL API for names and records.

## How to Run

### Prerequisites

- Node.js 18.14 or higher
- npm or yarn
- PostgreSQL (optional, uses pglite by default)

### Installation

```bash
npm install
```

### Configuration

Set the following environment variables:

```bash
export ROOT_NAME=celoo.eth
export RPC_URL=https://celo-mainnet.g.alchemy.com/v2/your-key
export APP_PORT=3000
export DB_TYPE=pglite
export DB_CONNECTION_STRING=postgresql://user:pass@localhost:5432/db  # Required if DB_TYPE=postgres
```

Or create a `.env` file:

```
ROOT_NAME=celoo.eth
RPC_URL=https://celo-mainnet.g.alchemy.com/v2/your-key
APP_PORT=3000
DB_TYPE=pglite
DB_CONNECTION_STRING=postgresql://user:pass@localhost:5432/db
```

### Development

```bash
npm run dev
```

Starts the indexer in development mode with hot-reload. Indexes events and serves GraphQL API.

### Production (Indexing Mode)

```bash
npm run codegen
npm start
```

Indexes blockchain events and serves the GraphQL API.

### Production (Read-Only Mode)

```bash
npm run codegen
npm run serve
```

Serves the GraphQL API only (no indexing). Use this when you have a separate indexer instance.

### Docker

Build and run with Docker:

```bash
docker build -t indexer-service -f Dockerfile .
docker run -p 3000:3000 \
  -e ROOT_NAME=celoo.eth \
  -e RPC_URL=https://celo-mainnet.g.alchemy.com/v2/your-key \
  -e APP_PORT=3000 \
  -e DB_TYPE=postgres \
  -e DB_CONNECTION_STRING=postgresql://user:pass@host:5432/db \
  indexer-service
```

For read-only mode, use `Dockerfile.Readonly`:

```bash
docker build -t indexer-service-readonly -f Dockerfile.Readonly .
docker run -p 3000:3000 \
  -e ROOT_NAME=celoo.eth \
  -e APP_PORT=3000 \
  -e DB_TYPE=postgres \
  -e DB_CONNECTION_STRING=postgresql://user:pass@host:5432/db \
  indexer-service-readonly
```

## API Endpoints

- `GET /` - GraphQL API endpoint
- `GET /graphql` - GraphQL API endpoint (alternative)

