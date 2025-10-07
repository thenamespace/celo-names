import Text from "@/components/Text";
import { CONTRACT_ADDRESSES, SELF_SCOPE_SEED } from "@/constants";
import {
  SelfAppBuilder,
  SelfQRcodeWrapper,
  type SelfApp,
} from "@selfxyz/qrcode";
import { useEffect, useState } from "react";
import { type Address } from "viem";
import { useAccount } from "wagmi";
import "./SelfQrCode.css";
import Button from "./Button";

interface SelfQrCodeProps {
  onVerified: () => void
  onError: (err: any) => void
  label: string
  owner: Address
}

export const SelfQrCode = ({label, owner, onVerified, onError}: SelfQrCodeProps) => {
  const [selfApp, setSelfApp] = useState<SelfApp>();
  const { address } = useAccount();

  useEffect(() => {
    const _selfApp = new SelfAppBuilder({
        version: 2,
        appName: "Demo Celo Names",
        scope: SELF_SCOPE_SEED,
        endpoint: CONTRACT_ADDRESSES.L2_SELF_REGISTRAR,
        logoBase64:
          "https://i.postimg.cc/mrmVf9hm/self.png", // url of a png image, base64 is accepted but not recommended
        userId: owner,
        endpointType: "celo",
        userIdType: "hex", // use 'hex' for ethereum address or 'uuid' for uuidv4
        userDefinedData: label,
        disclosures: {
          minimumAge: 18,
          passport_number: true,
        }
      }).build();
    setSelfApp(_selfApp);
  }, [address]);

  return (
    <div className="page">
      <div className="page-content">
        <div className="self-verify-header">
          <img 
            src="/self-logo.png" 
            alt="Self Logo" 
            className="self-verify-logo"
          />
          <div className="self-verify-text">
            <Text
              as="h2"
              size="2xl"
              weight="semibold"
              color="black"
              className="self-verify-title"
            >
              Verify with Self
            </Text>
            <Text
              size="sm"
              weight="normal"
              color="gray"
              className="self-verify-subtitle"
            >
              Verify with SELF and claim a free subname
            </Text>
          </div>
        </div>
        {selfApp && (
          <div className="qr-code-container">
            <SelfQRcodeWrapper
              selfApp={selfApp}
              onError={(err) => 
                onError(err)
              }
              onSuccess={() => onVerified()}
              size={200}
            ></SelfQRcodeWrapper>
          </div>
        )}
        <Button onClick={() => onVerified()}>Verify</Button>
      </div>
    </div>
  );
};
