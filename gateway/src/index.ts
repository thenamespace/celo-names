import { Hono } from "hono";
import { prettyJSON } from "hono/pretty-json";
import { serve } from "@hono/node-server";
import { CCIPReadHandler } from "./ccip-read/handler";
import { getEnvironment } from "./env";

const app = new Hono();
app.use("*", prettyJSON());

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

const port = Number(process.env.PORT || 3000);

console.log(`[gateway] starting on http://localhost:${port}`);

serve({ fetch: app.fetch, port });

