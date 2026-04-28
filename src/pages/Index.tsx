import { useState } from "react";
import { format, subMonths, addMonths } from "date-fns";
import { Settings, ChevronLeft, ChevronRight, BarChart3, LineChart, CreditCard, Wallet } from "lucide-react";
import { motion } from "framer-motion";
import { useBudgetStore } from "@/hooks/useBudgetStore";
import { useInvestments } from "@/hooks/useInvestments";
import BalanceCard from "@/components/BalanceCard";
import SpendingChart from "@/components/SpendingChart";
import TransactionList from "@/components/TransactionList";
import AddTransaction from "@/components/AddTransaction";
import SettingsView from "@/components/SettingsView";
import StatsView from "@/components/StatsView";
import InvestmentsView from "@/components/InvestmentsView";
import DebtView from "@/components/DebtView";
import AccountBalancesView from "@/components/AccountBalancesView";

type View = "home" | "settings" | "stats" | "investments" | "debt" | "balances";

const Index = () => {
  const store = useBudgetStore();
  const {
    transactions,
    profile,
    budgetConfig,
    addTransaction,
    addTransferTransaction,
    deleteTransaction,
    updateTransaction,
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
    getCategoryTree,
    getCategoryDisplayName,
    expenseCategories,
    incomeCategories,
    paymentMethods,
    displayCategory,
    getPaymentMethod,
  } = store;

  const investments = useInvestments();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [view, setView] = useState<View>("home");
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const handleEditTransaction = (tx: Transaction) => {
    setEditingTransaction(tx);
  };

  const handleUpdateTransaction = (updatedTx: Transaction) => {
    updateTransaction(updatedTx);
    setEditingTransaction(null);
  };

  const monthKey = format(currentMonth, "yyyy-MM");
  const monthLabel = format(currentMonth, "MMMM yyyy");
  const totals = getTotals(monthKey);
  const monthTransactions = getMonthTransactions(monthKey);
  const investFlow = investments.getMonthInvestmentFlow(monthKey);
  // Investments reduce balance: contributions out, withdrawals back in
  const adjustedBalance = totals.balance - investFlow.contributions + investFlow.withdrawals;

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
        allTransactions={transactions}
        displayCategory={displayCategory}
      />
    );
  }

  if (view === "investments") {
    return (
      <InvestmentsView
        accounts={investments.accounts}
        totalPortfolioValue={investments.totalPortfolioValue}
        portfolioByPartner={investments.portfolioByPartner}
        customInvestmentCategories={budgetConfig.customInvestmentCategories || []}
        paymentMethods={paymentMethods}
        onAddAccount={investments.addAccount}
        onUpdateAccount={investments.updateAccount}
        onDeleteAccount={investments.deleteAccount}
        onAddInvestmentTx={investments.addInvestmentTx}
        onDeleteInvestmentTx={investments.deleteInvestmentTx}
        getAccountBasis={investments.getAccountBasis}
        getAccountTransactions={investments.getAccountTransactions}
        getPartnerName={getPartnerName}
        onBack={() => setView("home")}
      />
    );
  }

  if (view === "debt") {
    return (
      <DebtView
        onBack={() => setView("home")}
        getPartnerName={getPartnerName}
      />
    );
  }

  if (view === "balances") {
    return (
      <AccountBalancesView
        onBack={() => setView("home")}
        getPartnerName={getPartnerName}
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
            onClick={() => setView("balances")}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-muted text-muted-foreground transition-colors hover:bg-muted/80"
            aria-label="Account Balances"
          >
            <Wallet className="h-4 w-4" />
          </button>
          <button
            onClick={() => setView("debt")}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-muted text-muted-foreground transition-colors hover:bg-muted/80"
            aria-label="Debt Management"
          >
            <CreditCard className="h-4 w-4" />
          </button>
          <button
            onClick={() => setView("investments")}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-muted text-muted-foreground transition-colors hover:bg-muted/80"
            aria-label="Investments"
          >
            <LineChart className="h-4 w-4" />
          </button>
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
          balance={adjustedBalance}
          monthLabel={monthLabel}
          investmentNet={investFlow.net}
          portfolioValue={investments.totalPortfolioValue}
          onPortfolioClick={() => setView("investments")}
        />

        <SpendingChart transactions={monthTransactions} />

        <div>
          <h2 className="font-display font-bold text-sm mb-3 px-1">Recent Transactions</h2>
          <TransactionList
            transactions={monthTransactions}
            getPartnerName={getPartnerName}
            onDelete={deleteTransaction}
            onEdit={handleEditTransaction}
            displayCategory={displayCategory}
            getPaymentMethod={getPaymentMethod}
          />
        </div>
      </main>

      <AddTransaction
        onAdd={addTransaction}
        onAddTransfer={addTransferTransaction}
        getPartnerName={getPartnerName}
        expenseCategories={getCategoryTree('expense')}
        incomeCategories={getCategoryTree('income')}
        paymentMethods={paymentMethods}
        getCategoryDisplayName={getCategoryDisplayName}
        editingTransaction={editingTransaction}
        onUpdate={handleUpdateTransaction}
        onCancelEdit={() => setEditingTransaction(null)}
      />
    </div>
  );
};

export default Index;
