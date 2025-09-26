import { useState } from "react";
import Modal from "@components/Modal";
import TransactionPending from "@components/TransactionPending";

export type TransactionStatus = 'pending' | 'success' | 'failed';

interface TransactionModalState {
  isOpen: boolean;
  status: TransactionStatus;
  transactionHash?: string;
}

export const useTransactionModal = () => {
  const [modalState, setModalState] = useState<TransactionModalState>({
    isOpen: false,
    status: 'pending',
    transactionHash: undefined
  });

  const showTransactionModal = (transactionHash?: string) => {
    setModalState({
      isOpen: true,
      status: 'pending',
      transactionHash
    });
  };

  const updateTransactionStatus = (status: TransactionStatus) => {
    setModalState(prev => ({
      ...prev,
      status
    }));
  };

  const closeTransactionModal = () => {
    setModalState({
      isOpen: false,
      status: 'pending',
      transactionHash: undefined
    });
  };

  const TransactionModal = () => (
    <Modal isOpen={modalState.isOpen} onClose={closeTransactionModal}>
      <TransactionPending
        status={modalState.status}
        transactionHash={modalState.transactionHash}
        onClose={closeTransactionModal}
      />
    </Modal>
  );

  return {
    showTransactionModal,
    updateTransactionStatus,
    closeTransactionModal,
    TransactionModal,
    isOpen: modalState.isOpen,
    status: modalState.status
  };
};
