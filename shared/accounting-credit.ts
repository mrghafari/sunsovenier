export interface AccountingCreditExposure {
  companyId: number;
  walletId: number;
  customerId: number;
  currency: string;
  creditLimit: string | null;
  openReceivables: string;
  unclearedChequeAllocations: string;
  approvedUnbilledCredit: string;
  exposure: string;
  remainingCredit: string | null;
  ledgerReceivables: string | null;
  openingApproved: boolean;
  reconciled: boolean;
  blockingCodes: string[];
  readOnly: true;
}