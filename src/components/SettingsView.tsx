import { useState } from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { CoupleProfile, BudgetConfig, PaymentMethod, DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from "@/types/budget";
import { ArrowLeft, Heart, Wallet, Tag, Plus, X, CalendarDays, CreditCard, Pencil, Check } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/currency";

interface SettingsViewProps {
  profile: CoupleProfile;
  budgetConfig: BudgetConfig;
  onUpdateProfile: (p: CoupleProfile) => void;
  onUpdateBudgetConfig: (c: BudgetConfig) => void;
  onBack: () => void;
  getPartnerName: (p: "A" | "B") => string;
}

interface CategoryRowProps {
  original: string;
  display: string;
  isCustom: boolean;
  onRename: (newName: string) => void;
  onDelete?: () => void;
}

function CategoryRow({ original, display, isCustom, onRename, onDelete }: CategoryRowProps) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(display);

  const save = () => {
    if (val.trim()) onRename(val.trim());
    setEditing(false);
  };

  return (
    <div className="flex items-center gap-2 rounded-xl bg-muted p-3">
      {editing ? (
        <Input
          autoFocus
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          className="h-8 flex-1 text-sm"
        />
      ) : (
        <span className="flex-1 text-sm truncate">{display}</span>
      )}
      <span className="text-[10px] text-muted-foreground uppercase">{isCustom ? "Custom" : "Default"}</span>
      {editing ? (
        <button onClick={save} className="text-primary"><Check className="h-4 w-4" /></button>
      ) : (
        <button onClick={() => { setVal(display); setEditing(true); }} className="text-muted-foreground hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
      )}
      {isCustom && onDelete && (
        <button onClick={onDelete} className="text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></button>
      )}
    </div>
  );
}

export default function SettingsView({
  profile, budgetConfig, onUpdateProfile, onUpdateBudgetConfig, onBack, getPartnerName,
}: SettingsViewProps) {
  const [nameA, setNameA] = useState(profile.partnerAName);
  const [nameB, setNameB] = useState(profile.partnerBName);
  const [dailyShared, setDailyShared] = useState(String(budgetConfig.dailyLimitShared || ""));
  const [dailyA, setDailyA] = useState(String(budgetConfig.dailyLimitA || ""));
  const [dailyB, setDailyB] = useState(String(budgetConfig.dailyLimitB || ""));
  const [monthlyShared, setMonthlyShared] = useState(String(budgetConfig.monthlyLimitShared || ""));
  const [monthlyA, setMonthlyA] = useState(String(budgetConfig.monthlyLimitA || ""));
  const [monthlyB, setMonthlyB] = useState(String(budgetConfig.monthlyLimitB || ""));
  const [customExpense, setCustomExpense] = useState(budgetConfig.customExpenseCategories);
  const [customIncome, setCustomIncome] = useState(budgetConfig.customIncomeCategories);
  const [renames, setRenames] = useState<Record<string, string>>(budgetConfig.categoryRenames || {});
  const [categoryLimits, setCategoryLimits] = useState<Record<string, number>>(budgetConfig.categoryLimits);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(budgetConfig.paymentMethods);
  const [newExpenseCat, setNewExpenseCat] = useState("");
  const [newIncomeCat, setNewIncomeCat] = useState("");
  const [newLimitCat, setNewLimitCat] = useState("");
  const [newLimitAmount, setNewLimitAmount] = useState("");
  const [newPmName, setNewPmName] = useState("");
  const [newPmIcon, setNewPmIcon] = useState("");
  const [newPmFee, setNewPmFee] = useState(false);

  const buildBudgetConfig = (overrides: Partial<BudgetConfig> = {}): BudgetConfig => ({
    dailyLimitShared: parseFloat(dailyShared) || 0,
    dailyLimitA: parseFloat(dailyA) || 0,
    dailyLimitB: parseFloat(dailyB) || 0,
    monthlyLimitShared: parseFloat(monthlyShared) || 0,
    monthlyLimitA: parseFloat(monthlyA) || 0,
    monthlyLimitB: parseFloat(monthlyB) || 0,
    customExpenseCategories: customExpense,
    customIncomeCategories: customIncome,
    categoryRenames: renames,
    categoryLimits,
    paymentMethods,
    ...overrides,
  });

  const persistBudgetConfig = (overrides: Partial<BudgetConfig> = {}) => {
    onUpdateBudgetConfig(buildBudgetConfig(overrides));
  };

  const handleSave = () => {
    onUpdateProfile({ partnerAName: nameA, partnerBName: nameB });
    onUpdateBudgetConfig(buildBudgetConfig());
    onBack();
  };

  const relinkRenames = (current: Record<string, string>, from: string, to: string) => {
    const next = Object.fromEntries(
      Object.entries(current).map(([key, value]) => [key, value === from ? to : value])
    );
    if (to === from) {
      delete next[from];
    } else {
      next[from] = to;
    }
    return next;
  };

  const renameCategory = (original: string, newName: string, kind: "expense" | "income", isCustom: boolean) => {
    const trimmed = newName.trim();
    if (!trimmed) return;

    if (!isCustom) {
      const nextRenames = trimmed === original
        ? Object.fromEntries(Object.entries(renames).filter(([key]) => key !== original))
        : { ...renames, [original]: trimmed };
      setRenames(nextRenames);
      persistBudgetConfig({ categoryRenames: nextRenames });
      return;
    }

    const list = kind === "expense" ? customExpense : customIncome;
    if (trimmed !== original && list.includes(trimmed)) return;

    const nextList = list.map((item) => (item === original ? trimmed : item));
    const nextExpense = kind === "expense" ? nextList : customExpense;
    const nextIncome = kind === "income" ? nextList : customIncome;
    const nextRenames = relinkRenames(renames, original, trimmed);
    const nextCategoryLimits = { ...categoryLimits };

    if (original !== trimmed && nextCategoryLimits[original] !== undefined) {
      nextCategoryLimits[trimmed] = nextCategoryLimits[original];
      delete nextCategoryLimits[original];
    }

    setCustomExpense(nextExpense);
    setCustomIncome(nextIncome);
    setRenames(nextRenames);
    setCategoryLimits(nextCategoryLimits);
    persistBudgetConfig({
      customExpenseCategories: nextExpense,
      customIncomeCategories: nextIncome,
      categoryRenames: nextRenames,
      categoryLimits: nextCategoryLimits,
    });
  };

  const displayName = (original: string) => renames[original] || original;

  const addCustomExpense = () => {
    const v = newExpenseCat.trim();
    if (v && !customExpense.includes(v) && !DEFAULT_EXPENSE_CATEGORIES.includes(v as never)) {
      const next = [...customExpense, v];
      setCustomExpense(next);
      persistBudgetConfig({ customExpenseCategories: next });
      setNewExpenseCat("");
    }
  };
  const addCustomIncome = () => {
    const v = newIncomeCat.trim();
    if (v && !customIncome.includes(v) && !DEFAULT_INCOME_CATEGORIES.includes(v as never)) {
      const next = [...customIncome, v];
      setCustomIncome(next);
      persistBudgetConfig({ customIncomeCategories: next });
      setNewIncomeCat("");
    }
  };
  const addCategoryLimit = () => {
    if (newLimitCat.trim() && newLimitAmount) {
      const next = { ...categoryLimits, [newLimitCat.trim()]: parseFloat(newLimitAmount) };
      setCategoryLimits(next);
      persistBudgetConfig({ categoryLimits: next });
      setNewLimitCat(""); setNewLimitAmount("");
    }
  };

  const deleteCategory = (category: string, kind: "expense" | "income") => {
    const nextExpense = kind === "expense"
      ? customExpense.filter((item) => item !== category)
      : customExpense;
    const nextIncome = kind === "income"
      ? customIncome.filter((item) => item !== category)
      : customIncome;
    const nextRenames = Object.fromEntries(Object.entries(renames).filter(([key]) => key !== category));
    const nextCategoryLimits = { ...categoryLimits };
    delete nextCategoryLimits[category];

    setCustomExpense(nextExpense);
    setCustomIncome(nextIncome);
    setRenames(nextRenames);
    setCategoryLimits(nextCategoryLimits);
    persistBudgetConfig({
      customExpenseCategories: nextExpense,
      customIncomeCategories: nextIncome,
      categoryRenames: nextRenames,
      categoryLimits: nextCategoryLimits,
    });
  };

  const addPaymentMethod = () => {
    const name = newPmName.trim();
    if (!name) return;
    const next = [
      ...paymentMethods,
      { id: crypto.randomUUID(), name, icon: newPmIcon.trim() || "💼", supportsFee: newPmFee },
    ];
    setPaymentMethods(next);
    persistBudgetConfig({ paymentMethods: next });
    setNewPmName(""); setNewPmIcon(""); setNewPmFee(false);
  };
  const updatePm = (id: string, patch: Partial<PaymentMethod>) => {
    const next = paymentMethods.map((p) => (p.id === id ? { ...p, ...patch } : p));
    setPaymentMethods(next);
    persistBudgetConfig({ paymentMethods: next });
  };
  const removePm = (id: string) => {
    const next = paymentMethods.filter((p) => p.id !== id);
    setPaymentMethods(next);
    persistBudgetConfig({ paymentMethods: next });
  };

  const allExpense = [...DEFAULT_EXPENSE_CATEGORIES, ...customExpense];
  const allIncome = [...DEFAULT_INCOME_CATEGORIES, ...customIncome];

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

      <h1 className="font-display text-2xl font-bold mb-6">Settings</h1>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="w-full mb-4">
          <TabsTrigger value="profile" className="flex-1 text-xs">Profile</TabsTrigger>
          <TabsTrigger value="budget" className="flex-1 text-xs">Budget</TabsTrigger>
          <TabsTrigger value="categories" className="flex-1 text-xs">Categories</TabsTrigger>
          <TabsTrigger value="payments" className="flex-1 text-xs">Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <div className="glass-card rounded-3xl p-6 space-y-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Heart className="h-4 w-4 text-partner-a" />
              <span>Partner Names</span>
            </div>
            <div>
              <Label htmlFor="nameA">Partner A</Label>
              <Input id="nameA" value={nameA} onChange={(e) => setNameA(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="nameB">Partner B</Label>
              <Input id="nameB" value={nameB} onChange={(e) => setNameB(e.target.value)} className="mt-1" />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="budget">
          <div className="space-y-4">
            <div className="glass-card rounded-3xl p-6 space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Wallet className="h-4 w-4 text-primary" />
                <span>Daily Budget Limits</span>
              </div>
              <div><Label>Shared Daily Limit</Label><Input type="number" min="0" step="1" placeholder="No limit" value={dailyShared} onChange={(e) => setDailyShared(e.target.value)} className="mt-1" /></div>
              <div><Label>{getPartnerName("A")}'s Daily Limit</Label><Input type="number" min="0" step="1" placeholder="No limit" value={dailyA} onChange={(e) => setDailyA(e.target.value)} className="mt-1" /></div>
              <div><Label>{getPartnerName("B")}'s Daily Limit</Label><Input type="number" min="0" step="1" placeholder="No limit" value={dailyB} onChange={(e) => setDailyB(e.target.value)} className="mt-1" /></div>
            </div>

            <div className="glass-card rounded-3xl p-6 space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarDays className="h-4 w-4 text-accent" />
                <span>Monthly Budget Limits</span>
              </div>
              <div><Label>Shared Monthly Limit</Label><Input type="number" min="0" step="1" placeholder="No limit" value={monthlyShared} onChange={(e) => setMonthlyShared(e.target.value)} className="mt-1" /></div>
              <div><Label>{getPartnerName("A")}'s Monthly Limit</Label><Input type="number" min="0" step="1" placeholder="No limit" value={monthlyA} onChange={(e) => setMonthlyA(e.target.value)} className="mt-1" /></div>
              <div><Label>{getPartnerName("B")}'s Monthly Limit</Label><Input type="number" min="0" step="1" placeholder="No limit" value={monthlyB} onChange={(e) => setMonthlyB(e.target.value)} className="mt-1" /></div>
            </div>

            <div className="glass-card rounded-3xl p-6 space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Tag className="h-4 w-4 text-accent" />
                <span>Monthly Category Limits</span>
              </div>
              {Object.entries(categoryLimits).map(([cat, limit]) => (
                <div key={cat} className="flex items-center justify-between rounded-xl bg-muted p-3">
                  <span className="text-sm">{cat}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{formatCurrency(limit)}</span>
                    <button onClick={() => { const next = { ...categoryLimits }; delete next[cat]; setCategoryLimits(next); }} className="text-muted-foreground"><X className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              ))}
              <div className="space-y-2">
                <Input placeholder="Category name (e.g. 🍔 Food & Dining)" value={newLimitCat} onChange={(e) => setNewLimitCat(e.target.value)} />
                <div className="flex gap-2">
                  <Input type="number" min="0" step="1" placeholder="Monthly limit" value={newLimitAmount} onChange={(e) => setNewLimitAmount(e.target.value)} className="flex-1" />
                  <Button size="sm" variant="secondary" onClick={addCategoryLimit}><Plus className="h-4 w-4" /></Button>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="categories">
          <div className="space-y-4">
            <div className="glass-card rounded-3xl p-6 space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Tag className="h-4 w-4 text-expense" />
                <span>Expense Categories ({allExpense.length})</span>
              </div>
              <p className="text-xs text-muted-foreground">Add, rename, or delete categories here. Category changes save immediately.</p>
              {allExpense.map((c) => (
                <CategoryRow
                  key={c}
                  original={c}
                  display={displayName(c)}
                  isCustom={customExpense.includes(c)}
                  onRename={(name) => renameCategory(c, name, "expense", customExpense.includes(c))}
                  onDelete={customExpense.includes(c) ? () => deleteCategory(c, "expense") : undefined}
                />
              ))}
              <div className="flex gap-2 pt-2">
                <Input placeholder="e.g. 🐕 Pet Care" value={newExpenseCat} onChange={(e) => setNewExpenseCat(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addCustomExpense()} className="flex-1" />
                <Button size="sm" variant="secondary" onClick={addCustomExpense}><Plus className="h-4 w-4" /></Button>
              </div>
            </div>

            <div className="glass-card rounded-3xl p-6 space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Tag className="h-4 w-4 text-income" />
                <span>Income Categories ({allIncome.length})</span>
              </div>
              <p className="text-xs text-muted-foreground">Custom categories are editable, and renamed labels are used across the app.</p>
              {allIncome.map((c) => (
                <CategoryRow
                  key={c}
                  original={c}
                  display={displayName(c)}
                  isCustom={customIncome.includes(c)}
                  onRename={(name) => renameCategory(c, name, "income", customIncome.includes(c))}
                  onDelete={customIncome.includes(c) ? () => deleteCategory(c, "income") : undefined}
                />
              ))}
              <div className="flex gap-2 pt-2">
                <Input placeholder="e.g. 🏘 Rental Income" value={newIncomeCat} onChange={(e) => setNewIncomeCat(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addCustomIncome()} className="flex-1" />
                <Button size="sm" variant="secondary" onClick={addCustomIncome}><Plus className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="payments">
          <div className="glass-card rounded-3xl p-6 space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CreditCard className="h-4 w-4 text-primary" />
              <span>Payment Methods</span>
            </div>
            <p className="text-xs text-muted-foreground">Toggle "Fee" for methods like M-Pesa, bank transfers, or money transfer services. Payment changes save immediately.</p>
            {paymentMethods.map((pm) => (
              <div key={pm.id} className="rounded-xl bg-muted p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Input value={pm.icon || ""} onChange={(e) => updatePm(pm.id, { icon: e.target.value })} className="h-9 w-12 text-center" maxLength={2} />
                  <Input value={pm.name} onChange={(e) => updatePm(pm.id, { name: e.target.value })} className="h-9 flex-1" />
                  <button onClick={() => removePm(pm.id)} className="text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></button>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Charges transaction fee</span>
                  <Switch checked={pm.supportsFee} onCheckedChange={(v) => updatePm(pm.id, { supportsFee: v })} />
                </div>
              </div>
            ))}
            <div className="space-y-2 pt-2 border-t border-border">
              <Label className="text-xs">Add new method</Label>
              <div className="flex gap-2">
                <Input placeholder="🏦" value={newPmIcon} onChange={(e) => setNewPmIcon(e.target.value)} className="w-12 text-center" maxLength={2} />
                <Input placeholder="Method name" value={newPmName} onChange={(e) => setNewPmName(e.target.value)} className="flex-1" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Has transaction fee</span>
                <div className="flex items-center gap-2">
                  <Switch checked={newPmFee} onCheckedChange={setNewPmFee} />
                  <Button size="sm" variant="secondary" onClick={addPaymentMethod}><Plus className="h-4 w-4" /></Button>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Button onClick={handleSave} className="w-full mt-6" size="lg">
        Save All Settings
      </Button>

      <div className="mt-8 text-center text-xs text-muted-foreground">
        <p>All data stored locally on your device</p>
        <p>No internet connection required ✨</p>
      </div>
    </motion.div>
  );
}
