import { useEffect, useState } from "react";
import { CheckCircle, XCircle, ExternalLink } from "lucide-react";
import Text from "./Text";
import Button from "./Button";
import "./TransactionPending.css";

type TransactionStatus = 'pending' | 'success' | 'failed';

interface TransactionPendingProps {
  status: TransactionStatus;
  transactionHash?: string;
  onClose: () => void;
}

const CELOSCAN_BASE_URL = 'https://celoscan.io/tx/';

export default function TransactionPending({ status, transactionHash, onClose }: TransactionPendingProps) {
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (status === 'success') {
      const timer = setTimeout(() => setShowSuccess(true), 500);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const getStatusContent = () => {
    switch (status) {
      case 'pending':
        return {
          icon: (
            <div className="celo-logo-bounce">
              <img src="/celo-logo.svg" alt="CELO" className="celo-logo" />
            </div>
          ),
          title: "Transaction Pending",
          description: "Your transaction is being processed",
          showButton: false
        };
      case 'success':
        return {
          icon: <CheckCircle size={48} color="#35D07F" />,
          title: "Transaction Successful!",
          description: "Your CELO name has been registered successfully",
          showButton: true
        };
      case 'failed':
        return {
          icon: <XCircle size={48} color="#EF4444" />,
          title: "Transaction Failed",
          description: "Your transaction could not be completed. Please try again.",
          showButton: true
        };
    }
  };

  const content = getStatusContent();

  return (
    <div className="transaction-pending">
      <div className="transaction-content">
        <div className="transaction-icon">
          {content.icon}
        </div>
        
        <div className="transaction-text">
          <Text size="xl" weight="semibold" color="black" className="transaction-title">
            {content.title}
          </Text>
          <Text size="base" weight="normal" color="gray" className="transaction-description">
            {content.description}
          </Text>
        </div>

        {transactionHash && (
          <div className="transaction-link">
            <a 
              href={`${CELOSCAN_BASE_URL}${transactionHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="celoscan-link"
            >
              <Text size="sm" weight="medium" color="black">
                View on Celoscan
              </Text>
              <ExternalLink size={16} color="#3B82F6" />
            </a>
          </div>
        )}

        {content.showButton && (
          <div className="transaction-actions">
            <Button
              variant="primary"
              onClick={onClose}
              className="close-button"
            >
              <Text size="base" weight="medium" color="red">
                {status === 'success' ? 'Continue' : 'Try Again'}
              </Text>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
