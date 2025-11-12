import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { mainnet } from "viem/chains";
import { useAccount, useEnsAvatar, usePublicClient } from "wagmi";

interface PrimaryNameContextType {
  primaryName: string | null;
  avatar: string | null;
  isLoading: boolean;
  setPrimaryName: (fullName: string) => Promise<void>;
  refreshPrimaryName: () => Promise<void>;
}

const PrimaryNameContext = createContext<PrimaryNameContextType | undefined>(undefined);

const STORAGE_KEY = "celo_primary_name";
const AVATAR_STORAGE_KEY = "celo_primary_avatar";

export function PrimaryNameProvider({ children }: { children: ReactNode }) {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient({chainId: mainnet.id})
  const [primaryName, setPrimaryName] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const {} = useEnsAvatar({ name: "artii.eth "})

  const fetchPrimaryName = async (cache: boolean = true) => {
    if (!address || !isConnected) {
      setPrimaryName(null);
      setAvatar(null);
      return;
    }

    setIsLoading(true);
    try {
      // First check local storage
      const storedPrimaryName = localStorage.getItem(`${STORAGE_KEY}_${address.toLowerCase()}`);
      const storedAvatar = localStorage.getItem(`${AVATAR_STORAGE_KEY}_${address.toLowerCase()}`);
      if (!cache) {
        if (storedPrimaryName) setPrimaryName(storedPrimaryName);
        if (storedAvatar) setAvatar(storedAvatar);
        if (storedPrimaryName || storedAvatar) return;
      }

      const name = await publicClient!.getEnsName({address})
      if (name) {
        setPrimaryNameValue(name)

        // Get avatar text record for the ENS/CNS name
        try {
          const avatarUrl = await publicClient!.getEnsText({ name, key: 'avatar' });
          if (avatarUrl) {
            localStorage.setItem(`${AVATAR_STORAGE_KEY}_${address.toLowerCase()}`, avatarUrl);
            setAvatar(avatarUrl);
          } else {
            localStorage.removeItem(`${AVATAR_STORAGE_KEY}_${address.toLowerCase()}`);
            setAvatar(null);
          }
        } catch (e) {
          console.error('Error fetching avatar text record:', e);
          setAvatar(null);
        }
      } else {
        // No primary name
        setPrimaryName(null);
        setAvatar(null);
        localStorage.removeItem(`${STORAGE_KEY}_${address.toLowerCase()}`);
        localStorage.removeItem(`${AVATAR_STORAGE_KEY}_${address.toLowerCase()}`);
      }
      
    } catch (error) {
      console.error("Error fetching primary name:", error);
      setPrimaryName(null);
      setAvatar(null);
    } finally {
      setIsLoading(false);
    }
  };

  const setPrimaryNameValue = async (fullName: string) => {
    if (!address) {
      throw new Error("Address not available");
    }

    // Store primary name in localStorage (keyed by address)
    localStorage.setItem(`${STORAGE_KEY}_${address.toLowerCase()}`, fullName);
    
    // Update state immediately
    setPrimaryName(fullName);
  };

  const refreshPrimaryName = async () => {
    await fetchPrimaryName();
  };

  useEffect(() => {
    fetchPrimaryName();
  }, [address, isConnected]);

  // Clear primary name when disconnected
  useEffect(() => {
    if (!isConnected) {
      setPrimaryName(null);
      setAvatar(null);
    }
  }, [isConnected]);

  return (
    <PrimaryNameContext.Provider
      value={{
        primaryName,
        avatar,
        isLoading,
        setPrimaryName: setPrimaryNameValue,
        refreshPrimaryName,
      }}
    >
      {children}
    </PrimaryNameContext.Provider>
  );
}

export function usePrimaryName() {
  const context = useContext(PrimaryNameContext);
  if (context === undefined) {
    throw new Error("usePrimaryName must be used within a PrimaryNameProvider");
  }
  return context;
}

