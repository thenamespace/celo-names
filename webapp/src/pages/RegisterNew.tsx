import { useState, useCallback } from "react";
import { normalize } from "viem/ens";
import { useAccount, useSwitchChain } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import Text from "@components/Text";
import Input from "@components/Input";
import Button from "@components/Button";
import CeloSpinner from "@components/CeloSpinner";
import DurationCurrencySelector from "@components/DurationCurrencySelector";
import SelfButton from "@components/SelfButton";
import "./Page.css";
import "./Register.css";
import "./RegisterNew.css";
import { useRegistrar } from "@/hooks/useRegistrar";
import { CELO_TOKEN, L2_CHAIN_ID, type PaymentToken } from "@/constants";
import { formatUnits } from "viem";
import { ENV } from "@/constants/environment";
import { debounce } from "lodash";

const MIN_NAME_LENGTH = 3;

const RegisterStep = {
  AVAILABILITY: 'availability',
  PRICING: 'pricing'
} as const;

type RegisterStep = typeof RegisterStep[keyof typeof RegisterStep];

function RegisterNew() {
  const { address, isConnected, chain } = useAccount();
  const { switchChain } = useSwitchChain();
  const { openConnectModal } = useConnectModal();
  const [label, setLabel] = useState("");

  const [nameAvailable, setNameAvailable] = useState<{
    isChecking: boolean
    isAvailable: boolean
  }>({
    isChecking: false,
    isAvailable: false,
  });
  const [namePrice, setNamePrice] = useState<{
    isChecking: boolean
    paymentToken: PaymentToken
    price: number
  }>({
    isChecking: false,
    paymentToken: CELO_TOKEN,
    price: 0,
  });
  const [durationInYears, setDurationInYears] = useState(1);
  const [selectedCurrency, setSelectedCurrency] = useState<PaymentToken>(CELO_TOKEN);
  const [currentStep, setCurrentStep] = useState<RegisterStep>(RegisterStep.AVAILABILITY);

  const {
    rentPrice,
    isNameAvailable,
  } = useRegistrar();


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

    if (_value.length > MIN_NAME_LENGTH) {
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
    setNameAvailable({ ...nameAvailable, isChecking: false, isAvailable: available });
  };

  const checkNamePrice = async (label: string, currency?: PaymentToken) => {
    const tokenToUse = currency || selectedCurrency;
    const _price = await rentPrice(label, 1, tokenToUse.address);
    const parsedPrice = Number(formatUnits(_price, tokenToUse.decimals));
    setNamePrice({ ...namePrice, isChecking: false, price: parsedPrice, paymentToken: tokenToUse });
  };

  const handleCurrencyChange = (currency: PaymentToken) => {
    setSelectedCurrency(currency);
    if (label.length > MIN_NAME_LENGTH) {
      checkNamePrice(label, currency);
    }
  };

  const handleNext = () => {
    if (!isConnected) {
      // If not connected -> prompt to connect
      openConnectModal?.();
      return;
    } else if (L2_CHAIN_ID !== chain?.id) {
      // If not on the right network -> prompt to switch chain
      switchChain({ chainId: L2_CHAIN_ID });
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
    // Button is enabled if name is available OR if user needs to connect/switch
    return label.length >= MIN_NAME_LENGTH && 
           !nameAvailable.isChecking && 
           nameAvailable.isAvailable;
  };

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
              <Text size="sm" weight="normal" color="gray" className="input-label">
                Choose your name
              </Text>
              <Input
                value={label}
                onChange={handleLabelChanged}
                placeholder="Pick your name"
                suffix={
                  <Text size="base" weight="medium">
                    .celoo.eth
                  </Text>
                }
              />

              {/* Name availability display */}
              {label.length > MIN_NAME_LENGTH && (
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
                        {nameAvailable.isAvailable ? "available!" : "unavailable"}
                      </Text>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="form-group">
              {/* Registration info */}
              <div className="registration-info">
                <Text size="lg" weight="semibold" color="black">
                  Registering {label}.{ENV.PARENT_NAME}
                </Text>
              </div>

              {/* Duration and currency selector */}
              <DurationCurrencySelector
                durationInYears={durationInYears}
                setDurationInYears={setDurationInYears}
                selectedCurrency={selectedCurrency}
                onCurrencyChange={handleCurrencyChange}
                price={namePrice.price}
                isCheckingPrice={namePrice.isChecking}
              />
            </div>
          )}

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
                <SelfButton
                  onClick={() => console.log("Claim with Self clicked")}
                />
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
                    onClick={() => console.log("Register clicked")}
                    variant="primary"
                    className="register-button"
                  >
                    <Text size="base" weight="medium" color="black">
                      Register
                    </Text>
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default RegisterNew;
