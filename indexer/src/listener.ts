import { ponder } from "ponder:registry";
import { names, records } from "ponder:schema";
import { RegistryHandler } from "./handlers/registry";
import { RegistrarHandler } from "./handlers/registrar";
import { ResolverHandler } from "./handlers/resolver";

export class Listener {
  constructor(
    private readonly registryHandler: RegistryHandler,
    private readonly registrarHandler: RegistrarHandler,
    private readonly resolverHandler: ResolverHandler
  ) {}

  public listenOrResolverEvent() {
    ponder.on("Resolver:AddrChanged", () => {});

    ponder.on("Resolver:AddressChanged", async () => {});

    ponder.on("Resolver:TextChanged", async () => {});

    ponder.on("Resolver:ContenthashChanged", async () => {});
  }

  public listenOnRegistryEvents() {
    ponder.on("Registry:NewName", async ({event, context}) => {});

    ponder.on("Registry:ExpiryUpdated", async () => {});

    ponder.on("Registry:NameRevoked", async () => {});
  }

  public listenOnRegistrarEvents() {
    ponder.on("Registrar:NameRegistered", async () => {});
  }
}
