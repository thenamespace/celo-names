import { useState } from "react";
import { ChevronDown } from "lucide-react";
import Text from "./Text";
import "./CurrencyDropdown.css";
import {
  CELO_TOKEN,
  SUSD_TOKEN,
  USDC_TOKEN,
  USDT_TOKEN,
  type PaymentToken,
} from "@/constants";

const PAYMENT_TOKENS: PaymentToken[] = [
  CELO_TOKEN,
  USDC_TOKEN,
  USDT_TOKEN,
  SUSD_TOKEN,
];

interface CurrencyDropdownProps {
  selectedCurrency: PaymentToken;
  onCurrencyChange: (currency: PaymentToken) => void;
}

const logos: Record<string, string> = {
  CELO: "/celo-logo.svg",
  USDC: "/usdc-logo.svg",
  USDT: "/usdt-logo.svg",
  sUSD: "/cusd-logo.png",
};

export default function CurrencyDropdown({
  selectedCurrency,
  onCurrencyChange,
}: CurrencyDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedCurrencyData = PAYMENT_TOKENS.find(
    (c) => c.name === selectedCurrency.name
  );

  const handleCurrencySelect = (currency: PaymentToken) => {
    const currencyData = PAYMENT_TOKENS.find((c) => c.name === currency.name);
    if (currencyData) {
      onCurrencyChange(currencyData);
      setIsOpen(false);
    }
  };

  return (
    <div className="currency-dropdown-container">
      <div className="currency-dropdown" onClick={() => setIsOpen(!isOpen)}>
        <div className="currency-option">
          <img
            src={logos[selectedCurrencyData?.name || "CELO"]}
            alt={selectedCurrencyData?.name}
            className="currency-icon"
          />
          <Text size="sm" weight="medium" color="black">
            {selectedCurrencyData?.name}
          </Text>
        </div>
        <ChevronDown size={16} color="#6B7280" />
      </div>

      {isOpen && (
        <div className="currency-dropdown-menu">
          {PAYMENT_TOKENS.map((currency) => (
            <div
              key={currency.address}
              className={`currency-option-item`}
              onClick={() => handleCurrencySelect(currency)}
            >
              <img
                src={logos[currency.name]}
                alt={currency.name}
                className="currency-icon"
              />
              <Text size="sm" weight="medium">
                {currency.name}
              </Text>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
