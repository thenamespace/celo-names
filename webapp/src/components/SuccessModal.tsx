import React, { useEffect, useState } from 'react';
import Confetti from 'react-confetti';
import Text from '@components/Text';
import Button from '@components/Button';
import Modal from '@components/Modal';
import './SuccessModal.css';

interface SuccessModalProps {
  isOpen: boolean;
  onContinue: () => void;
  mintedName: string;
}

const SuccessModal: React.FC<SuccessModalProps> = ({ 
  isOpen, 
  onContinue, 
  mintedName 
}) => {
  const [windowDimensions, setWindowDimensions] = useState({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    const updateDimensions = () => {
      setWindowDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);

    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  if (!isOpen) return null;

  return (
    <>
      {/* Confetti Effect */}
      <Confetti
        style={{zIndex: 9999}}
        width={windowDimensions.width}
        height={windowDimensions.height}
        recycle={false}
        numberOfPieces={200}
        gravity={0.3}
        initialVelocityY={20}
        colors={['#35D07F', '#FBCC5C', '#5EA33B', '#42A5F5']}
      />
      
      {/* Success Modal */}
      <Modal 
        isOpen={isOpen} 
        onClose={() => {}} // Prevent closing on backdrop
      >
        <div className="success-modal-content">
          <img 
            src="/celo-logo.svg" 
            alt="Celo Logo" 
            className="success-celo-logo animated"
          />
          <Text size="lg" weight="normal" color="gray">
            You successfully minted
          </Text>
          <Text size="3xl" weight="bold" color="black">
            {mintedName}
          </Text>
          <Button
            onClick={onContinue}
            variant="primary"
            size="large"
            className="success-continue-button"
          >
            <Text size="base" weight="medium" color="black">
              Continue
            </Text>
          </Button>
        </div>
      </Modal>
    </>
  );
};

export default SuccessModal;
