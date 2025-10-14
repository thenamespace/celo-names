import { useState, useEffect } from "react";
import { useAccount, useSwitchChain, usePublicClient } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { toast } from "react-toastify";
import { ContractFunctionExecutionError, type Hash } from "viem";
import { formatUnits } from "viem";
import Text from "@components/Text";
import Button from "@components/Button";
import Modal from "@components/Modal";
import DurationCurrencySelector from "@components/DurationCurrencySelector";
import { useRegistrar } from "@/hooks/useRegistrar";
import { useTransactionModal } from "@/hooks/useTransactionModal";
import { useERC20Permit } from "@/hooks/useERC20Permit";
import { CELO_TOKEN, L2_CHAIN_ID, type PaymentToken } from "@/constants";

interface ExtendModalProps {
  isOpen: boolean;
  onClose: () => void;
  nameLabel: string;
  currentExpiry: string;
  onSuccess?: (newExpiry: string) => void;
}

const USER_DENIED_TX_ERROR = "User denied transaction";

export default function ExtendModal({
  isOpen,
  onClose,
  nameLabel,
  currentExpiry,
  onSuccess,
}: ExtendModalProps) {
  const { isConnected, chain } = useAccount();
  const { switchChain } = useSwitchChain();
  const { openConnectModal } = useConnectModal();
  const publicClient = usePublicClient({ chainId: L2_CHAIN_ID });
  
  const [durationInYears, setDurationInYears] = useState(1);
  const [selectedCurrency, setSelectedCurrency] = useState<PaymentToken>(CELO_TOKEN);
  const [namePrice, setNamePrice] = useState<{
    isChecking: boolean;
    paymentToken: PaymentToken;
    price: number;
  }>({
    isChecking: false,
    paymentToken: CELO_TOKEN,
    price: 0,
  });
  const [isWaitingWallet, setIsWaitingWallet] = useState(false);

  const {
    rentPrice,
    registrarAddress,
    renew,
    renewERC20,
  } = useRegistrar();
  const { showTransactionModal, updateTransactionStatus, waitForTransaction, TransactionModal } =
    useTransactionModal();
  const { createSignedPermit } = useERC20Permit({ chainId: L2_CHAIN_ID });

  // Check price when duration or currency changes
  useEffect(() => {
    if (nameLabel && durationInYears > 0) {
      checkNamePrice(nameLabel, selectedCurrency);
    }
  }, [nameLabel, durationInYears, selectedCurrency]);

  const checkNamePrice = async (label: string, currency?: PaymentToken) => {
    const tokenToUse = currency || selectedCurrency;
    setNamePrice({ ...namePrice, isChecking: true });
    
    try {
      const _price = await rentPrice(label, durationInYears, tokenToUse.address);
      const parsedPrice = Number(formatUnits(_price, tokenToUse.decimals));
      setNamePrice({
        ...namePrice,
        isChecking: false,
        price: parsedPrice,
        paymentToken: tokenToUse,
      });
    } catch (error) {
      console.error("Error checking price:", error);
      setNamePrice({ ...namePrice, isChecking: false });
    }
  };

  const handleCurrencyChange = (currency: PaymentToken) => {
    setSelectedCurrency(currency);
  };

  const handleExtend = async () => {
    if (!isConnected) {
      openConnectModal?.();
      return;
    } else if (L2_CHAIN_ID !== chain?.id) {
      switchChain({ chainId: L2_CHAIN_ID });
      return;
    } else {
      if (durationInYears <= 0) {
        toast.error("Please select a valid duration");
        return;
      }
      if (namePrice.price <= 0) {
        toast.error("Unable to get price. Please try again.");
        return;
      }

      await extendName();
    }
  };

  const extendName = async () => {
    let _tx: Hash = "" as Hash;
    try {
      setIsWaitingWallet(true);
      
      // We call renew with native token
      if (selectedCurrency.address === CELO_TOKEN.address) {
        _tx = await renew(nameLabel, durationInYears);
      } else {
        // Spender should be the registrar contract
        const permitValue = await rentPrice(
          nameLabel,
          durationInYears,
          selectedCurrency.address
        );
        // Create erc20 permit for gasless transfer
        const permit = await createSignedPermit(
          selectedCurrency,
          registrarAddress,
          permitValue
        );

        _tx = await renewERC20(
          nameLabel,
          durationInYears,
          selectedCurrency.address,
          permit
        );
      }
    } catch (err) {
      handleContractErr(err);
      setIsWaitingWallet(false);
      return;
    }

    await waitForTransactionWithSuccess(_tx);
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
      toast.error("Extension failed. Please try again.");
      console.error("Extension error:", err);
    }
  };

  const waitForTransactionWithSuccess = async (_tx: Hash) => {
    try {
      // Show transaction modal after transaction is sent with hash
      showTransactionModal(_tx);

      // Use the centralized waitForTransaction function
      await waitForTransaction(publicClient!, _tx);

      updateTransactionStatus("success");
      toast.success("Name extended successfully!");
      
      // Calculate new expiry date
      const currentExpiryTimestamp = parseInt(currentExpiry);
      const newExpiryTimestamp = currentExpiryTimestamp + (durationInYears * 365 * 24 * 60 * 60);
      const newExpiry = newExpiryTimestamp.toString();
      
      onSuccess?.(newExpiry);
      onClose();
    } catch (err: unknown) {
      // Show modal with failed state if transaction fails
      showTransactionModal();
      updateTransactionStatus("failed");
      toast.error("Transaction failed. Please try again.");
      console.error("Transaction error:", err);
      setIsWaitingWallet(false);
    }
  };

  const getExtendButtonLabel = () => {
    if (!isConnected) {
      return "Connect Wallet";
    } else if (L2_CHAIN_ID !== chain?.id) {
      return "Switch to CELO";
    } else {
      return isWaitingWallet ? "Extending..." : "Extend";
    }
  };

  const isExtendButtonEnabled = () => {
    if (!isConnected || chain?.id !== L2_CHAIN_ID) {
      return true;
    }
    return !isWaitingWallet && namePrice.price > 0 && !namePrice.isChecking;
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} className="extend-modal">
        <div style={{ padding: '2rem' }}>
          <Text size="2xl" weight="semibold" color="black" className="mb-4">
            Extend {nameLabel}
          </Text>
          
          <Text size="base" weight="normal" color="gray" className="mb-6">
            Extend the registration duration for your name
          </Text>

          {/* Duration and currency selector */}
          <div className="mb-6">
            <DurationCurrencySelector
              durationInYears={durationInYears}
              setDurationInYears={setDurationInYears}
              selectedCurrency={selectedCurrency}
              onCurrencyChange={handleCurrencyChange}
              price={namePrice.price}
              isCheckingPrice={namePrice.isChecking}
            />
          </div>

          {/* Action buttons */}
          <div className="button-row" style={{ display: 'flex', gap: '1rem' }}>
            <Button
              onClick={onClose}
              variant="secondary"
              className="flex-1"
            >
              <Text size="base" weight="medium" color="black">
                Cancel
              </Text>
            </Button>
            <Button
              onClick={handleExtend}
              variant="primary"
              className="flex-1"
              disabled={!isExtendButtonEnabled()}
            >
              <Text size="base" weight="medium" color="black">
                {getExtendButtonLabel()}
              </Text>
            </Button>
          </div>
        </div>
      </Modal>

      {/* Transaction Modal */}
      <TransactionModal />
    </>
  );
}
