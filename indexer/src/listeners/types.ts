export interface EnsTextRecord {
    key: string
    value: string
}

export interface EnsAddressRecord {
    coin: number
    value: string
    name?: string
}

export interface EnsContenthash {
    codec: string
    decoded: string
    encoded: string
}
