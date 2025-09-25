import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { CCIPReadHandler } from "./ccip-read/handler";
import { getEnvironment } from "./env";
import { cors } from "hono/cors";

const app = new Hono();

// CORS configuration
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

const env = getEnvironment();
const ccip_handler: CCIPReadHandler = new CCIPReadHandler(env);

// Simple health endpoint
app.get("/", (c) => c.json({ ok: true }));

// GET /resolve/:sender/:data.json
app.get("/resolve/:sender/:data", (c) => {
  return ccip_handler.handle(c.req);
});

// POST /resolve/:sender/:data.json
app.post("/resolve/:sender/:data", async (c) => {
  return ccip_handler.handle(c.req);
});


const server = serve({ fetch: app.fetch, port: env.app_port });
console.log(`Listening on port -> ${env.app_port}`);

process.on('SIGINT', () => {
  server.close()
  process.exit(0)
})

process.on('SIGTERM', () => {
  server.close((err) => {
    if (err) {
      console.error(err)
      process.exit(1)
    }
    process.exit(0)
  })
})

