import { useState } from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useDebtStore } from "@/hooks/useDebtStore";
import { useBudgetStore } from "@/hooks/useBudgetStore";
import { Debt, DebtPayment } from "@/types/budget";
import { ArrowLeft, Plus, CreditCard, Calendar, DollarSign, TrendingUp, AlertTriangle, CheckCircle, Trash2, Receipt } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { format, isAfter, isBefore, differenceInDays } from "date-fns";

interface DebtViewProps {
  onBack: () => void;
  getPartnerName: (p: "A" | "B") => string;
}

export default function DebtView({ onBack, getPartnerName }: DebtViewProps) {
  const {
    debts,
    addDebt,
    updateDebt,
    deleteDebt,
    makeDebtPayment,
    getDebtPayments,
    getTotalDebtByPartner,
    getTotalPaidOffDebts,
    getUpcomingDebts,
    getOverdueDebts,
  } = useDebtStore();

  const { getCategoryTree, getCategoryDisplayName, paymentMethods } = useBudgetStore();

  const [showAddDebt, setShowAddDebt] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState<Debt | null>(null);
  const [newDebt, setNewDebt] = useState({
    name: "",
    description: "",
    totalAmount: "",
    creditor: "",
    debtor: "shared" as "A" | "B" | "shared",
    dueDate: "",
    interestRate: "",
    loanType: "term" as "term" | "30-day",
    loanTermMonths: "",
    category: "",
  });

  const [paymentData, setPaymentData] = useState({
    amount: "",
    paymentMethodId: "",
    transactionCost: "",
    note: "",
  });

  const debtCategories = getCategoryTree('debt');

  const resetDebtForm = (debt: Debt | null = null) => {
    if (debt) {
      setNewDebt({
        name: debt.name,
        description: debt.description || "",
        totalAmount: String(debt.totalAmount),
        creditor: debt.creditor,
        debtor: debt.debtor,
        dueDate: debt.dueDate || "",
        interestRate: debt.interestRate ? String(debt.interestRate) : "",
        loanType: debt.loanType || "term",
        loanTermMonths: debt.loanTermMonths ? String(debt.loanTermMonths) : "",
        category: debt.category,
      });
      setEditingDebt(debt);
      setShowAddDebt(true);
      return;
    }

    setNewDebt({
      name: "",
      description: "",
      totalAmount: "",
      creditor: "",
      debtor: "shared",
      dueDate: "",
      interestRate: "",
      loanType: "term",
      loanTermMonths: "",
      category: "",
    });
    setEditingDebt(null);
    setShowAddDebt(false);
  };

  const handleSaveDebt = () => {
    if (!newDebt.name || !newDebt.totalAmount || !newDebt.category) return;

    const payload = {
      name: newDebt.name,
      description: newDebt.description || undefined,
      totalAmount: parseFloat(newDebt.totalAmount),
      creditor: newDebt.creditor,
      debtor: newDebt.debtor,
      dueDate: newDebt.dueDate || undefined,
      interestRate: newDebt.interestRate ? parseFloat(newDebt.interestRate) : undefined,
      loanType: newDebt.loanType,
      loanTermMonths: newDebt.loanTermMonths ? parseInt(newDebt.loanTermMonths, 10) : undefined,
      category: newDebt.category,
    };

    if (editingDebt) {
      const amountDifference = payload.totalAmount - editingDebt.totalAmount;
      const updatedRemaining = Math.max(0, editingDebt.remainingAmount + amountDifference);
      updateDebt(editingDebt.id, { ...payload, remainingAmount: updatedRemaining });
    } else {
      addDebt({
        ...payload,
        remainingAmount: parseFloat(newDebt.totalAmount),
      });
    }

    setEditingDebt(null);
    setShowAddDebt(false);
    resetDebtForm();
  };

  const handleMakePayment = () => {
    if (!showPaymentDialog || !paymentData.amount) return;

    makeDebtPayment(
      showPaymentDialog.id,
      parseFloat(paymentData.amount),
      paymentData.paymentMethodId || undefined,
      paymentData.transactionCost ? parseFloat(paymentData.transactionCost) : undefined,
      paymentData.note || undefined
    );

    setPaymentData({
      amount: "",
      paymentMethodId: "",
      transactionCost: "",
      note: "",
    });
    setShowPaymentDialog(null);
  };

  const getDebtStatus = (debt: Debt) => {
    if (debt.isPaidOff) return { status: "paid", color: "bg-green-500", icon: CheckCircle };
    if (debt.dueDate) {
      const dueDate = new Date(debt.dueDate);
      const today = new Date();
      if (isBefore(dueDate, today)) return { status: "overdue", color: "bg-red-500", icon: AlertTriangle };
      if (differenceInDays(dueDate, today) <= 7) return { status: "due-soon", color: "bg-yellow-500", icon: Calendar };
    }
    return { status: "active", color: "bg-blue-500", icon: CreditCard };
  };

  const activeDebts = debts.filter(d => !d.isPaidOff);
  const paidOffDebts = debts.filter(d => d.isPaidOff);
  const totalDebt = activeDebts.reduce((sum, d) => sum + d.remainingAmount, 0);
  const upcomingDebts = getUpcomingDebts(30);
  const overdueDebts = getOverdueDebts();

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="min-h-screen bg-background p-6 pb-24 mx-auto max-w-lg"
    >
      <button onClick={onBack} className="mb-6 flex items-center gap-2 text-muted-foreground">
        <ArrowLeft className="h-4 w-4" />
        <span className="text-sm">Back</span>
      </button>

      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold">Debt Management</h1>
        <Dialog open={showAddDebt} onOpenChange={(open) => {
            if (!open) {
              setEditingDebt(null);
              resetDebtForm();
            }
            setShowAddDebt(open);
          }}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => resetDebtForm(null)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Debt
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingDebt ? "Edit Debt" : "Add New Debt"}</DialogTitle>
              <DialogDescription>
                {editingDebt ? "Update debt details, loan type, and repayment period." : "Track a new debt that needs to be paid off."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="debt-name">Debt Name</Label>
                <Input
                  id="debt-name"
                  value={newDebt.name}
                  onChange={(e) => setNewDebt(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Car Loan, Credit Card"
                />
              </div>
              <div>
                <Label htmlFor="debt-description">Description (Optional)</Label>
                <Input
                  id="debt-description"
                  value={newDebt.description}
                  onChange={(e) => setNewDebt(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Additional details"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="debt-amount">Total Amount</Label>
                  <Input
                    id="debt-amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={newDebt.totalAmount}
                    onChange={(e) => setNewDebt(prev => ({ ...prev, totalAmount: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="debt-creditor">Creditor</Label>
                  <Input
                    id="debt-creditor"
                    value={newDebt.creditor}
                    onChange={(e) => setNewDebt(prev => ({ ...prev, creditor: e.target.value }))}
                    placeholder="Bank, Person, etc."
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="debt-debtor">Who Owes It</Label>
                  <Select value={newDebt.debtor} onValueChange={(value: "A" | "B" | "shared") =>
                    setNewDebt(prev => ({ ...prev, debtor: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="shared">Both Partners</SelectItem>
                      <SelectItem value="A">{getPartnerName("A")}</SelectItem>
                      <SelectItem value="B">{getPartnerName("B")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="debt-category">Category</Label>
                  <Select value={newDebt.category} onValueChange={(value) =>
                    setNewDebt(prev => ({ ...prev, category: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {debtCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.fullPath}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="debt-due-date">Due Date (Optional)</Label>
                  <Input
                    id="debt-due-date"
                    type="date"
                    value={newDebt.dueDate}
                    onChange={(e) => setNewDebt(prev => ({ ...prev, dueDate: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="debt-interest">Interest Rate % (Optional)</Label>
                  <Input
                    id="debt-interest"
                    type="number"
                    min="0"
                    step="0.01"
                    value={newDebt.interestRate}
                    onChange={(e) => setNewDebt(prev => ({ ...prev, interestRate: e.target.value }))}
                    placeholder="5.5"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="debt-loan-type">Loan Type</Label>
                  <Select value={newDebt.loanType} onValueChange={(value: "term" | "30-day") =>
                    setNewDebt(prev => ({ ...prev, loanType: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="term">Term Loan</SelectItem>
                      <SelectItem value="30-day">30-Day Loan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="debt-loan-period">Loan Period (months)</Label>
                  <Input
                    id="debt-loan-period"
                    type="number"
                    min="1"
                    step="1"
                    value={newDebt.loanTermMonths}
                    onChange={(e) => setNewDebt(prev => ({ ...prev, loanTermMonths: e.target.value }))}
                    placeholder="12"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSaveDebt} disabled={!newDebt.name || !newDebt.totalAmount || !newDebt.category}>
                {editingDebt ? "Save Changes" : "Add Debt"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4 text-red-500" />
              <span>Total Debt</span>
            </div>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totalDebt)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Paid Off</span>
            </div>
            <div className="text-2xl font-bold text-green-600">{getTotalPaidOffDebts()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {overdueDebts.length > 0 && (
        <Card className="mb-4 border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-800 mb-2">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium">Overdue Debts</span>
            </div>
            <div className="space-y-1">
              {overdueDebts.map((debt) => (
                <div key={debt.id} className="text-sm text-red-700">
                  {debt.name} - {formatCurrency(debt.remainingAmount)} due {format(new Date(debt.dueDate!), "MMM dd")}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {upcomingDebts.length > 0 && (
        <Card className="mb-4 border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-yellow-800 mb-2">
              <Calendar className="h-4 w-4" />
              <span className="font-medium">Due Soon</span>
            </div>
            <div className="space-y-1">
              {upcomingDebts.map((debt) => (
                <div key={debt.id} className="text-sm text-yellow-700">
                  {debt.name} - {formatCurrency(debt.remainingAmount)} due {format(new Date(debt.dueDate!), "MMM dd")}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Debts */}
      <div className="space-y-4 mb-6">
        <h2 className="font-semibold text-lg">Active Debts ({activeDebts.length})</h2>
        {activeDebts.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No active debts. Great job staying debt-free!</p>
            </CardContent>
          </Card>
        ) : (
          activeDebts.map((debt) => {
            const status = getDebtStatus(debt);
            const progress = ((debt.totalAmount - debt.remainingAmount) / debt.totalAmount) * 100;
            const payments = getDebtPayments(debt.id);

            return (
              <Card key={debt.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${status.color}`} />
                      <CardTitle className="text-lg">{debt.name}</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => resetDebtForm(debt)}>
                        Edit
                      </Button>
                      <Dialog open={showPaymentDialog?.id === debt.id} onOpenChange={(open) =>
                        setShowPaymentDialog(open ? debt : null)
                      }>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            <Receipt className="h-4 w-4 mr-1" />
                            Pay
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Make Payment - {debt.name}</DialogTitle>
                            <DialogDescription>
                              Record a payment towards this debt.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label>Payment Amount</Label>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={paymentData.amount}
                                onChange={(e) => setPaymentData(prev => ({ ...prev, amount: e.target.value }))}
                                placeholder="0.00"
                              />
                            </div>
                            <div>
                              <Label>Payment Method</Label>
                              <Select value={paymentData.paymentMethodId} onValueChange={(value) =>
                                setPaymentData(prev => ({ ...prev, paymentMethodId: value }))
                              }>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select payment method" />
                                </SelectTrigger>
                                <SelectContent>
                                  {paymentMethods.map((method) => (
                                    <SelectItem key={method.id} value={method.id}>
                                      {method.icon} {method.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Transaction Cost (Optional)</Label>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={paymentData.transactionCost}
                                onChange={(e) => setPaymentData(prev => ({ ...prev, transactionCost: e.target.value }))}
                                placeholder="0.00"
                              />
                            </div>
                            <div>
                              <Label>Note (Optional)</Label>
                              <Input
                                value={paymentData.note}
                                onChange={(e) => setPaymentData(prev => ({ ...prev, note: e.target.value }))}
                                placeholder="Payment note"
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button onClick={handleMakePayment} disabled={!paymentData.amount}>
                              Record Payment
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Debt</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this debt? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteDebt(debt.id)} className="bg-destructive text-destructive-foreground">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Remaining: {formatCurrency(debt.remainingAmount)}</span>
                    <span>Total: {formatCurrency(debt.totalAmount)}</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{progress.toFixed(1)}% paid</span>
                    <span>{payments.length} payments</span>
                  </div>
                  {debt.description && (
                    <p className="text-sm text-muted-foreground">{debt.description}</p>
                  )}
                  <div className="flex justify-between text-xs">
                    <span>Creditor: {debt.creditor}</span>
                    <span>Owner: {debt.debtor === "shared" ? "Both" : getPartnerName(debt.debtor)}</span>
                  </div>
                  {debt.dueDate && (
                    <div className="flex justify-between text-xs">
                      <span>Due: {format(new Date(debt.dueDate), "MMM dd, yyyy")}</span>
                      <Badge variant={status.status === "overdue" ? "destructive" : status.status === "due-soon" ? "secondary" : "default"}>
                        {status.status.replace("-", " ")}
                      </Badge>
                    </div>
                  )}
                  {debt.interestRate && (
                    <div className="text-xs text-muted-foreground">
                      Interest Rate: {debt.interestRate}%
                    </div>
                  )}
                  {debt.loanType && (
                    <div className="text-xs text-muted-foreground">
                      Loan Type: {debt.loanType === "term" ? "Term Loan" : "30-Day Loan"}
                    </div>
                  )}
                  {debt.loanTermMonths && (
                    <div className="text-xs text-muted-foreground">
                      Loan Period: {debt.loanTermMonths} month{debt.loanTermMonths === 1 ? "" : "s"}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Paid Off Debts */}
      {paidOffDebts.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-semibold text-lg">Paid Off Debts ({paidOffDebts.length})</h2>
          {paidOffDebts.map((debt) => (
            <Card key={debt.id} className="opacity-75">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <div>
                      <div className="font-medium">{debt.name}</div>
                      <div className="text-sm text-muted-foreground">
                        Paid off {format(new Date(debt.lastPaymentDate!), "MMM dd, yyyy")}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-green-600">{formatCurrency(debt.totalAmount)}</div>
                    <div className="text-xs text-muted-foreground">Total paid</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </motion.div>
  );
}