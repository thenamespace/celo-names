export interface IndexerEnv {
    root_name: string
    rpc_url?: string
    app_port: number
    db_connection_string?: string
    db_type: "pglite" | "postgres"
}

export const getEnvironment = (): IndexerEnv => {
    const root_name = process.env.ROOT_NAME;
    const rpc_url = process.env.RPC_URL;
    const app_port = Number(process.env.APP_PORT || 3000);
    const db_type = process.env.DB_TYPE || "pglite";
    const db_conn_string = process.env.DB_CONNECTION_STRING

    if (!root_name) {
        throw new Error("ROOT_NAME is required");
    }


    return {
        root_name,
        rpc_url: rpc_url,
        app_port: app_port,
        db_type: db_type as "postgres" | "pglite",
        db_connection_string: db_conn_string
    }
}