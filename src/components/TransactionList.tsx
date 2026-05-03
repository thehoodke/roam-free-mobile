import { Transaction, Partner, PaymentMethod } from "@/types/budget";
import { motion } from "framer-motion";
import { Trash2, Edit, ChevronDown, ChevronRight } from "lucide-react";
import { format, parseISO } from "date-fns";
import { formatCurrency } from "@/lib/currency";
import { useState } from "react";

interface TransactionListProps {
  transactions: Transaction[];
  getPartnerName: (p: Partner) => string;
  onDelete: (id: string) => void;
  onEdit?: (tx: Transaction) => void;
  displayCategory?: (c: string) => string;
  getPaymentMethod?: (id?: string) => PaymentMethod | undefined;
}

export default function TransactionList({
  transactions,
  getPartnerName,
  onDelete,
  onEdit,
  displayCategory = (c) => c,
  getPaymentMethod,
}: TransactionListProps) {
  const [expandedBundles, setExpandedBundles] = useState<Set<string>>(new Set());

  const toggleBundle = (txId: string) => {
    setExpandedBundles((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(txId)) {
        newSet.delete(txId);
      } else {
        newSet.add(txId);
      }
      return newSet;
    });
  };

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
      {transactions.map((tx, i) => {
        const cat = displayCategory(tx.category);
        const pm = getPaymentMethod?.(tx.paymentMethodId);
        const isBundle = tx.bundleItems && tx.bundleItems.length > 0;
        const isExpanded = expandedBundles.has(tx.id);

        return (
          <div key={tx.id}>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className={`glass-card flex items-center gap-3 rounded-2xl p-4 ${tx.isFee ? "opacity-75" : ""}`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-lg">
                {cat.split(" ")[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm truncate">{tx.description || cat}</p>
                  {isBundle && (
                    <button
                      onClick={() => toggleBundle(tx.id)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    </button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {getPartnerName(tx.partner)} · {format(parseISO(tx.date), "MMM d, yyyy")}
                  {pm && <> · {pm.icon} {pm.name}</>}
                  {isBundle && <> · {tx.bundleItems!.length} items</>}
                </p>
              </div>
              <div className="text-right">
                <p className={`font-bold text-sm ${tx.type === "income" ? "text-income" : "text-expense"}`}>
                  {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount)}
                </p>
                {tx.isFee && <p className="text-[10px] text-muted-foreground">fee</p>}
              </div>
              <div className="flex gap-1">
                {onEdit && !tx.isFee && !tx.id.endsWith("-in") && !tx.bundleItems && (
                  <button
                    onClick={() => onEdit(tx)}
                    className="text-muted-foreground/50 hover:text-foreground transition-colors"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => onDelete(tx.id)}
                  className="text-muted-foreground/50 hover:text-destructive transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </motion.div>

            {isBundle && isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="ml-8 space-y-1"
              >
                {tx.bundleItems!.map((item) => {
                  const itemCat = displayCategory(item.category);
                  return (
                    <div key={item.id} className="flex items-center gap-3 rounded-xl bg-muted/50 p-3 ml-4">
                      <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-muted text-xs">
                        {itemCat.split(" ")[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{item.description || itemCat}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-medium ${tx.type === "income" ? "text-income" : "text-expense"}`}>
                          {tx.type === "income" ? "+" : "-"}{formatCurrency(item.amount)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            )}
          </div>
        );
      })}
    </div>
  );
}
