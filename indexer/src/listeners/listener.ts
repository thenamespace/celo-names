import { RegistrarListener } from "./registrar.listener";
import { RegistryListener } from "./registry.listener";
import { ResolverListener } from "./resolver.listener";

export class EventListener {
    
    public async start() {
        this.listenOnRegistrarEvents();
        this.listenOnRegistryEvents();
        this.listenOnResolverEvents();
    }

    private async listenOnRegistrarEvents() {
        const registrarListener = new RegistrarListener();
        await registrarListener.listenOnRegistrarEvents();
    }

    private async listenOnRegistryEvents() {
        const registryListener = new RegistryListener();
        await registryListener.listenOnRegistryEvents();
    }

    private async listenOnResolverEvents() {
        const resolverListener = new ResolverListener();
        await resolverListener.listenOnResolverEvents();
    }
}