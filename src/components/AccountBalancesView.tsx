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

      {/* Info Card */}
      <Card className="mt-6">
        <CardContent className="p-4">
          <div className="text-sm text-muted-foreground space-y-2">
            <p><strong>How balances work:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Set initial balances to track your starting amounts</li>
              <li>Balances are automatically updated when you add transactions</li>
              <li>Transfer transactions move money between accounts</li>
              <li>Positive balances are shown in green, negative in red</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}