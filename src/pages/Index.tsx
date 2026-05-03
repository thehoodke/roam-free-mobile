import { useMemo, useState } from "react";
import { format, subMonths, addMonths, parseISO } from "date-fns";
import { Settings, ChevronLeft, ChevronRight, BarChart3, LineChart, CreditCard, Wallet } from "lucide-react";
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
import { Transaction } from "@/types/budget";

type View = "home" | "settings" | "stats" | "investments" | "debt" | "balances";
type FilterMode = "month" | "day" | "range";

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
    getDateKey,
  } = store;

  const investments = useInvestments();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [view, setView] = useState<View>("home");
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>("month");
  const [selectedDay, setSelectedDay] = useState(format(new Date(), "yyyy-MM-dd"));
  const [rangeStart, setRangeStart] = useState(format(new Date(), "yyyy-MM-dd"));
  const [rangeEnd, setRangeEnd] = useState(format(new Date(), "yyyy-MM-dd"));

  const handleEditTransaction = (tx: Transaction) => {
    setEditingTransaction(tx);
  };

  const handleUpdateTransaction = (updatedTx: Transaction) => {
    updateTransaction(updatedTx);
    setEditingTransaction(null);
  };

  const monthKey = format(currentMonth, "yyyy-MM");
  const monthLabel = format(currentMonth, "LLLL yyyy");
  const totals = getTotals(monthKey);
  const monthTransactions = getMonthTransactions(monthKey);
  const investFlow = investments.getMonthInvestmentFlow(monthKey);
  const adjustedBalance = totals.balance - investFlow.contributions + investFlow.withdrawals;

  const visibleTransactions = useMemo(() => {
    if (filterMode === "month") return monthTransactions;
    if (filterMode === "day") {
      return transactions.filter((t) => (!t.parentId || t.isFee) && getDateKey(t.date) === selectedDay);
    }

    const start = rangeStart <= rangeEnd ? rangeStart : rangeEnd;
    const end = rangeStart <= rangeEnd ? rangeEnd : rangeStart;
    return transactions.filter((t) => {
      if (t.parentId && !t.isFee) return false;
      const key = getDateKey(t.date);
      return key >= start && key <= end;
    });
  }, [filterMode, monthTransactions, transactions, getDateKey, selectedDay, rangeStart, rangeEnd]);

  const groupedByDay = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    visibleTransactions.forEach((tx) => {
      const key = getDateKey(tx.date);
      const list = map.get(key) || [];
      list.push(tx);
      map.set(key, list);
    });

    return Array.from(map.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([date, txs]) => ({
        date,
        txs: txs.sort((a, b) => (a.date < b.date ? 1 : -1)),
      }));
  }, [visibleTransactions, getDateKey]);

  const visibleTotals = useMemo(() => {
    const income = visibleTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
    const expenses = visibleTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      income,
      expenses,
      balance: income - expenses,
    };
  }, [visibleTransactions]);

  const balanceLabel =
    filterMode === "month"
      ? monthLabel
      : filterMode === "day"
        ? format(parseISO(selectedDay), "PPP")
        : `${format(parseISO(rangeStart <= rangeEnd ? rangeStart : rangeEnd), "PPP")} - ${format(parseISO(rangeStart <= rangeEnd ? rangeEnd : rangeStart), "PPP")}`;

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
    return <DebtView onBack={() => setView("home")} getPartnerName={getPartnerName} />;
  }

  if (view === "balances") {
    return <AccountBalancesView onBack={() => setView("home")} getPartnerName={getPartnerName} />;
  }

  return (
    <div className="min-h-screen bg-background pb-24 mx-auto max-w-lg">
      <header className="flex items-center justify-between px-6 pt-6 pb-2">
        <div>
          <h1 className="font-display text-xl font-bold tracking-tight">CoupleBank</h1>
          <p className="text-xs text-muted-foreground">
            {getPartnerName("A")} & {getPartnerName("B")}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setView("balances")} className="flex h-10 w-10 items-center justify-center rounded-2xl bg-muted text-muted-foreground transition-colors hover:bg-muted/80" aria-label="Account Balances"><Wallet className="h-4 w-4" /></button>
          <button onClick={() => setView("debt")} className="flex h-10 w-10 items-center justify-center rounded-2xl bg-muted text-muted-foreground transition-colors hover:bg-muted/80" aria-label="Debt Management"><CreditCard className="h-4 w-4" /></button>
          <button onClick={() => setView("investments")} className="flex h-10 w-10 items-center justify-center rounded-2xl bg-muted text-muted-foreground transition-colors hover:bg-muted/80" aria-label="Investments"><LineChart className="h-4 w-4" /></button>
          <button onClick={() => setView("stats")} className="flex h-10 w-10 items-center justify-center rounded-2xl bg-muted text-muted-foreground transition-colors hover:bg-muted/80"><BarChart3 className="h-4 w-4" /></button>
          <button onClick={() => setView("settings")} className="flex h-10 w-10 items-center justify-center rounded-2xl bg-muted text-muted-foreground transition-colors hover:bg-muted/80"><Settings className="h-4 w-4" /></button>
        </div>
      </header>

      <div className="px-5 py-2">
        <div className="flex gap-2 rounded-xl bg-muted p-1">
          <button onClick={() => setFilterMode("month")} className={`flex-1 rounded-lg py-2 text-sm font-semibold ${filterMode === "month" ? "bg-card" : "text-muted-foreground"}`}>Month</button>
          <button onClick={() => setFilterMode("day")} className={`flex-1 rounded-lg py-2 text-sm font-semibold ${filterMode === "day" ? "bg-card" : "text-muted-foreground"}`}>Day</button>
          <button onClick={() => setFilterMode("range")} className={`flex-1 rounded-lg py-2 text-sm font-semibold ${filterMode === "range" ? "bg-card" : "text-muted-foreground"}`}>Range</button>
        </div>
      </div>

      {filterMode === "month" && (
        <div className="flex items-center justify-center gap-4 py-3">
          <button onClick={() => setCurrentMonth((d) => subMonths(d, 1))} className="text-muted-foreground"><ChevronLeft className="h-5 w-5" /></button>
          <span className="font-display text-sm font-semibold">{monthLabel}</span>
          <button onClick={() => setCurrentMonth((d) => addMonths(d, 1))} className="text-muted-foreground"><ChevronRight className="h-5 w-5" /></button>
        </div>
      )}

      {filterMode === "day" && (
        <div className="px-5 py-2">
          <input
            type="date"
            value={selectedDay}
            onChange={(e) => setSelectedDay(e.target.value)}
            className="w-full rounded-xl border bg-card px-3 py-2 text-sm"
          />
        </div>
      )}

      {filterMode === "range" && (
        <div className="px-5 py-2 grid grid-cols-2 gap-2">
          <input type="date" value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} className="w-full rounded-xl border bg-card px-3 py-2 text-sm" />
          <input type="date" value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} className="w-full rounded-xl border bg-card px-3 py-2 text-sm" />
        </div>
      )}

      <main className="space-y-4 px-5">
        <BalanceCard
          income={filterMode === "month" ? totals.income : visibleTotals.income}
          expenses={filterMode === "month" ? totals.expenses : visibleTotals.expenses}
          balance={filterMode === "month" ? adjustedBalance : visibleTotals.balance}
          monthLabel={balanceLabel}
          investmentNet={filterMode === "month" ? investFlow.net : 0}
          portfolioValue={investments.totalPortfolioValue}
          onPortfolioClick={() => setView("investments")}
        />

        <SpendingChart transactions={visibleTransactions} />

        <div>
          <h2 className="font-display font-bold text-sm mb-3 px-1">Transactions</h2>
          {groupedByDay.length === 0 ? (
            <TransactionList
              transactions={[]}
              getPartnerName={getPartnerName}
              onDelete={deleteTransaction}
              onEdit={handleEditTransaction}
              displayCategory={displayCategory}
              getPaymentMethod={getPaymentMethod}
            />
          ) : (
            <div className="space-y-4">
              {groupedByDay.map((group) => (
                <section key={group.date}>
                  <h3 className="text-xs font-semibold text-muted-foreground mb-2 px-1">{format(parseISO(group.date), "EEEE, MMM d, yyyy")}</h3>
                  <TransactionList
                    transactions={group.txs}
                    getPartnerName={getPartnerName}
                    onDelete={deleteTransaction}
                    onEdit={handleEditTransaction}
                    displayCategory={displayCategory}
                    getPaymentMethod={getPaymentMethod}
                  />
                </section>
              ))}
            </div>
          )}
        </div>
      </main>

      <AddTransaction
        onAdd={addTransaction}
        onAddTransfer={addTransferTransaction}
        getPartnerName={getPartnerName}
        expenseCategories={getCategoryTree("expense")}
        incomeCategories={getCategoryTree("income")}
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
