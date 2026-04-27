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
  createDefaultCategoryTree,
  CategoryNode,
  findCategoryById,
  getAllCategoryIds,
  getCategoryPath,
  addSubcategory,
} from "@/types/budget";
import { useAccountBalances } from "@/hooks/useAccountBalances";
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
  categoryTree: createDefaultCategoryTree(),
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
      categoryTree: loaded.categoryTree || createDefaultCategoryTree(),
    } as BudgetConfig;
  });

  const {
    balances,
    setInitialBalance,
    adjustBalance,
    getBalance,
    getTotalBalanceByPartner,
    getAllBalancesByPartner,
  } = useAccountBalances();

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

    if (tx.paymentMethodId) {
      const fee = tx.transactionCost ?? 0;
      if (tx.type === "income") {
        adjustBalance(tx.paymentMethodId, tx.partner, tx.amount - fee);
      } else if (tx.type === "expense") {
        adjustBalance(tx.paymentMethodId, tx.partner, -(tx.amount + fee));
      }
    }
  }, [adjustBalance]);

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

  const getPaymentMethod = useCallback(
    (id?: string) => budgetConfig.paymentMethods.find((p) => p.id === id),
    [budgetConfig.paymentMethods]
  );

  // Category tree management
  const getCategoryTree = useCallback((type: 'expense' | 'income' | 'investment' | 'debt') => {
    return budgetConfig.categoryTree?.[type] || [];
  }, [budgetConfig.categoryTree]);

  const findCategory = useCallback((categoryId: string, type: 'expense' | 'income' | 'investment' | 'debt') => {
    const tree = getCategoryTree(type);
    return findCategoryById(tree, categoryId);
  }, [getCategoryTree]);

  const displayCategory = useCallback(
    (categoryId: string) => {
      const category =
        findCategory(categoryId, 'expense') ||
        findCategory(categoryId, 'income') ||
        findCategory(categoryId, 'investment') ||
        findCategory(categoryId, 'debt');
      return category?.fullPath || budgetConfig.categoryRenames?.[categoryId] || categoryId;
    },
    [budgetConfig.categoryRenames, findCategory]
  );

  const getCategoryDisplayName = useCallback((categoryId: string, type: 'expense' | 'income' | 'investment' | 'debt') => {
    const category = findCategory(categoryId, type);
    return category?.fullPath || categoryId;
  }, [findCategory]);

  const addSubcategoryToTree = useCallback((
    type: 'expense' | 'income' | 'investment' | 'debt',
    parentId: string,
    name: string,
    icon?: string
  ) => {
    const currentTree = budgetConfig.categoryTree || createDefaultCategoryTree();
    const updatedTree = { ...currentTree };
    updatedTree[type] = addSubcategory(updatedTree[type], parentId, name, icon);

    setBudgetConfig(prev => ({
      ...prev,
      categoryTree: updatedTree,
    }));
  }, [budgetConfig.categoryTree]);

  // Transfer transactions
  const addTransferTransaction = useCallback((
    fromAccountId: string,
    toAccountId: string,
    amount: number,
    partner: Partner,
    description: string,
    transactionCost?: number
  ) => {
    const transferId = crypto.randomUUID();
    const fee = transactionCost ?? 0;
    const receivedAmount = Math.max(0, amount - fee);

    const transferOut: Transaction = {
      id: `${transferId}-out`,
      amount,
      type: "transfer",
      category: "transfer",
      description: `Transfer to ${toAccountId}: ${description}`,
      partner,
      date: new Date().toISOString(),
      paymentMethodId: fromAccountId,
      transactionCost: fee ? fee / 2 : undefined,
      transferFromAccountId: fromAccountId,
      transferToAccountId: toAccountId,
    };

    const transferIn: Transaction = {
      id: `${transferId}-in`,
      amount: receivedAmount,
      type: "transfer",
      category: "transfer",
      description: `Transfer from ${fromAccountId}: ${description}`,
      partner,
      date: new Date().toISOString(),
      paymentMethodId: toAccountId,
      transactionCost: fee ? fee / 2 : undefined,
      transferFromAccountId: fromAccountId,
      transferToAccountId: toAccountId,
    };

    setTransactions((prev) => [...prev, transferOut, transferIn]);
    adjustBalance(fromAccountId, partner, -amount);
    adjustBalance(toAccountId, partner, receivedAmount);

    return { transferOut, transferIn };
  }, [adjustBalance]);

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
    balances,
    setInitialBalance,
    getBalance,
    getTotalBalanceByPartner,
    getAllBalancesByPartner,
    displayCategory,
    getPaymentMethod,
    // New category tree functions
    getCategoryTree,
    findCategory,
    getCategoryDisplayName,
    addSubcategoryToTree,
    // Transfer functions
    addTransferTransaction,
  };
}
