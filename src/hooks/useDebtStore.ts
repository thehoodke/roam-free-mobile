import { useState, useEffect, useCallback, useMemo } from "react";
import { Debt, DebtPayment, Transaction } from "@/types/budget";

const STORAGE_KEYS = {
  DEBTS: "couplebank_debts",
  DEBT_PAYMENTS: "couplebank_debt_payments",
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

export function useDebtStore() {
  const [debts, setDebts] = useState<Debt[]>(() => load(STORAGE_KEYS.DEBTS, []));
  const [debtPayments, setDebtPayments] = useState<DebtPayment[]>(() =>
    load(STORAGE_KEYS.DEBT_PAYMENTS, [])
  );

  useEffect(() => save(STORAGE_KEYS.DEBTS, debts), [debts]);
  useEffect(() => save(STORAGE_KEYS.DEBT_PAYMENTS, debtPayments), [debtPayments]);

  const addDebt = useCallback((debt: Omit<Debt, "id" | "createdAt" | "isPaidOff">) => {
    const newDebt: Debt = {
      ...debt,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      isPaidOff: false,
    };
    setDebts((prev) => [newDebt, ...prev]);
    return newDebt;
  }, []);

  const updateDebt = useCallback((id: string, updates: Partial<Debt>) => {
    setDebts((prev) =>
      prev.map((debt) =>
        debt.id === id ? { ...debt, ...updates } : debt
      )
    );
  }, []);

  const deleteDebt = useCallback((id: string) => {
    setDebts((prev) => prev.filter((debt) => debt.id !== id));
    setDebtPayments((prev) => prev.filter((payment) => payment.debtId !== id));
  }, []);

  const makeDebtPayment = useCallback((
    debtId: string,
    amount: number,
    paymentMethodId?: string,
    transactionCost?: number,
    note?: string,
    transactionId?: string
  ) => {
    const payment: DebtPayment = {
      id: crypto.randomUUID(),
      debtId,
      amount,
      date: new Date().toISOString(),
      paymentMethodId,
      transactionCost,
      note,
      transactionId,
    };

    setDebtPayments((prev) => [payment, ...prev]);

    // Update debt remaining amount
    setDebts((prev) =>
      prev.map((debt) => {
        if (debt.id === debtId) {
          const newRemaining = Math.max(0, debt.remainingAmount - amount);
          return {
            ...debt,
            remainingAmount: newRemaining,
            lastPaymentDate: payment.date,
            isPaidOff: newRemaining === 0,
          };
        }
        return debt;
      })
    );

    return payment;
  }, []);

  const getDebtPayments = useCallback((debtId: string) => {
    return debtPayments.filter((payment) => payment.debtId === debtId);
  }, [debtPayments]);

  const getTotalDebtByPartner = useCallback((partner: "A" | "B" | "shared") => {
    return debts
      .filter((debt) => debt.debtor === partner && !debt.isPaidOff)
      .reduce((total, debt) => total + debt.remainingAmount, 0);
  }, [debts]);

  const getTotalPaidOffDebts = useCallback(() => {
    return debts.filter((debt) => debt.isPaidOff).length;
  }, [debts]);

  const getUpcomingDebts = useCallback((daysAhead: number = 30) => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    return debts.filter((debt) =>
      debt.dueDate &&
      !debt.isPaidOff &&
      new Date(debt.dueDate) <= futureDate &&
      new Date(debt.dueDate) >= new Date()
    );
  }, [debts]);

  const getOverdueDebts = useCallback(() => {
    const today = new Date();
    return debts.filter((debt) =>
      debt.dueDate &&
      !debt.isPaidOff &&
      new Date(debt.dueDate) < today
    );
  }, [debts]);

  return {
    debts,
    debtPayments,
    addDebt,
    updateDebt,
    deleteDebt,
    makeDebtPayment,
    getDebtPayments,
    getTotalDebtByPartner,
    getTotalPaidOffDebts,
    getUpcomingDebts,
    getOverdueDebts,
  };
}