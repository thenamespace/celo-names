export const ERRORS = {
  OWNER_ONLY: 'OwnableUnauthorizedAccount',
  REGISTRAR_ONLY: 'InsufficientRole("REGISTRAR"',
  ADMIN_ONLY: 'InsufficientRole("ADMIN"',
  ROLE_ALREADY_SET: 'RoleAlreadySet',
  SUBDOMAIN_ALREADY_TAKEN: 'SubdomainAlreadyTaken',
  INVALID_EXPIRY_TIME: 'InvalidExpiryTime',
  SUBDOMAIN_EXPIRED: 'SubdomainExpired',
  EMPTY_LABEL: 'EmptyLabel',
  CANNOT_TRANSFER_EXPIRED_NFT: 'CannotTransferExpiredNFT',
  PARENT_NODE_NOT_VALID: "ParentNodeNotValid",
  TOKEN_DOES_NOT_EXIST: 'TokenDoesNotExist'
} as const;

export interface ContractError extends Error {
  message: string;
  cause?: {
    data?: string;
    message?: string;
  };
}

export const expectContractCallToFail = async (
  contractCall: () => Promise<any>,
  expectedError: string
): Promise<void> => {
  try {
    await contractCall();
    throw new Error('Expected contract call to fail but it succeeded');
  } catch (error) {
    const contractError = error as ContractError;
    if (!contractError.message.includes(expectedError)) {
      throw new Error(
        `Expected error to contain "${expectedError}" but got: ${contractError.message}`
      );
    }
  }
};
