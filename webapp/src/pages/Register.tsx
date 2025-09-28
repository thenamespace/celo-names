import { useMemo, useState, useCallback, useEffect } from "react";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import {
  ContractFunctionExecutionError,
  formatEther,
  zeroHash,
  type Hash,
} from "viem";
import { debounce } from "lodash";
import { Plus, Minus } from "lucide-react";
import Text from "@components/Text";
import Button from "@components/Button";
import Input from "@components/Input";
import Modal from "@components/Modal";
import CurrencyDropdown from "@components/CurrencyDropdown";
import "./Page.css";
import "./Register.css";
import {
  getSupportedAddressByName,
  SelectRecordsForm,
  type EnsRecords,
  type SupportedEnsAddress,
} from "@thenamespace/ens-components";
import { useRegistrar } from "@/hooks/useRegistrar";
import { useAccount, usePublicClient, useSwitchChain } from "wagmi";
import { normalize } from "viem/ens";
import { L2_CHAIN_ID } from "@/constants";
import { useTransactionModal } from "@/hooks/useTransactionModal";

const USER_DENIED_TX_ERROR = "User denied transaction";
const celo_address = getSupportedAddressByName("celo") as SupportedEnsAddress;
const eth_address = getSupportedAddressByName("eth") as SupportedEnsAddress;

function Register() {
  const { address, isConnected, chain } = useAccount();
  const { switchChain } = useSwitchChain();
  const { openConnectModal } = useConnectModal();
  const { register, rentPrice, isNameAvailable } = useRegistrar();
  const { showTransactionModal, updateTransactionStatus, TransactionModal } =
    useTransactionModal();
  const publicClient = usePublicClient({ chainId: L2_CHAIN_ID });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [durationInYears, setDurationInYears] = useState(1);
  const [selectedCurrency, setSelectedCurrency] = useState<
    "CELO" | "USDC" | "USDT"
  >("CELO");
  const [records, setRecords] = useState<EnsRecords>({
    addresses: [],
    texts: [],
  });

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

  // Name availability and pricing state
  const [nameStatus, setNameStatus] = useState<{
    isAvailable: boolean | null;
    price: string | null;
    loading: boolean;
  }>({
    isAvailable: null,
    price: null,
    loading: false,
  });

  const handleLabelChanged = (value: string) => {
    if (value.includes(".")) {
      return;
    }
    const _value = value.toLocaleLowerCase();

    try {
      normalize(_value);
    } catch (err) {
      // Invalid character
      return;
    }

    setLabel(_value);
    if (durationInYears > 1) {
      setDurationInYears(1);
    }

    setNameStatus({ ...nameStatus, loading: true });
    debouncedCheckName(_value);
  };

  // Debounced function to check name availability and price
  const debouncedCheckName = useCallback(
    debounce(async (label: string) => {
      if (label.length <= 2) {
        setNameStatus({ isAvailable: false, price: "0", loading: false });
        return;
      }

      try {
        const [available, price] = await Promise.all([
          isNameAvailable(label),
          rentPrice(label, 1),
        ]);

        setNameStatus({
          isAvailable: available,
          price: formatEther(price),
          loading: false,
        });
      } catch (error) {
        console.error("Error checking name:", error);
        setNameStatus({
          isAvailable: null,
          price: null,
          loading: false,
        });
      }
    }, 500),
    []
  );

  const handleRegister = () => {
    if (!isConnected) {
      // 1. If not connected -> prompt to connect
      openConnectModal?.();
      return;
    } else if (L2_CHAIN_ID !== chain?.id) {
      // 2. If not on the right network -> prompt to switch chain
      switchChain({ chainId: L2_CHAIN_ID });
      return;
    } else {
      // 3. Else register
      registerName();
    }
  };

  const getRegButtonLabel = () => {
    if (!isConnected) {
      return "Connect";
    } else if (L2_CHAIN_ID !== chain?.id) {
      return "Switch to CELO";
    } else {
      return "Register";
    }
  };

  const registerName = async () => {
    let _tx: Hash = zeroHash;
    try {
      _tx = await register(label, durationInYears, address!, records);
    } catch (err) {
      const contractErr = err as ContractFunctionExecutionError;
      if (
        contractErr?.details &&
        contractErr.details.includes(USER_DENIED_TX_ERROR)
      ) {
        // no nothing, user denied signature request
      } else if (false) {
        // user has no funds and return
        //
      } else {
        // show error message
      }
      return;
    }

    try {
      // Show transaction modal after transaction is sent with hash
      showTransactionModal(_tx);

      // Simulate transaction processing with 5 second timeout
      const start_time = new Date().getTime();
      // We will add artifical 5 seconds delay to make the registration smoother
      const artificial_wait_time_miliseconds = 5000;

      await publicClient!.waitForTransactionReceipt({ hash: _tx });

      const end_time = new Date().getTime();

      const real_wait_time = end_time - start_time;
      const time_to_wait =
        real_wait_time > artificial_wait_time_miliseconds
          ? 0
          : artificial_wait_time_miliseconds - real_wait_time;

      setTimeout(() => {
        updateTransactionStatus("success");
      }, time_to_wait);
    } catch (err: unknown) {
      // Show modal with failed state if transaction fails
      showTransactionModal();
      updateTransactionStatus("failed");
    }
  };

  const handleSetProfile = () => {
    setIsModalOpen(true);
  };

  const recordsAdded = useMemo<number>(() => {
    let initial = 0;
    initial += records.texts.length;
    initial += records.addresses.length;
    initial += !records.contenthash ? 0 : 1;

    return initial;
  }, [records]);

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
          <div className="form-group">
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

            {/* Name status display */}
            {label.length > 2 && (
              <div className="name-status">
                {nameStatus.loading ? (
                  <div className="loading-status">
                    <div className="spinner"></div>
                    <Text
                      size="lg"
                      weight="medium"
                      color="gray"
                      className="mt-2"
                    >
                      Checking availability...
                    </Text>
                  </div>
                ) : nameStatus.isAvailable !== null ? (
                  <div className="mt-2">
                    <Text size="lg" weight="medium" color="black">
                      {label}.celoo.eth is{" "}
                    </Text>
                    <Text
                      size="lg"
                      weight="medium"
                      color={nameStatus.isAvailable ? "green" : "red"}
                    >
                      {nameStatus.isAvailable ? "available!" : "unavailable"}
                    </Text>
                  </div>
                ) : null}

                {/* Duration controls */}
                {!nameStatus.loading && nameStatus.isAvailable && (
                  <div className="duration-controls">
                    <Text
                      size="sm"
                      weight="medium"
                      color="black"
                      className="mb-2"
                    >
                      Registration Duration:
                    </Text>
                    <div className="duration-buttons">
                      <Button
                        variant="secondary"
                        onClick={() =>
                          setDurationInYears(Math.max(1, durationInYears - 1))
                        }
                        className="duration-btn"
                      >
                        <Minus size={20} color="black" />
                      </Button>
                      <div className="duration-display">
                        <Text size="lg" weight="semibold" color="black">
                          {durationInYears}{" "}
                          {durationInYears === 1 ? "Year" : "Years"}
                        </Text>
                      </div>
                      <Button
                        variant="secondary"
                        onClick={() =>
                          setDurationInYears(
                            Math.min(9999, durationInYears + 1)
                          )
                        }
                        className="duration-btn"
                      >
                        <Plus size={20} color="black" />
                      </Button>
                    </div>
                  </div>
                )}

                {!nameStatus.loading &&
                  nameStatus.isAvailable === true &&
                  nameStatus.price && (
                    <div className="price-display">
                      <div className="price-row">
                        <div className="price-section">
                          <Text
                            size="sm"
                            weight="normal"
                            color="gray"
                            className="price-label"
                          >
                            Total
                          </Text>
                          <Text size="lg" weight="semibold" color="black">
                            {(
                              parseFloat(nameStatus.price) * durationInYears
                            ).toFixed(2)}{" "}
                            {selectedCurrency}
                          </Text>
                        </div>
                        <div className="currency-section">
                          <Text
                            size="sm"
                            weight="normal"
                            color="gray"
                            className="currency-label"
                          >
                            Select token
                          </Text>
                          <CurrencyDropdown
                            selectedCurrency={selectedCurrency}
                            onCurrencyChange={setSelectedCurrency}
                          />
                        </div>
                      </div>
                    </div>
                  )}
              </div>
            )}
          </div>

          <div className="form-group">
            <Button
              variant="secondary"
              onClick={handleSetProfile}
              className="profile-button"
            >
              <Text size="base" weight="medium" color="black">
                + Set Profile
              </Text>
            </Button>
          </div>

          <div className="form-group">
            <Button
              variant="primary"
              onClick={handleRegister}
              className="register-button mt-2"
              disabled={
                getRegButtonLabel() === "Register" &&
                (label.length <= 2 ||
                  nameStatus.loading ||
                  nameStatus.isAvailable === false)
              }
            >
              <Text size="base" weight="medium" color="black">
                {getRegButtonLabel()}
              </Text>
            </Button>
          </div>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <SelectRecordsForm
          records={records}
          onRecordsUpdated={(_records: EnsRecords) => {
            setRecords(_records);
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
          >{`Add (${recordsAdded})`}</Button>
        </div>
      </Modal>

      <TransactionModal />
      <div></div>
    </div>
  );
}

export default Register;
