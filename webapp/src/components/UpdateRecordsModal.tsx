import { useState } from "react";
import { usePublicClient } from "wagmi";
import { toast } from "react-toastify";
import { ContractFunctionExecutionError, zeroHash, type Hash } from "viem";
import Modal from "@components/Modal";
import Button from "@components/Button";
import { useTransactionModal } from "@/hooks/useTransactionModal";
import { useRegistry } from "@/hooks/useRegistry";
import { ENV } from "@/constants/environment";
import {
  deepCopy,
  SelectRecordsForm,
  getEnsRecordsDiff,
  getSupportedAddressByCoin,
  type EnsRecords,
} from "@thenamespace/ens-components";

const USER_DENIED_TX_ERROR = "User denied transaction";

interface UpdateRecordsModalProps {
  isOpen: boolean;
  onClose: () => void;
  nameLabel: string;
  initialRecords: EnsRecords;
  ensRecords: EnsRecords;
  onRecordsUpdated: (records: EnsRecords) => void;
  onUpdate: () => void;
}

export default function UpdateRecordsModal({
  isOpen,
  onClose,
  nameLabel,
  initialRecords,
  ensRecords,
  onRecordsUpdated,
  onUpdate,
}: UpdateRecordsModalProps) {
  const publicClient = usePublicClient();
  const { updateRecords } = useRegistry();
  const {
    showTransactionModal,
    updateTransactionStatus,
    waitForTransaction,
    TransactionModal,
  } = useTransactionModal();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleCancel = () => {
    onRecordsUpdated(deepCopy(initialRecords));
    onClose();
  };

  // Validate text record
  const isValidTextRecord = (text: any) => {
    return text.value.length > 0;
  };

  // Validate address record
  const isValidAddressRecord = (address: any) => {
    if (address.value.length === 0) return false;

    const supportedAddress = getSupportedAddressByCoin(address.coinType);
    if (!supportedAddress) return false;

    return supportedAddress.validateFunc?.(address.value) || false;
  };

  // Check if there are any valid changes between initial and current records
  const hasValidChanges = () => {
    const diff = getEnsRecordsDiff(initialRecords, ensRecords);

    // Check if there are any changes
    const hasAnyChanges =
      diff.textsAdded.length > 0 ||
      diff.textsModified.length > 0 ||
      diff.textsRemoved.length > 0 ||
      diff.addressesAdded.length > 0 ||
      diff.addressesModified.length > 0 ||
      diff.addressesRemoved.length > 0 ||
      diff.contenthashRemoved ||
      diff.contenthashModified;

    if (!hasAnyChanges) return false;

    // Validate all text records that are being added or modified
    const allTextsValid = [...diff.textsAdded, ...diff.textsModified].every(
      (text) => isValidTextRecord(text)
    );

    // Validate all address records that are being added or modified
    const allAddressesValid = [
      ...diff.addressesAdded,
      ...diff.addressesModified,
    ].every((address) => isValidAddressRecord(address));

    return allTextsValid && allAddressesValid;
  };

  const handleContractErr = (err: any) => {
    const contractErr = err as ContractFunctionExecutionError;
    if (
      contractErr?.details &&
      contractErr.details.includes(USER_DENIED_TX_ERROR)
    ) {
      // User denied transaction - no toast needed
    } else if (contractErr?.details?.includes("insufficient funds")) {
      toast.error("Insufficient funds. Please add CELO to your wallet.");
    } else {
      // Generic error message
      toast.error("Update failed. Please try again.");
      console.error("Update error:", err);
    }
  };

  const handleUpdateRecords = async () => {
    if (!hasValidChanges()) {
      toast.error("No valid changes to update");
      return;
    }

    setIsUpdating(true);

    let txHash: Hash = zeroHash;
    try {
      const fullName = `${nameLabel}.${ENV.PARENT_NAME}`;
      txHash = await updateRecords(fullName, initialRecords, ensRecords);
    } catch (err) {
       handleContractErr(err);
       setIsUpdating(false);
       return;
    }

    try {
      // Show transaction modal
      showTransactionModal(txHash);

      // Wait for transaction confirmation
      await waitForTransaction(publicClient!, txHash);

      updateTransactionStatus("success");
      toast.success("Records updated successfully!");
      onUpdate();
      onClose();
    } catch (err: unknown) {
      handleContractErr(err);
      showTransactionModal();
      updateTransactionStatus("failed");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <SelectRecordsForm
        records={ensRecords}
        onRecordsUpdated={onRecordsUpdated}
      />
      <div
        className="p-2 pt-0"
        style={{ background: "#f4f4f4", gap: "7px", display: "flex" }}
      >
        <Button
          onClick={handleCancel}
          variant="secondary"
          className="w-50"
          size="large"
        >
          Cancel
        </Button>
        <Button
          onClick={handleUpdateRecords}
          size="large"
          className="w-50"
          disabled={!hasValidChanges() || isUpdating}
        >
          {isUpdating ? "Updating..." : "Update"}
        </Button>
      </div>
      <TransactionModal />
    </Modal>
  );
}
