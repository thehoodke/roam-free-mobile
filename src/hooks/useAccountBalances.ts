import { useState, useEffect, useCallback, useMemo } from "react";
import { AccountBalance, Transaction } from "@/types/budget";

const STORAGE_KEYS = {
  ACCOUNT_BALANCES: "couplebank_account_balances",
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

export function useAccountBalances() {
  const [balances, setBalances] = useState<AccountBalance[]>(() =>
    load(STORAGE_KEYS.ACCOUNT_BALANCES, [])
  );

  useEffect(() => save(STORAGE_KEYS.ACCOUNT_BALANCES, balances), [balances]);

  const getOrCreateBalance = useCallback((
    paymentMethodId: string,
    partner: "A" | "B" | "shared"
  ): AccountBalance => {
    let balance = balances.find(
      (b) => b.paymentMethodId === paymentMethodId && b.partner === partner
    );

    if (!balance) {
      balance = {
        id: crypto.randomUUID(),
        paymentMethodId,
        balance: 0,
        initialBalance: 0,
        lastUpdated: new Date().toISOString(),
        partner,
      };
      setBalances((prev) => [...prev, balance!]);
    }

    return balance;
  }, [balances]);

  const updateBalance = useCallback((
    paymentMethodId: string,
    partner: "A" | "B" | "shared",
    newBalance: number
  ) => {
    setBalances((prev) =>
      prev.map((balance) =>
        balance.paymentMethodId === paymentMethodId && balance.partner === partner
          ? { ...balance, balance: newBalance, lastUpdated: new Date().toISOString() }
          : balance
      )
    );
  }, []);

  const setInitialBalance = useCallback((
    paymentMethodId: string,
    partner: "A" | "B" | "shared",
    initialBalance: number
  ) => {
    const balance = getOrCreateBalance(paymentMethodId, partner);
    setBalances((prev) =>
      prev.map((b) =>
        b.id === balance.id
          ? { ...b, initialBalance, balance: initialBalance, lastUpdated: new Date().toISOString() }
          : b
      )
    );
  }, [getOrCreateBalance]);

  const adjustBalance = useCallback((
    paymentMethodId: string,
    partner: "A" | "B" | "shared",
    amount: number // positive for increase, negative for decrease
  ) => {
    const balance = getOrCreateBalance(paymentMethodId, partner);
    const newBalance = balance.balance + amount;
    updateBalance(paymentMethodId, partner, newBalance);
  }, [getOrCreateBalance, updateBalance]);

  const getBalance = useCallback((
    paymentMethodId: string,
    partner: "A" | "B" | "shared"
  ): number => {
    const balance = balances.find(
      (b) => b.paymentMethodId === paymentMethodId && b.partner === partner
    );
    return balance?.balance || 0;
  }, [balances]);

  const getTotalBalanceByPartner = useCallback((partner: "A" | "B" | "shared"): number => {
    return balances
      .filter((b) => b.partner === partner)
      .reduce((total, balance) => total + balance.balance, 0);
  }, [balances]);

  const getAllBalancesByPartner = useCallback((partner: "A" | "B" | "shared") => {
    return balances.filter((b) => b.partner === partner);
  }, [balances]);

  const resetBalances = useCallback(() => {
    setBalances([]);
  }, []);

  return {
    balances,
    getBalance,
    updateBalance,
    setInitialBalance,
    adjustBalance,
    getTotalBalanceByPartner,
    getAllBalancesByPartner,
    resetBalances,
  };
}