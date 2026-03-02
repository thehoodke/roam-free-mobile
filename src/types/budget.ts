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

export const EXPENSE_CATEGORIES = [
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

export const INCOME_CATEGORIES = [
  "💼 Salary",
  "💰 Freelance",
  "📈 Investments",
  "🎁 Gifts",
  "📦 Other",
] as const;
