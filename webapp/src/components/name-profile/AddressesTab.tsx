import Text from "@components/Text";
import { ChainIcon } from "@thenamespace/ens-components";
import type { Name } from "@/types/indexer";
import { CopyButton } from "./CopyButton";

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
         
          return (
            <div key={idx} className="text-record-badge">
              <ChainIcon chain={address.name} size={20} />
              <Text weight="medium" color="gray">
                {address.value.slice(0, 6)}...{address.value.slice(-4)}
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

