import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Partner, Transaction } from "@/types/budget";

interface AddTransactionProps {
  onAdd: (tx: Omit<Transaction, "id">) => void;
  getPartnerName: (p: Partner) => string;
  expenseCategories: readonly string[] | string[];
  incomeCategories: readonly string[] | string[];
}

export default function AddTransaction({ onAdd, getPartnerName, expenseCategories, incomeCategories }: AddTransactionProps) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [partner, setPartner] = useState<Partner>("A");

  const categories = type === "expense" ? expenseCategories : incomeCategories;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !category) return;
    onAdd({
      amount: parseFloat(amount),
      type,
      category,
      description,
      partner,
      date: new Date().toISOString(),
    });
    setAmount("");
    setCategory("");
    setDescription("");
    setOpen(false);
  };

  return (
    <>
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
      >
        <Plus className="h-6 w-6" />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/20 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-t-3xl bg-card p-6 pb-10 shadow-xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-xl font-bold">Add Transaction</h2>
                <button onClick={() => setOpen(false)} className="text-muted-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Type toggle */}
                <div className="flex gap-2 rounded-xl bg-muted p-1">
                  <button
                    type="button"
                    onClick={() => { setType("expense"); setCategory(""); }}
                    className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${
                      type === "expense"
                        ? "bg-expense text-primary-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    Expense
                  </button>
                  <button
                    type="button"
                    onClick={() => { setType("income"); setCategory(""); }}
                    className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${
                      type === "income"
                        ? "bg-income text-primary-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    Income
                  </button>
                </div>

                {/* Amount */}
                <div>
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="mt-1 text-2xl font-bold"
                    required
                  />
                </div>

                {/* Category */}
                <div>
                  <Label>Category</Label>
                  <Select value={category} onValueChange={setCategory} required>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Description */}
                <div>
                  <Label htmlFor="desc">Description (optional)</Label>
                  <Input
                    id="desc"
                    placeholder="What's it for?"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="mt-1"
                  />
                </div>

                {/* Partner */}
                <div>
                  <Label>Who paid?</Label>
                  <div className="mt-1 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPartner("A")}
                      className={`flex-1 rounded-xl border-2 py-2.5 text-sm font-semibold transition-colors ${
                        partner === "A"
                          ? "border-partner-a bg-partner-a/10 partner-a"
                          : "border-border text-muted-foreground"
                      }`}
                    >
                      {getPartnerName("A")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPartner("B")}
                      className={`flex-1 rounded-xl border-2 py-2.5 text-sm font-semibold transition-colors ${
                        partner === "B"
                          ? "border-partner-b bg-partner-b/10 partner-b"
                          : "border-border text-muted-foreground"
                      }`}
                    >
                      {getPartnerName("B")}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full" size="lg">
                  Add {type === "expense" ? "Expense" : "Income"}
                </Button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
