import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Transaction,
  CoupleProfile,
  Partner,
  BudgetConfig,
  PaymentMethod,
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
  DEFAULT_PAYMENT_METHODS,
} from "@/types/budget";
import { format, startOfDay, endOfDay, parseISO, startOfWeek, endOfWeek, eachDayOfInterval, subDays } from "date-fns";

const STORAGE_KEYS = {
  TRANSACTIONS: "couplebank_transactions",
  PROFILE: "couplebank_profile",
  BUDGET_CONFIG: "couplebank_budget_config",
};

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

function normalizePaymentMethods(stored?: PaymentMethod[]) {
  const safeStored = Array.isArray(stored)
    ? stored.filter((method): method is PaymentMethod => Boolean(method?.id && method.name))
    : [];

  const storedMap = new Map(safeStored.map((method) => [method.id, method]));
  const mergedDefaults = DEFAULT_PAYMENT_METHODS.map((method) => ({
    ...method,
    ...storedMap.get(method.id),
  }));
  const customMethods = safeStored.filter(
    (method) => !DEFAULT_PAYMENT_METHODS.some((defaultMethod) => defaultMethod.id === method.id)
  );

  return [...mergedDefaults, ...customMethods];
}

const defaultProfile: CoupleProfile = {
  partnerAName: "Partner A",
  partnerBName: "Partner B",
};

const defaultConfig: BudgetConfig = {
  dailyLimitShared: 0,
  dailyLimitA: 0,
  dailyLimitB: 0,
  monthlyLimitShared: 0,
  monthlyLimitA: 0,
  monthlyLimitB: 0,
  customExpenseCategories: [],
  customIncomeCategories: [],
  categoryRenames: {},
  categoryLimits: {},
  paymentMethods: DEFAULT_PAYMENT_METHODS,
  customInvestmentCategories: [],
};

export function useBudgetStore() {
  const [transactions, setTransactions] = useState<Transaction[]>(() =>
    loadFromStorage(STORAGE_KEYS.TRANSACTIONS, [])
  );
  const [profile, setProfile] = useState<CoupleProfile>(() =>
    loadFromStorage(STORAGE_KEYS.PROFILE, defaultProfile)
  );
  const [budgetConfig, setBudgetConfig] = useState<BudgetConfig>(() => {
    const loaded = loadFromStorage<Partial<BudgetConfig>>(STORAGE_KEYS.BUDGET_CONFIG, {});
    return {
      ...defaultConfig,
      ...loaded,
      customInvestmentCategories: loaded.customInvestmentCategories ?? [],
      paymentMethods: normalizePaymentMethods(loaded.paymentMethods),
    } as BudgetConfig;
  });

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.TRANSACTIONS, transactions);
  }, [transactions]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.PROFILE, profile);
  }, [profile]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.BUDGET_CONFIG, budgetConfig);
  }, [budgetConfig]);

  const addTransaction = useCallback((tx: Omit<Transaction, "id">) => {
    const id = crypto.randomUUID();
    const newTx: Transaction = { ...tx, id };
    setTransactions((prev) => {
      const next = [newTx, ...prev];
      // Auto-create a fee transaction if transactionCost provided
      if (tx.transactionCost && tx.transactionCost > 0) {
        const feeTx: Transaction = {
          id: crypto.randomUUID(),
          amount: tx.transactionCost,
          type: "expense",
          category: "💸 Transaction Fees",
          description: `Fee for ${tx.description || tx.category}`,
          partner: tx.partner,
          date: tx.date,
          paymentMethodId: tx.paymentMethodId,
          isFee: true,
          parentId: id,
        };
        return [feeTx, ...next];
      }
      return next;
    });
  }, []);

  const deleteTransaction = useCallback((id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id && t.parentId !== id));
  }, []);

  const updateProfile = useCallback((p: CoupleProfile) => {
    setProfile(p);
  }, []);

  const updateBudgetConfig = useCallback((c: BudgetConfig) => {
    setBudgetConfig(c);
  }, []);

  const getPartnerName = useCallback(
    (partner: Partner) =>
      partner === "A" ? profile.partnerAName : profile.partnerBName,
    [profile]
  );

  // Merged categories (defaults + custom)
  const expenseCategories = useMemo(
    () => [...DEFAULT_EXPENSE_CATEGORIES, ...budgetConfig.customExpenseCategories],
    [budgetConfig.customExpenseCategories]
  );

  const incomeCategories = useMemo(
    () => [...DEFAULT_INCOME_CATEGORIES, ...budgetConfig.customIncomeCategories],
    [budgetConfig.customIncomeCategories]
  );

  const getMonthTransactions = useCallback(
    (month: string) =>
      transactions.filter((t) => t.date.startsWith(month)),
    [transactions]
  );

  const getTotals = useCallback(
    (month: string) => {
      const monthTx = transactions.filter((t) => t.date.startsWith(month));
      const income = monthTx
        .filter((t) => t.type === "income")
        .reduce((s, t) => s + t.amount, 0);
      const expenses = monthTx
        .filter((t) => t.type === "expense")
        .reduce((s, t) => s + t.amount, 0);
      return { income, expenses, balance: income - expenses };
    },
    [transactions]
  );

  // Daily spending for a specific date
  const getDayExpenses = useCallback(
    (dateStr: string, partner?: Partner) => {
      const dayStart = format(startOfDay(parseISO(dateStr)), "yyyy-MM-dd");
      return transactions
        .filter(
          (t) =>
            t.type === "expense" &&
            t.date.startsWith(dayStart) &&
            (partner ? t.partner === partner : true)
        )
        .reduce((s, t) => s + t.amount, 0);
    },
    [transactions]
  );

  // Category spending for a month
  const getCategorySpending = useCallback(
    (month: string) => {
      const monthTx = transactions.filter(
        (t) => t.date.startsWith(month) && t.type === "expense"
      );
      const map: Record<string, number> = {};
      monthTx.forEach((t) => {
        map[t.category] = (map[t.category] || 0) + t.amount;
      });
      return map;
    },
    [transactions]
  );

  // Monthly expenses total (optionally by partner)
  const getMonthExpenses = useCallback(
    (month: string, partner?: Partner) => {
      return transactions
        .filter(
          (t) =>
            t.type === "expense" &&
            t.date.startsWith(month) &&
            (partner ? t.partner === partner : true)
        )
        .reduce((s, t) => s + t.amount, 0);
    },
    [transactions]
  );

  // Partner spending for a month
  const getPartnerSpending = useCallback(
    (month: string) => {
      const monthTx = transactions.filter(
        (t) => t.date.startsWith(month) && t.type === "expense"
      );
      const a = monthTx.filter((t) => t.partner === "A").reduce((s, t) => s + t.amount, 0);
      const b = monthTx.filter((t) => t.partner === "B").reduce((s, t) => s + t.amount, 0);
      return { A: a, B: b, total: a + b };
    },
    [transactions]
  );

  // Daily trend for last N days
  const getDailyTrend = useCallback(
    (days: number = 30) => {
      const end = new Date();
      const start = subDays(end, days - 1);
      const interval = eachDayOfInterval({ start, end });
      return interval.map((day) => {
        const dayStr = format(day, "yyyy-MM-dd");
        const dayTx = transactions.filter(
          (t) => t.date.startsWith(dayStr)
        );
        const income = dayTx.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
        const expenses = dayTx.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
        return { date: dayStr, label: format(day, "MMM dd"), income, expenses };
      });
    },
    [transactions]
  );

  const displayCategory = useCallback(
    (c: string) => budgetConfig.categoryRenames?.[c] || c,
    [budgetConfig.categoryRenames]
  );

  const getPaymentMethod = useCallback(
    (id?: string) => budgetConfig.paymentMethods.find((p) => p.id === id),
    [budgetConfig.paymentMethods]
  );

  return {
    transactions,
    profile,
    budgetConfig,
    addTransaction,
    deleteTransaction,
    updateProfile,
    updateBudgetConfig,
    getPartnerName,
    getMonthTransactions,
    getTotals,
    getDayExpenses,
    getMonthExpenses,
    getCategorySpending,
    getPartnerSpending,
    getDailyTrend,
    expenseCategories,
    incomeCategories,
    paymentMethods: budgetConfig.paymentMethods,
    displayCategory,
    getPaymentMethod,
  };
}
