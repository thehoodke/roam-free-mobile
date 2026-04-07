export function formatCurrency(amount: number, decimals = 0): string {
  return `KES ${amount.toLocaleString("en-KE", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}
