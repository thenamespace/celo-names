import type { Address, Hash } from "viem"

export interface CCIPReadRequest {
    sender: Address
    data: Hash
}