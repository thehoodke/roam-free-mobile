import { motion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";
import { formatCurrency } from "@/lib/currency";

interface BalanceCardProps {
  income: number;
  expenses: number;
  balance: number;
  monthLabel: string;
}

export default function BalanceCard({ income, expenses, balance, monthLabel }: BalanceCardProps) {
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
      <p className="text-xs text-muted-foreground mt-1">Net balance</p>

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
    </motion.div>
  );
}
