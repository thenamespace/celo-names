import { useState } from "react";
import { ChevronDown } from "lucide-react";
import Text from "./Text";
import "./CurrencyDropdown.css";

interface CurrencyDropdownProps {
  selectedCurrency: 'CELO' | 'USDC' | 'USDT';
  onCurrencyChange: (currency: 'CELO' | 'USDC' | 'USDT') => void;
}

const currencies = [
  { 
    code: 'CELO' as const, 
    name: 'CELO', 
    logo: '/celo-logo.svg',
    available: true 
  },
  { 
    code: 'USDC' as const, 
    name: 'USDC', 
    logo: '/usdc-logo.svg',
    available: false 
  },
  { 
    code: 'USDT' as const, 
    name: 'USDT', 
    logo: '/usdt-logo.svg',
    available: false 
  }
];

export default function CurrencyDropdown({ selectedCurrency, onCurrencyChange }: CurrencyDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const selectedCurrencyData = currencies.find(c => c.code === selectedCurrency);

  const handleCurrencySelect = (currency: 'CELO' | 'USDC' | 'USDT') => {
    const currencyData = currencies.find(c => c.code === currency);
    if (currencyData?.available) {
      onCurrencyChange(currency);
      setIsOpen(false);
    }
  };

  return (
    <div className="currency-dropdown-container">
      <div 
        className="currency-dropdown"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="currency-option">
          <img 
            src={selectedCurrencyData?.logo} 
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
          {currencies.map((currency) => (
            <div
              key={currency.code}
              className={`currency-option-item ${!currency.available ? 'disabled' : ''}`}
              onClick={() => handleCurrencySelect(currency.code)}
            >
              <img 
                src={currency.logo} 
                alt={currency.name} 
                className="currency-icon"
              />
              <Text 
                size="sm" 
                weight="medium" 
                color={currency.available ? "black" : "gray"}
              >
                {currency.name}
              </Text>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
