import { db } from "ponder:api";
import schema, { name, record, registration } from "ponder:schema";
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
app.get("/api/celo/details", async (c: any) => {
    try {
        // Fetch all names using db.select()
        const names = await db.select().from(name);
        
        // Fetch all records
        const records = await db.select().from(record);
        
        // Fetch all registrations
        const registrations = await db.select().from(registration);
        
        // Combine names with their related records and registrations
        const details = names.map((n: any) => {
            const nameRecord = records.find((r: any) => r.id === n.id);
            const nameRegistration = registrations.find((reg: any) => reg.id === n.id);
            
            return {
                id: n.id,
                label: n.label,
                full_name: n.full_name,
                expiry: n.expiry.toString(),
                owner: n.owner,
                created_at: n.created_at.toString(),
                records: nameRecord ? {
                    id: nameRecord.id,
                    addresses: nameRecord.addresses,
                    texts: nameRecord.texts,
                    contenthash: nameRecord.contenthash,
                } : null,
                registration: nameRegistration ? {
                    id: nameRegistration.id,
                    price_wei: nameRegistration.price_wei.toString(),
                    tx_hash: nameRegistration.tx_hash,
                    block_number: nameRegistration.block_number.toString(),
                    registrar_contract: nameRegistration.registrar_contract,
                    tx_sender: nameRegistration.tx_sender,
                    block_timestamp: nameRegistration.block_timestamp.toString(),
                    payment_token: nameRegistration.payment_token,
                    is_self_claim: nameRegistration.is_self_claim,
                } : null,
            };
        });
        
        return c.json({
            success: true,
            total: details.length,
            data: details,
        });
    } catch (error) {
        return c.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            },
            500
        );
    }
});

app.use("/", graphql({ db, schema }));
app.use("/graphql", graphql({ db, schema }));

export default app;
