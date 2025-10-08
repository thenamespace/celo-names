import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { Link } from "react-router-dom";
import { Clock, ExternalLink } from "lucide-react";
import Text from "@components/Text";
import Button from "@components/Button";
import CeloSpinner from "@components/CeloSpinner";
import { useCeloIndexer } from "@/hooks/useCeloIndexer";
import type { Name } from "@/types/indexer";
import "./Page.css";
import "./MyNames.css";
import { useConnectModal } from "@rainbow-me/rainbowkit";

function MyNames() {
  const { address, isConnected } = useAccount();
  const { getOwnerNames, loading, error } = useCeloIndexer();
  const [names, setNames] = useState<Name[]>([]);
  const { openConnectModal  } = useConnectModal();

  useEffect(() => {
    if (address && isConnected) {
      fetchNames();
    }
  }, [address, isConnected]);

  const fetchNames = async () => {
    if (!address) return;
    
    const ownerNames = await getOwnerNames(address);
    setNames(ownerNames);
  };

  const formatExpiry = (expiry: string) => {
    const expiryDate = new Date(parseInt(expiry) * 1000);
    const now = new Date();
    const daysUntilExpiry = Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) {
      return { date: expiryDate.toLocaleDateString(), status: 'expired' };
    } else if (daysUntilExpiry < 30) {
      return { date: expiryDate.toLocaleDateString(), status: 'expiring-soon' };
    }
    return { date: expiryDate.toLocaleDateString(), status: 'active' };
  };

  const getAvatar = (name: Name) => {
    return name.records?.texts?.find(text => text.key === 'avatar')?.value;
  };

  if (!isConnected) {
    return (
      <div className="page">
        <div className="page-content">
          <div className="connect-prompt">

            <Text as="h1" size="4xl" weight="semibold" color="black" className="mb-2">
              My Names
            </Text>
            <Text size="lg" weight="normal" color="gray" className="mb-6">
              Connect your wallet to view and manage your CELO names
            </Text>
            <Button onClick={() => openConnectModal?.()} variant="primary" className="mt-3">
                <Text size="base" weight="medium" color="black">
                  Connect Wallet
                </Text>
              </Button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page">
        <div className="page-content">
          <div className="loading-container">
            <CeloSpinner size={48} />
            <Text size="xl" weight="medium" color="gray" className="mt-4">
              Loading your names...
            </Text>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="page-content">
          <div className="error-container">
            <Text size="xl" weight="semibold" color="black" className="mb-2">
              Something went wrong
            </Text>
            <Text size="base" weight="normal" color="gray" className="mb-6">
              {error}
            </Text>
            <Button variant="secondary" onClick={fetchNames}>
              <Text size="base" weight="medium" color="black">
                Try Again
              </Text>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-content my-names-page">
        <div className="page-header">
          <Text as="h1" size="4xl" weight="semibold" color="black" className="mb-2">
            My Names
          </Text>
          <Text size="lg" weight="normal" color="gray">
            {names.length === 0 
              ? "No registered names yet" 
              : `${names.length} registered ${names.length === 1 ? 'name' : 'names'}`
            }
          </Text>
        </div>

        {names.length === 0 ? (
          <div className="empty-state">
            <Text size="2xl" weight="semibold" color="black" className="mb-2">
              No names yet
            </Text>
            <Text size="base" weight="normal" color="gray" className="mb-6">
              Start your CELO identity journey by registering your first name
            </Text>
            <Link to="/register">
              <Button variant="primary" className="cta-button">
                <Text size="base" weight="medium" color="black">
                  Register Your First Name
                </Text>
              </Button>
            </Link>
          </div>
        ) : (
          <div className="names-list">
            {names.map((name, index) => {
              const expiry = formatExpiry(name.expiry);
              const avatar = getAvatar(name);

              return (
                <div 
                  key={name.id} 
                  className="name-card"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="name-card-content">
                    <div className="name-main">
                      <div className="name-avatar">
                        {avatar ? (
                          <img src={avatar} alt={name.full_name} className="avatar-img" />
                        ) : (
                          <div className="avatar-placeholder">
                            {name.full_name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      
                      <div className="name-info">
                        <div className="name-title-row">
                          <Text size="xl" weight="semibold" color="black">
                            {name.full_name}
                          </Text>
                          <a
                            href={`https://app.ens.domains/${name.full_name}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="external-link"
                            title="View on ENS"
                          >
                            <ExternalLink size={18} />
                          </a>
                        </div>

                        <div className="name-meta">
                          <div className={`meta-item expiry-${expiry.status}`}>
                            <Clock size={14} />
                            <Text weight="normal" color="gray">
                              Expires {expiry.date}
                            </Text>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default MyNames;

