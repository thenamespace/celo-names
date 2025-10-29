import { useState } from "react";
import { useAccount, usePublicClient, useSwitchChain } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { mainnet } from "viem/chains";
import Modal from "@components/Modal";
import Button from "@components/Button";
import Text from "@components/Text";
import { toast } from "react-toastify";
import { usePrimaryName } from "@/contexts/PrimaryNameContext";
import { useSetPrimaryName } from "@/hooks/useSetPrimaryName";
import { useTransactionModal } from "@/hooks/useTransactionModal";
import { ContractFunctionExecutionError } from "viem";

interface SetPrimaryNameModalProps {
  isOpen: boolean;
  onClose: () => void;
  fullName: string;
  onSuccess?: () => void;
}

export default function SetPrimaryNameModal({
  isOpen,
  onClose,
  fullName,
  onSuccess,
}: SetPrimaryNameModalProps) {
  const USER_DENIED_TX_ERROR = "User denied transaction";
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { address, chain, isConnected } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { openConnectModal } = useConnectModal();
  const { setPrimaryName } = usePrimaryName();
  const { setEthPrimaryName } = useSetPrimaryName({chainId: chain?.id || mainnet.id});
  const pc = usePublicClient({chainId: mainnet.id})
  const { showTransactionModal, updateTransactionStatus, waitForTransaction, TransactionModal, closeTransactionModal } = useTransactionModal();
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSetPrimary = async () => {
    try {
      setIsSubmitting(true);

      // Verify connection and correct chain (Ethereum mainnet)
      if (!isConnected || !address) {
        // If not connected -> prompt to connect
        openConnectModal?.();
        setIsSubmitting(false);
        return;
      }
      if (chain?.id !== mainnet.id) {
        // If not on the right network -> prompt to switch chain
        await switchChainAsync({ chainId: mainnet.id });
      }

      // On-chain set primary name via Reverse Registrar
      const tx = await setEthPrimaryName(fullName);

      // Show transaction pending modal (no explorer link for Ethereum here)
      showTransactionModal();

      // Wait for confirmation (with retries)
      await waitForTransaction(pc!, tx);

      // Update local context/cache with the new primary name
      await setPrimaryName(fullName);

      // Update transaction modal to success and then show success screen
      updateTransactionStatus("success");
      setTimeout(() => {
        // Ensure the transaction modal is closed before showing success
        closeTransactionModal();
        setShowSuccess(true);
      }, 500);
    } catch (err) {
      const contractErr = err as ContractFunctionExecutionError;
      if (
        contractErr?.details &&
        contractErr.details.includes(USER_DENIED_TX_ERROR)
      ) {
        // User closed/denied the wallet tx popup – do not show toast
      } else {
        toast.error("Failed to set primary name. Please try again.");
        // eslint-disable-next-line no-console
        console.error("Set primary error:", err);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Modal isOpen={isOpen && !showSuccess} onClose={onClose}>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", padding: "2rem" }}>
          <Text as="h3" size="xl" weight="bold" color="black">
            Set Primary Name
          </Text>
          <Text size="base" weight="normal" color="gray">
            This will set your primary name to:
          </Text>
          <Text size="lg" weight="semibold" color="black">
            {fullName}
          </Text>

          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
            <Button
              onClick={onClose}
              variant="secondary"
              className="w-50"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSetPrimary}
              className="w-50"
              disabled={isSubmitting}
            >
              <Text size="base" weight="medium" color="black">
                {isSubmitting ? "Setting..." : "Confirm"}
              </Text>
            </Button>
          </div>
        </div>
      </Modal>

      {/* Transaction Modal */}
      <TransactionModal />

      {/* Success Screen */}
      <Modal isOpen={showSuccess} onClose={() => { setShowSuccess(false); closeTransactionModal(); onSuccess?.(); onClose(); }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "2rem", alignItems: "center", textAlign: "center" }}>
          <Text size="sm" weight="normal" color="gray">
            You have successfully set primary name
          </Text>
          <Text size="2xl" weight="bold" color="black">
            {fullName}
          </Text>
          <Button 
            onClick={() => { setShowSuccess(false); closeTransactionModal(); onSuccess?.(); onClose(); }}
            style={{ width: "100%", marginTop: "8px" }}
          >
            <Text size="base" weight="medium" color="black">Continue</Text>
          </Button>
        </div>
      </Modal>
    </>
  );
}


