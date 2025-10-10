import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface CopyButtonProps {
  textToCopy: string;
  size?: number;
}

export function CopyButton({ textToCopy, size = 14 }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 2500);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="copy-icon-button"
      title={copied ? "Copied!" : "Copy to clipboard"}
    >
      {copied ? (
        <Check size={size} color="#35D07F" />
      ) : (
        <Copy size={size} color="#6B7280" />
      )}
    </button>
  );
}

