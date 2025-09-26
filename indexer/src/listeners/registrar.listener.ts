import { ponder } from "ponder:registry";
import { registration } from "ponder:schema";
import { namehash } from "viem";
import { getEnvironment } from "../env";

const env = getEnvironment();

export class RegistrarListener {
 
    public async listenOnRegistrarEvents() {
        ponder.on("Registrar:NameRegistered", async ({context, event}) => {
            // Put node here, not parent node
            // TODO change event type, we don't need this for now
            const { price, label } = event.args;
            const { number } = event.block
            const { hash } = event.transaction;
            const node = namehash(`${label}.${env.root_name}`);

            await context.db.insert(registration).values({
                id: node,
                price_wei: price,
                tx_hash: hash,
                block_number: number,
                registrar_contract: event.transaction.to as any,
                tx_sender: event.transaction.from,
                block_timestamp: event.block.timestamp,
            })
        })
    }
}