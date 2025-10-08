import { CONTRACT_ADDRESSES, SELF_SCOPE_SEED } from "@/constants";
import {
  SelfAppBuilder,
  SelfQRcodeWrapper,
  type SelfApp,
} from "@selfxyz/qrcode";
import { useEffect, useState } from "react";
import { type Address } from "viem";

interface SelfQrCodeProps {
  onVerified: () => void;
  onError: (err: any) => void;
  label: string;
  owner: Address;
  width?: number
}

export const SelfQrCode = ({
  label,
  owner,
  onVerified,
  onError,
  width = 200
}: SelfQrCodeProps) => {
  const [selfApp, setSelfApp] = useState<SelfApp>();

  useEffect(() => {
    const _selfApp = new SelfAppBuilder({
      version: 2,
      appName: "Demo Celo Names",
      scope: SELF_SCOPE_SEED,
      endpoint: CONTRACT_ADDRESSES.L2_SELF_REGISTRAR,
      logoBase64: "https://i.postimg.cc/mrmVf9hm/self.png", // url of a png image, base64 is accepted but not recommended
      userId: owner,
      endpointType: "celo",
      userIdType: "hex", // use 'hex' for ethereum address or 'uuid' for uuidv4
      disclosures: {
        minimumAge: 18,
      },
    }).build();
    setSelfApp(_selfApp);
  }, [owner]);

  return (
    <>
      {selfApp && (
        <SelfQRcodeWrapper
            selfApp={selfApp}
            onError={(err) => onError(err)}
            onSuccess={() => onVerified()}
            size={width}
          ></SelfQRcodeWrapper>
      )}
    </>
  );
};
