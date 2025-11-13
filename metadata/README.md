# Metadata Service

A NestJS service that generates dynamic NFT metadata images for Celo ENS names. This service creates images that can be used as NFT metadata for registered `.celo.eth` domain names.

## What It Does

Generates PNG images on-demand for Celo ENS names with branding (Celo and ENS logos) and returns OpenSea-compatible JSON metadata. Images are cached in memory for performance.

## How to Run

### Prerequisites

- Node.js 20 or higher
- npm or yarn

### Installation

```bash
npm install
```

### Configuration

Set the `BASE_URL` environment variable:

```bash
export BASE_URL=http://localhost:3000
```

Or create a `.env` file:

```
BASE_URL=http://localhost:3000
```

### Development

```bash
npm run start:dev
```

Service runs on `http://localhost:3000`

### Production

```bash
npm run build
npm run start:prod
```

### Docker

```bash
docker build -t metadata-service .
docker run -p 3000:3000 -e BASE_URL=http://localhost:3000 metadata-service
```

## API Endpoints

- `GET /metadata/:name` - Returns JSON metadata
- `GET /metadata/:name/image` - Returns PNG image
