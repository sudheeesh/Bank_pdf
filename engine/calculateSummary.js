function toNumber(v) {
  if (typeof v === "number") return v;
  if (!v) return 0;
  return Number(String(v).replace(/,/g, "").trim());
}

function calculateSummary(transactions, openingBalance) {

  let balance = toNumber(openingBalance);

  let totalDebit = 0;
  let totalCredit = 0;

  transactions.forEach(t => {

    const amount = toNumber(t.amount);

    if (t.type === "CR") {
      totalCredit += amount;
      balance += amount;   // credit increases balance
    } else {
      totalDebit += amount;
      balance -= amount;   // debit decreases balance
    }
  });

  return {
    opening: openingBalance.toFixed(2),
    totalDebit: totalDebit.toFixed(2),
    totalCredit: totalCredit.toFixed(2),
    closing: balance.toFixed(2)
  };
}

module.exports = calculateSummary;