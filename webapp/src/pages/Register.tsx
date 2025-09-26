import { useMemo, useState, useCallback } from "react";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { formatEther } from "viem";
import { debounce } from "lodash";
import Text from "@components/Text";
import Button from "@components/Button";
import Input from "@components/Input";
import Modal from "@components/Modal";
import "./Page.css";
import "./Register.css";
import {
  SelectRecordsForm,
  type EnsRecords,
} from "@thenamespace/ens-components";
import { useRegistrar } from "@/hooks/useRegistrar";
import { useAccount } from "wagmi";

function Register() {
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { register, rentPrice, isNameAvailable } = useRegistrar();
  
  const [username, setUsername] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [records, setRecords] = useState<EnsRecords>({
    addresses: [],
    texts: [],
  });
  
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

  // Debounced function to check name availability and price
  const debouncedCheckName = useCallback(
    debounce(async (label: string) => {
      if (label.length <= 2) {
        setNameStatus({ isAvailable: null, price: null, loading: false });
        return;
      }

      setNameStatus(prev => ({ ...prev, loading: true }));

      try {
        const [available, price] = await Promise.all([
          isNameAvailable(label),
          rentPrice(label, 1), // 1 year duration
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
    [isNameAvailable, rentPrice]
  );

  const handleUsernameChange = (value: string) => {
    setUsername(value);
    setLabel(value);
    debouncedCheckName(value);
  };

  const handleRegister = () => {
    console.log("Conected");
    if (!isConnected) {
      console.log("Not connected");
      openConnectModal?.();
      return;
    }
    console.log("Registering username:", username);
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
              value={username}
              onChange={handleUsernameChange}
              placeholder="Enter your username"
              suffix={
                <Text size="base" weight="medium">
                  .celoo.eth
                </Text>
              }
              loading={nameStatus.loading}
            />
            
            {/* Name status display */}
            {username.length > 2 && !nameStatus.loading && (
              <div className="name-status">
                {nameStatus.isAvailable !== null && (
                  <Text 
                    size="sm" 
                    weight="medium" 
                    color={nameStatus.isAvailable ? "green" : "red"}
                    className="mt-2"
                  >
                    {nameStatus.isAvailable ? "✓ Available" : "✗ Not Available"}
                  </Text>
                )}
                {nameStatus.price && (
                  <Text size="sm" weight="normal" color="gray" className="mt-1">
                    Price: {nameStatus.price} CELO/year
                  </Text>
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
              disabled={!isConnected && username.length > 2 && nameStatus.isAvailable === false}
            >
              <Text size="base" weight="medium" color="black">
                {isConnected ? "Register" : "Connect"}
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
          <Button  onClick={() => setIsModalOpen(false)} variant="secondary" className="w-50" size="large">
            Cancel
          </Button>
          <Button
            onClick={() => setIsModalOpen(false)}
            size="large"
            className="w-50"
          >{`Add (${recordsAdded})`}</Button>
        </div>
      </Modal>
      <div></div>
    </div>
  );
}

export default Register;
