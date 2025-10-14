import { useState } from "react";
import { User, ExternalLink, FileText, Calendar } from "lucide-react";
import Text from "@components/Text";
import Button from "@components/Button";
import TransferOwnershipModal from "@components/TransferOwnershipModal";
import type { Name } from "@/types/indexer";
import { truncateAddress } from "@/utils";
import type { Address } from "viem";

interface OwnershipTabProps {
  nameData: Name;
  onOwnershipChanged?: (newOwner: Address) => void
}

export function OwnershipTab({ nameData }: OwnershipTabProps) {
  const [showTransferModal, setShowTransferModal] = useState(false);

  const formatExpiry = (expiry: string) => {
    const expiryDate = new Date(parseInt(expiry) * 1000);
    return expiryDate.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <>
      {/* Owner Information */}
      <div className="records-group">
        <Text size="sm" weight="medium" color="gray" className="records-group-label">
          Owner
        </Text>
        <div className="ownership-info-grid">
          <div className="ownership-info-item">
            <User size={20} color="#6B7280" />
            <div className="ownership-info-content">
              <Text size="sm" weight="medium" color="gray">
                Address
              </Text>
              <a
                href={`https://celoscan.io/address/${nameData.owner}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ownership-link"
              >
                <Text size="sm" weight="medium" color="black">
                  {truncateAddress(nameData.owner)}
                </Text>
                <ExternalLink size={14} />
              </a>
            </div>
          </div>

          <div className="ownership-info-item">
            <Calendar size={20} color="#6B7280" />
            <div className="ownership-info-content">
              <Text size="sm" weight="medium" color="gray">
                Expires
              </Text>
              <Text size="sm" weight="medium" color="black">
                {formatExpiry(nameData.expiry)}
              </Text>
            </div>
          </div>
        </div>
      </div>

      {/* Registration Information */}
      {nameData.registration && (
        <div className="records-group">
          <Text size="sm" weight="medium" color="gray" className="records-group-label">
            Registration
          </Text>
          <div className="ownership-info-grid">
            <div className="ownership-info-item">
              <FileText size={20} color="#6B7280" />
              <div className="ownership-info-content">
                <Text size="sm" weight="medium" color="gray">
                  Transaction
                </Text>
                <a
                  href={`https://celoscan.io/tx/${nameData.registration.tx_hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ownership-link"
                >
                  <Text size="sm" weight="medium" color="black">
                    {truncateAddress(nameData.registration.tx_hash)}
                  </Text>
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>

            <div className="ownership-info-item">
              <FileText size={20} color="#6B7280" />
              <div className="ownership-info-content">
                <Text size="sm" weight="medium" color="gray">
                  Block Number
                </Text>
                <Text size="sm" weight="medium" color="black">
                  {nameData.registration.block_number}
                </Text>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Button */}
      <div className="ownership-actions">
        <Button 
          variant="primary" 
          className="action-button"
          onClick={() => setShowTransferModal(true)}
        >
          <Text size="base" weight="medium" color="black">
            Transfer Ownership
          </Text>
        </Button>
      </div>

      {/* Transfer Ownership Modal */}
      <TransferOwnershipModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        nameLabel={nameData.label}
        currentOwner={nameData.owner}
        onSuccess={() => {
          // TODO: Handle successful transfer
          console.log("Ownership transferred successfully");
        }}
      />
    </>
  );
}

