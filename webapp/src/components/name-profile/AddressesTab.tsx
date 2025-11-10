import Text from "@components/Text";
import { ChainIcon } from "@thenamespace/ens-components";
import type { Name } from "@/types/indexer";
import { CopyButton } from "./CopyButton";
import { truncateAddress } from "@/utils";

interface AddressesTabProps {
  nameData: Name;
}

export function AddressesTab({ nameData }: AddressesTabProps) {
  const addresses = nameData.records?.addresses || [];
  
  return addresses.length > 0 ? (
    <>
      <Text size="sm" weight="medium" color="gray" className="records-group-label">
        Addresses
      </Text>
      <div className="text-records-list">
        {addresses.map((address, idx) => {

          let name = address.name;
          if (name === "arb1") {
            name = "arb";
          } else if (name === "btc") {
            name = "bitcoin"
          }

          return (
            <div key={idx} className="text-record-badge">
              <ChainIcon chain={name} size={20} />
              <Text size="sm">
                {truncateAddress(address.value, 6)}
              </Text>
              <CopyButton textToCopy={address.value} />
            </div>
          );
        })}
      </div>
    </>
  ) : (
    <div className="empty-tab-state">
      <Text size="base" weight="normal" color="gray">
        No addresses found
      </Text>
    </div>
  );
}

