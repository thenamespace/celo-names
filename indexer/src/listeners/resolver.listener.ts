import { getCoderByCoinType } from "@ensdomains/address-encoder";
import { ponder } from "ponder:registry";
import { record } from "ponder:schema";

export class ResolverListener {
    public async listenOnResolverEvents() {
        this.handleTextChanged();
        this.handleAddrChanged();
        this.handleAddressChanged();
        this.handleContenthashChanged();
    }

    private async handleTextChanged() {
        ponder.on("Resolver:TextChanged", async ({ context, event }) => {
            const { node, key, value } = event.args;
            const { db } = context;

            const existingRecord = await db.find(record, { id: node });

            if (!existingRecord?.id) {
                await context.db.insert(record).values({
                    id: node,
                    texts: [{ key, value }],
                });
            } else {
                const texts = (existingRecord.texts || []) as any[];
                const updatedTexts = texts.filter((t: any) => t.key !== key);
                updatedTexts.push({ key, value });

                await db.update(record, { id: node }).set({ texts: updatedTexts });
            }
        });
    }

    private async handleAddrChanged() {
        ponder.on("Resolver:AddrChanged", async ({ context, event }) => {
            const { node, a } = event.args;
            const { db } = context;

            const existingRecord = await db.find(record, { id: node });

            if (!existingRecord?.id) {
                await context.db.insert(record).values({
                    id: node,
                    addresses: [{ coin: 60, value: a }], // 60 = ETH
                });
            } else {
                const addresses = (existingRecord.addresses || []) as any[];
                const updatedAddresses = addresses.filter((addr: any) => addr.coin !== 60);
                updatedAddresses.push({ coin: 60, value: a });

                await db.update(record, { id: node }).set({ addresses: updatedAddresses });
            }
        });
    }

    private async handleAddressChanged() {
        ponder.on("Resolver:AddressChanged", async ({ context, event }) => {
            const { node, coinType, newAddress } = event.args;
            const { db } = context;

            const existingRecord = await db.find(record, { id: node });

            const coin_type = Number(coinType);
            if (!existingRecord?.id) {
                await context.db.insert(record).values({
                    id: node,
                    addresses: [{ coin: coin_type, value: this.parseAddress(newAddress, coin_type) }],
                });
            } else {
                const addresses = (existingRecord.addresses || []) as any[];
                const updatedAddresses = addresses.filter((addr: any) => addr.coin !== coin_type);
                updatedAddresses.push({ coin: coin_type, value: this.parseAddress(newAddress, coin_type) });

                await db.update(record, { id: node }).set({ addresses: updatedAddresses });
            }
        });
    }

    private async handleContenthashChanged() {
        ponder.on("Resolver:ContenthashChanged", async ({ context, event }) => {
            const { node, hash } = event.args;
            const { db } = context;

            const existingRecord = await db.find(record, { id: node });

            if (!existingRecord?.id) {
                await context.db.insert(record).values({
                    id: node,
                    contenthash: hash,
                });
            } else {
                await db.update(record, { id: node }).set({ contenthash: hash });
            }
        });
    }

    private parseAddress(value: any, coinType: number): string {
        try {
             const addrCoder = getCoderByCoinType(coinType);
        if (!addrCoder) {
            console.log(`No address coder found for coin type: ${coinType}`);
            return value;
        }
            return addrCoder.encode(value);
        } catch (err) {
            console.log(`Error decoding address: ${err}`);
            return value;
        }
    }
}