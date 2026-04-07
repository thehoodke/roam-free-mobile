import { Transaction, Partner } from "@/types/budget";
import { motion } from "framer-motion";
import { Trash2 } from "lucide-react";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/currency";

interface TransactionListProps {
  transactions: Transaction[];
  getPartnerName: (p: Partner) => string;
  onDelete: (id: string) => void;
}

export default function TransactionList({
  transactions,
  getPartnerName,
  onDelete,
}: TransactionListProps) {
  if (transactions.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <p className="text-lg">No transactions yet</p>
        <p className="text-sm">Tap + to add your first one</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {transactions.map((tx, i) => (
        <motion.div
          key={tx.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.03 }}
          className="glass-card flex items-center gap-3 rounded-2xl p-4"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-lg">
            {tx.category.split(" ")[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">
              {tx.description || tx.category}
            </p>
            <p className="text-xs text-muted-foreground">
              {getPartnerName(tx.partner)} · {format(new Date(tx.date), "MMM d")}
            </p>
          </div>
          <div className="text-right">
            <p
              className={`font-bold text-sm ${
                tx.type === "income" ? "text-income" : "text-expense"
              }`}
            >
              {tx.type === "income" ? "+" : "−"}{formatCurrency(tx.amount)}
            </p>
          </div>
          <button
            onClick={() => onDelete(tx.id)}
            className="ml-1 text-muted-foreground/50 hover:text-destructive transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </motion.div>
      ))}
    </div>
  );
}
