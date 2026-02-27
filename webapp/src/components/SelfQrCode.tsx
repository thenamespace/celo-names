import "./SelfQrCode.css";
import { CONTRACT_ADDRESSES, SELF_SCOPE_SEED } from "@/constants";
import {
  SelfAppBuilder,
  SelfQRcodeWrapper,
  getUniversalLink,
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
  const [isSmallScreen, setIsSmallScreen] = useState(window.innerWidth < 700);

  useEffect(() => {
    const handleResize = () => setIsSmallScreen(window.innerWidth < 700);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const _selfApp = new SelfAppBuilder({
      version: 2,
      appName: "Celo Names",
      scope: SELF_SCOPE_SEED,
      endpoint: CONTRACT_ADDRESSES.L2_SELF_REGISTRAR.toLocaleLowerCase(),
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

  if (!selfApp) return null;

  const deepLink = getUniversalLink(selfApp);

  return (
    <div className="self-qr-wrapper">
      <SelfQRcodeWrapper
        selfApp={selfApp}
        onError={(err) => onError(err)}
        onSuccess={() => onVerified()}
        size={width}
      />
      {isSmallScreen && (
        <a href={deepLink} className="self-deep-link-btn">
          Open in Self App
        </a>
      )}
    </div>
  );
};
