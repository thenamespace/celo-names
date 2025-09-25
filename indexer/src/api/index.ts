import { db } from "ponder:api";
import schema from "ponder:schema";
import { Hono } from "hono";
import { client, graphql } from "ponder";
import { cors } from "hono/cors";

const app = new Hono();

app.use("*", cors(
    {
        origin: "*",
        allowMethods: ["GET", "POST", "OPTIONS"],
    }
));

app.use("/", graphql({ db, schema }));
app.use("/graphql", graphql({ db, schema }));

export default app;
