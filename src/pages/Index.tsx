import { useState, useMemo } from "react";
import { format, subMonths, addMonths } from "date-fns";
import { Settings, ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { useBudgetStore } from "@/hooks/useBudgetStore";
import BalanceCard from "@/components/BalanceCard";
import SpendingChart from "@/components/SpendingChart";
import TransactionList from "@/components/TransactionList";
import AddTransaction from "@/components/AddTransaction";
import SettingsView from "@/components/SettingsView";

const Index = () => {
  const {
    profile,
    addTransaction,
    deleteTransaction,
    updateProfile,
    getPartnerName,
    getMonthTransactions,
    getTotals,
  } = useBudgetStore();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showSettings, setShowSettings] = useState(false);

  const monthKey = format(currentMonth, "yyyy-MM");
  const monthLabel = format(currentMonth, "MMMM yyyy");
  const totals = getTotals(monthKey);
  const monthTransactions = getMonthTransactions(monthKey);

  if (showSettings) {
    return (
      <SettingsView
        profile={profile}
        onUpdateProfile={updateProfile}
        onBack={() => setShowSettings(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="flex items-center justify-between px-6 pt-6 pb-2">
        <div>
          <h1 className="font-display text-xl font-bold tracking-tight">CoupleBank</h1>
          <p className="text-xs text-muted-foreground">
            {getPartnerName("A")} & {getPartnerName("B")}
          </p>
        </div>
        <button
          onClick={() => setShowSettings(true)}
          className="flex h-10 w-10 items-center justify-center rounded-2xl bg-muted text-muted-foreground transition-colors hover:bg-muted/80"
        >
          <Settings className="h-4 w-4" />
        </button>
      </header>

      {/* Month Selector */}
      <div className="flex items-center justify-center gap-4 py-3">
        <button
          onClick={() => setCurrentMonth((d) => subMonths(d, 1))}
          className="text-muted-foreground"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="font-display text-sm font-semibold">{monthLabel}</span>
        <button
          onClick={() => setCurrentMonth((d) => addMonths(d, 1))}
          className="text-muted-foreground"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Content */}
      <main className="space-y-4 px-5">
        <BalanceCard
          income={totals.income}
          expenses={totals.expenses}
          balance={totals.balance}
          monthLabel={monthLabel}
        />

        <SpendingChart transactions={monthTransactions} />

        <div>
          <h2 className="font-display font-bold text-sm mb-3 px-1">Recent Transactions</h2>
          <TransactionList
            transactions={monthTransactions}
            getPartnerName={getPartnerName}
            onDelete={deleteTransaction}
          />
        </div>
      </main>

      <AddTransaction onAdd={addTransaction} getPartnerName={getPartnerName} />
    </div>
  );
};

export default Index;
