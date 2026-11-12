export const INSUFFICIENT_BALANCE_MESSAGE = "Solde insuffisant pour effectuer cet achat";

/** Vérifie le montant avant toute opération, y compris au moment de sa validation. */
export function hasSufficientBalance(balance: number | undefined, amount: number): boolean {
  return (
    typeof balance === "number" &&
    Number.isFinite(balance) &&
    balance >= 0 &&
    Number.isFinite(amount) &&
    amount >= 0 &&
    amount <= balance
  );
}