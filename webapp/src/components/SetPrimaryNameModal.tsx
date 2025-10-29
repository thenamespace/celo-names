import { useState } from "react";
import { useAccount, usePublicClient, useSwitchChain } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { mainnet } from "viem/chains";
import Modal from "@components/Modal";
import Button from "@components/Button";
import Text from "@components/Text";
import { toast } from "react-toastify";
import { usePrimaryName } from "@/contexts/PrimaryNameContext";
import { sleep } from "@/utils";
import { useSetPrimaryName } from "@/hooks/useSetPrimaryName";
import { useTransactionModal } from "@/hooks/useTransactionModal";
import { ContractFunctionExecutionError, type Hash } from "viem";

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
  const { chain } = useAccount();
  const { TransactionModal, closeTransactionModal } = useTransactionModal();
  const [showSuccess, setShowSuccess] = useState(false);
  const { switchChainAsync } = useSwitchChain();

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
            {chain?.id !== mainnet.id && <Button className="w-50" onClick={async() => {
              await switchChainAsync({ chainId: mainnet.id })
              await sleep(500)
            }}>Switch to Mainnet</Button>}
            {chain?.id === mainnet.id && <SetPrimaryNameButton onSuccess={() => setShowSuccess(true)} fullName={fullName} />}
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

const SetPrimaryNameButton = ({ fullName, onSuccess }: { fullName: string, onSuccess: () => void }) => {
  const { setEthPrimaryName } = useSetPrimaryName({ chainId: mainnet.id });
  const USER_DENIED_TX_ERROR = "User denied transaction";
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { address, chain, isConnected } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { openConnectModal } = useConnectModal();
  const { setPrimaryName } = usePrimaryName();
  const pc = usePublicClient({ chainId: mainnet.id })
  const { showTransactionModal, updateTransactionStatus, waitForTransaction, TransactionModal, closeTransactionModal } = useTransactionModal();


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
        // Wait a moment for React to re-render and clients to initialize
        await sleep(500);
      }

      // On-chain set primary name via Reverse Registrar with retry logic
      // (retry in case clients aren't ready immediately after chain switch)
      let tx: Hash | null = null;
      let retries = 0;
      const maxRetries = 5;

      while (retries < maxRetries && !tx) {
        try {
          tx = await setEthPrimaryName(fullName);
        } catch (err: any) {
          if (err?.message?.includes("Ethereum client unavailable") && retries < maxRetries - 1) {
            // Wait a bit longer and retry
            retries++;
            await sleep(300);
            continue;
          }
          throw err; // Re-throw if not the expected error or max retries reached
        }
      }

      if (!tx) {
        throw new Error("Failed to get transaction after retries");
      }

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
        onSuccess();
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
      <Button className="w-50" disabled={chain?.id !== mainnet.id || isSubmitting} onClick={handleSetPrimary}>{isSubmitting ? "Setting..." : "Set Primary Name"}</Button>
      <TransactionModal />
    </>
  )
}
