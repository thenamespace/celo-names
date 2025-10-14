import { getCoderByCoinType } from "@ensdomains/address-encoder";
import { ponder } from "ponder:registry";
import { record } from "ponder:schema";
import { Hash, toBytes } from "viem";
import { decode, encode, getCodec } from "@ensdomains/content-hash";
import { EnsAddressRecord, EnsTextRecord, EnsContenthash } from "./types";

const ETH_COIN = 60;
const ETH_NAME = "eth";
const UNKNOWN = "unkown";

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
        const texts = (existingRecord.texts || []) as EnsTextRecord[];
        const updatedTexts = texts.filter((t: EnsTextRecord) => t.key !== key);
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
          addresses: [{ coin: ETH_COIN, value: a, name: ETH_NAME }], // 60 = ETH
        });
      } else {
        const addresses = (existingRecord.addresses ||
          []) as EnsAddressRecord[];
        const updatedAddresses = addresses.filter(
          (addr: EnsAddressRecord) => addr.coin !== ETH_COIN
        );
        updatedAddresses.push({ coin: ETH_COIN, value: a, name: ETH_NAME });

        await db
          .update(record, { id: node })
          .set({ addresses: updatedAddresses });
      }
    });
  }

  private async handleAddressChanged() {
    ponder.on("Resolver:AddressChanged", async ({ context, event }) => {
      const { node, coinType, newAddress } = event.args;
      const { db } = context;

      const existingRecord = await db.find(record, { id: node });

      const coin_type = Number(coinType);
      const parsed_addr = this.parseAddress(newAddress, coin_type);

      if (!existingRecord?.id) {
        await context.db.insert(record).values({
          id: node,
          addresses: [
            {
              coin: coin_type,
              value: parsed_addr.value,
              name: parsed_addr.name,
            },
          ],
        });
      } else {
        const addresses = (existingRecord.addresses || []) as EnsAddressRecord[];
        const updatedAddresses = addresses.filter(
          (addr: EnsAddressRecord) => addr.coin !== coin_type
        );
        updatedAddresses.push({
          coin: coin_type,
          value: parsed_addr.value,
          name: parsed_addr.name,
        });

        await db
          .update(record, { id: node })
          .set({ addresses: updatedAddresses });
      }
    });
  }

  private async handleContenthashChanged() {
    ponder.on("Resolver:ContenthashChanged", async ({ context, event }) => {
      const { node, hash } = event.args;
      const { db } = context;

      const existingRecord = await db.find(record, { id: node });
      const parsed_contenthash = this.parseContenthash(hash);

      if (!existingRecord?.id) {
        await context.db.insert(record).values({
          id: node,
          contenthash: parsed_contenthash,
        });
      } else {
        await db.update(record, { id: node }).set({ contenthash: parsed_contenthash });
      }
    });
  }

  private parseAddress(
    value: any,
    coinType: number
  ): { value: string; name: string } {
    try {
      const addrCoder = getCoderByCoinType(coinType);
      if (!addrCoder) {
        console.log(`No address coder found for coin type: ${coinType}`);
        return { value: value, name: UNKNOWN };
      }

      const encoded = addrCoder.encode(toBytes(value));
      return { value: encoded, name: addrCoder.name };
    } catch (err) {
      console.log(`Error decoding address: ${err}`);
      return { value: value, name: UNKNOWN };
    }
  }

  private parseContenthash(value: Hash): EnsContenthash {
    let codec = "" as any;
    try {
      codec = getCodec(value);
      if (codec) {
        const decodedValue = decode(value);
        return { codec: codec, decoded: decodedValue, encoded: value };
      }
    } catch (err) {
      console.error(`Failed to encode contenthash value: ${value}, codec: ${codec}`);
    }

    return { codec: UNKNOWN, decoded: value, encoded: ""}
  }
}
