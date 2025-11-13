# Gateway Service

A CCIP-read gateway server for off-chain name resolution. Handles cross-chain resolution requests from Ethereum (L1) to Celo (L2) for ENS names.

## What It Does

Implements the CCIP-Read protocol to resolve ENS names registered on Celo from Ethereum. When a resolver on Ethereum needs to query a name on Celo, it makes a CCIP-Read request to this gateway, which then queries the L2 resolver on Celo and returns a signed response.

## How to Run

### Prerequisites

- Node.js 20 or higher
- npm or yarn

### Installation

```bash
npm install
```

### Configuration

Set the following environment variables:

```bash
export SIGNER_WALLET_KEY=your_private_key
export L2_RESOLVER=0x...
export CHAIN_ID=42220
export PORT=3000
export ALCHEMY_TOKEN=your_alchemy_token
```

Or create a `.env` file:

```
SIGNER_WALLET_KEY=your_private_key
L2_RESOLVER=0x...
CHAIN_ID=42220
PORT=3000
ALCHEMY_TOKEN=your_alchemy_token
```

### Development

```bash
npm run dev
```

Service runs on `http://localhost:3000`

### Production

```bash
npm run build
npm start
```

### Docker

```bash
docker build -t gateway-service .
docker run -p 3000:3000 \
  -e SIGNER_WALLET_KEY=your_private_key \
  -e L2_RESOLVER=0x... \
  -e CHAIN_ID=42220 \
  -e PORT=3000 \
  gateway-service
```

## API Endpoints

- `GET /resolve/:sender/:data` - CCIP-Read resolution endpoint
- `POST /resolve/:sender/:data` - CCIP-Read resolution endpoint

