import { createPublicClient, http } from "viem"
import { celo } from "viem/chains";

export class Web3Client {

    private client: ReturnType<typeof createPublicClient>

    constructor() {
        this.client = createPublicClient({
            transport: http(),
            chain: celo
        })
    }

    public async resolve() {
        
    }


}