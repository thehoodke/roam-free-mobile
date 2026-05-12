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

  const recalculateDebtFromPayments = useCallback((debt: Debt, payments: DebtPayment[]) => {
    const existingTopups = debtPayments
      .filter((p) => p.debtId === debt.id && p.type === "topup")
      .reduce((sum, p) => sum + p.amount, 0);
    const basePrincipal = Math.max(0, debt.totalAmount - existingTopups);

    const topups = payments
      .filter((p) => p.type === "topup")
      .reduce((sum, p) => sum + p.amount, 0);
    const paid = payments
      .filter((p) => p.type !== "topup")
      .reduce((sum, p) => sum + p.amount, 0);

    const totalAmount = basePrincipal + topups;
    const remainingAmount = Math.max(0, totalAmount - paid);
    const lastPaymentDate = payments.length
      ? payments
          .map((p) => p.date)
          .sort((a, b) => (a > b ? -1 : 1))[0]
      : undefined;

    return {
      ...debt,
      totalAmount,
      remainingAmount,
      lastPaymentDate,
      isPaidOff: remainingAmount === 0,
    };
  }, [debtPayments]);

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
    transactionId?: string,
    type: "payment" | "topup" = "payment"
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
      type,
    };

    setDebtPayments((prev) => {
      const next = [payment, ...prev];
      const debtPaymentsForDebt = next.filter((p) => p.debtId === debtId);
      setDebts((prevDebts) =>
        prevDebts.map((debt) =>
          debt.id === debtId ? recalculateDebtFromPayments(debt, debtPaymentsForDebt) : debt
        )
      );
      return next;
    });

    return payment;
  }, [recalculateDebtFromPayments]);

  const updateDebtPayment = useCallback((id: string, updates: Partial<DebtPayment>) => {
    setDebtPayments((prev) => {
      const existing = prev.find((p) => p.id === id);
      if (!existing) return prev;

      const next = prev.map((payment) =>
        payment.id === id ? { ...payment, ...updates } : payment
      );

      const debtPaymentsForDebt = next.filter((p) => p.debtId === existing.debtId);
      setDebts((prevDebts) =>
        prevDebts.map((debt) =>
          debt.id === existing.debtId ? recalculateDebtFromPayments(debt, debtPaymentsForDebt) : debt
        )
      );

      return next;
    });
  }, [recalculateDebtFromPayments]);

  const deleteDebtPayment = useCallback((id: string) => {
    setDebtPayments((prev) => {
      const existing = prev.find((p) => p.id === id);
      if (!existing) return prev;

      const next = prev.filter((payment) => payment.id !== id);
      const debtPaymentsForDebt = next.filter((p) => p.debtId === existing.debtId);

      setDebts((prevDebts) =>
        prevDebts.map((debt) =>
          debt.id === existing.debtId ? recalculateDebtFromPayments(debt, debtPaymentsForDebt) : debt
        )
      );

      return next;
    });
  }, [recalculateDebtFromPayments]);

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
    updateDebtPayment,
    deleteDebtPayment,
    getDebtPayments,
    getTotalDebtByPartner,
    getTotalPaidOffDebts,
    getUpcomingDebts,
    getOverdueDebts,
  };
}
