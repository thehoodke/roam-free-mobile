import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, LineChart } from "lucide-react";
import { formatCurrency } from "@/lib/currency";

interface BalanceCardProps {
  income: number;
  expenses: number;
  balance: number;
  monthLabel: string;
  investmentNet?: number;     // contributions - withdrawals this month
  portfolioValue?: number;    // total portfolio value (lifetime)
  onPortfolioClick?: () => void;
}

export default function BalanceCard({
  income, expenses, balance, monthLabel,
  investmentNet = 0, portfolioValue = 0, onPortfolioClick,
}: BalanceCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-3xl p-6"
    >
      <p className="text-sm font-medium text-muted-foreground mb-1">{monthLabel}</p>
      <p className="font-display text-3xl font-bold tracking-tight">
        {formatCurrency(balance)}
      </p>
      <p className="text-xs text-muted-foreground mt-1">
        Net balance{investmentNet !== 0 && ` · after ${formatCurrency(investmentNet)} invested`}
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2 rounded-2xl bg-income/10 p-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-income">
            <TrendingUp className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Income</p>
            <p className="text-sm font-bold text-income">{formatCurrency(income)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-2xl bg-expense/10 p-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-expense">
            <TrendingDown className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Expenses</p>
            <p className="text-sm font-bold text-expense">{formatCurrency(expenses)}</p>
          </div>
        </div>
      </div>

      {(portfolioValue > 0 || investmentNet > 0) && (
        <button
          onClick={onPortfolioClick}
          className="mt-3 w-full flex items-center gap-2 rounded-2xl bg-primary/10 p-3 text-left hover:bg-primary/15 transition-colors"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary">
            <LineChart className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Portfolio</p>
            <p className="text-sm font-bold text-primary">{formatCurrency(portfolioValue)}</p>
          </div>
          {investmentNet !== 0 && (
            <span className="text-[11px] text-muted-foreground">
              {investmentNet > 0 ? "+" : ""}{formatCurrency(investmentNet)} this mo.
            </span>
          )}
        </button>
      )}
    </motion.div>
  );
}
