import { useState, useCallback, useEffect, useMemo } from "react";
import { normalize } from "viem/ens";
import { useAccount, useSwitchChain, usePublicClient } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useNavigate } from "react-router-dom";
import { Plus, CheckCircle, Check, User } from "lucide-react";
import { toast } from "react-toastify";
import { ContractFunctionExecutionError, zeroHash, type Hash } from "viem";
import Text from "@components/Text";
import Input from "@components/Input";
import Button from "@components/Button";
import Modal from "@components/Modal";
import CeloSpinner from "@components/CeloSpinner";
import DurationCurrencySelector from "@components/DurationCurrencySelector";
import SelfButton from "@components/SelfButton";
import TokenIcon from "@components/TokenIcon";
import SuccessModal from "@components/SuccessModal";
import "./Page.css";
import "./Register.css";
import { useRegistrar } from "@/hooks/useRegistrar";
import { useTransactionModal } from "@/hooks/useTransactionModal";
import { useERC20Permit } from "@/hooks/useERC20Permit";
import { useBalanceCheck } from "@/hooks/useBalanceCheck";
import { CELO_TOKEN, L2_CHAIN_ID, USDC_TOKEN, type PaymentToken } from "@/constants";
import { formatUnits } from "viem";
import { ENV } from "@/constants/environment";
import { debounce } from "lodash";
import { SelfQrCode } from "../components/SelfQrCode";
import { sleep } from "@/utils";
import {
  getSupportedAddressByCoin,
  getSupportedAddressByName,
  SelectRecordsForm,
  type EnsRecords,
  type SupportedEnsAddress,
} from "@thenamespace/ens-components";

const MIN_NAME_LENGTH = 3;
const USER_DENIED_TX_ERROR = "User denied transaction";

const celo_address = getSupportedAddressByName("celo") as SupportedEnsAddress;
const eth_address = getSupportedAddressByName("eth") as SupportedEnsAddress;

const RegisterStep = {
  AVAILABILITY: "availability",
  PRICING: "pricing",
  REGISTER_RECEIPT: "register_receipt",
  SELF_CLAIM: "self_claim",
  SELF_VERIFIED: "self_verified",
  SELF_MAXIMUM_CLAIMED: "self_maximum_claimed",
  SUCCESS: "success",
} as const;

type RegisterStep = (typeof RegisterStep)[keyof typeof RegisterStep];

function RegisterNew() {
  const { address, isConnected, chain } = useAccount();
  const { switchChainAsync, switchChain } = useSwitchChain();
  const { openConnectModal } = useConnectModal();
  const publicClient = usePublicClient({ chainId: L2_CHAIN_ID });
  const navigate = useNavigate();
  const [label, setLabel] = useState("");

  const [nameAvailable, setNameAvailable] = useState<{
    isChecking: boolean;
    isAvailable: boolean;
  }>({
    isChecking: false,
    isAvailable: false,
  });
  const [namePrice, setNamePrice] = useState<{
    isChecking: boolean;
    paymentToken: PaymentToken;
    price: number;
  }>({
    isChecking: false,
    paymentToken: CELO_TOKEN,
    price: 0,
  });
  const [usdcPrice, setUsdcPrice] = useState<number>(0);
  const [durationInYears, setDurationInYears] = useState(1);
  const [selectedCurrency, setSelectedCurrency] =
    useState<PaymentToken>(CELO_TOKEN);
  const [currentStep, setCurrentStep] = useState<RegisterStep>(
    RegisterStep.AVAILABILITY
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [records, setRecords] = useState<EnsRecords>({
    addresses: [],
    texts: [],
  });
  const [isWaitingWallet, setIsWaitingWallet] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const {
    register,
    rentPrice,
    isNameAvailable,
    registrarAddress,
    registerERC20,
    claimWithSelf,
    isSelfVerified,
    getSelfClaimCount
  } = useRegistrar();
  const { showTransactionModal, updateTransactionStatus, waitForTransaction, TransactionModal } =
    useTransactionModal();
  const { createSignedPermit } = useERC20Permit({ chainId: L2_CHAIN_ID });
  const { getTokenBalance } = useBalanceCheck();
  const [selfClaimCount, setSelfClaimCount] = useState<{
    isChecking: boolean
    value: number
  }>({
    isChecking: true,
    value: 0
  })

  useEffect(() => {

    if (address) {
      getSelfClaimCount(address).then(res => {
        setSelfClaimCount({
          isChecking: false,
          value: Number(res)
        })
      }).catch(err => {
        console.error(err);
        toast.error("Failed to fetch number of self claimed names")
        setSelfClaimCount({
          isChecking: false,
          value: 999
        })
      })
    }

  }, [address])


  const recordsToAdd = useMemo(() => {
    let count = 0;
    records.texts.forEach(text => {
      if (text.value.length > 0) {
        count++;
      }
    })
    records.addresses.forEach(addr => {
      const supportedAddr = getSupportedAddressByCoin(addr.coinType);
      if (supportedAddr) {
        if (addr.value.length > 0 && supportedAddr.validateFunc?.(addr.value)) {
          count++;
        }
      }
    })
    return count;
  }, [records])

  // Check if profile has been set (has any text records)
  const hasProfileSet = useMemo(() => {
    return records.texts.some(text => text.value.length > 0);
  }, [records])

  // Get avatar from records
  const avatarUrl = useMemo(() => {
    const avatarRecord = records.texts.find(text => text.key === 'avatar');
    return avatarRecord?.value || null;
  }, [records])

  // Initialize records with user's address when they connect
  useEffect(() => {
    if (address && records.addresses.length === 0) {
      setRecords({
        ...records,
        addresses: [
          { coinType: eth_address.coinType, value: address },
          { coinType: celo_address.coinType, value: address },
        ],
      });
    }
  }, [address]);

  // Reset to availability step if user disconnects
  useEffect(() => {
    if (!isConnected && currentStep !== RegisterStep.AVAILABILITY) {
      setCurrentStep(RegisterStep.AVAILABILITY);
    }
  }, [isConnected]);

  const handleLabelChanged = (value: string) => {
    if (value.includes(".")) {
      return;
    }
    const _value = value.toLocaleLowerCase();

    try {
      normalize(_value);
    } catch (err) {
      return;
    }

    setLabel(_value);
    if (durationInYears > 1) {
      setDurationInYears(1);
    }

    if (_value.length >= MIN_NAME_LENGTH) {
      setNameAvailable({ ...nameAvailable, isChecking: true });
      setNamePrice({ ...namePrice, isChecking: true });
      debouncedCheckName(_value, namePrice.paymentToken);
    }
  };

  const debouncedCheckName = useCallback(
    debounce(async (label: string, currency: PaymentToken) => {
      checkNameAvailable(label);
      checkNamePrice(label, currency);
    }, 500),
    []
  );

  const checkNameAvailable = async (label: string) => {
    const available = await isNameAvailable(label);
    setNameAvailable({
      ...nameAvailable,
      isChecking: false,
      isAvailable: available,
    });
  };

  const checkNamePrice = async (label: string, currency?: PaymentToken) => {
    const tokenToUse = currency || selectedCurrency;
    const _price = await rentPrice(label, 1, tokenToUse.address);
    const parsedPrice = Number(formatUnits(_price, tokenToUse.decimals));
    setNamePrice({
      ...namePrice,
      isChecking: false,
      price: parsedPrice,
      paymentToken: tokenToUse,
    });

    // Fetch USDC price when CELO is selected
    if (tokenToUse.name === "CELO") {
      try {
        const _usdcPrice = await rentPrice(label, 1, USDC_TOKEN.address);
        const parsedUsdcPrice = Number(formatUnits(_usdcPrice, USDC_TOKEN.decimals));
        setUsdcPrice(parsedUsdcPrice);
      } catch (error) {
        console.error("Error fetching USDC price:", error);
        setUsdcPrice(0);
      }
    } else {
      setUsdcPrice(0);
    }
  };

  const handleCurrencyChange = (currency: PaymentToken) => {
    setSelectedCurrency(currency);
    if (label.length >= MIN_NAME_LENGTH) {
      checkNamePrice(label, currency);
    }
  };

  const handleNext = async () => {
    if (!isConnected) {
      // If not connected -> prompt to connect
      openConnectModal?.();
      return;
    } else if (L2_CHAIN_ID !== chain?.id) {
      // If not on the right network -> prompt to switch chain
      await switchChainAsync({ chainId: L2_CHAIN_ID });
      await sleep(500);
      return;
    } else {
      // If connected and on correct network -> proceed to pricing
      setCurrentStep(RegisterStep.PRICING);
      // Check price when moving to pricing step
      if (label.length >= MIN_NAME_LENGTH) {
        checkNamePrice(label);
      }
    }
  };

  const getNextButtonLabel = () => {
    if (!isConnected) {
      return "Connect Wallet";
    } else if (L2_CHAIN_ID !== chain?.id) {
      return "Switch to CELO";
    } else {
      return "Next";
    }
  };

  const isNextButtonEnabled = () => {
    // Button is enabled if user is connected or on the wrong network
    if (!isConnected || chain?.id !== L2_CHAIN_ID) {
      return true;
    }

    // Button is enabled if name is available OR if user needs to connect/switch
    return (
      label.length >= MIN_NAME_LENGTH &&
      !nameAvailable.isChecking &&
      nameAvailable.isAvailable
    );
  };

  const handleClaimWithSelf = async () => {
    const _verified = await isSelfVerified(address!);
    if (_verified) {
      // Check if user has reached max claim count
      if (selfClaimCount.value >= ENV.MAX_SELF_CLAIM_COUNT) {
        setCurrentStep(RegisterStep.SELF_MAXIMUM_CLAIMED);
      } else {
        setCurrentStep(RegisterStep.SELF_VERIFIED);
      }
    } else {
      setCurrentStep(RegisterStep.SELF_CLAIM);
    }
  };

  const handleVerificationSuccess = () => {
    // Check if user has reached max claim count
    if (selfClaimCount.value >= ENV.MAX_SELF_CLAIM_COUNT) {
      setCurrentStep(RegisterStep.SELF_MAXIMUM_CLAIMED);
    } else {
      setCurrentStep(RegisterStep.SELF_VERIFIED);
    }
  };

  const handleVerificationError = (error: any) => {
    console.error("Verification error:", error);
    toast.error("Verification failed! " + JSON.stringify(error, null, 2));
  };

  const handleAddProfile = () => {
    setIsModalOpen(true);
  };

  const handleRegister = async (isSelf: boolean = false) => {
    if (!isConnected) {
      // 1. If not connected -> prompt to connect
      openConnectModal?.();
      return;
    } else if (L2_CHAIN_ID !== chain?.id) {
      // 2. If not on the right network -> prompt to switch chain
      await switchChain({ chainId: L2_CHAIN_ID });
      await sleep(500);
      return;
    } else {
      // 3. Else register - add validation
      if (label.length <= 2) {
        toast.error("Please enter a name with at least 3 characters");
        return;
      }
      if (!nameAvailable.isAvailable) {
        toast.error(
          "This name is not available. Please choose a different name."
        );
        return;
      }
      if (nameAvailable.isChecking) {
        toast.warning("Please wait while we check name availability");
        return;
      }

      if (isSelf) {
        claimName();
      } else {
        registerName();
      }
    }
  };

  const claimName = async () => {
    let _tx: Hash = zeroHash;
    try {
      _tx = await claimWithSelf(label, address!, records);
    } catch (err) {
      handleContractErr(err);
      setIsWaitingWallet(false);
      return;
    }

    await waitForTransactionWithDelay(_tx);
  };

  const hasBalance = async (): Promise<boolean> => {
    try {

      // Check if user has sufficient balance before registering
      const requiredPrice = await rentPrice(
        label,
        durationInYears,
        selectedCurrency.address
      );

      const userBalance = await getTokenBalance(selectedCurrency, address!);

      return userBalance >= requiredPrice
    } catch (err) {
      // Lets not do anything here for now
      return true;
    }
  }

  const registerName = async () => {
    let _tx: Hash = zeroHash;
    try {
      setIsWaitingWallet(true);

      const requiredPrice = await rentPrice(
        label,
        durationInYears,
        selectedCurrency.address
      );

      // We call register with native token
      if (selectedCurrency.address === CELO_TOKEN.address) {
        _tx = await register(label, durationInYears, address!, records);
      } else {
        // Spender should be the registrar contract
        const permitValue = requiredPrice;
        // Create erc20 permit for gasless transfer
        const permit = await createSignedPermit(
          selectedCurrency,
          registrarAddress,
          permitValue
        );

        _tx = await registerERC20(
          label,
          durationInYears,
          address!,
          records,
          permit,
          selectedCurrency.address
        );
      }
    } catch (err: any) {

      if (err.details && typeof err.details === "string") {
        const errDetails = err.details as string;
        if (errDetails.includes("User rejected the request")) {
          setIsWaitingWallet(false)
          return;
        }
      }

      const hasEnoughBalance = await hasBalance();

      if (!hasEnoughBalance) {
        toast.error(`Insufficient ${selectedCurrency.name} balance.`);
      } else {
        handleContractErr(err);
      }

      setIsWaitingWallet(false);
      return;
    }

    await waitForTransactionWithDelay(_tx);
  };

  const handleContractErr = (err: any) => {
    const contractErr = err as ContractFunctionExecutionError;
    if (
      contractErr?.details &&
      contractErr.details.includes(USER_DENIED_TX_ERROR)
    ) {
      // User denied transaction - no toast needed
    } else {
      // Generic error message
      toast.error("Registration failed. Please try again.");
      console.error("Registration error:", err);
    }
  };

  const waitForTransactionWithDelay = async (_tx: Hash) => {
    try {
      // Show transaction modal after transaction is sent with hash
      showTransactionModal(_tx);

      // Simulate transaction processing with 5 second timeout
      const start_time = new Date().getTime();
      // We will add artifical 5 seconds delay to make the registration smoother
      const artificial_wait_time_miliseconds = 5000;

      // Use the centralized waitForTransaction function
      await waitForTransaction(publicClient!, _tx);

      const end_time = new Date().getTime();

      const real_wait_time = end_time - start_time;
      const time_to_wait =
        real_wait_time > artificial_wait_time_miliseconds
          ? 0
          : artificial_wait_time_miliseconds - real_wait_time;

      setTimeout(() => {
        updateTransactionStatus("success");
        setShowSuccessModal(true);
        setCurrentStep(RegisterStep.SUCCESS);
      }, time_to_wait);
    } catch (err: unknown) {
      // Show modal with failed state if transaction fails
      showTransactionModal();
      updateTransactionStatus("failed");
      toast.error("Transaction failed. Please try again.");
      console.error("Transaction error:", err);
      setIsWaitingWallet(false);
    }
  };

  const handleContinueSuccess = () => {
    navigate(`/name/${label}.${ENV.PARENT_NAME}`);
  };

  // If user disconnects after progressing past availability step, show connect prompt
  if (!isConnected && currentStep !== RegisterStep.AVAILABILITY) {
    return (
      <div className="page">
        <div className="page-content">
          <div className="connect-prompt">
            <Text as="h1" size="4xl" weight="semibold" color="black" className="mb-2">
              Register
            </Text>
            <Text size="lg" weight="normal" color="gray" className="mb-6">
              Connect your wallet to continue registering your CELO name
            </Text>
            <Button onClick={() => openConnectModal?.()} variant="primary" className="mt-3">
              <Text size="base" weight="medium" color="black">
                Connect Wallet
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
        <Text
          as="h1"
          size="4xl"
          weight="semibold"
          color="black"
          className="mb-2"
        >
          Register
        </Text>
        <Text size="lg" weight="normal" color="gray" className="2">
          Get your CELO name
        </Text>

        <div className="register-form">
          {currentStep === RegisterStep.AVAILABILITY ? (
            <div className="form-group">
              <Text
                size="sm"
                weight="normal"
                color="gray"
                className="input-label"
              >
                Choose your name
              </Text>
              <Input
                value={label}
                onChange={handleLabelChanged}
                placeholder="Pick your name"
                suffix={
                  <Text size="base" weight="medium">
                    .{ENV.PARENT_NAME}
                  </Text>
                }
              />
              {(label.length > 0 && label.length < MIN_NAME_LENGTH) && <div className="mt-2">
                <Text size="sm" color="gray">Name must contain at least {MIN_NAME_LENGTH} characters</Text>
              </div> }

              {/* Name availability display */}
              {label.length >= MIN_NAME_LENGTH && (
                <div className="name-status">
                  {nameAvailable.isChecking ? (
                    <div className="loading-status">
                      <CeloSpinner size={32} />
                      <Text
                        size="lg"
                        weight="medium"
                        color="gray"
                        className="mt-2"
                      >
                        Checking availability...
                      </Text>
                    </div>
                  ) : (
                    <div className="mt-2">
                      <Text size="lg" weight="medium" color="black">
                        {`${label}.${ENV.PARENT_NAME} is `}
                      </Text>
                      <Text
                        size="lg"
                        weight="medium"
                        color={nameAvailable.isAvailable ? "green" : "red"}
                      >
                        {nameAvailable.isAvailable
                          ? "available!"
                          : "unavailable"}
                      </Text>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : currentStep === RegisterStep.PRICING ? (
            <div className="form-group">
              {/* Registration info */}
              <div>
                <Text
                  weight="normal"
                  color="gray"
                  className="registering-label"
                >
                  Registering
                </Text>
                <Text
                  size="2xl"
                  weight="bold"
                  color="black"
                  className="registering-name"
                >
                  {label}.{ENV.PARENT_NAME}
                </Text>
              </div>

              {/* Duration and currency selector */}
              <DurationCurrencySelector
                durationInYears={durationInYears}
                setDurationInYears={setDurationInYears}
                selectedCurrency={selectedCurrency}
                onCurrencyChange={handleCurrencyChange}
                price={namePrice.price}
                usdcPrice={usdcPrice}
                isCheckingPrice={namePrice.isChecking}
              />
            </div>
          ) : null}

          {/* Next button - always visible but disabled when conditions not met */}
          {currentStep === RegisterStep.AVAILABILITY && (
            <div className="form-group">
              <Button
                onClick={handleNext}
                variant="primary"
                disabled={!isNextButtonEnabled()}
              >
                <Text size="base" weight="medium" color="black">
                  {getNextButtonLabel()}
                </Text>
              </Button>
            </div>
          )}

          {/* Claim with Self and Register/Cancel buttons - show in pricing step */}
          {currentStep === RegisterStep.PRICING && (
            <>
              <div className="form-group">
                <SelfButton onClick={handleClaimWithSelf} />
              </div>
              <div className="form-group">
                <div className="button-row">
                  <Button
                    onClick={() => setCurrentStep(RegisterStep.AVAILABILITY)}
                    variant="secondary"
                    className="cancel-button"
                  >
                    <Text size="base" weight="medium" color="black">
                      Cancel
                    </Text>
                  </Button>
                  <Button
                    onClick={() => {
                      setCurrentStep(RegisterStep.REGISTER_RECEIPT);
                    }}
                    variant="primary"
                    className="register-button"
                  >
                    <Text size="base" weight="medium" color="black">
                      Next
                    </Text>
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* Register step */}
          {currentStep === RegisterStep.REGISTER_RECEIPT && (
            <div className="form-group">
              {/* Registration info */}
              <div>
                <Text
                  weight="normal"
                  color="gray"
                  className="registering-label"
                >
                  Register
                </Text>
                <Text
                  size="2xl"
                  weight="bold"
                  color="black"
                  className="registering-name"
                >
                  {label}.{ENV.PARENT_NAME}
                </Text>
                <div className="registration-details">
                  <div className="detail-box">
                    <div className="detail-label">
                      <Text weight="medium" color="gray">
                        Duration
                      </Text>
                    </div>
                    <Text size="base" weight="semibold" color="black">
                      {durationInYears} year{durationInYears > 1 ? "s" : ""}
                    </Text>
                  </div>
                  <div className="detail-box">
                    <div className="detail-label">
                      <Text weight="medium" color="gray">
                        Price
                      </Text>
                    </div>
                    <div className="detail-value">
                      <Text size="base" weight="semibold" color="black">
                        {(namePrice.price * durationInYears).toFixed(2)}{" "}
                        {namePrice.paymentToken.name}
                      </Text>
                      <TokenIcon
                        tokenName={namePrice.paymentToken.name}
                        size={20}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="button-column mt-3">
                <Button
                    onClick={handleAddProfile }
                    variant="secondary"
                    className="set-profile-button"
                  >
                    <Plus size={16} />
                    <Text size="base" weight="medium" color="black">
                      Set Profile
                    </Text>
                  </Button>
                <div className="button-row">
                  <Button
                    onClick={() => setCurrentStep(RegisterStep.PRICING)}
                    variant="secondary"
                    className="back-button"
                  >
                    <Text size="base" weight="medium" color="black">
                      Back
                    </Text>
                  </Button>
                  <Button
                    onClick={() => handleRegister(false)}
                    variant="primary"
                    className="register-button"
                    disabled={isWaitingWallet}
                  >
                    <Text size="base" weight="medium" color="black">
                      {isWaitingWallet ? "Waiting for wallet..." : "Register"}
                    </Text>
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Self Claim step */}
          {currentStep === RegisterStep.SELF_CLAIM && (
            <div className="form-group">
              {/* Registration info */}
              <div className="claim-info">
                <Text size="lg" weight="semibold" color="black">
                  Claim {label}.{ENV.PARENT_NAME}
                </Text>
                <Text size="sm" weight="normal" color="gray" className="mt-1">
                  Scan QR code, verify your identity, and claim your name for
                  free
                </Text>
              </div>

              {/* QR Code */}
              <div className="qr-code-section">
                <div className="qr-code-placeholder">
                  <SelfQrCode
                    label={label}
                    owner={address!}
                    onError={handleVerificationError}
                    onVerified={handleVerificationSuccess}
                    width={220}
                  />
                </div>
              </div>

              {/* Claim and Cancel buttons */}
              <div className="button-row">
                <Button
                  onClick={() => setCurrentStep(RegisterStep.PRICING)}
                  variant="secondary"
                  className="cancel-button"
                >
                  <Text size="base" weight="medium" color="black">
                    Cancel
                  </Text>
                </Button>
                <Button
                  variant="primary"
                  className="claim-button"
                  disabled={true}
                >
                  <Text size="base" weight="medium" color="black">
                    {"Verify First"}
                  </Text>
                </Button>
              </div>
            </div>
          )}

          {/* Self Verified step */}
          {currentStep === RegisterStep.SELF_VERIFIED && (
            <div className="form-group">
              {/* Success message */}
              <div className="verification-success">
                <div className="success-header">
                  <CheckCircle size={32} className="success-icon" />
                  <Text size="lg" weight="semibold" color="green">
                    Successfully verified!
                  </Text>
                </div>
                <Text
                  size="xl"
                  weight="bold"
                  color="black"
                  className="verified-name"
                >
                  {label}.{ENV.PARENT_NAME}
                </Text>
                <Text weight="normal" color="gray">
                  You can now claim this name for free
                </Text>
                {!selfClaimCount.isChecking && (
                  <Text weight="bold" color="black">
                    Claims used: {selfClaimCount.value}/{ENV.MAX_SELF_CLAIM_COUNT}
                  </Text>
                )}
                <div className="mt-2 claim-expiry-banner">
                  <Text color="gray" size="xs">Names claimed via Self Verification have 1 year expiry and can be extended for 1 cent per year.</Text>
                </div>
              </div>

              {/* Add Profile and Claim buttons */}
              <div className="button-column">
                <Button
                  onClick={handleAddProfile}
                  variant="secondary"
                  className="add-profile-button"
                >
                  <Plus size={16} />
                  <Text size="base" weight="medium" color="black">
                    Set Profile
                  </Text>
                </Button>
                {hasProfileSet && (
                  <div
                    onClick={handleAddProfile}
                    className="profile-updated-notification"
                  >
                    <div className="profile-updated-avatar-container">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt="Profile"
                          className="profile-updated-avatar"
                        />
                      ) : (
                        <div className="profile-updated-avatar-placeholder">
                          <User size={20} color="#6B7280" />
                        </div>
                      )}
                    </div>
                    <div className="profile-updated-text-container">
                      <Text size="base" weight="semibold" color="black">
                        Profile updated!
                      </Text>
                      <Text size="sm" weight="normal" color="gray">
                        All set! Finish your registration.
                      </Text>
                    </div>
                    <div className="profile-updated-check-container">
                      <Check size={20} color="#FFFFFF" />
                    </div>
                  </div>
                )}
                <div className="button-row">
                  <Button
                    onClick={() => setCurrentStep(RegisterStep.PRICING)}
                    variant="secondary"
                    className="claim-button"
                  >
                    <Text size="base" weight="medium" color="black">
                      Cancel
                    </Text>
                  </Button>
                  <Button
                    onClick={() => handleRegister(true)}
                    variant="primary"
                    className="claim-button"
                    disabled={isWaitingWallet}
                  >
                    <Text size="base" weight="medium" color="black">
                      {isWaitingWallet ? "Waiting wallet..." : "Claim"}
                    </Text>
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Self Maximum Claimed step */}
          {currentStep === RegisterStep.SELF_MAXIMUM_CLAIMED && (
            <div className="form-group">
              {/* Warning message */}
              <div className="maximum-claimed-warning">
                <Text size="lg" weight="semibold" color="black">
                  Maximum Claims Reached
                </Text>
                <Text
                  size="sm"
                  weight="normal"
                  color="gray"
                  className="warning-subtitle"
                >
                  You have claimed the maximum number of names {`${selfClaimCount.value}/${ENV.MAX_SELF_CLAIM_COUNT}`}.
                  Please register additional names using the standard registration process.
                </Text>
              </div>

              {/* Back button */}
              <div className="button-row">
                <Button
                  onClick={() => setCurrentStep(RegisterStep.PRICING)}
                  variant="secondary"
                  className="back-button"
                >
                  <Text size="base" weight="medium" color="black">
                    Back
                  </Text>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Select Records Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <SelectRecordsForm
          records={records}
          onRecordsUpdated={(updatedRecords: EnsRecords) => {
            setRecords(updatedRecords);
          }}
        />
        <div
          className="p-2 pt-0"
          style={{ background: "#f4f4f4", gap: "7px", display: "flex" }}
        >
          <Button
            onClick={() => setIsModalOpen(false)}
            variant="secondary"
            className="w-50"
            size="large"
          >
            Cancel
          </Button>
          <Button
            onClick={() => setIsModalOpen(false)}
            size="large"
            className="w-50"
          >
            Add ({recordsToAdd})
          </Button>
        </div>
      </Modal>

      {/* Transaction Modal */}
      <TransactionModal />

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        onContinue={handleContinueSuccess}
        mintedName={`${label}.${ENV.PARENT_NAME}`}
      />
    </div>
  );
}

export default RegisterNew;
