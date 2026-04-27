import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, ArrowRightLeft } from "lucide-react";
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
import { Partner, Transaction, PaymentMethod, CategoryNode } from "@/types/budget";

interface AddTransactionProps {
  onAdd: (tx: Omit<Transaction, "id">) => void;
  onAddTransfer?: (fromAccountId: string, toAccountId: string, amount: number, partner: Partner, description: string, transactionCost?: number) => void;
  getPartnerName: (p: Partner) => string;
  expenseCategories: CategoryNode[];
  incomeCategories: CategoryNode[];
  paymentMethods: PaymentMethod[];
  getCategoryDisplayName: (categoryId: string, type: 'expense' | 'income') => string;
}

export default function AddTransaction({
  onAdd,
  onAddTransfer,
  getPartnerName,
  expenseCategories,
  incomeCategories,
  paymentMethods,
  getCategoryDisplayName,
}: AddTransactionProps) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"income" | "expense" | "transfer">("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [partner, setPartner] = useState<Partner>("A");
  const [paymentMethodId, setPaymentMethodId] = useState<string>(paymentMethods[0]?.id || "");
  const [transactionCost, setTransactionCost] = useState("");
  const [transferToAccountId, setTransferToAccountId] = useState<string>("");

  const categories = type === "expense" ? expenseCategories : incomeCategories;
  const flattenedCategories = useMemo(() => {
    const flatten = (nodes: CategoryNode[]): CategoryNode[] =>
      nodes.flatMap((node) => [
        node,
        ...(node.children ? flatten(node.children) : []),
      ]);

    return flatten(categories);
  }, [categories]);

  const selectedPm = useMemo(
    () => paymentMethods.find((p) => p.id === paymentMethodId),
    [paymentMethods, paymentMethodId]
  );

  useEffect(() => {
    if (!paymentMethods.length) {
      setPaymentMethodId("");
      return;
    }

    if (!paymentMethods.some((method) => method.id === paymentMethodId)) {
      setPaymentMethodId(paymentMethods[0].id);
    }
  }, [paymentMethodId, paymentMethods]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (type === "transfer") {
      if (!amount || !paymentMethodId || !transferToAccountId || !onAddTransfer) return;

      onAddTransfer(
        paymentMethodId,
        transferToAccountId,
        parseFloat(amount),
        partner,
        description,
        selectedPm?.supportsFee && transactionCost ? parseFloat(transactionCost) : undefined
      );
    } else {
      if (!amount || !category) return;

      onAdd({
        amount: parseFloat(amount),
        type,
        category,
        description,
        partner,
        date: new Date().toISOString(),
        paymentMethodId: paymentMethodId || undefined,
        transactionCost: selectedPm?.supportsFee && transactionCost ? parseFloat(transactionCost) : undefined,
      });
    }

    // Reset form
    setAmount("");
    setCategory("");
    setDescription("");
    setTransactionCost("");
    setTransferToAccountId("");
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
              className="w-full max-w-lg rounded-t-3xl bg-card p-6 pb-10 shadow-xl max-h-[90vh] overflow-y-auto"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-xl font-bold">Add Transaction</h2>
                <button onClick={() => setOpen(false)} className="text-muted-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex gap-1 rounded-xl bg-muted p-1">
                  <button
                    type="button"
                    onClick={() => { setType("expense"); setCategory(""); setTransferToAccountId(""); }}
                    className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${
                      type === "expense" ? "bg-expense text-primary-foreground" : "text-muted-foreground"
                    }`}
                  >
                    Expense
                  </button>
                  <button
                    type="button"
                    onClick={() => { setType("income"); setCategory(""); setTransferToAccountId(""); }}
                    className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${
                      type === "income" ? "bg-income text-primary-foreground" : "text-muted-foreground"
                    }`}
                  >
                    Income
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setType("transfer");
                      setCategory("");
                      setTransferToAccountId("");
                      setTransactionCost("");
                    }}
                    className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${
                      type === "transfer" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                    }`}
                  >
                    <ArrowRightLeft className="h-4 w-4 mx-auto" />
                  </button>
                </div>

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

                {type !== "transfer" && (
                  <div>
                    <Label>Category</Label>
                    <Select value={category} onValueChange={setCategory} required>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {flattenedCategories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.fullPath}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {type === "transfer" && (
                  <div className="space-y-4">
                    <div>
                      <Label>From Account</Label>
                      <Select value={paymentMethodId} onValueChange={setPaymentMethodId} required>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select source account" />
                        </SelectTrigger>
                        <SelectContent>
                          {paymentMethods.map((pm) => (
                            <SelectItem key={pm.id} value={pm.id}>
                              {pm.icon} {pm.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>To Account</Label>
                      <Select value={transferToAccountId} onValueChange={setTransferToAccountId} required>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select destination account" />
                        </SelectTrigger>
                        <SelectContent>
                          {paymentMethods.filter(pm => pm.id !== paymentMethodId).map((pm) => (
                            <SelectItem key={pm.id} value={pm.id}>
                              {pm.icon} {pm.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {type !== "transfer" && (
                  <div>
                    <Label>Payment Method</Label>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {paymentMethods.map((pm) => {
                        const isActive = pm.id === paymentMethodId;

                        return (
                          <button
                          key={pm.id}
                          type="button"
                          onClick={() => {
                            setPaymentMethodId(pm.id);
                            setTransactionCost("");
                          }}
                          className={`rounded-xl border px-3 py-3 text-left transition-colors ${
                            isActive
                              ? "border-primary bg-primary/10 text-foreground"
                              : "border-border bg-card text-muted-foreground"
                          }`}
                        >
                          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <span className="text-base">{pm.icon}</span>
                            <span className="truncate">{pm.name}</span>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {pm.supportsFee ? "Supports fee tracking" : "No transaction fee"}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
                )}

                {selectedPm?.supportsFee && (
                  <div>
                    <Label htmlFor="fee">Transaction Cost (optional)</Label>
                    <Input
                      id="fee"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="e.g. 22"
                      value={transactionCost}
                      onChange={(e) => setTransactionCost(e.target.value)}
                      className="mt-1"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Tracked separately as a "Transaction Fees" expense.
                    </p>
                  </div>
                )}

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
                  Add {type === "expense" ? "Expense" : type === "income" ? "Income" : "Transfer"}
                </Button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
