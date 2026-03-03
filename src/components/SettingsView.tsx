import { useState } from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CoupleProfile, BudgetConfig } from "@/types/budget";
import { ArrowLeft, Heart, Wallet, Tag, Plus, X, DollarSign } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SettingsViewProps {
  profile: CoupleProfile;
  budgetConfig: BudgetConfig;
  onUpdateProfile: (p: CoupleProfile) => void;
  onUpdateBudgetConfig: (c: BudgetConfig) => void;
  onBack: () => void;
  getPartnerName: (p: "A" | "B") => string;
}

export default function SettingsView({
  profile,
  budgetConfig,
  onUpdateProfile,
  onUpdateBudgetConfig,
  onBack,
  getPartnerName,
}: SettingsViewProps) {
  const [nameA, setNameA] = useState(profile.partnerAName);
  const [nameB, setNameB] = useState(profile.partnerBName);
  const [dailyShared, setDailyShared] = useState(String(budgetConfig.dailyLimitShared || ""));
  const [dailyA, setDailyA] = useState(String(budgetConfig.dailyLimitA || ""));
  const [dailyB, setDailyB] = useState(String(budgetConfig.dailyLimitB || ""));
  const [customExpense, setCustomExpense] = useState(budgetConfig.customExpenseCategories);
  const [customIncome, setCustomIncome] = useState(budgetConfig.customIncomeCategories);
  const [categoryLimits, setCategoryLimits] = useState<Record<string, number>>(budgetConfig.categoryLimits);
  const [newExpenseCat, setNewExpenseCat] = useState("");
  const [newIncomeCat, setNewIncomeCat] = useState("");
  const [newLimitCat, setNewLimitCat] = useState("");
  const [newLimitAmount, setNewLimitAmount] = useState("");

  const handleSave = () => {
    onUpdateProfile({ partnerAName: nameA, partnerBName: nameB });
    onUpdateBudgetConfig({
      dailyLimitShared: parseFloat(dailyShared) || 0,
      dailyLimitA: parseFloat(dailyA) || 0,
      dailyLimitB: parseFloat(dailyB) || 0,
      customExpenseCategories: customExpense,
      customIncomeCategories: customIncome,
      categoryLimits,
    });
    onBack();
  };

  const addCustomExpense = () => {
    if (newExpenseCat.trim() && !customExpense.includes(newExpenseCat.trim())) {
      setCustomExpense([...customExpense, newExpenseCat.trim()]);
      setNewExpenseCat("");
    }
  };

  const addCustomIncome = () => {
    if (newIncomeCat.trim() && !customIncome.includes(newIncomeCat.trim())) {
      setCustomIncome([...customIncome, newIncomeCat.trim()]);
      setNewIncomeCat("");
    }
  };

  const addCategoryLimit = () => {
    if (newLimitCat.trim() && newLimitAmount) {
      setCategoryLimits({ ...categoryLimits, [newLimitCat.trim()]: parseFloat(newLimitAmount) });
      setNewLimitCat("");
      setNewLimitAmount("");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="min-h-screen bg-background p-6 pb-24"
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
        </TabsList>

        {/* Profile Tab */}
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

        {/* Budget Tab */}
        <TabsContent value="budget">
          <div className="space-y-4">
            <div className="glass-card rounded-3xl p-6 space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Wallet className="h-4 w-4 text-primary" />
                <span>Daily Budget Limits</span>
              </div>
              <div>
                <Label>Shared Daily Limit</Label>
                <Input
                  type="number" min="0" step="0.01"
                  placeholder="No limit"
                  value={dailyShared}
                  onChange={(e) => setDailyShared(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>{getPartnerName("A")}'s Daily Limit</Label>
                <Input
                  type="number" min="0" step="0.01"
                  placeholder="No limit"
                  value={dailyA}
                  onChange={(e) => setDailyA(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>{getPartnerName("B")}'s Daily Limit</Label>
                <Input
                  type="number" min="0" step="0.01"
                  placeholder="No limit"
                  value={dailyB}
                  onChange={(e) => setDailyB(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Category Limits */}
            <div className="glass-card rounded-3xl p-6 space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <DollarSign className="h-4 w-4 text-accent" />
                <span>Monthly Category Limits</span>
              </div>
              {Object.entries(categoryLimits).map(([cat, limit]) => (
                <div key={cat} className="flex items-center justify-between rounded-xl bg-muted p-3">
                  <span className="text-sm">{cat}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">${limit}</span>
                    <button
                      onClick={() => {
                        const next = { ...categoryLimits };
                        delete next[cat];
                        setCategoryLimits(next);
                      }}
                      className="text-muted-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              <div className="space-y-2">
                <Input
                  placeholder="Category name (e.g. 🍔 Food & Dining)"
                  value={newLimitCat}
                  onChange={(e) => setNewLimitCat(e.target.value)}
                />
                <div className="flex gap-2">
                  <Input
                    type="number" min="0" step="0.01"
                    placeholder="Monthly limit"
                    value={newLimitAmount}
                    onChange={(e) => setNewLimitAmount(e.target.value)}
                    className="flex-1"
                  />
                  <Button size="sm" variant="secondary" onClick={addCategoryLimit}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories">
          <div className="space-y-4">
            <div className="glass-card rounded-3xl p-6 space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Tag className="h-4 w-4 text-expense" />
                <span>Custom Expense Categories</span>
              </div>
              {customExpense.map((c) => (
                <div key={c} className="flex items-center justify-between rounded-xl bg-muted p-3">
                  <span className="text-sm">{c}</span>
                  <button
                    onClick={() => setCustomExpense(customExpense.filter((x) => x !== c))}
                    className="text-muted-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. 🐕 Pet Care"
                  value={newExpenseCat}
                  onChange={(e) => setNewExpenseCat(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCustomExpense()}
                  className="flex-1"
                />
                <Button size="sm" variant="secondary" onClick={addCustomExpense}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="glass-card rounded-3xl p-6 space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Tag className="h-4 w-4 text-income" />
                <span>Custom Income Categories</span>
              </div>
              {customIncome.map((c) => (
                <div key={c} className="flex items-center justify-between rounded-xl bg-muted p-3">
                  <span className="text-sm">{c}</span>
                  <button
                    onClick={() => setCustomIncome(customIncome.filter((x) => x !== c))}
                    className="text-muted-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. 🏘 Rental Income"
                  value={newIncomeCat}
                  onChange={(e) => setNewIncomeCat(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCustomIncome()}
                  className="flex-1"
                />
                <Button size="sm" variant="secondary" onClick={addCustomIncome}>
                  <Plus className="h-4 w-4" />
                </Button>
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
