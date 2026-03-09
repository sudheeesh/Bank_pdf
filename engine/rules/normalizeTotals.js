function normalizeTotals(transactions, rules){

  let debitTx = transactions.filter(t => t.type === "DR");
  let creditTx = transactions.filter(t => t.type === "CR");

  let totalDebit = debitTx.reduce((sum, t) => sum + parseFloat(t.amount), 0);
  let totalCredit = creditTx.reduce((sum, t) => sum + parseFloat(t.amount), 0);

  // Scale debits proportionally
  const debitRatio = rules.maxTotalDebit / totalDebit;
  debitTx.forEach(t => {
    let newAmt = parseFloat(t.amount) * debitRatio;

    if(newAmt > rules.maxSingleDebit)
        newAmt = rules.maxSingleDebit - 50;

    t.amount = newAmt.toFixed(2);
  });

  // Scale credits proportionally
  const creditRatio = rules.targetCredit / totalCredit;
  creditTx.forEach(t => {
    let newAmt = parseFloat(t.amount) * creditRatio;
    t.amount = newAmt.toFixed(2);
  });

  return transactions;
}

module.exports = normalizeTotals;