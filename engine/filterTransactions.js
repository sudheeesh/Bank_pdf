function isValidDate(d) {
  return typeof d === "string" && /^\d{2}-\d{2}-\d{4}$/.test(d);
}

function toNumber(v) {
  if (typeof v === "number") return v;
  if (!v) return NaN;
  return Number(String(v).replace(/,/g, "").trim());
}

function isValidTransaction(t) {

  const amount = toNumber(t.amount);
  const balance = toNumber(t.balance);

  if (!isValidDate(t.date)) return false;
  if (!Number.isFinite(amount) || amount <= 0) return false;
  if (!Number.isFinite(balance)) return false;

  return true;
}

function filterTransactions(rows) {

  const clean = [];

  rows.forEach(r => {

    const amount = toNumber(r.amount);
    const balance = toNumber(r.balance);

    const txn = { ...r, amount, balance };

    if (isValidTransaction(txn)) {
      clean.push(txn);
    }
  });

  return clean;
}

module.exports = filterTransactions;