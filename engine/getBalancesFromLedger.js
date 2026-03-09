function toNumber(v) {
  if (!v) return 0;
  return parseFloat(String(v).replace(/,/g, ""));
}

function getBalancesFromLedger(transactions) {

  if (!transactions.length)
    throw new Error("No transactions to calculate balance");

  const first = transactions[0];
  const last = transactions[transactions.length - 1];

  const balance = toNumber(first.balance);
  const amount = toNumber(first.amount);

  let opening;

  // detect debit or credit using balance movement
  const nextBalance = toNumber(transactions[1]?.balance);

  if (nextBalance < balance)
    opening = balance + amount; // debit happened
  else
    opening = balance - amount; // credit happened

  const closing = toNumber(last.balance);

  return { opening, closing };
}

module.exports = getBalancesFromLedger;