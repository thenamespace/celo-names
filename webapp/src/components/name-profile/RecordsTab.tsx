import { ExternalLink } from "lucide-react";
import Text from "@components/Text";
import { supportedTexts, Icon } from "@thenamespace/ens-components";
import type { Name } from "@/types/indexer";

interface RecordsTabProps {
  nameData: Name;
}

export function RecordsTab({ nameData }: RecordsTabProps) {
  const textRecords = nameData.records?.texts || [];
  
  // Separate general/image and social records
  const generalRecords = textRecords.filter(record => {
    const supported = supportedTexts.find(s => s.key === record.key);
    return supported && (supported.category === 'general' || supported.category === 'image');
  });
  
  const socialRecords = textRecords.filter(record => {
    const supported = supportedTexts.find(s => s.key === record.key);
    return supported?.category === 'social';
  });

  // Get description/short-bio separately
  const description = textRecords.find(r => r.key === 'description' || r.key === 'short-bio')?.value;

  return (
    <>
      {/* General Records */}
      {generalRecords.length > 0 && (
        <div className="records-group">
          <Text size="sm" weight="medium" color="gray" className="records-group-label">
            Profile
          </Text>
          <div className="text-records-list">
            {generalRecords.map((record, idx) => {
              const supported = supportedTexts.find(s => s.key === record.key);
              if (!supported || record.key === 'description' || record.key === 'short-bio') return null;
              
              const isUrl = record.key === 'url';
              const content = (
                <>
                  <Icon name={supported.icon} size={16} />
                  <Text size="sm" weight="normal" color="black">
                    {record.value}
                  </Text>
                  {isUrl && <ExternalLink size={14} className="badge-external-icon" />}
                </>
              );

              return isUrl ? (
                <a
                  key={idx}
                  href={record.value.startsWith('http') ? record.value : `https://${record.value}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-record-badge clickable"
                >
                  {content}
                </a>
              ) : (
                <div key={idx} className="text-record-badge">
                  {content}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Description */}
      {description && (
        <div className="records-group">
          <Text size="sm" weight="normal" color="gray" className="description-text">
            {description}
          </Text>
        </div>
      )}

      {/* Social Records */}
      {socialRecords.length > 0 && (
        <div className="records-group">
          <Text size="sm" weight="medium" color="gray" className="records-group-label">
            Social
          </Text>
          <div className="text-records-list">
            {socialRecords.map((record, idx) => {
              const supported = supportedTexts.find(s => s.key === record.key);
              if (!supported) return null;
              
              const prefix = supported.socialRecordPrefix || '';
              const displayValue = prefix ? `${prefix}${record.value}` : record.value;
              
              // Construct proper URL - if prefix exists, use it with https://
              let url = record.value;
              if (prefix) {
                // Remove any trailing slash from prefix and ensure https://
                const cleanPrefix = prefix.endsWith('/') ? prefix.slice(0, -1) : prefix;
                url = `https://${cleanPrefix}/${record.value}`;
              } else if (!record.value.startsWith('http')) {
                url = `https://${record.value}`;
              }
              
              return (
                <a
                  key={idx}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-record-badge clickable"
                >
                  <Icon name={supported.icon} size={16} />
                  <Text size="sm" weight="normal" color="black">
                    {displayValue}
                  </Text>
                  <ExternalLink size={14} className="badge-external-icon" />
                </a>
              );
            })}
          </div>
        </div>
      )}

      {generalRecords.length === 0 && socialRecords.length === 0 && !description && (
        <div className="empty-tab-state">
          <Text size="base" weight="normal" color="gray">
            No records found
          </Text>
        </div>
      )}
    </>
  );
}

