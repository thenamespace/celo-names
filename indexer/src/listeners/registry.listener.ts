import { ponder } from "ponder:registry";
import { name, record } from "ponder:schema";
import { getEnvironment } from "../env";

const env = getEnvironment();

export class RegistryListener {
  public async listenOnRegistryEvents() {
    this.handleNewName();
    this.handleExpiryExtended();
    this.handleNameRevoked();
  }

  private async handleNewName() {
    ponder.on("Registry:NewName", async ({ context, event }) => {
      const { node, label, expiry, owner } = event.args;
      const { db } = context;

      const existingName = await db.find(name, {
        id: node,
      });

      const full_name = `${label}.${env.root_name}`;
      console.log(`New subname received: ${full_name}`);
      if (!existingName?.id) {
        await context.db.insert(name).values({
          id: node,
          label,
          expiry: expiry,
          owner,
          full_name: full_name,
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
        console.log("Cannot set expiry for name that doesn't exist");
      } else {
        await db.update(name, { id: node }).set({ expiry });
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
}
