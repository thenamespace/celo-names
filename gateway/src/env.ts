import { zeroAddress, type Address } from "viem"

export interface Env {
    rpc_url?: string
    signer_wallet_key: string
    l2_resolver: Address
}

export const getEnvironment = (): Env => {
    return {
        rpc_url: "",
        signer_wallet_key: "0x0",
        l2_resolver: zeroAddress
    }
}