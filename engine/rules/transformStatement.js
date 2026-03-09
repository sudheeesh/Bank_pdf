/* ---------------- UTIL ---------------- */

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function toNumber(value) {
  if (typeof value === "number") return value;
  if (!value) return 0;
  return Number(String(value).replace(/,/g, "").trim());
}

/* ---------------- ROLE CLASSIFIER ---------------- */

function isAnchor(t) {
  const desc = (t.description || "").toLowerCase();
  return (
    /salary|neft|rtgs|imps|tfr|transfer|deposit|chq|cheque/.test(desc) ||
    t.amount >= 20000
  );
}

/* ---------------- SMALL NORMALIZATION ---------------- */
/* keeps small transactions human sized, does NOT solve closing */

function normalizeNoise(txns) {
  txns.forEach(t => {
    if (!isAnchor(t)) {
      t.amount = clamp(t.amount, 50, 3000);
    }
  });
}

/* ---------------- BALANCE REBUILD ---------------- */

function rebuildBalance(txns, opening) {
  let balance = opening;

  txns.forEach(t => {
    if (t.type === "CR") balance += t.amount;
    else balance -= t.amount;

    t.balance = Number(balance.toFixed(2));
  });

  return balance;
}

/* ---------------- MAIN TRANSFORM ---------------- */

function transformStatement(txns, opening, closing) {

  opening = toNumber(opening);
  closing = toNumber(closing);

  // ensure numeric
  txns.forEach(t => t.amount = toNumber(t.amount));

  // Step 1: keep behaviour human
  normalizeNoise(txns);

  // Step 2: rebuild ledger honestly
  let balance = rebuildBalance(txns, opening);

  // Step 3: compute remaining diff
  let diff = Number((closing - balance).toFixed(2));
  if (diff === 0) return txns;

  // Step 4: distribute ONLY into anchor credits
  const anchors = txns.filter(t => isAnchor(t) && t.type === "CR");

  if (anchors.length === 0) {
    // fallback: last txn
    const last = txns[txns.length - 1];
    if (last.type === "CR") last.amount += diff;
    else last.amount -= diff;
  } else {
    const share = diff / anchors.length;
    anchors.forEach(a => {
      a.amount = Number((a.amount + share).toFixed(2));
    });
  }

  // Step 5: rebuild balance again after correction
  balance = rebuildBalance(txns, opening);

  // Step 6: tiny rounding correction on last anchor
  let finalDiff = Number((closing - balance).toFixed(2));
  if (Math.abs(finalDiff) > 0.01) {
    const lastAnchor = anchors.length
      ? anchors[anchors.length - 1]
      : txns[txns.length - 1];

    if (lastAnchor.type === "CR") lastAnchor.amount += finalDiff;
    else lastAnchor.amount -= finalDiff;

    rebuildBalance(txns, opening);
  }

  return txns;
}

module.exports = transformStatement;