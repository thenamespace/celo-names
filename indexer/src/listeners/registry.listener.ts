import { ponder } from "ponder:registry";
import { name } from "ponder:schema";
import { getEnvironment } from "../env";
import { zeroAddress } from "viem";
import {CONTRACTS} from "../contracts";;

const env = getEnvironment();

export class RegistryListener {
  public async listenOnRegistryEvents() {
    this.handleNewName();
    this.handleExpiryExtended();
    this.handleNameRevoked();
    this.handleNameTransfered();
  }

  private async handleNewName() {
    ponder.on("Registry:NewName", async ({ context, event }) => {
      const { node, label, expiry, owner } = event.args;
      const { timestamp } = event.block;
      const { db } = context;

      const existingName = await db.find(name, {
        id: node,
      });

      const full_name = `${label}.${env.root_name}`;
      if (!existingName?.id) {
        await context.db.insert(name).values({
          id: node,
          label,
          expiry: expiry,
          owner,
          full_name: full_name,
          created_at: timestamp
        });
      } else {
        await db.update(name, { id: node }).set(() => ({
          owner: owner,
          expiry: expiry,
        }));
      }
    });
  }

  private async handleExpiryExtended() {
    ponder.on("Registry:ExpiryUpdated", async ({ context, event }) => {
      const { node, expiry } = event.args;
      const { db } = context;

      const existingName = await db.find(name, {
        id: node,
      });

      if (!existingName?.id) {
        console.warn("Cannot set expiry for name that doesn't exist");
      } else {
        await db.update(name, { id: node }).set({ expiry: expiry });
      }
    });
  }

  private async handleNameRevoked() {
     ponder.on("Registry:NameRevoked", async ({ context, event }) => {
      const { node } = event.args;
      const { db } = context;

      await db.delete(name, { id: node })
    });
  }

  private async handleNameTransfered() {
     ponder.on("Registry:NewOwner", async ({ context, event }) => {
      const { node, newOwner } = event.args;
      const { db } = context;

      const internalOwners = [zeroAddress, CONTRACTS.L2_REGISTRAR, CONTRACTS.L2_SELF_REGISTRAR];
      const isInternalOwner = internalOwners
          .find(o => o.toLocaleLowerCase() === newOwner.toLocaleLowerCase());

      if (isInternalOwner) {
        return;
      }

      try {
          await db.update(name, { id: node }).set({ owner: newOwner });
      } catch(err) {
        console.error("Failed to handle NewOwner event", err);
      } 
    });
  }

}
