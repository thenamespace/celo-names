import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { Link } from "react-router-dom";
import { Clock, User } from "lucide-react";
import Text from "@components/Text";
import Button from "@components/Button";
import { useCeloIndexer } from "@/hooks/useCeloIndexer";
import type { Name } from "@/types/indexer";
import "./Page.css";
import "./MyNames.css";

function MyNames() {
  const { address, isConnected } = useAccount();
  const { getOwnerNames, loading, error } = useCeloIndexer();
  const [names, setNames] = useState<Name[]>([]);

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
    return expiryDate.toLocaleDateString();
  };

 
  const getShortenedAddress = (name: Name) => {
    const ethAddress = name.records?.addresses?.find(addr => addr.coin === 60)?.value;
    if (ethAddress) {
      return `${ethAddress.slice(0, 6)}.${ethAddress.slice(-6)}`;
    }
    return null;
  };

  if (!isConnected) {
    return (
      <div className="page">
        <div className="page-content">
          <Text as="h1" size="4xl" weight="semibold" color="black" className="mb-2">
            My Names
          </Text>
          <Text size="lg" weight="normal" color="gray" className="mb-4">
            Connect your wallet to view your registered CELO names
          </Text>
          <Button variant="primary" onClick={() => window.location.href = '/register'}>
            <Text size="base" weight="medium" color="black">
              Connect Wallet
            </Text>
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page">
        <div className="page-content">
          <Text as="h1" size="4xl" weight="semibold" color="black" className="mb-2">
            My Names
          </Text>
          <div className="loading-state">
            <div className="spinner"></div>
            <Text size="lg" weight="medium" color="gray" className="mt-2">
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
          <Text as="h1" size="4xl" weight="semibold" color="black" className="mb-2">
            My Names
          </Text>
          <div className="error-state">
            <Text size="lg" weight="medium" color="red" className="mb-4">
              Error loading names: {error}
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
      <div className="page-content">
        <div className="names-header">
          <div className="header-content">
            <Text as="h1" size="4xl" weight="semibold" color="black" className="mb-2">
              My Names
            </Text>
            <Text size="lg" weight="normal" color="gray">
              Your registered CELO names ({names.length})
            </Text>
          </div>
        </div>

        {names.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-content">
              <Text size="xl" weight="semibold" color="black" className="mt-4 mb-2">
                No registered names
              </Text>
              <Text size="base" weight="normal" color="gray" className="mb-6">
                You haven't registered any CELO names yet. Get started by registering your first name.
              </Text>
              <Link to="/">
                <Button variant="primary" className="mt-3">
                  <Text size="base" weight="medium" color="black">
                    Register
                  </Text>
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="names-grid">
            {names.map((name) => (
              <div key={name.id} className="name-card">
                <div className="name-card-header">
                  <div className="name-info">
                    <div className="name-with-avatar">
                      <div className="avatar-circle">
                        {name.records?.texts?.find(text => text.key === 'avatar')?.value ? (
                          <img 
                            src={name.records.texts.find(text => text.key === 'avatar')?.value} 
                            alt="Avatar" 
                            className="avatar-image"
                          />
                        ) : (
                          <div className="default-avatar"></div>
                        )}
                      </div>
                      <div className="name-details">
                        <a 
                          href={`https://app.ens.domains/${name.full_name}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="name-link"
                        >
                          <Text size="xl" weight="semibold" color="black">
                            {name.full_name}
                          </Text>
                        </a>
                        <div className="expiry-with-icon">
                          <Clock size={16} color="#6B7280" />
                          <Text size="base" weight="normal" color="gray">
                            {formatExpiry(name.expiry)}
                          </Text>
                        </div>
                        {name.registration?.price_wei && (
                          <div className="price-with-icon">
                            <img src="/celo-logo.svg" alt="CELO" className="celo-icon" />
                            <Text size="sm" weight="medium" color="black">
                              {(parseInt(name.registration.price_wei) / 1e18).toFixed(3)} CELO
                            </Text>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="name-card-details">
                  {getShortenedAddress(name) && (
                    <div className="detail-item">
                      <User size={16} color="#6B7280" />
                      <Text size="sm" weight="normal" color="gray">
                        {getShortenedAddress(name)}
                      </Text>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default MyNames;
