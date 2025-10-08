import Text from "@components/Text";
import Button from "@components/Button";
import "./SelfButton.css";

interface SelfButtonProps {
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export default function SelfButton({ onClick, disabled, className }: SelfButtonProps) {
  return (
    <Button
      variant="secondary"
      onClick={onClick}
      disabled={disabled}
      className={`self-button ${className || ""}`}
    >
      <div className="self-button-content">
        <img 
          src="/self-logo.png" 
          alt="Self Logo" 
          className="self-logo"
        />
        <Text size="base" weight="medium" color="black">
          Claim with Self for free
        </Text>
      </div>
    </Button>
  );
}
