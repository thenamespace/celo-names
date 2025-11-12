import { Plus, Minus } from "lucide-react";
import Text from "@components/Text";
import Button from "@components/Button";
import CurrencyDropdown from "@components/CurrencyDropdown";
import CeloSpinner from "@components/CeloSpinner";
import { type PaymentToken } from "@/constants";
import "./DurationCurrencySelector.css";

interface DurationCurrencySelectorProps {
  durationInYears: number;
  setDurationInYears: (years: number) => void;
  selectedCurrency: PaymentToken;
  onCurrencyChange: (currency: PaymentToken) => void;
  price: number;
  usdcPrice?: number;
  isCheckingPrice: boolean;
}

export default function DurationCurrencySelector({
  durationInYears,
  setDurationInYears,
  selectedCurrency,
  onCurrencyChange,
  price,
  usdcPrice,
  isCheckingPrice,
}: DurationCurrencySelectorProps) {
  return (
    <div className="duration-currency-selector">
      {/* Duration controls */}
      <div className="duration-controls">
        <Text
          size="sm"
          weight="medium"
          color="black"
          className="mb-2"
        >
          Registration Duration:
        </Text>
        <div className="duration-buttons">
          <Button
            variant="secondary"
            onClick={() =>
              setDurationInYears(Math.max(1, durationInYears - 1))
            }
            className="duration-btn"
          >
            <Minus size={20} color="black" />
          </Button>
          <div className="duration-display">
            <Text size="lg" weight="semibold" color="black">
              {durationInYears}{" "}
              {durationInYears === 1 ? "Year" : "Years"}
            </Text>
          </div>
          <Button
            variant="secondary"
            onClick={() =>
              setDurationInYears(Math.min(9999, durationInYears + 1))
            }
            className="duration-btn"
          >
            <Plus size={20} color="black" />
          </Button>
        </div>
      </div>

      {/* Price and currency selection */}
      {isCheckingPrice ? (
        <div className="price-loading">
          <CeloSpinner size={24} />
          <Text size="sm" weight="normal" color="gray" className="ml-2">
            Loading price...
          </Text>
        </div>
      ) : price > 0 ? (
        <div className="price-display">
          <div className="price-row">

            <div className="currency-section">
              <Text
                size="sm"
                weight="normal"
                color="gray"
                className="currency-label"
              >
                Select token
              </Text>
              <CurrencyDropdown
                selectedCurrency={selectedCurrency}
                onCurrencyChange={onCurrencyChange}
              />
            </div>

            <div className="price-section">
              <Text
                size="sm"
                weight="normal"
                color="gray"
                className="price-label"
              >
                Total
              </Text>
              <div className="price-value-container">
                <Text size="lg" weight="semibold" color="black">
                  {(price * durationInYears).toFixed(2)}{" "}
                  {selectedCurrency.name}
                </Text>
                {selectedCurrency.name === "CELO" && usdcPrice && usdcPrice > 0 && (
                  <Text size="sm" weight="normal" color="gray" className="usdc-price-text">
                    ({(usdcPrice * durationInYears).toFixed(2)} USD)
                  </Text>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
