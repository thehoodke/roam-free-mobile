import { Transaction, CoupleProfile, BudgetConfig, InvestmentAccount, InvestmentTransaction, AccountBalance, Debt, DebtPayment } from "@/types/budget";

export interface BackupData {
  version: string;
  timestamp: string;
  transactions: Transaction[];
  profile: CoupleProfile;
  budgetConfig: BudgetConfig;
  investmentAccounts: InvestmentAccount[];
  investmentTransactions: InvestmentTransaction[];
  accountBalances: AccountBalance[];
  debts: Debt[];
  debtPayments: DebtPayment[];
}

const STORAGE_KEYS = {
  TRANSACTIONS: "couplebank_transactions",
  PROFILE: "couplebank_profile",
  BUDGET_CONFIG: "couplebank_budget_config",
  INVEST_ACCOUNTS: "couplebank_invest_accounts",
  INVEST_TX: "couplebank_invest_transactions",
  ACCOUNT_BALANCES: "couplebank_account_balances",
  DEBTS: "couplebank_debts",
  DEBT_PAYMENTS: "couplebank_debt_payments",
};

const BACKUP_VERSION = "1.0";

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function createBackup(): BackupData {
  const transactions = loadFromStorage<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, []);
  const profile = loadFromStorage<CoupleProfile>(STORAGE_KEYS.PROFILE, {
    partnerAName: "Partner A",
    partnerBName: "Partner B",
  });
  const budgetConfig = loadFromStorage<BudgetConfig>(STORAGE_KEYS.BUDGET_CONFIG, {});
  const investmentAccounts = loadFromStorage<InvestmentAccount[]>(STORAGE_KEYS.INVEST_ACCOUNTS, []);
  const investmentTransactions = loadFromStorage<InvestmentTransaction[]>(STORAGE_KEYS.INVEST_TX, []);
  const accountBalances = loadFromStorage<AccountBalance[]>(STORAGE_KEYS.ACCOUNT_BALANCES, []);
  const debts = loadFromStorage<Debt[]>(STORAGE_KEYS.DEBTS, []);
  const debtPayments = loadFromStorage<DebtPayment[]>(STORAGE_KEYS.DEBT_PAYMENTS, []);

  return {
    version: BACKUP_VERSION,
    timestamp: new Date().toISOString(),
    transactions,
    profile,
    budgetConfig,
    investmentAccounts,
    investmentTransactions,
    accountBalances,
    debts,
    debtPayments,
  };
}

export function downloadBackup() {
  const backup = createBackup();
  const dataStr = JSON.stringify(backup, null, 2);
  const dataBlob = new Blob([dataStr], { type: "application/json" });

  const link = document.createElement("a");
  link.href = URL.createObjectURL(dataBlob);
  link.download = `couplebank-backup-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function restoreFromBackup(backupData: BackupData): { success: boolean; message: string } {
  try {
    // Validate backup data structure
    if (!backupData.version || !backupData.transactions || !backupData.profile || !backupData.budgetConfig) {
      return { success: false, message: "Invalid backup file format" };
    }

    // Save all data to localStorage
    saveToStorage(STORAGE_KEYS.TRANSACTIONS, backupData.transactions);
    saveToStorage(STORAGE_KEYS.PROFILE, backupData.profile);
    saveToStorage(STORAGE_KEYS.BUDGET_CONFIG, backupData.budgetConfig);
    saveToStorage(STORAGE_KEYS.INVEST_ACCOUNTS, backupData.investmentAccounts || []);
    saveToStorage(STORAGE_KEYS.INVEST_TX, backupData.investmentTransactions || []);
    saveToStorage(STORAGE_KEYS.ACCOUNT_BALANCES, backupData.accountBalances || []);
    saveToStorage(STORAGE_KEYS.DEBTS, backupData.debts || []);
    saveToStorage(STORAGE_KEYS.DEBT_PAYMENTS, backupData.debtPayments || []);

    return { success: true, message: "Data restored successfully! Please refresh the page to see changes." };
  } catch (error) {
    return { success: false, message: `Restore failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

export function parseBackupFile(file: File): Promise<BackupData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string) as BackupData;
        resolve(data);
      } catch (error) {
        reject(new Error("Invalid JSON file"));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}