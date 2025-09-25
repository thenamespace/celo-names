export interface IndexerEnv {
    root_name: string
    rpc_url?: string
    app_port: number
}

export const getEnvironment = (): IndexerEnv => {
    const root_name = process.env.ROOT_NAME;
    const rpc_url = process.env.RPC_URL;
    const app_port = Number(process.env.APP_PORT || 3000);

    if (!root_name) {
        throw new Error("ROOT_NAME is required");
    }
    return {
        root_name,
        rpc_url: rpc_url,
        app_port: app_port
    }
}