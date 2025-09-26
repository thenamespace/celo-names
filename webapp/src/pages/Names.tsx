import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { Link } from "react-router-dom";
import { Calendar, ExternalLink, User } from "lucide-react";
import Text from "@components/Text";
import Button from "@components/Button";
import { useCeloIndexer } from "@/hooks/useCeloIndexer";
import type { Name } from "@/types/indexer";
import "./Page.css";
import "./Names.css";

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

  const isExpired = (expiry: string) => {
    const expiryDate = new Date(parseInt(expiry) * 1000);
    return expiryDate < new Date();
  };

  const getRecordCount = (name: Name) => {
    let count = 0;
    if (name.records?.addresses) count += name.records.addresses.length;
    if (name.records?.texts) count += name.records.texts.length;
    if (name.records?.contenthash) count += 1;
    return count;
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
          <div>
            <Text as="h1" size="4xl" weight="semibold" color="black" className="mb-2">
              My Names
            </Text>
            <Text size="lg" weight="normal" color="gray">
              Manage your registered CELO names
            </Text>
          </div>
          <Link to="/register">
            <Button variant="primary">
              <Text size="base" weight="medium" color="black">
                Register New Name
              </Text>
            </Button>
          </Link>
        </div>

        {names.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-content">
              <User size={64} color="#9CA3AF" />
              <Text size="xl" weight="semibold" color="black" className="mt-4 mb-2">
                No registered names
              </Text>
              <Text size="base" weight="normal" color="gray" className="mb-6">
                You haven't registered any CELO names yet. Get started by registering your first name.
              </Text>
              <Link to="/register">
                <Button variant="primary">
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
                    <Text size="lg" weight="semibold" color="black">
                      {name.label}
                    </Text>
                    <Text size="sm" weight="normal" color="gray">
                      {name.full_name}
                    </Text>
                  </div>
                  <div className={`status-badge ${isExpired(name.expiry) ? 'expired' : 'active'}`}>
                    <Text size="xs" weight="medium" color="white">
                      {isExpired(name.expiry) ? 'Expired' : 'Active'}
                    </Text>
                  </div>
                </div>

                <div className="name-card-details">
                  <div className="detail-item">
                    <Calendar size={16} color="#6B7280" />
                    <Text size="sm" weight="normal" color="gray">
                      Expires: {formatExpiry(name.expiry)}
                    </Text>
                  </div>
                  
                  {getRecordCount(name) > 0 && (
                    <div className="detail-item">
                      <User size={16} color="#6B7280" />
                      <Text size="sm" weight="normal" color="gray">
                        {getRecordCount(name)} record{getRecordCount(name) !== 1 ? 's' : ''}
                      </Text>
                    </div>
                  )}
                </div>

                {name.registration?.tx_hash && (
                  <div className="name-card-footer">
                    <a
                      href={`https://celoscan.io/tx/${name.registration.tx_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="tx-link"
                    >
                      <ExternalLink size={16} color="#3B82F6" />
                      <Text size="sm" weight="medium">
                        View Transaction
                      </Text>
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default MyNames;
