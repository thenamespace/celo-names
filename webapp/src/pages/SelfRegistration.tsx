import Text from "@/components/Text";
import {
  SelfAppBuilder,
  SelfQRcodeWrapper,
  countries,
  type SelfApp,
} from "@selfxyz/qrcode";
import { add } from "lodash";
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
        scope: "celo-test-names",
        endpoint: `0xa3014efc4e0a0f9ceabf3e8922113d94b56d891a`,
        logoBase64:
          "https://i.postimg.cc/mrmVf9hm/self.png", // url of a png image, base64 is accepted but not recommended
        userId: address || zeroAddress,
        endpointType: "staging_celo",
        userIdType: "hex", // use 'hex' for ethereum address or 'uuid' for uuidv4
        userDefinedData: "subnamelabel",
        disclosures: {
        // what you want to verify from users' identity
          minimumAge: 1,
          // ofac: true,
          // what you want users to reveal
          // name: false,
          // issuing_state: true,
          // nationality: true,
          // date_of_birth: true,
          // passport_number: false,
          // gender: true,
          // expiry_date: false,
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
