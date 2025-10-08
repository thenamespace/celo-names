import { useEffect, useState } from "react";
import { useAccount, useDisconnect, usePublicClient } from "wagmi";
import { ChevronDown } from "lucide-react";
import Text from "@components/Text";
import "./ConnectedWallet.css";
import { mainnet } from "viem/chains";

export default function ConnectedWallet() {
  const { address } = useAccount();
  const { disconnect } = useDisconnect();
  const publicClient = usePublicClient({ chainId: mainnet.id });
  const [ensName, setEnsName] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const fetchEnsData = async () => {
      if (!address || !publicClient) return;
      
      try {
        // Get ENS name for the address
        const name = await publicClient.getEnsName({ address });
        
        if (name) {
          setEnsName(name);
          
          // Get avatar text record for the ENS name
          const avatarUrl = await publicClient.getEnsText({
            name,
            key: 'avatar'
          });
          
          if (avatarUrl) {
            setAvatar(avatarUrl);
          }
        }
      } catch (error) {
        console.error('Error fetching ENS data:', error);
      }
    };

    fetchEnsData();
  }, [address, publicClient]);

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const displayName = ensName || (address ? truncateAddress(address) : "");

  return (
    <div className="connected-wallet">
      <button 
        className="wallet-button" 
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="wallet-avatar">
          {avatar ? (
            <img src={avatar} alt="Avatar" className="avatar-image" />
          ) : (
            <div className="avatar-placeholder">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <Text size="base" weight="medium" color="black">
          {displayName}
        </Text>
        <ChevronDown 
          size={16} 
          className={`chevron ${isOpen ? 'open' : ''}`}
        />
      </button>
      
      {isOpen && (
        <>
          <div className="wallet-overlay" onClick={() => setIsOpen(false)} />
          <div className="wallet-dropdown">
            <button 
              className="dropdown-item disconnect"
              onClick={() => {
                disconnect();
                setIsOpen(false);
              }}
            >
              <Text weight="medium" color="black">
                Disconnect
              </Text>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

