function splitAmount(total, maxPerTxn) {
  const parts = [];

  while (total > 0) {
    let amt = Math.min(maxPerTxn, total);

    // avoid perfect patterns
    amt = Math.max(200, Math.round(amt * (0.7 + Math.random() * 0.3)));

    if (amt > total) amt = total;

    parts.push(Number(amt.toFixed(2)));
    total -= amt;
  }

  return parts;
}

function buildMonth(openingBalance, monthIndex, startDate) {

  const MAX_TXN = 3000;
  const CREDIT_TARGET = 10000;
  const DEBIT_TARGET = 28000;

  const credits = splitAmount(CREDIT_TARGET, MAX_TXN);
  const debits = splitAmount(DEBIT_TARGET, MAX_TXN);

  // ensure minimum 5 each
  while (credits.length < 5) credits.push(200);
  while (debits.length < 5) debits.push(200);

  const txns = [];

  credits.forEach(a =>
    txns.push({ type: "CR", amount: a })
  );

  debits.forEach(a =>
    txns.push({ type: "DR", amount: a })
  );

  // shuffle so it looks natural
  txns.sort(() => Math.random() - 0.5);

  let balance = openingBalance;

  txns.forEach(t => {
    balance += t.type === "CR" ? t.amount : -t.amount;
    t.balance = Number(balance.toFixed(2));
  });

  return { txns, closing: balance };
}

function buildLedger(opening, closing, months) {

  let balance = opening;
  const all = [];

  for (let i = 0; i < months; i++) {

    const { txns, closing: monthClose } = buildMonth(balance, i);
    balance = monthClose;

    all.push(...txns);
  }

  // final correction to match exact closing
  let diff = Number((closing - balance).toFixed(2));

  if (diff !== 0) {
    all.push({
      type: diff > 0 ? "CR" : "DR",
      amount: Math.abs(diff),
      balance: closing
    });
  }

  return all;
}

module.exports = buildLedger;