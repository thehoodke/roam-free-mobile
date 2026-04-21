export type Partner = "A" | "B";

export interface PaymentMethod {
  id: string;
  name: string;          // e.g. "M-Pesa", "Equity Bank"
  icon?: string;         // emoji
  supportsFee: boolean;  // whether to prompt for txn cost
}

export interface Transaction {
  id: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  description: string;
  partner: Partner;
  date: string; // ISO string
  paymentMethodId?: string;
  transactionCost?: number; // fee charged on top
  isFee?: boolean;          // marks auto-generated fee entries
  parentId?: string;        // links fee to source txn
}

export interface BudgetGoal {
  id: string;
  category: string;
  limit: number;
  month: string; // YYYY-MM
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
  customExpenseCategories: string[];
  customIncomeCategories: string[];
  categoryRenames: Record<string, string>; // originalName -> newName (works for defaults too)
  categoryLimits: Record<string, number>;
  paymentMethods: PaymentMethod[];
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

export const DEFAULT_PAYMENT_METHODS: PaymentMethod[] = [
  { id: "cash", name: "Cash", icon: "💵", supportsFee: false },
  { id: "mpesa", name: "M-Pesa", icon: "📱", supportsFee: true },
  { id: "bank", name: "Bank Transfer", icon: "🏦", supportsFee: true },
  { id: "transfer", name: "Money Transfer", icon: "↔️", supportsFee: true },
  { id: "card", name: "Card", icon: "💳", supportsFee: false },
];

export const EXPENSE_CATEGORIES = DEFAULT_EXPENSE_CATEGORIES;
export const INCOME_CATEGORIES = DEFAULT_INCOME_CATEGORIES;
