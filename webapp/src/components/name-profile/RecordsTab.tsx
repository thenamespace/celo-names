import { ExternalLink } from "lucide-react";
import Text from "@components/Text";
import { supportedTexts, Icon } from "@thenamespace/ens-components";
import type { Name } from "@/types/indexer";
import { CopyButton } from "./CopyButton";

interface RecordsTabProps {
  nameData: Name;
}

// Mapping of social record keys to their base URLs
const SOCIAL_URL_MAP: Record<string, string> = {
  "com.twitter": "https://x.com",
  "com.x": "https://x.com",
  "com.github": "https://github.com",
  "org.telegram": "https://t.me",
  "com.youtube": "https://youtube.com",
};

export function RecordsTab({ nameData }: RecordsTabProps) {
  const textRecords = nameData.records?.texts || [];

  // Separate general/image and social records
  const generalRecords = textRecords.filter((record) => {
    const supported = supportedTexts.find((s) => s.key === record.key);
    return (
      supported &&
      (supported.category === "general" || supported.category === "image")
    );
  });

  const socialRecords = textRecords.filter((record) => {
    const supported = supportedTexts.find((s) => s.key === record.key);
    return supported?.category === "social";
  });

  // Get description/short-bio separately
  const description = textRecords.find(
    (r) => r.key === "description" || r.key === "short-bio"
  )?.value;

  return (
    <>
      {/* General Records */}
      {generalRecords.length > 0 && (
        <div className="records-group">
          <Text
            size="sm"
            weight="medium"
            color="gray"
            className="records-group-label"
          >
            Profile
          </Text>
          <div className="text-records-list">
            {generalRecords.map((record, idx) => {
              const supported = supportedTexts.find(
                (s) => s.key === record.key
              );
              if (
                !supported ||
                record.key === "description" ||
                record.key === "short-bio"
              )
                return null;

              const isUrl = record.key === "url";
              const content = (
                <>
                  <Icon name={supported.icon} size={16} />
                  <Text size="sm" weight="normal" color="black" className="truncate"  >
                    {record.value}
                  </Text>
                  {isUrl && (
                    <ExternalLink size={14} className="badge-external-icon" />
                  )}
                </>
              );

              return isUrl ? (
                <a
                  key={idx}
                  href={
                    record.value.startsWith("http")
                      ? record.value
                      : `https://${record.value}`
                  }
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
          <Text
            size="sm"
            weight="normal"
            color="gray"
            className="description-text"
          >
            {description}
          </Text>
        </div>
      )}

      {/* Social Records */}
      {socialRecords.length > 0 && (
        <div className="records-group">
          <Text
            size="sm"
            weight="medium"
            color="gray"
            className="records-group-label"
          >
            Social
          </Text>
          <div className="text-records-list">
            {socialRecords.map((record, idx) => {
              const supported = supportedTexts.find(
                (s) => s.key === record.key
              );
              if (!supported) return null;

              // Get base URL for this social platform
              const baseUrl = SOCIAL_URL_MAP[record.key];

              // Display value: always show just the record value (username)
              const displayValue = record.value;

              // If baseUrl exists, show as link, otherwise show with copy button
              if (baseUrl) {
                // Construct URL by appending username to base URL
                let url: string;
                if (baseUrl.endsWith("/") || baseUrl.endsWith("@")) {
                  // Base URL already has trailing slash or @, just append username
                  url = `${baseUrl}${record.value}`;
                } else {
                  // Append username with a slash
                  url = `${baseUrl}/${record.value}`;
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
              } else {
                // No baseUrl - show with copy button
                return (
                  <div key={idx} className="text-record-badge">
                    <Icon name={supported.icon} size={16} />
                    <Text size="sm" weight="normal" color="black">
                      {displayValue}
                    </Text>
                    <CopyButton textToCopy={record.value} size={14} />
                  </div>
                );
              }
            })}
          </div>
        </div>
      )}

      {generalRecords.length === 0 &&
        socialRecords.length === 0 &&
        !description && (
          <div className="empty-tab-state">
            <Text size="base" weight="normal" color="gray">
              No records found
            </Text>
          </div>
        )}
    </>
  );
}
