import { useState, useEffect } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { isAddress } from "viem";
import { toast } from "react-toastify";
import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import Text from "@components/Text";
import Button from "@components/Button";
import Modal from "@components/Modal";
import Input from "@components/Input";
import { useRegistry } from "@/hooks/useRegistry";
import { useTransactionModal } from "@/hooks/useTransactionModal";
import { ENV } from "@/constants/environment";
import { sleep } from "@/utils";

interface TransferOwnershipModalProps {
  isOpen: boolean;
  onClose: () => void;
  nameLabel: string;
  currentOwner: string;
  onSuccess?: () => void;
}

type ValidationState = 'idle' | 'validating' | 'valid' | 'invalid';

export default function TransferOwnershipModal({
  isOpen,
  onClose,
  nameLabel,
  currentOwner,
  onSuccess,
}: TransferOwnershipModalProps) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { transferName } = useRegistry();
  const { showTransactionModal, updateTransactionStatus, TransactionModal } = useTransactionModal();
  
  const [newOwnerInput, setNewOwnerInput] = useState("");
  const [validationState, setValidationState] = useState<ValidationState>('idle');
  const [resolvedAddress, setResolvedAddress] = useState<string>("");
  const [isTransferring, setIsTransferring] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setNewOwnerInput("");
      setValidationState('idle');
      setResolvedAddress("");
      setIsTransferring(false);
    }
  }, [isOpen]);

  const validateAddress = async (input: string): Promise<{ isValid: boolean; address: string }> => {
    if (!input.trim()) {
      return { isValid: false, address: "" };
    }

    const trimmedInput = input.trim();

    // Check if it's a valid Ethereum address
    if (isAddress(trimmedInput)) {
      return { isValid: true, address: trimmedInput };
    }

    // Check if it's an ENS name (ends with .eth)
    if (trimmedInput.endsWith('.eth')) {
      try {
        const resolvedAddress = await publicClient?.getEnsAddress({ name: trimmedInput });
        if (resolvedAddress) {
          return { isValid: true, address: resolvedAddress };
        }
      } catch (error) {
        console.error("ENS resolution error:", error);
      }
    }

    return { isValid: false, address: "" };
  };

  const handleInputChange = async (value: string) => {
    setNewOwnerInput(value);
    
    if (!value.trim()) {
      setValidationState('idle');
      setResolvedAddress("");
      return;
    }

    setValidationState('validating');
    
    try {
      const result = await validateAddress(value);
      if (result.isValid) {
        setValidationState('valid');
        setResolvedAddress(result.address);
      } else {
        setValidationState('invalid');
        setResolvedAddress("");
      }
    } catch (error) {
      console.error("Validation error:", error);
      setValidationState('invalid');
      setResolvedAddress("");
    }
  };

  const handleTransfer = async () => {
    if (validationState !== 'valid' || !resolvedAddress) {
      toast.error("Please enter a valid address or ENS name");
      return;
    }

    if (resolvedAddress.toLowerCase() === currentOwner.toLowerCase()) {
      toast.error("Cannot transfer to the current owner");
      return;
    }

    if (resolvedAddress.toLowerCase() === address?.toLowerCase()) {
      toast.error("Cannot transfer to yourself");
      return;
    }

    setIsTransferring(true);
    
    try {
      // Call the transfer function
      const txHash = await transferName(nameLabel, resolvedAddress as `0x${string}`);
      
      // Show transaction modal
      showTransactionModal(txHash);
      
      // Wait for transaction confirmation
      const retry_count = 3;
      for (let i = 0; i <= retry_count; i++) {
        try {
          await publicClient!.waitForTransactionReceipt({ hash: txHash });
          break;
        } catch (err) {
          if (i === retry_count) {
            throw err;
          }
          await sleep(1000); // Sleep for 1 second before retry
        }
      }

      updateTransactionStatus("success");
      toast.success("Ownership transferred successfully!");
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("Transfer error:", error);
      showTransactionModal();
      updateTransactionStatus("failed");
      toast.error("Transfer failed. Please try again.");
    } finally {
      setIsTransferring(false);
    }
  };

  const getValidationIcon = () => {
    switch (validationState) {
      case 'validating':
        return <div className="spinner" style={{ width: '16px', height: '16px' }}></div>;
      case 'valid':
        return <CheckCircle size={16} color="#10B981" />;
      case 'invalid':
        return <XCircle size={16} color="#EF4444" />;
      default:
        return null;
    }
  };

  const getValidationMessage = () => {
    switch (validationState) {
      case 'validating':
        return "Validating address...";
      case 'valid':
        return `Valid address: ${resolvedAddress.slice(0, 6)}...${resolvedAddress.slice(-4)}`;
      case 'invalid':
        return "Invalid address or ENS name";
      default:
        return "";
    }
  };

  const isTransferButtonEnabled = () => {
    return validationState === 'valid' && !isTransferring;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="transfer-ownership-modal">
      <div style={{ padding: '2rem' }}>
        {/* Warning Header */}
        <div className="transfer-warning">
          <div className="warning-icon">
            <AlertTriangle size={24} color="#F59E0B" />
          </div>
          <div className="warning-content">
            <Text size="lg" weight="semibold" color="black" className="mb-2">
              Transfer Ownership
            </Text>
            <Text size="base" weight="normal" color="gray">
              You are transferring ownership of <strong>{nameLabel}.{ENV.PARENT_NAME}</strong> to a new owner. 
              This action cannot be undone. Make sure you trust the recipient.
            </Text>
          </div>
        </div>

        {/* Current Owner Info */}
        <div className="current-owner-info">
          <Text size="sm" weight="medium" color="gray" className="mb-2">
            Current Owner
          </Text>
          <Text size="base" weight="medium" color="black" className="mono">
            {currentOwner.slice(0, 6)}...{currentOwner.slice(-4)}
          </Text>
        </div>

        {/* New Owner Input */}
        <div className="new-owner-input">
          <Text size="sm" weight="medium" color="gray" className="mb-2">
            New Owner Address or ENS Name
          </Text>
          <div className="input-with-validation">
            <Input
              value={newOwnerInput}
              onChange={handleInputChange}
              placeholder="0x... or name.eth"
              className="transfer-input"
            />
            {getValidationIcon() && (
              <div className="validation-icon">
                {getValidationIcon()}
              </div>
            )}
          </div>
          {getValidationMessage() && (
            <Text 
              size="sm" 
              weight="normal" 
              color={validationState === 'valid' ? 'green' : validationState === 'invalid' ? 'red' : 'gray'}
              className="validation-message"
            >
              {getValidationMessage()}
            </Text>
          )}
        </div>

        {/* Action Buttons */}
        <div className="button-row" style={{ marginTop: '1.5rem' }}>
          <Button
            onClick={onClose}
            variant="secondary"
            className="flex-1"
            disabled={isTransferring}
          >
            <Text size="base" weight="medium" color="black">
              Cancel
            </Text>
          </Button>
          <Button
            onClick={handleTransfer}
            variant="primary"
            className="flex-1"
            disabled={!isTransferButtonEnabled()}
          >
            <Text size="base" weight="medium" color="black">
              {isTransferring ? "Transferring..." : "Transfer Ownership"}
            </Text>
          </Button>
        </div>
      </div>

      {/* Transaction Modal */}
      <TransactionModal />
    </Modal>
  );
}
