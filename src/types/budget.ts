export type Partner = "A" | "B";

export interface Transaction {
  id: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  description: string;
  partner: Partner;
  date: string; // ISO string
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
  dailyLimitShared: number; // 0 = no limit
  dailyLimitA: number;
  dailyLimitB: number;
  monthlyLimitShared: number;
  monthlyLimitA: number;
  monthlyLimitB: number;
  customExpenseCategories: string[];
  customIncomeCategories: string[];
  categoryLimits: Record<string, number>; // category -> monthly limit
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

// Keep backward compat aliases
export const EXPENSE_CATEGORIES = DEFAULT_EXPENSE_CATEGORIES;
export const INCOME_CATEGORIES = DEFAULT_INCOME_CATEGORIES;
