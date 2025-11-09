import { CONTRACT_ADDRESSES, L2_CHAIN_ID } from "@/constants";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { ABIS } from "@/constants";
import { deepCopy, type EnsRecords } from "@thenamespace/ens-components";
import { convertToResolverData } from "@/utils";
import { zeroAddress, type Address, type Hash } from "viem";
import { ENV } from "@/constants/environment";

export interface ERC20Permit {
  value: bigint;
  deadline: bigint;
  v: number;
  r: Hash;
  s: Hash;
}

export interface ERC20Register {
  label: string;
  durationInYears: number;
  owner: string;
  records: EnsRecords;
  currency: Address;
  permit: ERC20Permit;
}

const DEFAULT_CELO_AVATAR = "https://avtr.cc/celo/avatar.png";
const DEFAULT_CELO_HEADER = "https://avtr.cc/celo/header.png";

export const useRegistrar = () => {
  const publicClient = usePublicClient({ chainId: L2_CHAIN_ID });
  const { data: walletClient } = useWalletClient({ chainId: L2_CHAIN_ID });
  const { address } = useAccount();

  const isNameAvailable = async (label: string): Promise<boolean> => {
    const available = await publicClient!.readContract({
      address: CONTRACT_ADDRESSES.L2_REGISTRAR,
      abi: ABIS.L2_REGISTRAR,
      functionName: "available",
      args: [label],
    });
    return available as boolean;
  };

  const rentPrice = async (
    label: string,
    durationInYears: number,
    tokenCurrency: Address = zeroAddress
  ): Promise<bigint> => {
    const price = await publicClient!.readContract({
      address: CONTRACT_ADDRESSES.L2_REGISTRAR,
      abi: ABIS.L2_REGISTRAR_V2,
      functionName: "rentPrice",
      args: [label, durationInYears, tokenCurrency],
      account: address,
    });

    return price as bigint;
  };

  const claimWithSelf = async (
    label: string,
    owner: Address,
    records: EnsRecords
  ): Promise<Hash> => {
    const full_name = `${label}.${ENV.PARENT_NAME}`;

    let _records = records;
    if (ENV.SET_DEFAULT_IMAGE_RECORDS) {
      _records = getRecordsWithDefaultImageRecords(records);
    }

    const { request } = await publicClient!.simulateContract({
      address: CONTRACT_ADDRESSES.L2_SELF_REGISTRAR,
      abi: ABIS.L2_SELF_REGISTRAR_ABI,
      args: [label, owner, convertToResolverData(full_name, _records)],
      account: address!,
      functionName: "claim",
    });

    return await walletClient!.writeContract(request);
  };

  const getRecordsWithDefaultImageRecords = (originalRecords: EnsRecords) => {
    const hasAvatarRecord = originalRecords?.texts.find(
      (txt) => txt.key === "avatar"
    );
    const hasHeaderRecord = originalRecords?.texts.find(
      (txt) => txt.key === "Header"
    );

    // if user sets these records, we wont use defaults
    if (
      hasAvatarRecord ||
      hasHeaderRecord ||
      originalRecords.texts?.length === 0
    ) {
      return originalRecords;
    }

    const recordsCopy = deepCopy(originalRecords) as EnsRecords;

    if (!hasAvatarRecord) {
      recordsCopy.texts.push({ key: "avatar", value: DEFAULT_CELO_AVATAR });
    }

    if (!hasHeaderRecord) {
      recordsCopy.texts.push({ key: "header", value: DEFAULT_CELO_HEADER });
    }

    return recordsCopy;
  };

  const registerERC20 = async (
    label: string,
    durationInYears: number,
    owner: string,
    records: EnsRecords,
    permit: ERC20Permit,
    tokenCurrency: Address
  ) => {
    if (tokenCurrency === zeroAddress) {
      throw Error("Permit not required for native transfers");
    }

    let _records = records;
    if (ENV.SET_DEFAULT_IMAGE_RECORDS) {
      _records = getRecordsWithDefaultImageRecords(records);
    }

    const resolverData = convertToResolverData(
      `${label}.${ENV.PARENT_NAME}`,
      _records
    );

    const { request } = await publicClient!.simulateContract({
      address: CONTRACT_ADDRESSES.L2_REGISTRAR,
      abi: ABIS.L2_REGISTRAR_V2,
      functionName: "registerERC20",
      args: [
        label,
        durationInYears,
        owner,
        resolverData,
        tokenCurrency,
        permit,
      ],
      account: address,
    });

    return await walletClient!.writeContract(request);
  };

  const isSelfVerified = async (user: Address): Promise<boolean> => {
    return publicClient!.readContract({
      functionName: "isVerified",
      abi: ABIS.REGISTRAR_STORAGE_ABI,
      args: [user],
      address: CONTRACT_ADDRESSES.REGISTRAR_STORAGE,
    }) as Promise<boolean>;
  };

  const register = async (
    label: string,
    durationInYears: number,
    owner: string,
    records: EnsRecords = { texts: [], addresses: [] }
  ) => {
    const price = await rentPrice(label, durationInYears);
    let _records = records;
    if (ENV.SET_DEFAULT_IMAGE_RECORDS) {
      _records = getRecordsWithDefaultImageRecords(records);
    }

    const resolverData = convertToResolverData(
      `${label}.${ENV.PARENT_NAME}`,
      _records
    );

    const { request } = await publicClient!.simulateContract({
      address: CONTRACT_ADDRESSES.L2_REGISTRAR,
      abi: ABIS.L2_REGISTRAR_V2,
      functionName: "register",
      args: [label, durationInYears, owner, resolverData],
      value: price,
      account: address,
    });

    return await walletClient!.writeContract(request);
  };

  const renew = async (label: string, durationInYears: number) => {
    const price = await rentPrice(label, durationInYears);

    const { request } = await publicClient!.simulateContract({
      address: CONTRACT_ADDRESSES.L2_REGISTRAR,
      abi: ABIS.L2_REGISTRAR_V2,
      functionName: "renew",
      args: [label, durationInYears],
      value: price,
      account: address,
    });

    return await walletClient!.writeContract(request);
  };

  const getSelfClaimCount = async (claimer: Address): Promise<BigInt> => {
    return (await publicClient!.readContract({
      address: CONTRACT_ADDRESSES.REGISTRAR_STORAGE,
      abi: ABIS.REGISTRAR_STORAGE_ABI,
      functionName: "claimCount",
      args: [claimer],
    })) as BigInt;
  };

  const renewERC20 = async (
    label: string,
    durationInYears: number,
    paymentToken: Address,
    permit: ERC20Permit
  ) => {
    const { request } = await publicClient!.simulateContract({
      address: CONTRACT_ADDRESSES.L2_REGISTRAR,
      abi: ABIS.L2_REGISTRAR_V2,
      functionName: "renewERC20",
      args: [label, durationInYears, paymentToken, permit],
      account: address,
    });

    return await walletClient!.writeContract(request);
  };

  return {
    isNameAvailable,
    register,
    rentPrice,
    registerERC20,
    registrarAddress: CONTRACT_ADDRESSES.L2_REGISTRAR,
    claimWithSelf,
    isSelfVerified,
    renew,
    renewERC20,
    getSelfClaimCount,
  };
};
