import { useState } from "react";
import { useAccount, useDisconnect } from "wagmi";
import { ChevronDown } from "lucide-react";
import Text from "@components/Text";
import { truncateAddress } from "@/utils";
import "./ConnectedWallet.css";
import { usePrimaryName } from "@/contexts/PrimaryNameContext";

export default function ConnectedWallet() {
  const { address } = useAccount();
  const { disconnect } = useDisconnect();
  const { primaryName, avatar } = usePrimaryName();
  const [isOpen, setIsOpen] = useState(false);

  const displayName = primaryName || (address ? truncateAddress(address) : "");

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

