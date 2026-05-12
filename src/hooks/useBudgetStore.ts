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

function getDateKey(dateLike: string) {
  try {
    return format(parseISO(dateLike), "yyyy-MM-dd");
  } catch {
    return dateLike.slice(0, 10);
  }
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
    loadFromStorage<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, []).map((tx) => ({
      ...tx,
      date: getDateKey(tx.date),
    }))
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
    replaceBalances,
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

    // If this is a bundle transaction, create individual transactions for each item
    if (tx.bundleItems && tx.bundleItems.length > 0) {
      const bundleTransactions: Transaction[] = [];
      let totalFee = tx.transactionCost || 0;

      tx.bundleItems.forEach((item) => {
        const itemId = crypto.randomUUID();
        const itemTx: Transaction = {
          id: itemId,
          amount: item.amount,
          type: tx.type,
          category: item.category,
          description: item.description || `${tx.description || "Bundle item"} - ${item.category}`,
          partner: tx.partner,
          date: tx.date,
          paymentMethodId: tx.paymentMethodId,
          parentId: id, // Link to the bundle parent
        };
        bundleTransactions.push(itemTx);

        // Update balance for each bundle item
        if (tx.paymentMethodId) {
          if (tx.type === "income") {
            adjustBalance(tx.paymentMethodId, tx.partner, item.amount);
          } else if (tx.type === "expense") {
            adjustBalance(tx.paymentMethodId, tx.partner, -item.amount);
          }
        }
      });

      // Create the main bundle transaction (for display purposes)
      const normalizedDate = getDateKey(tx.date);
      const mainTx: Transaction = {
        ...tx,
        id,
        date: normalizedDate,
        bundleItems: tx.bundleItems,
      };
      bundleTransactions.push(mainTx);

      // Handle transaction fee if any
      if (totalFee > 0) {
        const feeTx: Transaction = {
          id: crypto.randomUUID(),
          amount: totalFee,
          type: "expense",
          category: "💸 Transaction Fees",
          description: `Fee for ${tx.description || "bundle transaction"}`,
          partner: tx.partner,
          date: normalizedDate,
          paymentMethodId: tx.paymentMethodId,
          isFee: true,
          parentId: id,
        };
        bundleTransactions.unshift(feeTx);

        // Adjust balance for fee
        if (tx.paymentMethodId) {
          adjustBalance(tx.paymentMethodId, tx.partner, -totalFee);
        }
      }

      setTransactions((prev) => [...bundleTransactions, ...prev]);
      return;
    }

    // Regular single transaction
    const normalizedDate = getDateKey(tx.date);
    const newTx: Transaction = { ...tx, id, date: normalizedDate };
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
          date: normalizedDate,
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
    setTransactions((prev) => {
      const txToDelete = prev.find((t) => t.id === id);
      if (!txToDelete) return prev;

      const reverseTxImpact = (tx: Transaction) => {
        if (!tx.paymentMethodId) return;

        if (tx.type === "transfer") {
          if (!tx.id.endsWith("-out")) return;
          const inTx = prev.find((t) => t.id === tx.id.replace("-out", "-in"));
          if (!inTx?.paymentMethodId) return;
          const fromPartner = tx.transferFromPartner || tx.partner;
          const toPartner = inTx.transferToPartner || inTx.partner;
          adjustBalance(tx.paymentMethodId, fromPartner, tx.amount);
          adjustBalance(inTx.paymentMethodId, toPartner, -inTx.amount);
          return;
        }

        if (tx.bundleItems && tx.bundleItems.length > 0) {
          return;
        }

        if (tx.isFee) {
          const parent = tx.parentId ? prev.find((p) => p.id === tx.parentId) : undefined;
          if (parent?.bundleItems && parent.bundleItems.length > 0) {
            adjustBalance(tx.paymentMethodId, tx.partner, tx.amount);
          }
          return;
        }

        if (tx.parentId) {
          const parent = prev.find((p) => p.id === tx.parentId);
          if (parent?.bundleItems && parent.bundleItems.length > 0) {
            if (tx.type === "income") {
              adjustBalance(tx.paymentMethodId, tx.partner, -tx.amount);
            } else if (tx.type === "expense") {
              adjustBalance(tx.paymentMethodId, tx.partner, tx.amount);
            }
          }
          return;
        }

        const fee = tx.transactionCost ?? 0;
        if (tx.type === "income") {
          adjustBalance(tx.paymentMethodId, tx.partner, -(tx.amount - fee));
        } else if (tx.type === "expense") {
          adjustBalance(tx.paymentMethodId, tx.partner, tx.amount + fee);
        }
      };

      // If this is a bundle transaction, delete all bundle items too
      if (txToDelete.bundleItems && txToDelete.bundleItems.length > 0) {
        const bundleItemIds = txToDelete.bundleItems.map(item => item.id);
        const toDelete = prev.filter((t) => t.id === id || t.parentId === id || bundleItemIds.includes(t.id));
        toDelete.forEach(reverseTxImpact);
        const toDeleteIds = new Set(toDelete.map((t) => t.id));
        return prev.filter((t) => !toDeleteIds.has(t.id));
      }

      // Regular transaction deletion
      const toDelete = prev.filter((t) => t.id === id || t.parentId === id);
      toDelete.forEach(reverseTxImpact);
      const toDeleteIds = new Set(toDelete.map((t) => t.id));
      return prev.filter((t) => !toDeleteIds.has(t.id));
    });
  }, [adjustBalance]);

  const updateTransaction = useCallback((updatedTx: Transaction) => {
    setTransactions((prev) => {
      const oldTx = prev.find((t) => t.id === updatedTx.id);
      if (!oldTx) return prev;

      // Handle balance adjustments
      if (oldTx.type === "transfer") {
        const oldOut = oldTx.id.endsWith("-out")
          ? oldTx
          : prev.find((t) => t.id === oldTx.id.replace("-in", "-out"));
        const oldIn = oldTx.id.endsWith("-in")
          ? oldTx
          : prev.find((t) => t.id === oldTx.id.replace("-out", "-in"));

        if (!oldOut || !oldIn || !oldOut.paymentMethodId || !oldIn.paymentMethodId) return prev;

        const oldFromPartner = oldOut.transferFromPartner || oldOut.partner;
        const oldToPartner = oldIn.transferToPartner || oldIn.partner;

        adjustBalance(oldOut.paymentMethodId, oldFromPartner, oldOut.amount);
        adjustBalance(oldIn.paymentMethodId, oldToPartner, -oldIn.amount);

        const isUpdatedOut = updatedTx.id.endsWith("-out");
        const nextOut = isUpdatedOut ? updatedTx : { ...oldOut };
        const halfFee = nextOut.transactionCost ?? 0;
        const receivedAmount = Math.max(0, nextOut.amount - (halfFee * 2));
        const nextIn: Transaction = {
          ...oldIn,
          amount: receivedAmount,
          description: `Transfer from ${nextOut.transferFromAccountId || nextOut.paymentMethodId}: ${nextOut.description.replace(/^Transfer to .*?:\s*/, "")}`,
          date: nextOut.date,
          partner: nextOut.transferToPartner || oldIn.partner,
          paymentMethodId: nextOut.transferToAccountId || oldIn.paymentMethodId,
          transactionCost: nextOut.transactionCost,
          transferFromAccountId: nextOut.transferFromAccountId,
          transferToAccountId: nextOut.transferToAccountId,
          transferFromPartner: nextOut.transferFromPartner,
          transferToPartner: nextOut.transferToPartner,
        };

        if (!nextOut.paymentMethodId || !nextIn.paymentMethodId) return prev;

        const newFromPartner = nextOut.transferFromPartner || nextOut.partner;
        const newToPartner = nextOut.transferToPartner || nextIn.partner;

        adjustBalance(nextOut.paymentMethodId, newFromPartner, -nextOut.amount);
        adjustBalance(nextIn.paymentMethodId, newToPartner, nextIn.amount);

        return prev.map((t) => {
          if (t.id === nextOut.id) return nextOut;
          if (t.id === nextIn.id) return nextIn;
          return t;
        });
      } else {
        // For regular transactions, revert old balance adjustment
        if (oldTx.paymentMethodId) {
          const oldFee = oldTx.transactionCost ?? 0;
          if (oldTx.type === "income") {
            adjustBalance(oldTx.paymentMethodId, oldTx.partner, -(oldTx.amount - oldFee));
          } else if (oldTx.type === "expense") {
            adjustBalance(oldTx.paymentMethodId, oldTx.partner, oldTx.amount + oldFee);
          }
        }
      }

      // Apply new balance adjustments
      if (updatedTx.type !== "transfer") {
        // For regular transactions, apply new balance adjustment
        if (updatedTx.paymentMethodId) {
          const newFee = updatedTx.transactionCost ?? 0;
          if (updatedTx.type === "income") {
            adjustBalance(updatedTx.paymentMethodId, updatedTx.partner, updatedTx.amount - newFee);
          } else if (updatedTx.type === "expense") {
            adjustBalance(updatedTx.paymentMethodId, updatedTx.partner, -(updatedTx.amount + newFee));
          }
        }
      }

      // Update transaction and handle fee transaction
      const updated = prev.map((t) => {
        if (t.id === updatedTx.id) {
          return updatedTx;
        }
        if (t.parentId === updatedTx.id) {
          // Update fee transaction
          return {
            ...t,
            amount: updatedTx.transactionCost ?? 0,
            description: `Fee for ${updatedTx.description || updatedTx.category}`,
            partner: updatedTx.partner,
            date: updatedTx.date,
            paymentMethodId: updatedTx.paymentMethodId,
          };
        }
        return t;
      });

      // If transaction cost changed, add or remove fee transaction
      const hasFee = updatedTx.transactionCost && updatedTx.transactionCost > 0;
      const existingFee = updated.find((t) => t.parentId === updatedTx.id);

      if (hasFee && !existingFee) {
        // Add new fee transaction
        const feeTx: Transaction = {
          id: crypto.randomUUID(),
          amount: updatedTx.transactionCost,
          type: "expense",
          category: "💸 Transaction Fees",
          description: `Fee for ${updatedTx.description || updatedTx.category}`,
          partner: updatedTx.partner,
          date: updatedTx.date,
          paymentMethodId: updatedTx.paymentMethodId,
          isFee: true,
          parentId: updatedTx.id,
        };
        return [feeTx, ...updated];
      } else if (!hasFee && existingFee) {
        // Remove fee transaction
        return updated.filter((t) => t.id !== existingFee.id);
      }

      return updated;
    });
  }, [adjustBalance]);

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
      transactions.filter((t) => getDateKey(t.date).startsWith(month) && (!t.parentId || t.isFee)),
    [transactions]
  );

  const getTotals = useCallback(
    (month: string) => {
      const monthTx = transactions.filter((t) => getDateKey(t.date).startsWith(month) && (!t.parentId || t.isFee));
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
            getDateKey(t.date).startsWith(dayStart) &&
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
        (t) => getDateKey(t.date).startsWith(month) && t.type === "expense"
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
            getDateKey(t.date).startsWith(month) &&
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
        (t) => getDateKey(t.date).startsWith(month) && t.type === "expense"
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
          (t) => getDateKey(t.date).startsWith(dayStr) && (!t.parentId || t.isFee)
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
    fromPartner: Partner,
    toPartner: Partner,
    description: string,
    transactionCost?: number,
    date: string = format(new Date(), "yyyy-MM-dd")
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
      partner: fromPartner,
      date,
      paymentMethodId: fromAccountId,
      transactionCost: fee ? fee / 2 : undefined,
      transferFromAccountId: fromAccountId,
      transferToAccountId: toAccountId,
      transferFromPartner: fromPartner,
      transferToPartner: toPartner,
    };

    const transferIn: Transaction = {
      id: `${transferId}-in`,
      amount: receivedAmount,
      type: "transfer",
      category: "transfer",
      description: `Transfer from ${fromAccountId}: ${description}`,
      partner: toPartner,
      date,
      paymentMethodId: toAccountId,
      transactionCost: fee ? fee / 2 : undefined,
      transferFromAccountId: fromAccountId,
      transferToAccountId: toAccountId,
      transferFromPartner: fromPartner,
      transferToPartner: toPartner,
    };

    setTransactions((prev) => [...prev, transferOut, transferIn]);
    adjustBalance(fromAccountId, fromPartner, -amount);
    adjustBalance(toAccountId, toPartner, receivedAmount);

    return { transferOut, transferIn };
  }, [adjustBalance]);

  const getBalanceReconciliation = useCallback(() => {
    const expectedMap = new Map<string, number>();
    const initialMap = new Map<string, number>();

    balances.forEach((b) => {
      const key = `${b.partner}:${b.paymentMethodId}`;
      initialMap.set(key, b.initialBalance || 0);
      expectedMap.set(key, b.initialBalance || 0);
    });

    transactions.forEach((tx) => {
      if (!tx.paymentMethodId) return;
      if (tx.type === "transfer") return;
      if (tx.parentId && !tx.isFee) return;

      const key = `${tx.partner}:${tx.paymentMethodId}`;
      const current = expectedMap.get(key) ?? 0;

      if (tx.type === "income") {
        expectedMap.set(key, current + tx.amount);
      } else if (tx.type === "expense") {
        expectedMap.set(key, current - tx.amount);
      }
    });

    transactions
      .filter((tx) => tx.type === "transfer" && tx.id.endsWith("-out"))
      .forEach((outTx) => {
        const inTx = transactions.find((t) => t.id === outTx.id.replace("-out", "-in"));
        if (!outTx.paymentMethodId || !inTx?.paymentMethodId) return;

        const fromPartner = outTx.transferFromPartner || outTx.partner;
        const toPartner = inTx.transferToPartner || inTx.partner;

        const fromKey = `${fromPartner}:${outTx.paymentMethodId}`;
        const toKey = `${toPartner}:${inTx.paymentMethodId}`;

        expectedMap.set(fromKey, (expectedMap.get(fromKey) ?? 0) - outTx.amount);
        expectedMap.set(toKey, (expectedMap.get(toKey) ?? 0) + inTx.amount);
      });

    const allKeys = new Set<string>([
      ...Array.from(expectedMap.keys()),
      ...balances.map((b) => `${b.partner}:${b.paymentMethodId}`),
    ]);

    const items = Array.from(allKeys).map((key) => {
      const [partner, paymentMethodId] = key.split(":");
      const stored = balances.find((b) => b.partner === partner && b.paymentMethodId === paymentMethodId)?.balance ?? 0;
      const expected = expectedMap.get(key) ?? 0;
      const delta = expected - stored;
      return { key, partner: partner as Partner | "shared", paymentMethodId, stored, expected, delta };
    });

    return {
      items: items.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)),
      hasMismatch: items.some((i) => Math.abs(i.delta) > 0.000001),
    };
  }, [balances, transactions]);

  const reconcileBalances = useCallback(() => {
    const report = getBalanceReconciliation();
    const now = new Date().toISOString();

    const reconciled = report.items.map((item) => {
      const existing = balances.find(
        (b) => b.partner === item.partner && b.paymentMethodId === item.paymentMethodId
      );
      return {
        id: existing?.id || crypto.randomUUID(),
        paymentMethodId: item.paymentMethodId,
        partner: item.partner,
        initialBalance: existing?.initialBalance || 0,
        balance: item.expected,
        lastUpdated: now,
      };
    });

    replaceBalances(reconciled);
    return report;
  }, [balances, getBalanceReconciliation, replaceBalances]);

  return {
    transactions,
    profile,
    budgetConfig,
    addTransaction,
    deleteTransaction,
    updateTransaction,
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
    getDateKey,
    getBalanceReconciliation,
    reconcileBalances,
  };
}
