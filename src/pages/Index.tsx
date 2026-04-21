import { useState } from "react";
import { format, subMonths, addMonths } from "date-fns";
import { Settings, ChevronLeft, ChevronRight, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";
import { useBudgetStore } from "@/hooks/useBudgetStore";
import BalanceCard from "@/components/BalanceCard";
import SpendingChart from "@/components/SpendingChart";
import TransactionList from "@/components/TransactionList";
import AddTransaction from "@/components/AddTransaction";
import SettingsView from "@/components/SettingsView";
import StatsView from "@/components/StatsView";

type View = "home" | "settings" | "stats";

const Index = () => {
  const store = useBudgetStore();
  const {
    profile,
    budgetConfig,
    addTransaction,
    deleteTransaction,
    updateProfile,
    updateBudgetConfig,
    getPartnerName,
    getMonthTransactions,
    getTotals,
    getCategorySpending,
    getPartnerSpending,
    getDailyTrend,
    getDayExpenses,
    getMonthExpenses,
    expenseCategories,
    incomeCategories,
    paymentMethods,
    displayCategory,
    getPaymentMethod,
  } = store;

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [view, setView] = useState<View>("home");

  const monthKey = format(currentMonth, "yyyy-MM");
  const monthLabel = format(currentMonth, "MMMM yyyy");
  const totals = getTotals(monthKey);
  const monthTransactions = getMonthTransactions(monthKey);

  if (view === "settings") {
    return (
      <SettingsView
        profile={profile}
        budgetConfig={budgetConfig}
        onUpdateProfile={updateProfile}
        onUpdateBudgetConfig={updateBudgetConfig}
        onBack={() => setView("home")}
        getPartnerName={getPartnerName}
      />
    );
  }

  if (view === "stats") {
    return (
      <StatsView
        monthKey={monthKey}
        monthLabel={monthLabel}
        monthTransactions={monthTransactions}
        getCategorySpending={getCategorySpending}
        getPartnerSpending={getPartnerSpending}
        getDailyTrend={getDailyTrend}
        getDayExpenses={getDayExpenses}
        getMonthExpenses={getMonthExpenses}
        getPartnerName={getPartnerName}
        getPaymentMethod={getPaymentMethod}
        budgetConfig={budgetConfig}
        onBack={() => setView("home")}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 mx-auto max-w-lg">
      {/* Header */}
      <header className="flex items-center justify-between px-6 pt-6 pb-2">
        <div>
          <h1 className="font-display text-xl font-bold tracking-tight">CoupleBank</h1>
          <p className="text-xs text-muted-foreground">
            {getPartnerName("A")} & {getPartnerName("B")}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setView("stats")}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-muted text-muted-foreground transition-colors hover:bg-muted/80"
          >
            <BarChart3 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setView("settings")}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-muted text-muted-foreground transition-colors hover:bg-muted/80"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
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
            displayCategory={displayCategory}
            getPaymentMethod={getPaymentMethod}
          />
        </div>
      </main>

      <AddTransaction
        onAdd={addTransaction}
        getPartnerName={getPartnerName}
        expenseCategories={expenseCategories}
        incomeCategories={incomeCategories}
        paymentMethods={paymentMethods}
        displayCategory={displayCategory}
      />
    </div>
  );
};

export default Index;
