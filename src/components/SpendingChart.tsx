import { Transaction } from "@/types/budget";
import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface SpendingChartProps {
  transactions: Transaction[];
}

const COLORS = [
  "hsl(158, 64%, 32%)",
  "hsl(38, 92%, 55%)",
  "hsl(220, 80%, 56%)",
  "hsl(330, 70%, 55%)",
  "hsl(260, 60%, 55%)",
  "hsl(180, 50%, 45%)",
  "hsl(10, 70%, 55%)",
  "hsl(90, 50%, 45%)",
];

export default function SpendingChart({ transactions }: SpendingChartProps) {
  const data = useMemo(() => {
    const expenses = transactions.filter((t) => t.type === "expense");
    const byCategory = expenses.reduce<Record<string, number>>((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {});
    return Object.entries(byCategory)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  if (data.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground text-sm">
        No expenses to chart yet
      </div>
    );
  }

  return (
    <div className="glass-card rounded-3xl p-5">
      <h3 className="font-display font-bold text-sm mb-3">Spending Breakdown</h3>
      <div className="flex items-center gap-4">
        <div className="h-32 w-32 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={30}
                outerRadius={55}
                paddingAngle={3}
                dataKey="value"
                stroke="none"
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-1.5 min-w-0">
          {data.slice(0, 5).map((d, i) => (
            <div key={d.name} className="flex items-center gap-2 text-xs">
              <div
                className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: COLORS[i % COLORS.length] }}
              />
              <span className="truncate flex-1">{d.name}</span>
              <span className="font-semibold">${d.value.toFixed(0)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
