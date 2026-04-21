import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft, TrendingUp, Users, PieChart, Target, Activity,
  Trophy, Calendar as CalendarIcon, Sparkles,
} from "lucide-react";
import {
  format, parseISO, startOfDay, endOfDay, startOfWeek, endOfWeek,
  startOfMonth, endOfMonth, startOfYear, endOfYear, eachDayOfInterval,
  differenceInCalendarDays, isWithinInterval, subDays,
} from "date-fns";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart as RPieChart, Pie, Cell, Legend,
} from "recharts";
import { Partner, BudgetConfig, PaymentMethod, Transaction } from "@/types/budget";
import { formatCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";

interface StatsViewProps {
  monthKey: string;
  monthLabel: string;
  monthTransactions: Transaction[];
  getCategorySpending: (month: string) => Record<string, number>;
  getPartnerSpending: (month: string) => { A: number; B: number; total: number };
  getDailyTrend: (days?: number) => { date: string; label: string; income: number; expenses: number }[];
  getDayExpenses: (date: string, partner?: Partner) => number;
  getMonthExpenses: (month: string, partner?: Partner) => number;
  getPartnerName: (p: Partner) => string;
  getPaymentMethod: (id?: string) => PaymentMethod | undefined;
  budgetConfig: BudgetConfig;
  onBack: () => void;
  allTransactions: Transaction[];
  displayCategory: (c: string) => string;
}

const CHART_COLORS = [
  "hsl(158, 64%, 32%)", "hsl(38, 92%, 55%)", "hsl(220, 80%, 56%)",
  "hsl(330, 70%, 55%)", "hsl(0, 72%, 51%)", "hsl(270, 60%, 55%)",
  "hsl(190, 70%, 45%)", "hsl(100, 50%, 45%)", "hsl(45, 80%, 50%)",
  "hsl(15, 75%, 50%)",
];

type PeriodKey = "today" | "week" | "month" | "year" | "all" | "custom";

const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "year", label: "Year" },
  { key: "all", label: "All" },
  { key: "custom", label: "Custom" },
];

export default function StatsView({
  monthKey, monthLabel, monthTransactions, getDayExpenses, getMonthExpenses,
  getPartnerName, getPaymentMethod, budgetConfig, onBack,
  allTransactions, displayCategory,
}: StatsViewProps) {
  const [period, setPeriod] = useState<PeriodKey>("month");
  const [customRange, setCustomRange] = useState<{ from?: Date; to?: Date }>({});

  // Compute period interval
  const { rangeStart, rangeEnd, rangeLabel } = useMemo(() => {
    const now = new Date();
    let start: Date, end: Date, label: string;
    switch (period) {
      case "today":
        start = startOfDay(now); end = endOfDay(now); label = format(now, "MMM dd, yyyy");
        break;
      case "week":
        start = startOfWeek(now, { weekStartsOn: 1 });
        end = endOfWeek(now, { weekStartsOn: 1 });
        label = `${format(start, "MMM dd")} – ${format(end, "MMM dd")}`;
        break;
      case "year":
        start = startOfYear(now); end = endOfYear(now); label = format(now, "yyyy");
        break;
      case "all":
        start = new Date(2000, 0, 1); end = endOfDay(now); label = "All time";
        break;
      case "custom":
        start = customRange.from ? startOfDay(customRange.from) : startOfMonth(now);
        end = customRange.to ? endOfDay(customRange.to) : endOfDay(now);
        label = customRange.from && customRange.to
          ? `${format(customRange.from, "MMM dd")} – ${format(customRange.to, "MMM dd, yyyy")}`
          : "Pick a range";
        break;
      case "month":
      default:
        start = startOfMonth(parseISO(`${monthKey}-01`));
        end = endOfMonth(start);
        label = monthLabel;
        break;
    }
    return { rangeStart: start, rangeEnd: end, rangeLabel: label };
  }, [period, customRange, monthKey, monthLabel]);

  // Filter transactions to selected range
  const periodTx = useMemo(() => {
    return allTransactions.filter((t) => {
      const d = parseISO(t.date);
      return isWithinInterval(d, { start: rangeStart, end: rangeEnd });
    });
  }, [allTransactions, rangeStart, rangeEnd]);

  const expenseTx = useMemo(() => periodTx.filter((t) => t.type === "expense"), [periodTx]);
  const incomeTx = useMemo(() => periodTx.filter((t) => t.type === "income"), [periodTx]);

  const totalExpenses = useMemo(() => expenseTx.reduce((s, t) => s + t.amount, 0), [expenseTx]);
  const totalIncome = useMemo(() => incomeTx.reduce((s, t) => s + t.amount, 0), [incomeTx]);

  // Partner spending in range
  const partnerSpending = useMemo(() => {
    const a = expenseTx.filter((t) => t.partner === "A").reduce((s, t) => s + t.amount, 0);
    const b = expenseTx.filter((t) => t.partner === "B").reduce((s, t) => s + t.amount, 0);
    return { A: a, B: b, total: a + b };
  }, [expenseTx]);

  // Category spending in range (using display names)
  const categorySpending = useMemo(() => {
    const map: Record<string, number> = {};
    expenseTx.forEach((t) => {
      const name = displayCategory(t.category);
      map[name] = (map[name] || 0) + t.amount;
    });
    return map;
  }, [expenseTx, displayCategory]);

  const rankedCategories = useMemo(
    () => Object.entries(categorySpending)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value),
    [categorySpending]
  );

  const pieData = rankedCategories;

  // Daily trend across the selected range (cap at 60 buckets to keep chart readable)
  const dailyTrend = useMemo(() => {
    const days = differenceInCalendarDays(rangeEnd, rangeStart) + 1;
    if (days <= 0) return [];
    const cappedStart = days > 60 ? subDays(rangeEnd, 59) : rangeStart;
    const interval = eachDayOfInterval({ start: cappedStart, end: rangeEnd });
    return interval.map((day) => {
      const dayStr = format(day, "yyyy-MM-dd");
      const dayTx = periodTx.filter((t) => t.date.startsWith(dayStr));
      const income = dayTx.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
      const expenses = dayTx.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
      return { date: dayStr, label: format(day, days <= 31 ? "MMM dd" : "MMM"), income, expenses };
    });
  }, [periodTx, rangeStart, rangeEnd]);

  // Spending frequency: distinct active days, txns/day, avg per txn
  const frequency = useMemo(() => {
    const distinctDays = new Set(expenseTx.map((t) => t.date.slice(0, 10)));
    const totalDays = Math.max(1, differenceInCalendarDays(rangeEnd, rangeStart) + 1);
    const txCount = expenseTx.length;
    const avgPerTx = txCount > 0 ? totalExpenses / txCount : 0;
    const avgPerDay = totalExpenses / totalDays;
    const txPerDay = txCount / totalDays;
    return {
      activeDays: distinctDays.size,
      totalDays,
      txCount,
      avgPerTx,
      avgPerDay,
      txPerDay,
    };
  }, [expenseTx, totalExpenses, rangeStart, rangeEnd]);

  // Daily comparison: today vs yesterday vs avg (period scoped to last 30d for context)
  const dailyComparison = useMemo(() => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const yesterdayStr = format(subDays(new Date(), 1), "yyyy-MM-dd");
    const today = allTransactions
      .filter((t) => t.type === "expense" && t.date.startsWith(todayStr))
      .reduce((s, t) => s + t.amount, 0);
    const yesterday = allTransactions
      .filter((t) => t.type === "expense" && t.date.startsWith(yesterdayStr))
      .reduce((s, t) => s + t.amount, 0);
    const last7 = eachDayOfInterval({ start: subDays(new Date(), 6), end: new Date() })
      .map((d) => allTransactions
        .filter((t) => t.type === "expense" && t.date.startsWith(format(d, "yyyy-MM-dd")))
        .reduce((s, t) => s + t.amount, 0));
    const avg7 = last7.reduce((a, b) => a + b, 0) / 7;
    return { today, yesterday, avg7 };
  }, [allTransactions]);

  // Partner breakdown by category (top 5)
  const partnerByCategory = useMemo(() => {
    const top = rankedCategories.slice(0, 5).map(({ name }) => name);
    return top.map((name) => {
      const a = expenseTx
        .filter((t) => displayCategory(t.category) === name && t.partner === "A")
        .reduce((s, t) => s + t.amount, 0);
      const b = expenseTx
        .filter((t) => displayCategory(t.category) === name && t.partner === "B")
        .reduce((s, t) => s + t.amount, 0);
      return { name, A: a, B: b };
    });
  }, [rankedCategories, expenseTx, displayCategory]);

  // Fees in range
  const feeTransactions = useMemo(() => periodTx.filter((t) => t.isFee), [periodTx]);
  const feeTotal = feeTransactions.reduce((s, t) => s + t.amount, 0);
  const feeAverage = feeTransactions.length > 0 ? feeTotal / feeTransactions.length : 0;
  const feeByMethod = useMemo(() => {
    const grouped = feeTransactions.reduce<Record<string, number>>((acc, t) => {
      const m = getPaymentMethod(t.paymentMethodId);
      const label = m ? `${m.icon} ${m.name}` : "Other";
      acc[label] = (acc[label] || 0) + t.amount;
      return acc;
    }, {});
    return Object.entries(grouped).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total);
  }, [feeTransactions, getPaymentMethod]);

  // Today/month for budget bars (still based on real today/month)
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayShared = getDayExpenses(todayStr);
  const todayA = getDayExpenses(todayStr, "A");
  const todayB = getDayExpenses(todayStr, "B");
  const monthShared = getMonthExpenses(monthKey);
  const monthA = getMonthExpenses(monthKey, "A");
  const monthB = getMonthExpenses(monthKey, "B");

  const categoryLimitEntries = useMemo(
    () => Object.entries(budgetConfig.categoryLimits).map(([cat, limit]) => {
      const display = displayCategory(cat);
      const spent = categorySpending[display] || 0;
      return {
        category: display, limit, spent,
        pct: limit > 0 ? Math.min(100, (spent / limit) * 100) : 0,
      };
    }),
    [budgetConfig.categoryLimits, categorySpending, displayCategory]
  );

  const partnerAPercent = partnerSpending.total > 0
    ? (partnerSpending.A / partnerSpending.total) * 100 : 50;

  const hasDailyLimits = budgetConfig.dailyLimitShared > 0 || budgetConfig.dailyLimitA > 0 || budgetConfig.dailyLimitB > 0;
  const hasMonthlyLimits = budgetConfig.monthlyLimitShared > 0 || budgetConfig.monthlyLimitA > 0 || budgetConfig.monthlyLimitB > 0;

  // Insights
  const insights = useMemo(() => {
    const list: string[] = [];
    if (rankedCategories[0]) {
      list.push(`Top category: ${rankedCategories[0].name} (${formatCurrency(rankedCategories[0].value)})`);
    }
    if (rankedCategories.length > 1) {
      const last = rankedCategories[rankedCategories.length - 1];
      list.push(`Lowest: ${last.name} (${formatCurrency(last.value)})`);
    }
    if (totalIncome > 0) {
      const savingsRate = ((totalIncome - totalExpenses) / totalIncome) * 100;
      list.push(`Savings rate: ${savingsRate.toFixed(0)}%`);
    }
    if (frequency.txCount > 0) {
      list.push(`Avg ${frequency.txPerDay.toFixed(1)} txns/day, ${formatCurrency(frequency.avgPerTx)} each`);
    }
    if (dailyComparison.avg7 > 0) {
      const diff = ((dailyComparison.today - dailyComparison.avg7) / dailyComparison.avg7) * 100;
      list.push(`Today is ${diff >= 0 ? "+" : ""}${diff.toFixed(0)}% vs 7-day avg`);
    }
    return list;
  }, [rankedCategories, totalIncome, totalExpenses, frequency, dailyComparison]);

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

      <h1 className="font-display text-2xl font-bold mb-1">Statistics</h1>
      <p className="text-sm text-muted-foreground mb-4">{rangeLabel}</p>

      {/* Period selector */}
      <div className="mb-4 flex flex-wrap gap-2">
        {PERIOD_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setPeriod(opt.key)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              period === opt.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {period === "custom" && (
        <div className="mb-4 flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="flex-1 justify-start text-xs">
                <CalendarIcon className="mr-2 h-3 w-3" />
                {customRange.from ? format(customRange.from, "MMM dd") : "From"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={customRange.from}
                onSelect={(d) => setCustomRange((r) => ({ ...r, from: d ?? undefined }))}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="flex-1 justify-start text-xs">
                <CalendarIcon className="mr-2 h-3 w-3" />
                {customRange.to ? format(customRange.to, "MMM dd") : "To"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={customRange.to}
                onSelect={(d) => setCustomRange((r) => ({ ...r, to: d ?? undefined }))}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>
      )}

      {/* Summary tiles */}
      <div className="mb-4 grid grid-cols-3 gap-2">
        <div className="rounded-2xl bg-muted p-3">
          <p className="text-[11px] text-muted-foreground">Income</p>
          <p className="mt-1 text-sm font-semibold text-income">{formatCurrency(totalIncome)}</p>
        </div>
        <div className="rounded-2xl bg-muted p-3">
          <p className="text-[11px] text-muted-foreground">Expenses</p>
          <p className="mt-1 text-sm font-semibold text-expense">{formatCurrency(totalExpenses)}</p>
        </div>
        <div className="rounded-2xl bg-muted p-3">
          <p className="text-[11px] text-muted-foreground">Net</p>
          <p className="mt-1 text-sm font-semibold">{formatCurrency(totalIncome - totalExpenses)}</p>
        </div>
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <div className="glass-card rounded-3xl p-5 mb-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="h-4 w-4 text-accent" />
            Key Insights
          </div>
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            {insights.map((i, idx) => <li key={idx}>• {i}</li>)}
          </ul>
        </div>
      )}

      {/* Daily Budget Status */}
      {hasDailyLimits && (
        <div className="glass-card rounded-3xl p-5 mb-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Target className="h-4 w-4 text-primary" />
            Today's Budget
          </div>
          {budgetConfig.dailyLimitShared > 0 && (
            <BudgetBar label="Shared" spent={todayShared} limit={budgetConfig.dailyLimitShared} />
          )}
          {budgetConfig.dailyLimitA > 0 && (
            <BudgetBar label={getPartnerName("A")} spent={todayA} limit={budgetConfig.dailyLimitA} />
          )}
          {budgetConfig.dailyLimitB > 0 && (
            <BudgetBar label={getPartnerName("B")} spent={todayB} limit={budgetConfig.dailyLimitB} />
          )}
        </div>
      )}

      {/* Monthly Budget Status */}
      {hasMonthlyLimits && (
        <div className="glass-card rounded-3xl p-5 mb-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Target className="h-4 w-4 text-accent" />
            Monthly Budget
          </div>
          {budgetConfig.monthlyLimitShared > 0 && (
            <BudgetBar label="Shared" spent={monthShared} limit={budgetConfig.monthlyLimitShared} />
          )}
          {budgetConfig.monthlyLimitA > 0 && (
            <BudgetBar label={getPartnerName("A")} spent={monthA} limit={budgetConfig.monthlyLimitA} />
          )}
          {budgetConfig.monthlyLimitB > 0 && (
            <BudgetBar label={getPartnerName("B")} spent={monthB} limit={budgetConfig.monthlyLimitB} />
          )}
        </div>
      )}

      {/* Spending Trend */}
      {dailyTrend.length > 0 && (
        <div className="glass-card rounded-3xl p-5 mb-4">
          <div className="flex items-center gap-2 text-sm font-semibold mb-4">
            <TrendingUp className="h-4 w-4 text-primary" />
            Trend
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={dailyTrend}>
              <defs>
                <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="incGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(158, 64%, 32%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(158, 64%, 32%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(140, 15%, 88%)" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10 }} width={40} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: 12, fontSize: 12, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
              <Area type="monotone" dataKey="income" stroke="hsl(158, 64%, 32%)" fill="url(#incGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="expenses" stroke="hsl(0, 72%, 51%)" fill="url(#expGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Daily Comparison */}
      <div className="glass-card rounded-3xl p-5 mb-4">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
          <CalendarIcon className="h-4 w-4 text-primary" />
          Daily Comparison
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-2xl bg-muted p-3">
            <p className="text-[11px] text-muted-foreground">Today</p>
            <p className="mt-1 text-sm font-semibold">{formatCurrency(dailyComparison.today)}</p>
          </div>
          <div className="rounded-2xl bg-muted p-3">
            <p className="text-[11px] text-muted-foreground">Yesterday</p>
            <p className="mt-1 text-sm font-semibold">{formatCurrency(dailyComparison.yesterday)}</p>
          </div>
          <div className="rounded-2xl bg-muted p-3">
            <p className="text-[11px] text-muted-foreground">7-day avg</p>
            <p className="mt-1 text-sm font-semibold">{formatCurrency(dailyComparison.avg7)}</p>
          </div>
        </div>
      </div>

      {/* Spending Frequency */}
      <div className="glass-card rounded-3xl p-5 mb-4">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
          <Activity className="h-4 w-4 text-primary" />
          Spending Frequency
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Transactions" value={String(frequency.txCount)} />
          <Stat label="Active days" value={`${frequency.activeDays} / ${frequency.totalDays}`} />
          <Stat label="Avg / day" value={formatCurrency(frequency.avgPerDay)} />
          <Stat label="Avg / txn" value={formatCurrency(frequency.avgPerTx)} />
        </div>
      </div>

      {/* Partner Comparison */}
      <div className="glass-card rounded-3xl p-5 mb-4">
        <div className="flex items-center gap-2 text-sm font-semibold mb-4">
          <Users className="h-4 w-4 text-primary" />
          Partner Comparison
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{getPartnerName("A")}</span>
            <span>{getPartnerName("B")}</span>
          </div>
          <div className="flex h-4 rounded-full overflow-hidden bg-muted">
            <div className="bg-partner-a transition-all" style={{ width: `${partnerAPercent}%` }} />
            <div className="bg-partner-b transition-all" style={{ width: `${100 - partnerAPercent}%` }} />
          </div>
          <div className="flex justify-between text-xs font-semibold">
            <span className="partner-a">{formatCurrency(partnerSpending.A)}</span>
            <span className="partner-b">{formatCurrency(partnerSpending.B)}</span>
          </div>
          {partnerSpending.total > 0 && (
            <p className="text-xs text-center text-muted-foreground mt-1">
              {partnerSpending.A > partnerSpending.B
                ? `${getPartnerName("A")} spent ${formatCurrency(partnerSpending.A - partnerSpending.B)} more`
                : partnerSpending.B > partnerSpending.A
                ? `${getPartnerName("B")} spent ${formatCurrency(partnerSpending.B - partnerSpending.A)} more`
                : "Even split! 🎉"}
            </p>
          )}
        </div>

        {partnerByCategory.length > 0 && (
          <div className="mt-5">
            <p className="mb-2 text-xs text-muted-foreground">By top categories</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={partnerByCategory}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-15} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 10 }} width={40} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: 12, fontSize: 12, border: "none" }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="A" name={getPartnerName("A")} fill="hsl(var(--partner-a))" radius={[6, 6, 0, 0]} />
                <Bar dataKey="B" name={getPartnerName("B")} fill="hsl(var(--partner-b))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Category Ranking */}
      {rankedCategories.length > 0 && (
        <div className="glass-card rounded-3xl p-5 mb-4">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
            <Trophy className="h-4 w-4 text-accent" />
            Category Ranking
          </div>
          <div className="space-y-2">
            {rankedCategories.map((c, i) => {
              const pct = totalExpenses > 0 ? (c.value / totalExpenses) * 100 : 0;
              return (
                <div key={c.name} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="truncate">
                      <span className="text-muted-foreground mr-1">#{i + 1}</span>
                      {c.name}
                    </span>
                    <span className="font-semibold">{formatCurrency(c.value)} · {pct.toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Transaction Costs */}
      {feeTransactions.length > 0 && (
        <div className="glass-card rounded-3xl p-5 mb-4">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
            <Target className="h-4 w-4 text-primary" />
            Transaction Costs
          </div>
          <div className="mb-4 grid grid-cols-3 gap-3">
            <Stat label="Total fees" value={formatCurrency(feeTotal)} />
            <Stat label="Charged txns" value={String(feeTransactions.length)} />
            <Stat label="Average fee" value={formatCurrency(feeAverage)} />
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={feeByMethod}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-12} textAnchor="end" height={48} />
              <YAxis tick={{ fontSize: 10 }} width={40} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ borderRadius: 12, fontSize: 12, border: "none" }} />
              <Bar dataKey="total" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Category Breakdown Pie */}
      {pieData.length > 0 && (
        <div className="glass-card rounded-3xl p-5 mb-4">
          <div className="flex items-center gap-2 text-sm font-semibold mb-4">
            <PieChart className="h-4 w-4 text-primary" />
            Category Breakdown
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <RPieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                {pieData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(val: number) => formatCurrency(val)} contentStyle={{ borderRadius: 12, fontSize: 12, border: "none" }} />
              <Legend formatter={(value) => <span className="text-xs">{value}</span>} wrapperStyle={{ fontSize: 11 }} />
            </RPieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Budget vs Actual */}
      {categoryLimitEntries.length > 0 && (
        <div className="glass-card rounded-3xl p-5 mb-4">
          <div className="flex items-center gap-2 text-sm font-semibold mb-4">
            <Target className="h-4 w-4 text-accent" />
            Budget vs Actual
          </div>
          <div className="space-y-4">
            {categoryLimitEntries.map(({ category, limit, spent, pct }) => (
              <div key={category} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>{category}</span>
                  <span className={spent > limit ? "text-expense font-semibold" : "text-muted-foreground"}>
                    {formatCurrency(spent)} / {formatCurrency(limit)}
                  </span>
                </div>
                <Progress value={pct} className="h-2" />
              </div>
            ))}
          </div>
        </div>
      )}

      {pieData.length === 0 && categoryLimitEntries.length === 0 && expenseTx.length === 0 && (
        <div className="text-center text-muted-foreground text-sm py-12">
          No expense data yet for {rangeLabel}. Add some transactions to see stats!
        </div>
      )}
    </motion.div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-muted p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function BudgetBar({ label, spent, limit }: { label: string; spent: number; limit: number; color?: string }) {
  const pct = Math.min(100, (spent / limit) * 100);
  const over = spent > limit;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span>{label}</span>
        <span className={over ? "text-expense font-semibold" : "text-muted-foreground"}>
          {formatCurrency(spent)} / {formatCurrency(limit)}
        </span>
      </div>
      <Progress value={pct} className="h-2" />
    </div>
  );
}
