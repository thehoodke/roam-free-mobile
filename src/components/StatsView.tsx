import { useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, TrendingUp, Users, PieChart, Target } from "lucide-react";
import { format } from "date-fns";
import { Progress } from "@/components/ui/progress";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart as RPieChart, Pie, Cell, Legend,
} from "recharts";
import { Partner, BudgetConfig } from "@/types/budget";
import { formatCurrency } from "@/lib/currency";

interface StatsViewProps {
  monthKey: string;
  monthLabel: string;
  getCategorySpending: (month: string) => Record<string, number>;
  getPartnerSpending: (month: string) => { A: number; B: number; total: number };
  getDailyTrend: (days?: number) => { date: string; label: string; income: number; expenses: number }[];
  getDayExpenses: (date: string, partner?: Partner) => number;
  getMonthExpenses: (month: string, partner?: Partner) => number;
  getPartnerName: (p: Partner) => string;
  budgetConfig: BudgetConfig;
  onBack: () => void;
}

const CHART_COLORS = [
  "hsl(158, 64%, 32%)", "hsl(38, 92%, 55%)", "hsl(220, 80%, 56%)",
  "hsl(330, 70%, 55%)", "hsl(0, 72%, 51%)", "hsl(270, 60%, 55%)",
  "hsl(190, 70%, 45%)", "hsl(100, 50%, 45%)", "hsl(45, 80%, 50%)",
  "hsl(15, 75%, 50%)",
];

export default function StatsView({
  monthKey, monthLabel, getCategorySpending, getPartnerSpending,
  getDailyTrend, getDayExpenses, getMonthExpenses, getPartnerName, budgetConfig, onBack,
}: StatsViewProps) {
  const categorySpending = useMemo(() => getCategorySpending(monthKey), [monthKey, getCategorySpending]);
  const partnerSpending = useMemo(() => getPartnerSpending(monthKey), [monthKey, getPartnerSpending]);
  const dailyTrend = useMemo(() => getDailyTrend(30), [getDailyTrend]);

  const pieData = useMemo(
    () => Object.entries(categorySpending).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
    [categorySpending]
  );

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayShared = getDayExpenses(todayStr);
  const todayA = getDayExpenses(todayStr, "A");
  const todayB = getDayExpenses(todayStr, "B");

  const monthShared = getMonthExpenses(monthKey);
  const monthA = getMonthExpenses(monthKey, "A");
  const monthB = getMonthExpenses(monthKey, "B");

  const categoryLimitEntries = useMemo(
    () => Object.entries(budgetConfig.categoryLimits).map(([cat, limit]) => ({
      category: cat, limit, spent: categorySpending[cat] || 0,
      pct: limit > 0 ? Math.min(100, ((categorySpending[cat] || 0) / limit) * 100) : 0,
    })),
    [budgetConfig.categoryLimits, categorySpending]
  );

  const partnerAPercent = partnerSpending.total > 0 ? (partnerSpending.A / partnerSpending.total) * 100 : 50;

  const hasDailyLimits = budgetConfig.dailyLimitShared > 0 || budgetConfig.dailyLimitA > 0 || budgetConfig.dailyLimitB > 0;
  const hasMonthlyLimits = budgetConfig.monthlyLimitShared > 0 || budgetConfig.monthlyLimitA > 0 || budgetConfig.monthlyLimitB > 0;

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
      <p className="text-sm text-muted-foreground mb-6">{monthLabel}</p>

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
      <div className="glass-card rounded-3xl p-5 mb-4">
        <div className="flex items-center gap-2 text-sm font-semibold mb-4">
          <TrendingUp className="h-4 w-4 text-primary" />
          30-Day Trend
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
            <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
            <Area type="monotone" dataKey="income" stroke="hsl(158, 64%, 32%)" fill="url(#incGrad)" strokeWidth={2} />
            <Area type="monotone" dataKey="expenses" stroke="hsl(0, 72%, 51%)" fill="url(#expGrad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
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
      </div>

      {/* Category Breakdown */}
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

      {pieData.length === 0 && categoryLimitEntries.length === 0 && (
        <div className="text-center text-muted-foreground text-sm py-12">
          No expense data yet for {monthLabel}. Add some transactions to see stats!
        </div>
      )}
    </motion.div>
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
