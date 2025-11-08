# Metadata Image Service

A NestJS service for generating dynamic metadata images.

## Features

- Dynamic image generation using `@napi-rs/canvas`
- RESTful API endpoint: `GET /metadata/{name}`
- Hardcoded nameInfo response (ready to be replaced with indexer integration)

## Installation

```bash
npm install
```

## Running the app

```bash
# development
npm run start:dev

# production mode
npm run start:prod
```

## API Endpoints

### GET /metadata/:name

Generates and returns a PNG image for the given name.

**Example:**
```bash
curl http://localhost:3000/metadata/alice
```

## Project Structure

```
src/
├── main.ts                    # Application entry point
├── app.module.ts              # Root module
└── metadata-image/
    ├── metadata-image.module.ts
    ├── metadata-image.controller.ts
    └── metadata-image.service.ts
```

## Next Steps

To integrate with the indexer endpoint, update the `getNameInfo` method in `metadata-image.service.ts` to make an actual HTTP request instead of returning hardcoded data.

