export type Partner = "A" | "B";

export interface PaymentMethod {
  id: string;
  name: string;          // e.g. "M-Pesa", "Equity Bank"
  icon?: string;         // emoji
  supportsFee: boolean;  // whether to prompt for txn cost
}

export interface CategoryNode {
  id: string;
  name: string;
  icon?: string;
  children?: CategoryNode[];
  parentId?: string;
  level: number; // 0 = root, 1 = child, 2 = grandchild, etc.
  fullPath: string; // e.g. "Food & Dining > Groceries > Fruits"
}

export interface Transaction {
  id: string;
  amount: number;
  type: "income" | "expense" | "transfer";
  category: string; // category ID for nested categories
  description: string;
  partner: Partner;
  date: string; // ISO string
  paymentMethodId?: string;
  transactionCost?: number; // fee charged on top
  isFee?: boolean;          // marks auto-generated fee entries
  parentId?: string;        // links fee to source txn
  transferToAccountId?: string; // for transfers: destination account
  transferFromAccountId?: string; // for transfers: source account
}

export interface AccountBalance {
  id: string;
  paymentMethodId: string;
  balance: number;
  lastUpdated: string; // ISO
  initialBalance: number;
  partner: Partner | "shared";
}

export interface Debt {
  id: string;
  name: string;
  description?: string;
  totalAmount: number;
  remainingAmount: number;
  creditor: string; // who is owed the money
  debtor: Partner | "shared"; // who owes the money
  dueDate?: string; // ISO
  interestRate?: number; // annual interest rate (percentage)
  createdAt: string; // ISO
  lastPaymentDate?: string; // ISO
  isPaidOff: boolean;
  category: string; // debt category ID
}

export interface DebtPayment {
  id: string;
  debtId: string;
  amount: number;
  date: string; // ISO
  paymentMethodId?: string;
  transactionCost?: number;
  note?: string;
  transactionId?: string; // link to the actual transaction
}

export interface BudgetGoal {
  id: string;
  category: string; // category ID
  limit: number;
  month: string; // YYYY-MM
  includeSubcategories: boolean; // whether to include child categories
}

export interface CoupleProfile {
  partnerAName: string;
  partnerBName: string;
}

export interface BudgetConfig {
  dailyLimitShared: number;
  dailyLimitA: number;
  dailyLimitB: number;
  monthlyLimitShared: number;
  monthlyLimitA: number;
  monthlyLimitB: number;
  customExpenseCategories: string[]; // deprecated, use categoryTree instead
  customIncomeCategories: string[]; // deprecated, use categoryTree instead
  categoryRenames: Record<string, string>; // originalName -> newName (works for defaults too)
  categoryLimits: Record<string, number>; // category ID -> limit
  paymentMethods: PaymentMethod[];
  customInvestmentCategories: string[]; // deprecated, use categoryTree instead
  categoryTree: {
    expense: CategoryNode[];
    income: CategoryNode[];
    investment: CategoryNode[];
    debt: CategoryNode[];
  };
}

// Investments
export interface InvestmentAccount {
  id: string;
  name: string;            // e.g. "CIC Money Market", "Safaricom NSE"
  category: string;        // from INVESTMENT_CATEGORIES or custom
  partner: Partner | "shared";
  currentValue: number;    // manually-updated valuation
  lastValuationDate?: string; // ISO
  notes?: string;
  createdAt: string;       // ISO
}

export type InvestmentTxType = "contribution" | "withdrawal" | "valuation";

export interface InvestmentTransaction {
  id: string;
  accountId: string;
  type: InvestmentTxType;
  amount: number;          // for contribution/withdrawal: cash flow; for valuation: new total value
  date: string;            // ISO
  paymentMethodId?: string;
  transactionCost?: number;
  note?: string;
}

export const DEFAULT_EXPENSE_CATEGORIES = [
  "🍔 Food & Dining",
  "🏠 Housing",
  "🚗 Transport",
  "🛒 Groceries",
  "💊 Health",
  "🎬 Entertainment",
  "👗 Shopping",
  "📱 Subscriptions",
  "🎁 Gifts",
  "📦 Other",
] as const;

export const DEFAULT_INCOME_CATEGORIES = [
  "💼 Salary",
  "💰 Freelance",
  "📈 Investments",
  "🎁 Gifts",
  "📦 Other",
] as const;

export const DEFAULT_DEBT_CATEGORIES = [
  "🏠 Mortgage",
  "🚗 Car Loan",
  "📚 Student Loan",
  "💳 Credit Card",
  "🏦 Personal Loan",
  "📱 Phone Contract",
  "🏘️ Rent Deposit",
  "📦 Other",
] as const;

export const DEFAULT_PAYMENT_METHODS: PaymentMethod[] = [
  { id: "cash", name: "Cash", icon: "💵", supportsFee: false },
  { id: "mpesa", name: "M-Pesa", icon: "📱", supportsFee: true },
  { id: "bank", name: "Bank Transfer", icon: "🏦", supportsFee: true },
  { id: "transfer", name: "Money Transfer", icon: "↔️", supportsFee: true },
  { id: "card", name: "Card", icon: "💳", supportsFee: false },
];

export const DEFAULT_INVESTMENT_CATEGORIES = [
  // Standard
  "📈 Stocks",
  "📊 Bonds",
  "🏦 Mutual Funds",
  "₿ Crypto",
  "🏘️ Real Estate",
  "💼 Other",
  // Kenya-focused
  "🤝 SACCO",
  "💵 Money Market Fund",
  "🏛️ T-Bills / T-Bonds",
  "📉 NSE Stocks",
  "👥 Chama",
] as const;

// Helper functions for category trees
export function createDefaultCategoryTree(): BudgetConfig['categoryTree'] {
  const createNodes = (categories: readonly string[], type: string): CategoryNode[] => {
    return categories.map((cat, index) => ({
      id: `${type}-${index}`,
      name: cat,
      level: 0,
      fullPath: cat,
    }));
  };

  return {
    expense: createNodes(DEFAULT_EXPENSE_CATEGORIES, 'expense'),
    income: createNodes(DEFAULT_INCOME_CATEGORIES, 'income'),
    investment: createNodes(DEFAULT_INVESTMENT_CATEGORIES, 'investment'),
    debt: createNodes(DEFAULT_DEBT_CATEGORIES, 'debt'),
  };
}

export function findCategoryById(tree: CategoryNode[], id: string): CategoryNode | null {
  for (const node of tree) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findCategoryById(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

export function getAllCategoryIds(tree: CategoryNode[]): string[] {
  const ids: string[] = [];
  const traverse = (nodes: CategoryNode[]) => {
    for (const node of nodes) {
      ids.push(node.id);
      if (node.children) traverse(node.children);
    }
  };
  traverse(tree);
  return ids;
}

export function getCategoryPath(tree: CategoryNode[], categoryId: string): string[] {
  const path: string[] = [];
  const traverse = (nodes: CategoryNode[], targetId: string): boolean => {
    for (const node of nodes) {
      if (node.id === targetId) {
        path.push(node.name);
        return true;
      }
      if (node.children) {
        if (traverse(node.children, targetId)) {
          path.unshift(node.name);
          return true;
        }
      }
    }
    return false;
  };
  traverse(tree, categoryId);
  return path;
}

export function getChildCategories(tree: CategoryNode[], parentId: string): CategoryNode[] {
  const parent = findCategoryById(tree, parentId);
  return parent?.children || [];
}

export function addSubcategory(tree: CategoryNode[], parentId: string, name: string, icon?: string): CategoryNode[] {
  const newTree = JSON.parse(JSON.stringify(tree)); // Deep clone

  const traverse = (nodes: CategoryNode[]): boolean => {
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].id === parentId) {
        if (!nodes[i].children) nodes[i].children = [];
        const newNode: CategoryNode = {
          id: crypto.randomUUID(),
          name,
          icon,
          level: nodes[i].level + 1,
          fullPath: `${nodes[i].fullPath} > ${name}`,
          parentId,
        };
        nodes[i].children!.push(newNode);
        return true;
      }
      if (nodes[i].children && traverse(nodes[i].children)) {
        return true;
      }
    }
    return false;
  };

  traverse(newTree);
  return newTree;
}

export const EXPENSE_CATEGORIES = DEFAULT_EXPENSE_CATEGORIES;
export const INCOME_CATEGORIES = DEFAULT_INCOME_CATEGORIES;
export const INVESTMENT_CATEGORIES = DEFAULT_INVESTMENT_CATEGORIES;
