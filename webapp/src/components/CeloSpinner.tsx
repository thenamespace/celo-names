import "./CeloSpinner.css";

interface CeloSpinnerProps {
  size?: number;
  className?: string;
}

export default function CeloSpinner({ size = 32, className }: CeloSpinnerProps) {
  return (
    <div className={`celo-spinner ${className || ""}`} style={{ width: size, height: size }}>
      <img 
        src="/celo-logo.svg" 
        alt="Celo Logo" 
        className="celo-spinner-logo"
        style={{ width: size, height: size }}
      />
    </div>
  );
}
