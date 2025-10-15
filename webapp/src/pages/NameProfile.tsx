import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Calendar, User } from "lucide-react";
import Text from "@components/Text";
import Button from "@components/Button";
import { useCeloIndexer } from "@/hooks/useCeloIndexer";
import type { Name } from "@/types/indexer";
import { ENV } from "@/constants/environment";
import { truncateAddress } from "@/utils";
import { RecordsTab } from "@/components/name-profile/RecordsTab";
import { AddressesTab } from "@/components/name-profile/AddressesTab";
import { OwnershipTab } from "@/components/name-profile/OwnershipTab";
import ExtendModal from "@/components/ExtendModal";
import UpdateRecordsModal from "@/components/UpdateRecordsModal";
import "./Page.css";
import "./NameProfile.css";
import {
  deepCopy,
  equalsIgnoreCase,
  type EnsAddressRecord,
  type EnsContenthashRecord,
  type EnsRecords,
  type EnsTextRecord,
} from "@thenamespace/ens-components";
import { useAccount } from "wagmi";
import { zeroAddress } from "viem";

type TabType = "records" | "addresses" | "ownership";

const toEnsRecords = (data: Name) => {
  const texts: EnsTextRecord[] = [];
  const addrs: EnsAddressRecord[] = [];
  let contenthash: EnsContenthashRecord | null = null;

  if (data.records) {
    data.records.texts?.forEach((txt) => {
      texts.push(txt);
    });
    data.records.addresses?.forEach((addr) => {
      addrs.push({ coinType: addr.coin, value: addr.value });
    });

    if (data.records.contenthash) {
      contenthash = {
        protocol: data.records.contenthash.codec as any,
        value: data.records.contenthash.decoded,
      };
    }
  }
  return {
    texts,
    addresses: addrs,
    contenthash: contenthash || undefined,
  };
};

function NameProfile() {
  const { address } = useAccount();
  const { name } = useParams<{ name: string }>();
  const { getNameById, loading, error } = useCeloIndexer();
  const [nameData, setNameData] = useState<Name | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("records");
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [showRecordModal, setShowRecordModal] = useState(false);

  const [initialRecords, setInitialRecords] = useState<EnsRecords>({
    texts: [],
    addresses:[]
  })
  const [ensRecords, setEnsRecords] = useState<EnsRecords>({
    texts: [],
    addresses: [],
  });

  useEffect(() => {
    if (name) {
      fetchName();
    }
  }, [name]);

  const fetchName = async () => {
    if (!name) return;
    const data = await getNameById(name);
    setNameData(data);

    if (data?.full_name) {
      const records = toEnsRecords(data);
      setEnsRecords(deepCopy(records));
      setInitialRecords(deepCopy(records));
    }
  };

  const getTextRecord = (key: string): string | undefined => {
    return nameData?.records?.texts?.find((t) => t.key === key)?.value;
  };

  const formatExpiry = (expiry: string) => {
    const expiryDate = new Date(parseInt(expiry) * 1000);
    return expiryDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const headerImage = getTextRecord("header");
  const avatarImage = getTextRecord("avatar");

  const isNameOwner = useMemo(() => {
    return equalsIgnoreCase(address || "", nameData?.owner || zeroAddress);
  }, [nameData, address]);

  const handleUpdateRecords = () => {
    // TODO: Implement the actual update logic
    console.log("Update records:", ensRecords);
    setShowRecordModal(false);
  };

  if (loading) {
    return (
      <div className="page">
        <div className="page-content">
          <div className="loading-state">
            <div className="spinner"></div>
            <Text size="lg" weight="medium" color="gray" className="mt-2">
              Loading name profile...
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
          <div className="error-state">
            <Text size="xl" weight="semibold" color="black" className="mb-2">
              Error loading profile
            </Text>
            <Text size="lg" weight="medium" color="red" className="mb-4">
              {error}
            </Text>
            <Button variant="secondary" onClick={fetchName}>
              <Text size="base" weight="medium" color="black">
                Try Again
              </Text>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!nameData) {
    return (
      <div className="page">
        <div className="page-content">
          <div className="not-found-state">
            <User size={64} color="#9CA3AF" />
            <Text
              size="2xl"
              weight="semibold"
              color="black"
              className="mt-4 mb-2"
            >
              Name not registered
            </Text>
            <Text size="lg" weight="normal" color="gray" className="mb-2">
              The name{" "}
              <strong>
                {name}.{ENV.PARENT_NAME}
              </strong>{" "}
              is not registered yet.
            </Text>
            <Text size="base" weight="normal" color="gray" className="mb-6">
              Would you like to register it?
            </Text>
            <Link to="/">
              <Button variant="primary">
                <Text size="base" weight="medium" color="black">
                  Register {name}
                </Text>
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="name-profile-page">
      <div className="profile-content">
        {/* Header/Cover Image */}
        <div
          className="profile-header"
          style={{
            backgroundImage: headerImage ? `url(${headerImage})` : undefined,
            backgroundColor: headerImage ? undefined : "#E5E7EB",
          }}
        ></div>

        <div className="profile-main">
          {/* Avatar and Name Section */}
          <div className="profile-header-section">
            <div
              className="profile-avatar"
              style={{
                backgroundImage: avatarImage
                  ? `url(${avatarImage})`
                  : undefined,
                backgroundColor: avatarImage ? undefined : "#D1D5DB",
              }}
            ></div>

            <div className="profile-info">
              <div className="profile-name-section">
                <Text
                  as="h1"
                  size="4xl"
                  weight="bold"
                  color="black"
                  className="profile-name"
                >
                  {nameData.label}
                </Text>
                <Text
                  size="lg"
                  weight="normal"
                  color="gray"
                  className="profile-fullname"
                >
                  {nameData.full_name}
                </Text>
              </div>

              <div className="profile-meta-row">
                <div className="profile-meta-badges">
                  <div className="meta-badge">
                    <Calendar size={16} color="#6B7280" />
                    <Text size="sm" weight="medium" color="gray">
                      Expires {formatExpiry(nameData.expiry)}
                    </Text>
                  </div>

                  <div className="meta-badge">
                    <User size={16} color="#6B7280" />
                    <Text size="sm" weight="medium" color="gray">
                      Owner:
                    </Text>
                    <a
                      href={`https://celoscan.io/address/${nameData.owner}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="owner-link"
                    >
                      <Text
                        size="sm"
                        weight="medium"
                        color="gray"
                        className="mono"
                      >
                        {truncateAddress(nameData.owner)}
                      </Text>
                    </a>
                  </div>
                </div>

                <div className="profile-action-buttons">
                  <Button
                    variant="secondary"
                    className="profile-action-btn"
                    onClick={() => setShowExtendModal(true)}
                  >
                    <Text size="sm" weight="medium" color="black">
                      Extend
                    </Text>
                  </Button>
                  {isNameOwner && (
                    <Button
                      variant="primary"
                      className="profile-action-btn"
                      onClick={() => setShowRecordModal(true)}
                    >
                      <Text size="sm" weight="medium" color="black">
                        + Edit Profile
                      </Text>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tabs Navigation */}
          <div className="tabs-container">
            <div className="tabs-nav">
              <button
                className={`tab-button ${
                  activeTab === "records" ? "active" : ""
                }`}
                onClick={() => setActiveTab("records")}
              >
                <Text size="base" weight="medium">
                  Records
                </Text>
              </button>
              <button
                className={`tab-button ${
                  activeTab === "addresses" ? "active" : ""
                }`}
                onClick={() => setActiveTab("addresses")}
              >
                <Text size="base" weight="medium">
                  Addresses
                </Text>
              </button>
              <button
                className={`tab-button ${
                  activeTab === "ownership" ? "active" : ""
                }`}
                onClick={() => setActiveTab("ownership")}
              >
                <Text size="base" weight="medium">
                  Ownership
                </Text>
              </button>
            </div>

            <div className="tab-content">
              {/* Records Tab */}
              {activeTab === "records" && (
                <div className="tab-panel">
                  <RecordsTab nameData={nameData} />
                </div>
              )}

              {/* Addresses Tab */}
              {activeTab === "addresses" && (
                <div className="tab-panel">
                  <AddressesTab nameData={nameData} />
                </div>
              )}

              {/* Ownership Tab */}
              {activeTab === "ownership" && (
                <div className="tab-panel">
                  <OwnershipTab nameData={nameData} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Extend Modal */}
      <ExtendModal
        isOpen={showExtendModal}
        onClose={() => setShowExtendModal(false)}
        nameLabel={nameData?.label || ""}
        currentExpiry={nameData?.expiry || "0"}
        onSuccess={(newExpiry) => {
          // Update the name data with new expiry without refetching
          if (nameData) {
            setNameData({
              ...nameData,
              expiry: newExpiry,
            });
          }
        }}
      />
      {/* Update records modal */}
      <UpdateRecordsModal
        isOpen={showRecordModal}
        onClose={() => setShowRecordModal(false)}
        initialRecords={initialRecords}
        ensRecords={ensRecords}
        onRecordsUpdated={(e) => setEnsRecords(e)}
        onUpdate={handleUpdateRecords}
      />
    </div>
  );
}

export default NameProfile;
