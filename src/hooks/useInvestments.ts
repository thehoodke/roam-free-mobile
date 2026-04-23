import { useState, useEffect, useCallback, useMemo } from "react";
import {
  InvestmentAccount,
  InvestmentTransaction,
  Partner,
} from "@/types/budget";

const STORAGE_KEYS = {
  ACCOUNTS: "couplebank_invest_accounts",
  INVEST_TX: "couplebank_invest_transactions",
};

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function useInvestments() {
  const [accounts, setAccounts] = useState<InvestmentAccount[]>(() =>
    load<InvestmentAccount[]>(STORAGE_KEYS.ACCOUNTS, [])
  );
  const [investTx, setInvestTx] = useState<InvestmentTransaction[]>(() =>
    load<InvestmentTransaction[]>(STORAGE_KEYS.INVEST_TX, [])
  );

  useEffect(() => save(STORAGE_KEYS.ACCOUNTS, accounts), [accounts]);
  useEffect(() => save(STORAGE_KEYS.INVEST_TX, investTx), [investTx]);

  const addAccount = useCallback((acc: Omit<InvestmentAccount, "id" | "createdAt">) => {
    const newAcc: InvestmentAccount = {
      ...acc,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    setAccounts((prev) => [newAcc, ...prev]);
    return newAcc;
  }, []);

  const updateAccount = useCallback((id: string, patch: Partial<InvestmentAccount>) => {
    setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  }, []);

  const deleteAccount = useCallback((id: string) => {
    setAccounts((prev) => prev.filter((a) => a.id !== id));
    setInvestTx((prev) => prev.filter((t) => t.accountId !== id));
  }, []);

  const addInvestmentTx = useCallback((tx: Omit<InvestmentTransaction, "id">) => {
    const newTx: InvestmentTransaction = { ...tx, id: crypto.randomUUID() };
    setInvestTx((prev) => [newTx, ...prev]);

    // Auto-update account current value based on tx type
    setAccounts((prev) =>
      prev.map((a) => {
        if (a.id !== tx.accountId) return a;
        if (tx.type === "valuation") {
          return { ...a, currentValue: tx.amount, lastValuationDate: tx.date };
        }
        if (tx.type === "contribution") {
          return { ...a, currentValue: a.currentValue + tx.amount };
        }
        if (tx.type === "withdrawal") {
          return { ...a, currentValue: Math.max(0, a.currentValue - tx.amount) };
        }
        return a;
      })
    );
    return newTx;
  }, []);

  const deleteInvestmentTx = useCallback((id: string) => {
    setInvestTx((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Aggregates
  const totalPortfolioValue = useMemo(
    () => accounts.reduce((s, a) => s + (a.currentValue || 0), 0),
    [accounts]
  );

  const portfolioByPartner = useMemo(() => {
    const out = { A: 0, B: 0, shared: 0 };
    accounts.forEach((a) => {
      out[a.partner] = (out[a.partner] || 0) + (a.currentValue || 0);
    });
    return out;
  }, [accounts]);

  // Net cashflow into investments for a given month (contributions - withdrawals)
  // Used by main balance: contributions reduce balance, withdrawals add back.
  const getMonthInvestmentFlow = useCallback(
    (month: string, partner?: Partner) => {
      const txs = investTx.filter((t) => t.date.startsWith(month));
      let contributions = 0;
      let withdrawals = 0;
      let fees = 0;
      txs.forEach((t) => {
        if (partner) {
          const acc = accounts.find((a) => a.id === t.accountId);
          if (!acc) return;
          if (acc.partner !== partner && acc.partner !== "shared") return;
        }
        if (t.type === "contribution") {
          contributions += t.amount;
          fees += t.transactionCost || 0;
        } else if (t.type === "withdrawal") {
          withdrawals += t.amount;
          fees += t.transactionCost || 0;
        }
      });
      return { contributions, withdrawals, fees, net: contributions - withdrawals };
    },
    [investTx, accounts]
  );

  // Lifetime cost basis per account: sum contributions - withdrawals
  const getAccountBasis = useCallback(
    (accountId: string) => {
      const txs = investTx.filter((t) => t.accountId === accountId);
      let basis = 0;
      txs.forEach((t) => {
        if (t.type === "contribution") basis += t.amount;
        else if (t.type === "withdrawal") basis -= t.amount;
      });
      return basis;
    },
    [investTx]
  );

  const getAccountTransactions = useCallback(
    (accountId: string) =>
      investTx
        .filter((t) => t.accountId === accountId)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [investTx]
  );

  return {
    accounts,
    investmentTransactions: investTx,
    addAccount,
    updateAccount,
    deleteAccount,
    addInvestmentTx,
    deleteInvestmentTx,
    totalPortfolioValue,
    portfolioByPartner,
    getMonthInvestmentFlow,
    getAccountBasis,
    getAccountTransactions,
  };
}
