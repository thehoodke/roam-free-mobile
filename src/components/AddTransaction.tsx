import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, ArrowRightLeft, Calendar } from "lucide-react";
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
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, parseISO } from "date-fns";
import { formatCurrency } from "@/lib/currency";
import { Partner, Transaction, PaymentMethod, CategoryNode, TransactionBundleItem } from "@/types/budget";

interface AddTransactionProps {
  onAdd: (tx: Omit<Transaction, "id">) => void;
  onAddTransfer?: (
    fromAccountId: string,
    toAccountId: string,
    amount: number,
    partner: Partner,
    description: string,
    transactionCost?: number,
    date?: string
  ) => void;
  getPartnerName: (p: Partner) => string;
  expenseCategories: CategoryNode[];
  incomeCategories: CategoryNode[];
  paymentMethods: PaymentMethod[];
  getCategoryDisplayName: (categoryId: string, type: 'expense' | 'income') => string;
  editingTransaction?: Transaction | null;
  onUpdate?: (tx: Transaction) => void;
  onCancelEdit?: () => void;
}

export default function AddTransaction({
  onAdd,
  onAddTransfer,
  getPartnerName,
  expenseCategories,
  incomeCategories,
  paymentMethods,
  getCategoryDisplayName,
  editingTransaction,
  onUpdate,
  onCancelEdit,
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
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isBundleMode, setIsBundleMode] = useState(false);
  const [bundleItems, setBundleItems] = useState<TransactionBundleItem[]>([]);
  const [currentBundleItem, setCurrentBundleItem] = useState({
    category: "",
    description: "",
    amount: "",
  });

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

  const bundleTotal = bundleItems.reduce((sum, item) => sum + item.amount, 0);
  const remainingAmount = type !== "transfer" && amount ? parseFloat(amount) - bundleTotal : 0;

  const addBundleItem = () => {
    if (!currentBundleItem.category || !currentBundleItem.amount) return;

    const newItem: TransactionBundleItem = {
      id: crypto.randomUUID(),
      category: currentBundleItem.category,
      description: currentBundleItem.description,
      amount: parseFloat(currentBundleItem.amount),
    };

    setBundleItems(prev => [...prev, newItem]);
    setCurrentBundleItem({ category: "", description: "", amount: "" });
  };

  const removeBundleItem = (id: string) => {
    setBundleItems(prev => prev.filter(item => item.id !== id));
  };

  useEffect(() => {
    if (!paymentMethods.length) {
      setPaymentMethodId("");
      return;
    }

    if (!paymentMethods.some((method) => method.id === paymentMethodId)) {
      setPaymentMethodId(paymentMethods[0].id);
    }
  }, [paymentMethodId, paymentMethods]);

  // Initialize form for editing
  useEffect(() => {
    if (editingTransaction) {
      setOpen(true);
      setType(editingTransaction.type);
      setAmount(editingTransaction.amount.toString());
      setCategory(editingTransaction.category);
      setDescription(editingTransaction.description || "");
      setPartner(editingTransaction.partner);
      setPaymentMethodId(editingTransaction.paymentMethodId || paymentMethods[0]?.id || "");
      setTransactionCost(editingTransaction.transactionCost?.toString() || "");
      setSelectedDate(parseISO(editingTransaction.date));
      if (editingTransaction.type === "transfer") {
        setTransferToAccountId(editingTransaction.transferToAccountId || "");
      }
    } else if (open) {
      // Reset form for new transaction or when editing is cancelled
      setType("expense");
      setAmount("");
      setCategory("");
      setDescription("");
      setPartner("A");
      setPaymentMethodId(paymentMethods[0]?.id || "");
      setTransactionCost("");
      setTransferToAccountId("");
      setSelectedDate(new Date());
      setIsBundleMode(false);
      setBundleItems([]);
      setCurrentBundleItem({ category: "", description: "", amount: "" });
    }
  }, [editingTransaction, open, paymentMethods]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (type === "transfer") {
      if (!amount || !paymentMethodId || !transferToAccountId) return;

      if (editingTransaction && onUpdate) {
        // Editing existing transfer - need to update both transfer-out and transfer-in
        const fee = selectedPm?.supportsFee && transactionCost ? parseFloat(transactionCost) : 0;
        const receivedAmount = Math.max(0, parseFloat(amount) - fee);

        // Find the related transfer transaction (the pair)
        const isTransferOut = editingTransaction.id.endsWith('-out');
        const pairId = isTransferOut ? editingTransaction.id.replace('-out', '-in') : editingTransaction.id.replace('-in', '-out');
        
        // Update the transfer-out transaction
        const transferOutData = {
          ...editingTransaction,
          amount: parseFloat(amount),
          description: `Transfer to ${transferToAccountId}: ${description}`,
          partner,
          date: format(selectedDate, "yyyy-MM-dd"),
          paymentMethodId,
          transactionCost: fee ? fee / 2 : undefined,
          transferFromAccountId: paymentMethodId,
          transferToAccountId,
        };

        // Update the transfer-in transaction
        const transferInData = {
          id: pairId,
          amount: receivedAmount,
          type: "transfer" as const,
          category: "transfer",
          description: `Transfer from ${paymentMethodId}: ${description}`,
          partner,
          date: format(selectedDate, "yyyy-MM-dd"),
          paymentMethodId: transferToAccountId,
          transactionCost: fee ? fee / 2 : undefined,
          transferFromAccountId: paymentMethodId,
          transferToAccountId,
          isFee: false,
        };

        onUpdate(transferOutData);
        onUpdate(transferInData);
      } else if (onAddTransfer) {
        // Adding new transfer
        onAddTransfer(
          paymentMethodId,
          transferToAccountId,
          parseFloat(amount),
          partner,
          description,
          selectedPm?.supportsFee && transactionCost ? parseFloat(transactionCost) : undefined,
          format(selectedDate, "yyyy-MM-dd")
        );
      }
    } else {
      if (!amount || (!category && !isBundleMode) || (isBundleMode && bundleItems.length === 0)) return;

      const transactionData = {
        amount: parseFloat(amount),
        type,
        category: isBundleMode ? "bundle" : category,
        description,
        partner,
        date: format(selectedDate, "yyyy-MM-dd"),
        paymentMethodId: paymentMethodId || undefined,
        transactionCost: selectedPm?.supportsFee && transactionCost ? parseFloat(transactionCost) : undefined,
        bundleItems: isBundleMode && bundleItems.length > 0 ? bundleItems : undefined,
      };

      if (editingTransaction && onUpdate) {
        // Editing existing transaction
        onUpdate({
          ...editingTransaction,
          ...transactionData,
        });
      } else {
        // Adding new transaction
        onAdd(transactionData);
      }
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
                <h2 className="font-display text-xl font-bold">
                  {editingTransaction ? "Edit Transaction" : "Add Transaction"}
                </h2>
                <div className="flex gap-2">
                  {editingTransaction && onCancelEdit && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        onCancelEdit();
                        setOpen(false);
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                  <button onClick={() => setOpen(false)} className="text-muted-foreground">
                    <X className="h-5 w-5" />
                  </button>
                </div>
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

                {type !== "transfer" && (
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Bundle Mode</Label>
                    <button
                      type="button"
                      onClick={() => setIsBundleMode(!isBundleMode)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        isBundleMode ? "bg-primary" : "bg-muted"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          isBundleMode ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                )}

                <div>
                  <Label htmlFor="amount">Total Amount</Label>
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
                  {isBundleMode && bundleItems.length > 0 && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      Allocated: {formatCurrency(bundleTotal)} | Remaining: {formatCurrency(remainingAmount)}
                    </div>
                  )}
                </div>

                {type !== "transfer" && !isBundleMode && (
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

                {type !== "transfer" && isBundleMode && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Bundle Items</Label>
                      <span className="text-xs text-muted-foreground">{bundleItems.length} items</span>
                    </div>

                    {/* Add bundle item form */}
                    <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Category</Label>
                          <Select value={currentBundleItem.category} onValueChange={(value) =>
                            setCurrentBundleItem(prev => ({ ...prev, category: value }))
                          }>
                            <SelectTrigger className="h-8">
                              <SelectValue placeholder="Category" />
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
                        <div>
                          <Label className="text-xs">Amount</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={currentBundleItem.amount}
                            onChange={(e) => setCurrentBundleItem(prev => ({ ...prev, amount: e.target.value }))}
                            className="h-8"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Description (Optional)</Label>
                        <Input
                          placeholder="Item description"
                          value={currentBundleItem.description}
                          onChange={(e) => setCurrentBundleItem(prev => ({ ...prev, description: e.target.value }))}
                          className="h-8"
                        />
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        onClick={addBundleItem}
                        disabled={!currentBundleItem.category || !currentBundleItem.amount}
                        className="w-full"
                      >
                        Add Item
                      </Button>
                    </div>

                    {/* Bundle items list */}
                    {bundleItems.length > 0 && (
                      <div className="space-y-2">
                        {bundleItems.map((item) => {
                          const cat = flattenedCategories.find(c => c.id === item.category);
                          return (
                            <div key={item.id} className="flex items-center justify-between p-2 bg-background rounded border">
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">
                                  {item.description || (cat?.fullPath || item.category)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {formatCurrency(item.amount)}
                                </div>
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => removeBundleItem(item.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}
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
                  <Label>Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal mt-1"
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {format(selectedDate, "PPP")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => date && setSelectedDate(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
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
                  {editingTransaction ? "Update" : "Add"} {type === "expense" ? "Expense" : type === "income" ? "Income" : "Transfer"}
                </Button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
