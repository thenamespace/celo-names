import { getCoderByCoinType } from "@ensdomains/address-encoder";
import { encode } from "@ensdomains/content-hash";
import type { EnsRecords } from "@thenamespace/ens-components";
import { encodeFunctionData, namehash, parseAbi, toHex, type Hash } from "viem";

export const SET_TEXT_FUNC =
  "function setText(bytes32 node, string key, string value)";
export const SET_ADDRESS_FUNC =
  "function setAddr(bytes32 node, uint256 coin, bytes value)";
export const SET_CONTENTHASH_FUNC =
  "function setContenthash(bytes32 node, bytes value)";
export const MULTICALL = "function multicall(bytes[] data)";

export const ENS_RESOLVER_ABI = parseAbi([
  SET_TEXT_FUNC,
  SET_ADDRESS_FUNC,
  SET_CONTENTHASH_FUNC,
  MULTICALL,
]);

export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

export const truncateAddress = (address: string): string => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const convertToResolverData = (
  full_name: string,
  records: EnsRecords
): Hash[] => {
  const node = namehash(full_name);
  const resolverMulticallData: Hash[] = [];

  records.texts
    .filter((text) => text.value.length > 0)
    .forEach((text) => {
      const data = encodeFunctionData({
        functionName: "setText",
        abi: parseAbi([SET_TEXT_FUNC]),
        args: [node, text.key, text.value],
      });
      resolverMulticallData.push(data);
    });

  records.addresses.forEach((addr) => {
    const coinEncoder = getCoderByCoinType(addr.coinType);
    if (!coinEncoder) {
      throw Error(
        `Coin type is not supported: ${addr.coinType}. Cannot get an encoder`
      );
    }
    const decode = coinEncoder.decode(addr.value);
    const hexValue = toHex(decode);
    const data = encodeFunctionData({
      functionName: "setAddr",
      abi: parseAbi([SET_ADDRESS_FUNC]),
      args: [node, BigInt(addr.coinType), hexValue],
    });
    resolverMulticallData.push(data);
  });

  if (records.contenthash !== undefined) {
    const { protocol, value } = records.contenthash;
    const encodedValue = `0x${encode(protocol, value)}`;

    const data = encodeFunctionData({
      functionName: "setContenthash",
      abi: parseAbi([SET_CONTENTHASH_FUNC]),
      args: [node, encodedValue as `0x${string}`],
    });
    resolverMulticallData.push(data);
  }

  return resolverMulticallData;
};
