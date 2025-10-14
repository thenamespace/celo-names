import { useState } from "react";
import Modal from "@components/Modal";
import TransactionPending from "@components/TransactionPending";
import { sleep } from "@/utils";
import type{ Hash } from "viem";

export type TransactionStatus = 'pending' | 'success' | 'failed';

export const retry_count = 3;

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

  const waitForTransaction = async (publicClient: any, txHash: Hash) => {
    for (let i = 0; i <= retry_count; i++) {
      try {
        await publicClient.waitForTransactionReceipt({ hash: txHash });
        break;
      } catch (err) {
        if (i === retry_count) {
          throw err;
        }
        await sleep(1000); // Sleep for 1 second before retry
      }
    }
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
    waitForTransaction,
    TransactionModal,
    isOpen: modalState.isOpen,
    status: modalState.status
  };
};
