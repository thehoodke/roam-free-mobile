import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, TrendingUp, TrendingDown, Trash2, X, Pencil, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  InvestmentAccount,
  InvestmentTransaction,
  Partner,
  PaymentMethod,
  DEFAULT_INVESTMENT_CATEGORIES,
} from "@/types/budget";
import { formatCurrency } from "@/lib/currency";
import { format } from "date-fns";

interface InvestmentsViewProps {
  accounts: InvestmentAccount[];
  totalPortfolioValue: number;
  portfolioByPartner: { A: number; B: number; shared: number };
  customInvestmentCategories: string[];
  paymentMethods: PaymentMethod[];
  onAddAccount: (a: Omit<InvestmentAccount, "id" | "createdAt">) => void;
  onUpdateAccount: (id: string, patch: Partial<InvestmentAccount>) => void;
  onDeleteAccount: (id: string) => void;
  onAddInvestmentTx: (t: Omit<InvestmentTransaction, "id">) => void;
  onDeleteInvestmentTx: (id: string) => void;
  getAccountBasis: (id: string) => number;
  getAccountTransactions: (id: string) => InvestmentTransaction[];
  getPartnerName: (p: Partner) => string;
  onBack: () => void;
}

export default function InvestmentsView(props: InvestmentsViewProps) {
  const {
    accounts, totalPortfolioValue, portfolioByPartner,
    customInvestmentCategories, paymentMethods,
    onAddAccount, onUpdateAccount, onDeleteAccount,
    onAddInvestmentTx, onDeleteInvestmentTx,
    getAccountBasis, getAccountTransactions, getPartnerName, onBack,
  } = props;

  const allCategories = useMemo(
    () => [...DEFAULT_INVESTMENT_CATEGORIES, ...customInvestmentCategories],
    [customInvestmentCategories]
  );

  const totalBasis = useMemo(
    () => accounts.reduce((s, a) => s + getAccountBasis(a.id), 0),
    [accounts, getAccountBasis]
  );
  const totalGain = totalPortfolioValue - totalBasis;
  const gainPct = totalBasis > 0 ? (totalGain / totalBasis) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="min-h-screen bg-background p-6 pb-24 mx-auto max-w-lg"
    >
      <button onClick={onBack} className="mb-4 flex items-center gap-2 text-muted-foreground">
        <ArrowLeft className="h-4 w-4" />
        <span className="text-sm">Back</span>
      </button>

      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-2xl font-bold">Investments</h1>
        <NewAccountDialog
          allCategories={allCategories}
          onCreate={onAddAccount}
          getPartnerName={getPartnerName}
        />
      </div>

      {/* Portfolio summary */}
      <div className="glass-card rounded-3xl p-6 mb-4">
        <p className="text-sm text-muted-foreground mb-1">Total Portfolio Value</p>
        <p className="font-display text-3xl font-bold tracking-tight">{formatCurrency(totalPortfolioValue)}</p>
        <div className="mt-3 flex items-center gap-2 text-sm">
          {totalGain >= 0 ? (
            <TrendingUp className="h-4 w-4 text-income" />
          ) : (
            <TrendingDown className="h-4 w-4 text-expense" />
          )}
          <span className={totalGain >= 0 ? "text-income font-semibold" : "text-expense font-semibold"}>
            {totalGain >= 0 ? "+" : ""}{formatCurrency(totalGain)} ({gainPct.toFixed(1)}%)
          </span>
          <span className="text-xs text-muted-foreground">vs basis {formatCurrency(totalBasis)}</span>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
          <PartnerStat label={getPartnerName("A")} value={portfolioByPartner.A} accent="partner-a" />
          <PartnerStat label={getPartnerName("B")} value={portfolioByPartner.B} accent="partner-b" />
          <PartnerStat label="Shared" value={portfolioByPartner.shared} accent="primary" />
        </div>
      </div>

      {accounts.length === 0 ? (
        <div className="glass-card rounded-3xl p-8 text-center">
          <Wallet className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="font-display font-semibold mb-1">No investment accounts yet</p>
          <p className="text-xs text-muted-foreground">Tap the + button above to add your first account (e.g. SACCO, MMF, NSE Stocks).</p>
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map((acc) => (
            <AccountCard
              key={acc.id}
              account={acc}
              basis={getAccountBasis(acc.id)}
              transactions={getAccountTransactions(acc.id)}
              paymentMethods={paymentMethods}
              allCategories={allCategories}
              getPartnerName={getPartnerName}
              onUpdate={(patch) => onUpdateAccount(acc.id, patch)}
              onDelete={() => onDeleteAccount(acc.id)}
              onAddTx={(t) => onAddInvestmentTx({ ...t, accountId: acc.id })}
              onDeleteTx={onDeleteInvestmentTx}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}

function PartnerStat({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded-2xl bg-muted p-3">
      <p className="text-[10px] uppercase text-muted-foreground truncate">{label}</p>
      <p className={`text-sm font-bold text-${accent}`}>{formatCurrency(value)}</p>
    </div>
  );
}

// ============ New Account Dialog ============
function NewAccountDialog({
  allCategories, onCreate, getPartnerName,
}: {
  allCategories: string[];
  onCreate: (a: Omit<InvestmentAccount, "id" | "createdAt">) => void;
  getPartnerName: (p: Partner) => string;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState(allCategories[0] || "");
  const [partner, setPartner] = useState<Partner | "shared">("shared");
  const [currentValue, setCurrentValue] = useState("");
  const [notes, setNotes] = useState("");

  const reset = () => {
    setName(""); setCategory(allCategories[0] || ""); setPartner("shared");
    setCurrentValue(""); setNotes("");
  };

  const submit = () => {
    if (!name.trim() || !category) return;
    onCreate({
      name: name.trim(),
      category,
      partner,
      currentValue: parseFloat(currentValue) || 0,
      notes: notes.trim() || undefined,
      lastValuationDate: currentValue ? new Date().toISOString() : undefined,
    });
    reset();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="rounded-full"><Plus className="h-4 w-4 mr-1" />Account</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New Investment Account</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. CIC Money Market" />
          </div>
          <div>
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {allCategories.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Owner</Label>
            <Select value={partner} onValueChange={(v) => setPartner(v as Partner | "shared")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="shared">Shared</SelectItem>
                <SelectItem value="A">{getPartnerName("A")}</SelectItem>
                <SelectItem value="B">{getPartnerName("B")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Current Value (optional)</Label>
            <Input type="number" min="0" value={currentValue} onChange={(e) => setCurrentValue(e.target.value)} placeholder="0" />
          </div>
          <div>
            <Label>Notes (optional)</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Account # / broker..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============ Account Card ============
function AccountCard({
  account, basis, transactions, paymentMethods, allCategories,
  getPartnerName, onUpdate, onDelete, onAddTx, onDeleteTx,
}: {
  account: InvestmentAccount;
  basis: number;
  transactions: InvestmentTransaction[];
  paymentMethods: PaymentMethod[];
  allCategories: string[];
  getPartnerName: (p: Partner) => string;
  onUpdate: (patch: Partial<InvestmentAccount>) => void;
  onDelete: () => void;
  onAddTx: (t: Omit<InvestmentTransaction, "id" | "accountId">) => void;
  onDeleteTx: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const gain = account.currentValue - basis;
  const gainPct = basis > 0 ? (gain / basis) * 100 : 0;

  const ownerLabel = account.partner === "shared" ? "Shared" : getPartnerName(account.partner);

  return (
    <div className="glass-card rounded-3xl p-5">
      <div className="flex items-start justify-between gap-3">
        <button onClick={() => setExpanded((v) => !v)} className="flex-1 text-left">
          <p className="text-xs text-muted-foreground">{account.category} · {ownerLabel}</p>
          <p className="font-display font-bold text-base mt-0.5">{account.name}</p>
        </button>
        <div className="text-right">
          <p className="font-display font-bold">{formatCurrency(account.currentValue)}</p>
          <p className={`text-[11px] font-semibold ${gain >= 0 ? "text-income" : "text-expense"}`}>
            {gain >= 0 ? "+" : ""}{formatCurrency(gain)} {basis > 0 && `(${gainPct.toFixed(1)}%)`}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <TxDialog
          mode="contribution"
          paymentMethods={paymentMethods}
          onSubmit={onAddTx}
        />
        <TxDialog
          mode="withdrawal"
          paymentMethods={paymentMethods}
          onSubmit={onAddTx}
        />
        <TxDialog
          mode="valuation"
          paymentMethods={paymentMethods}
          onSubmit={onAddTx}
          defaultAmount={account.currentValue}
        />
        <button
          onClick={() => setEditing(true)}
          className="rounded-full bg-muted px-3 py-1 text-xs flex items-center gap-1 hover:bg-muted/70"
        >
          <Pencil className="h-3 w-3" /> Edit
        </button>
        <button
          onClick={() => {
            if (confirm(`Delete "${account.name}" and all its transactions?`)) onDelete();
          }}
          className="rounded-full bg-destructive/10 text-destructive px-3 py-1 text-xs flex items-center gap-1 hover:bg-destructive/20"
        >
          <Trash2 className="h-3 w-3" /> Delete
        </button>
      </div>

      {expanded && (
        <div className="mt-4 border-t border-border pt-3 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">History ({transactions.length})</p>
          {transactions.length === 0 && (
            <p className="text-xs text-muted-foreground">No activity yet.</p>
          )}
          {transactions.map((t) => (
            <div key={t.id} className="flex items-center justify-between text-xs rounded-xl bg-muted p-2">
              <div>
                <p className="font-semibold capitalize">{t.type}</p>
                <p className="text-muted-foreground">{format(new Date(t.date), "MMM dd, yyyy")}{t.note ? ` · ${t.note}` : ""}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold">{formatCurrency(t.amount)}</span>
                <button onClick={() => onDeleteTx(t.id)} className="text-muted-foreground hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <EditAccountDialog
          open={editing}
          account={account}
          allCategories={allCategories}
          getPartnerName={getPartnerName}
          onClose={() => setEditing(false)}
          onSave={(patch) => { onUpdate(patch); setEditing(false); }}
        />
      )}
    </div>
  );
}

// ============ Tx Dialog (contribution / withdrawal / valuation) ============
function TxDialog({
  mode, paymentMethods, onSubmit, defaultAmount,
}: {
  mode: "contribution" | "withdrawal" | "valuation";
  paymentMethods: PaymentMethod[];
  onSubmit: (t: Omit<InvestmentTransaction, "id" | "accountId">) => void;
  defaultAmount?: number;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(defaultAmount ? String(defaultAmount) : "");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [pm, setPm] = useState(paymentMethods[0]?.id || "");
  const [fee, setFee] = useState("");
  const [note, setNote] = useState("");

  const labels = {
    contribution: { btn: "Buy / Add", title: "Add Contribution", color: "bg-income/15 text-income hover:bg-income/25" },
    withdrawal: { btn: "Sell / Withdraw", title: "Record Withdrawal", color: "bg-expense/15 text-expense hover:bg-expense/25" },
    valuation: { btn: "Update Value", title: "Update Current Value", color: "bg-muted hover:bg-muted/70" },
  } as const;
  const cfg = labels[mode];

  const submit = () => {
    const amt = parseFloat(amount);
    if (!amt || amt < 0) return;
    onSubmit({
      type: mode,
      amount: amt,
      date: new Date(date).toISOString(),
      paymentMethodId: mode !== "valuation" ? pm : undefined,
      transactionCost: mode !== "valuation" && fee ? parseFloat(fee) : undefined,
      note: note.trim() || undefined,
    });
    setAmount(""); setFee(""); setNote("");
    setOpen(false);
  };

  const selectedPm = paymentMethods.find((p) => p.id === pm);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className={`rounded-full px-3 py-1 text-xs font-semibold ${cfg.color}`}>
          {cfg.btn}
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{cfg.title}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>{mode === "valuation" ? "New total value" : "Amount"}</Label>
            <Input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div>
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          {mode !== "valuation" && (
            <>
              <div>
                <Label>Payment method</Label>
                <Select value={pm} onValueChange={setPm}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.icon} {p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedPm?.supportsFee && (
                <div>
                  <Label>Transaction cost (optional)</Label>
                  <Input type="number" min="0" value={fee} onChange={(e) => setFee(e.target.value)} placeholder="0" />
                </div>
              )}
            </>
          )}
          <div>
            <Label>Note (optional)</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============ Edit Account Dialog ============
function EditAccountDialog({
  open, account, allCategories, getPartnerName, onClose, onSave,
}: {
  open: boolean;
  account: InvestmentAccount;
  allCategories: string[];
  getPartnerName: (p: Partner) => string;
  onClose: () => void;
  onSave: (patch: Partial<InvestmentAccount>) => void;
}) {
  const [name, setName] = useState(account.name);
  const [category, setCategory] = useState(account.category);
  const [partner, setPartner] = useState<Partner | "shared">(account.partner);
  const [notes, setNotes] = useState(account.notes || "");

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit Account</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div>
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {allCategories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Owner</Label>
            <Select value={partner} onValueChange={(v) => setPartner(v as Partner | "shared")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="shared">Shared</SelectItem>
                <SelectItem value="A">{getPartnerName("A")}</SelectItem>
                <SelectItem value="B">{getPartnerName("B")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Notes</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave({ name: name.trim(), category, partner, notes: notes.trim() || undefined })}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
