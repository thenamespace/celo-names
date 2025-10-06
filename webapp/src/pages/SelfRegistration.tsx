import Text from "@/components/Text";
import { CONTRACT_ADDRESSES, SELF_SCOPE_SEED } from "@/constants";
import {
  SelfAppBuilder,
  SelfQRcodeWrapper,
  type SelfApp,
} from "@selfxyz/qrcode";
import { useEffect, useState } from "react";
import { zeroAddress } from "viem";
import { useAccount } from "wagmi";

export const SelfRegistration = () => {
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
        userId: address || zeroAddress,
        endpointType: "celo",
        userIdType: "hex", // use 'hex' for ethereum address or 'uuid' for uuidv4
        userDefinedData: "subnamelabel",
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
        <Text>Self Registration</Text>
        {selfApp && (
          <SelfQRcodeWrapper
            selfApp={selfApp}
            onError={(err) => 
              console.log(err, "ERROR!")
            }
            onSuccess={() => console.log("On success!")}
          ></SelfQRcodeWrapper>
        )}
      </div>
    </div>
  );
};
