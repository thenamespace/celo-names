import React from 'react';
import './TokenIcon.css';

interface TokenIconProps {
  tokenName: string;
  size?: number;
  className?: string;
}

const TokenIcon: React.FC<TokenIconProps> = ({ tokenName, size = 16, className = '' }) => {
  const getTokenIcon = (tokenName: string) => {
    switch (tokenName) {
      case 'CELO':
        return '/celo-logo.svg';
      case 'USDC':
        return '/usdc-logo.svg';
      case 'USDT':
        return '/usdt-logo.svg';
      case 'sUSD':
        return '/cusd-logo.png';
      default:
        return '/celo-logo.svg';
    }
  };

  return (
    <img 
      src={getTokenIcon(tokenName)} 
      alt={`${tokenName} logo`}
      className={`token-icon ${className}`}
      style={{ width: size, height: size }}
    />
  );
};

export default TokenIcon;
