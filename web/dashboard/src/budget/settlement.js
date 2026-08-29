// settlement.js — pure funding, responsibility and couple reconciliation engine.
// Separates the service cost, external funding, contractual installments and
// actual cash movements. No Firestore / DOM dependencies.

const money = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
const DEFAULT_PARTICIPANTS = ["david", "ayde"];

export function normalizeShares(shares = {}, participants = DEFAULT_PARTICIPANTS) {
  const positive = Object.fromEntries(participants.map((id) => [id, Math.max(0, money(shares[id]))]));
  const total = Object.values(positive).reduce((sum, value) => sum + value, 0);
  if (!total) return Object.fromEntries(participants.map((id) => [id, 1 / participants.length]));
  return Object.fromEntries(participants.map((id) => [id, positive[id] / total]));
}

export function contributionAmount(contribution, itemAmount) {
  if (!contribution || contribution.status === "cancelled") return 0;
  if (contribution.coverageMode === "full") return itemAmount;
  if (contribution.coverageMode === "percentage") {
    return itemAmount * Math.max(0, Math.min(100, money(contribution.percentage))) / 100;
  }
  return Math.max(0, money(contribution.amount ?? contribution.committedAmount));
}

export function settleBudget({
  items = [], contributions = [], payments = [], participants = DEFAULT_PARTICIPANTS,
} = {}) {
  const expected = Object.fromEntries(participants.map((id) => [id, 0]));
  const paid = Object.fromEntries(participants.map((id) => [id, 0]));
  const externalCommittedByItem = new Map();
  const externalReceivedByItem = new Map();

  for (const contribution of contributions) {
    const item = items.find((candidate) => candidate.id === contribution.budgetItemId);
    if (!item) continue;
    const amount = contributionAmount(contribution, money(item.amount));
    const committed = externalCommittedByItem.get(item.id) || 0;
    externalCommittedByItem.set(item.id, Math.min(money(item.amount), committed + amount));
    if (contribution.status === "received" || contribution.status === "paid") {
      const received = externalReceivedByItem.get(item.id) || 0;
      externalReceivedByItem.set(item.id, Math.min(money(item.amount), received + amount));
    }
  }

  const lines = items.map((item) => {
    const gross = Math.max(0, money(item.amount));
    const externalCommitted = externalCommittedByItem.get(item.id) || 0;
    const externalReceived = externalReceivedByItem.get(item.id) || 0;
    const coupleResponsibility = Math.max(0, gross - externalCommitted);
    const shares = normalizeShares(item.responsibilityShares, participants);
    const responsibility = Object.fromEntries(participants.map((id) => {
      const amount = coupleResponsibility * shares[id];
      expected[id] += amount;
      return [id, amount];
    }));
    return { itemId: item.id, gross, externalCommitted, externalReceived, coupleResponsibility, shares, responsibility };
  });

  for (const payment of payments) {
    if (payment.kind === "planned" || !["paid", "cleared"].includes(payment.status)) continue;
    if (participants.includes(payment.payerId)) paid[payment.payerId] += Math.max(0, money(payment.amount));
  }

  const grossBudget = lines.reduce((sum, line) => sum + line.gross, 0);
  const externalCommitted = lines.reduce((sum, line) => sum + line.externalCommitted, 0);
  const externalReceived = lines.reduce((sum, line) => sum + line.externalReceived, 0);
  const coupleResponsibility = grossBudget - externalCommitted;
  const couplePaid = Object.values(paid).reduce((sum, value) => sum + value, 0);
  const outstanding = Math.max(0, coupleResponsibility - couplePaid);
  const position = Object.fromEntries(participants.map((id) => [id, paid[id] - expected[id]]));

  let transfer = null;
  if (participants.length === 2) {
    const [first, second] = participants;
    if (position[first] > 0) transfer = { from: second, to: first, amount: position[first] };
    else if (position[second] > 0) transfer = { from: first, to: second, amount: position[second] };
  }

  return {
    lines, grossBudget, externalCommitted, externalReceived,
    externalOutstanding: Math.max(0, externalCommitted - externalReceived),
    coupleResponsibility, couplePaid, outstanding,
    expected, paid, position, transfer,
    isFullySettled: outstanding === 0 && externalCommitted === externalReceived,
  };
}

export default { normalizeShares, contributionAmount, settleBudget };
