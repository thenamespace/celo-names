import { ponder } from "ponder:registry";
import { registration } from "ponder:schema";
import { namehash, zeroAddress } from "viem";
import { getEnvironment } from "../env";

const env = getEnvironment();

export class RegistrarListener {
  public async listenOnRegistrarEvents() {
    this.handleNameRegistered();
    this.handleNameClaimed();
  }
  private async handleNameRegistered() {
    ponder.on("Registrar:NameRegistered", async ({ context, event }) => {
      const { price, token, node } = event.args;
      const { number } = event.block;
      const { hash } = event.transaction;

      await context.db.insert(registration).values({
        id: node,
        price_wei: price,
        tx_hash: hash,
        block_number: number,
        registrar_contract: event.transaction.to as any,
        tx_sender: event.transaction.from,
        block_timestamp: event.block.timestamp,
        payment_token: token,
        is_self_claim: false,
      });
    });
  }

  private async handleNameClaimed() {
    ponder.on("SelfRegistrar:NameClaimed", async ({ context, event }) => {
      const { node } = event.args;
      const { number } = event.block;
      const { hash } = event.transaction;

      await context.db.insert(registration).values({
        id: node,
        price_wei: 0n,
        tx_hash: hash,
        block_number: number,
        registrar_contract: event.transaction.to as any,
        tx_sender: event.transaction.from,
        block_timestamp: event.block.timestamp,
        payment_token: zeroAddress,
        is_self_claim: true,
      });
    });
  }
}
