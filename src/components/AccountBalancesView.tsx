import { useState } from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBudgetStore } from "@/hooks/useBudgetStore";
import { ArrowLeft, Wallet, Plus, Minus, RefreshCw } from "lucide-react";
import { formatCurrency } from "@/lib/currency";

interface AccountBalancesViewProps {
  onBack: () => void;
  getPartnerName: (p: "A" | "B") => string;
}

export default function AccountBalancesView({ onBack, getPartnerName }: AccountBalancesViewProps) {
  const { balances, setInitialBalance, getTotalBalanceByPartner, getAllBalancesByPartner, paymentMethods } = useBudgetStore();

  const [selectedPartner, setSelectedPartner] = useState<"A" | "B" | "shared">("shared");
  const [selectedAccount, setSelectedAccount] = useState("");
  const [initialAmount, setInitialAmount] = useState("");

  const partnerBalances = getAllBalancesByPartner(selectedPartner);
  const totalBalance = getTotalBalanceByPartner(selectedPartner);

  // Calculate grand total across all accounts
  const grandTotal = balances.reduce((total, balance) => total + balance.balance, 0);
  const allBalances = balances;

  const handleSetInitialBalance = () => {
    if (!selectedAccount || !initialAmount) return;

    setInitialBalance(selectedAccount, selectedPartner, parseFloat(initialAmount));
    setSelectedAccount("");
    setInitialAmount("");
  };

  const getAccountName = (paymentMethodId: string) => {
    const method = paymentMethods.find(p => p.id === paymentMethodId);
    return method ? `${method.icon} ${method.name}` : paymentMethodId;
  };

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

      <h1 className="font-display text-2xl font-bold mb-6">Account Balances</h1>

      {/* Partner Selector */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <Label className="text-sm font-medium mb-2 block">View Balances For</Label>
          <Select value={selectedPartner} onValueChange={(value: "A" | "B" | "shared") => setSelectedPartner(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="shared">Shared Accounts</SelectItem>
              <SelectItem value="A">{getPartnerName("A")}'s Accounts</SelectItem>
              <SelectItem value="B">{getPartnerName("B")}'s Accounts</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Grand Total */}
      <Card className="mb-6 border-2 border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="h-6 w-6 text-primary" />
              <div>
                <span className="font-bold text-lg">Grand Total</span>
                <p className="text-xs text-muted-foreground">All accounts combined</p>
              </div>
            </div>
            <span className={`text-2xl font-bold ${grandTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(grandTotal)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Total Balance */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              <span className="font-medium">Total Balance</span>
            </div>
            <span className={`text-xl font-bold ${totalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(totalBalance)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Set Initial Balance */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Set Initial Balance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Account</Label>
            <Select value={selectedAccount} onValueChange={setSelectedAccount}>
              <SelectTrigger>
                <SelectValue placeholder="Select account" />
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
            <Label>Initial Balance</Label>
            <Input
              type="number"
              step="0.01"
              value={initialAmount}
              onChange={(e) => setInitialAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <Button onClick={handleSetInitialBalance} disabled={!selectedAccount || !initialAmount} className="w-full">
            Set Initial Balance
          </Button>
        </CardContent>
      </Card>

      {/* Account Balances List */}
      <div className="space-y-4">
        <h2 className="font-semibold text-lg">Account Balances</h2>
        {partnerBalances.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No accounts set up yet. Set initial balances above to get started.</p>
            </CardContent>
          </Card>
        ) : (
          partnerBalances.map((balance) => (
            <Card key={`${balance.paymentMethodId}-${balance.partner}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">
                      {paymentMethods.find(p => p.id === balance.paymentMethodId)?.icon || "💳"}
                    </div>
                    <div>
                      <div className="font-medium">
                        {paymentMethods.find(p => p.id === balance.paymentMethodId)?.name || balance.paymentMethodId}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Initial: {formatCurrency(balance.initialBalance)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold ${balance.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(balance.balance)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Last updated: {new Date(balance.lastUpdated).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* All Accounts Overview */}
      {allBalances.length > 0 && (
        <div className="space-y-4 mt-8">
          <h2 className="font-semibold text-lg">All Accounts Overview</h2>
          <div className="grid grid-cols-1 gap-3">
            {allBalances.map((balance) => (
              <Card key={`${balance.paymentMethodId}-${balance.partner}`} className="opacity-75">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="text-lg">
                        {paymentMethods.find(p => p.id === balance.paymentMethodId)?.icon || "💳"}
                      </div>
                      <div>
                        <div className="text-sm font-medium">
                          {paymentMethods.find(p => p.id === balance.paymentMethodId)?.name || balance.paymentMethodId}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {balance.partner === "shared" ? "Shared" : getPartnerName(balance.partner as "A" | "B")}
                        </div>
                      </div>
                    </div>
                    <div className={`text-sm font-bold ${balance.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(balance.balance)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Info Card */}
      <Card className="mt-6">
        <CardContent className="p-4">
          <div className="text-sm text-muted-foreground space-y-3">
            <div>
              <p className="font-medium text-foreground mb-1"><strong>How balances work:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Set initial balances to track your starting amounts</li>
                <li>Balances are automatically updated when you add transactions</li>
                <li>Transfer transactions move money between accounts</li>
                <li>Positive balances are shown in green, negative in red</li>
                <li><strong>Grand Total</strong> shows the combined balance across all accounts</li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-foreground mb-1"><strong>💡 Loan Advice:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><strong>Enter loans as income</strong> when you receive the money</li>
                <li><strong>Track the loan as debt</strong> in the Debt section to monitor repayment</li>
                <li>This gives you accurate cash flow while tracking outstanding obligations</li>
                <li>Use debt categories to organize different types of loans</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}