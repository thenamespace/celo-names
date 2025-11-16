# Webapp

React frontend for registering names, managing resolver records, and transferring ownership of Celo ENS names.

## What It Does

A web application that allows users to register `.celo.eth` domain names, manage their registered names, set resolver records (addresses, text records), transfer ownership, and view name profiles. Built with React, Vite, Wagmi, and RainbowKit for wallet connectivity.

## How to Run

### Prerequisites

- Node.js 20 or higher
- npm or yarn

### Installation

```bash
npm install
```

### Configuration

Set the following environment variables (optional):

```bash
export VITE_ALCHEMY_TOKEN=your_alchemy_token
```

Or create a `.env` file:

```
VITE_ALCHEMY_TOKEN=your_alchemy_token
```

### Development

```bash
npm run dev
```

App runs on `http://localhost:5173` (or next available port)

### Production Build

```bash
npm run build
```

Builds the app to the `dist` directory.

### Preview Production Build

```bash
npm run preview
```

### Docker

```bash
docker build -t webapp .
docker run -p 80:80 webapp
```

App runs on `http://localhost:80`
