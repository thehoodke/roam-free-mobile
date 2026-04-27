import { useState } from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { CoupleProfile, BudgetConfig, PaymentMethod, DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES, DEFAULT_INVESTMENT_CATEGORIES, CategoryNode, addSubcategory, findCategoryById, getAllCategoryIds } from "@/types/budget";
import { ArrowLeft, Heart, Wallet, Tag, Plus, X, CalendarDays, CreditCard, Pencil, Check, Download, Upload, AlertTriangle, ChevronRight, ChevronDown, Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/currency";
import { downloadBackup, restoreFromBackup, parseBackupFile, BackupData } from "@/lib/backup";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

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

interface CategoryTreeManagerProps {
  categoryTree: Record<string, CategoryNode[]>;
  onUpdateTree: (type: 'expense' | 'income' | 'investment' | 'debt', newTree: CategoryNode[]) => void;
}

function CategoryTreeManager({ categoryTree, onUpdateTree }: CategoryTreeManagerProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState("");
  const [addingToParent, setAddingToParent] = useState<string | null>(null);

  const toggleExpanded = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const startEditing = (nodeId: string, currentName: string) => {
    setEditingNode(nodeId);
    setNewCategoryName(currentName);
  };

  const saveEdit = (type: 'expense' | 'income' | 'investment' | 'debt', nodeId: string) => {
    if (!newCategoryName.trim()) return;

    const tree = categoryTree[type] || [];
    const updateNode = (nodes: CategoryNode[]): CategoryNode[] => {
      return nodes.map(node => {
        if (node.id === nodeId) {
          return { ...node, name: newCategoryName.trim() };
        }
        if (node.children) {
          return { ...node, children: updateNode(node.children) };
        }
        return node;
      });
    };

    const updatedTree = updateNode(tree);
    onUpdateTree(type, updatedTree);
    setEditingNode(null);
    setNewCategoryName("");
  };

  const deleteCategory = (type: 'expense' | 'income' | 'investment' | 'debt', nodeId: string) => {
    const tree = categoryTree[type] || [];
    const deleteNode = (nodes: CategoryNode[]): CategoryNode[] => {
      return nodes.filter(node => {
        if (node.id === nodeId) return false;
        if (node.children) {
          node.children = deleteNode(node.children);
        }
        return true;
      });
    };

    const updatedTree = deleteNode(tree);
    onUpdateTree(type, updatedTree);
  };

  const addCategory = (type: 'expense' | 'income' | 'investment' | 'debt', parentId?: string) => {
    if (!newCategoryName.trim()) return;

    const tree = categoryTree[type] || [];
    let updatedTree: CategoryNode[];

    if (parentId) {
      updatedTree = addSubcategory(tree, parentId, newCategoryName.trim(), newCategoryIcon.trim() || undefined);
    } else {
      // Add root level category
      const newNode: CategoryNode = {
        id: crypto.randomUUID(),
        name: newCategoryName.trim(),
        icon: newCategoryIcon.trim() || undefined,
        level: 0,
        fullPath: newCategoryName.trim(),
      };
      updatedTree = [...tree, newNode];
    }

    onUpdateTree(type, updatedTree);
    setNewCategoryName("");
    setNewCategoryIcon("");
    setAddingToParent(null);
  };

  const renderCategoryNode = (node: CategoryNode, type: 'expense' | 'income' | 'investment' | 'debt', depth = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const isEditing = editingNode === node.id;
    const isAdding = addingToParent === node.id;

    return (
      <div key={node.id} style={{ marginLeft: `${depth * 16}px` }}>
        <div className="flex items-center gap-2 py-1">
          {hasChildren && (
            <button
              onClick={() => toggleExpanded(node.id)}
              className="text-muted-foreground hover:text-foreground"
            >
              {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </button>
          )}
          {!hasChildren && <div className="w-3" />}

          {node.icon && <span className="text-sm">{node.icon}</span>}

          {isEditing ? (
            <Input
              autoFocus
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveEdit(type, node.id)}
              onBlur={() => saveEdit(type, node.id)}
              className="h-7 text-sm flex-1"
            />
          ) : (
            <span className="text-sm flex-1">{node.name}</span>
          )}

          <div className="flex items-center gap-1">
            <button
              onClick={() => startEditing(node.id, node.name)}
              className="text-muted-foreground hover:text-foreground p-1"
            >
              <Pencil className="h-3 w-3" />
            </button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="text-muted-foreground hover:text-destructive p-1">
                  <Trash2 className="h-3 w-3" />
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Category</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{node.name}"? This will also delete all subcategories and may affect existing transactions.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => deleteCategory(type, node.id)}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <button
              onClick={() => setAddingToParent(node.id)}
              className="text-muted-foreground hover:text-foreground p-1"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
        </div>

        {isAdding && (
          <div className="flex items-center gap-2 py-1" style={{ marginLeft: `${(depth + 1) * 16}px` }}>
            <Input
              placeholder="New subcategory name"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="h-7 text-sm flex-1"
            />
            <Input
              placeholder="Icon (optional)"
              value={newCategoryIcon}
              onChange={(e) => setNewCategoryIcon(e.target.value)}
              className="h-7 text-sm w-16"
              maxLength={2}
            />
            <Button size="sm" onClick={() => addCategory(type, node.id)}>Add</Button>
            <Button size="sm" variant="outline" onClick={() => { setAddingToParent(null); setNewCategoryName(""); setNewCategoryIcon(""); }}>Cancel</Button>
          </div>
        )}

        {hasChildren && isExpanded && (
          <div>
            {node.children!.map(child => renderCategoryNode(child, type, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const renderCategoryType = (type: 'expense' | 'income' | 'investment' | 'debt', title: string, icon: string) => {
    const tree = categoryTree[type] || [];

    return (
      <div className="glass-card rounded-3xl p-6 space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{icon}</span>
          <span>{title} Categories ({getAllCategoryIds(tree).length})</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Manage categories with unlimited nesting. Changes save immediately.
        </p>

        <div className="space-y-1">
          {tree.map(node => renderCategoryNode(node, type))}
        </div>

        <div className="flex gap-2 pt-2 border-t border-border">
          <Input
            placeholder={`New ${title.toLowerCase()} category`}
            value={addingToParent === null ? newCategoryName : ""}
            onChange={(e) => setNewCategoryName(e.target.value)}
            className="flex-1"
          />
          <Input
            placeholder="Icon"
            value={addingToParent === null ? newCategoryIcon : ""}
            onChange={(e) => setNewCategoryIcon(e.target.value)}
            className="w-16"
            maxLength={2}
          />
          <Button
            size="sm"
            variant="secondary"
            onClick={() => addCategory(type)}
            disabled={!newCategoryName.trim()}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {renderCategoryType('expense', 'Expense', '💸')}
      {renderCategoryType('income', 'Income', '💰')}
      {renderCategoryType('investment', 'Investment', '📈')}
      {renderCategoryType('debt', 'Debt', '💳')}
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
  const [customInvestment, setCustomInvestment] = useState(budgetConfig.customInvestmentCategories || []);
  const [renames, setRenames] = useState<Record<string, string>>(budgetConfig.categoryRenames || {});
  const [categoryLimits, setCategoryLimits] = useState<Record<string, number>>(budgetConfig.categoryLimits);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(budgetConfig.paymentMethods);
  const [newExpenseCat, setNewExpenseCat] = useState("");
  const [newIncomeCat, setNewIncomeCat] = useState("");
  const [newInvestmentCat, setNewInvestmentCat] = useState("");
  const [newLimitCat, setNewLimitCat] = useState("");
  const [newLimitAmount, setNewLimitAmount] = useState("");
  const [newPmName, setNewPmName] = useState("");
  const [newPmIcon, setNewPmIcon] = useState("");
  const [newPmFee, setNewPmFee] = useState(false);
  const [backupMessage, setBackupMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

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
    customInvestmentCategories: customInvestment,
    categoryTree: budgetConfig.categoryTree,
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

  const displayName = (original: string) => renames[original] || original;
  const addCategoryLimit = () => {
    if (newLimitCat.trim() && newLimitAmount) {
      const next = { ...categoryLimits, [newLimitCat.trim()]: parseFloat(newLimitAmount) };
      setCategoryLimits(next);
      persistBudgetConfig({ categoryLimits: next });
      setNewLimitCat(""); setNewLimitAmount("");
    }
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

  const handleExportBackup = () => {
    try {
      downloadBackup();
      setBackupMessage({ type: 'success', message: 'Backup downloaded successfully!' });
      setTimeout(() => setBackupMessage(null), 3000);
    } catch (error) {
      setBackupMessage({ type: 'error', message: 'Failed to create backup' });
      setTimeout(() => setBackupMessage(null), 3000);
    }
  };

  const handleImportBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const backupData = await parseBackupFile(file);
      const result = restoreFromBackup(backupData);

      if (result.success) {
        setBackupMessage({ type: 'success', message: result.message });
        // Clear the file input
        event.target.value = '';
        // Optionally refresh the page after a delay
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setBackupMessage({ type: 'error', message: result.message });
        setTimeout(() => setBackupMessage(null), 5000);
      }
    } catch (error) {
      setBackupMessage({ type: 'error', message: error instanceof Error ? error.message : 'Failed to import backup' });
      setTimeout(() => setBackupMessage(null), 5000);
    }
  };

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
          <TabsTrigger value="backup" className="flex-1 text-xs">Backup</TabsTrigger>
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
          <CategoryTreeManager
            categoryTree={budgetConfig.categoryTree || {}}
            onUpdateTree={(type, newTree) => {
              const updatedConfig = {
                ...budgetConfig,
                categoryTree: {
                  ...budgetConfig.categoryTree,
                  [type]: newTree,
                },
              };
              onUpdateBudgetConfig(updatedConfig);
            }}
          />
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

        <TabsContent value="backup">
          <div className="space-y-4">
            <div className="glass-card rounded-3xl p-6 space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Download className="h-4 w-4 text-primary" />
                <span>Backup Your Data</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Create a backup of all your transactions, settings, and investment data. This file can be used to restore your data on another device or after clearing your browser data.
              </p>
              <Button onClick={handleExportBackup} className="w-full" variant="default">
                <Download className="h-4 w-4 mr-2" />
                Download Backup
              </Button>
            </div>

            <div className="glass-card rounded-3xl p-6 space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Upload className="h-4 w-4 text-accent" />
                <span>Restore from Backup</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Import data from a previously created backup file. This will replace all current data with the backup contents.
              </p>
              <div className="space-y-2">
                <Label htmlFor="backup-file" className="text-xs">Select backup file (.json)</Label>
                <Input
                  id="backup-file"
                  type="file"
                  accept=".json"
                  onChange={handleImportBackup}
                  className="cursor-pointer"
                />
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="w-full">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload & Restore
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      Restore from Backup
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This will replace all your current data with the backup file contents. This action cannot be undone. Make sure you have a recent backup of your current data if needed.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => document.getElementById('backup-file')?.click()}>
                      Continue
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            {backupMessage && (
              <div className={`glass-card rounded-3xl p-4 ${
                backupMessage.type === 'success'
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}>
                <p className="text-sm font-medium">
                  {backupMessage.type === 'success' ? '✅' : '❌'} {backupMessage.message}
                </p>
              </div>
            )}

            <div className="glass-card rounded-3xl p-6 space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span>Important Notes</span>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Backups include all transactions, settings, and investment data</li>
                <li>• Backup files are stored locally on your device</li>
                <li>• Keep backup files secure and private</li>
                <li>• Test restoration on a separate device first</li>
                <li>• Data is stored locally - no cloud backup is performed</li>
              </ul>
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
