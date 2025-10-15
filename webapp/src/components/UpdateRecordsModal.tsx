import Modal from "@components/Modal";
import Button from "@components/Button";
import {
  deepCopy,
  SelectRecordsForm,
  getEnsRecordsDiff,
  getSupportedAddressByCoin,
  type EnsRecords,
} from "@thenamespace/ens-components";

interface UpdateRecordsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRecords: EnsRecords;
  ensRecords: EnsRecords;
  onRecordsUpdated: (records: EnsRecords) => void;
  onUpdate: () => void;
}

export default function UpdateRecordsModal({
  isOpen,
  onClose,
  initialRecords,
  ensRecords,
  onRecordsUpdated,
  onUpdate,
}: UpdateRecordsModalProps) {
  
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
    const hasAnyChanges = (
      diff.textsAdded.length > 0 ||
      diff.textsModified.length > 0 ||
      diff.textsRemoved.length > 0 ||
      diff.addressesAdded.length > 0 ||
      diff.addressesModified.length > 0 ||
      diff.addressesRemoved.length > 0 ||
      diff.contenthashRemoved ||
      diff.contenthashModified
    );

    if (!hasAnyChanges) return false;

    // Validate all text records that are being added or modified
    const allTextsValid = [
      ...diff.textsAdded,
      ...diff.textsModified
    ].every(text => isValidTextRecord(text));

    // Validate all address records that are being added or modified
    const allAddressesValid = [
      ...diff.addressesAdded,
      ...diff.addressesModified
    ].every(address => isValidAddressRecord(address));

    return allTextsValid && allAddressesValid;
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
          onClick={onUpdate}
          size="large"
          className="w-50"
          disabled={!hasValidChanges()}
        >
          Update
        </Button>
      </div>
    </Modal>
  );
}
