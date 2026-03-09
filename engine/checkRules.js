const toMoney = n => Math.round((Number(n)+Number.EPSILON)*100)/100;

function checkRules(summary, monthly, expected){

  const report = {};

  // opening & closing
  report.openingMatch =
    toMoney(summary.opening) === toMoney(expected.opening);

  report.closingMatch =
    toMoney(summary.closing) === toMoney(expected.closing);

  // monthly totals
  report.months = {};

  for(const m in monthly){
    report.months[m] = {
      creditOk: Math.abs(monthly[m].credit - expected.monthlyCredit) < 1,
      debitOk:  Math.abs(monthly[m].debit  - expected.monthlyDebit)  < 1,
      credit: monthly[m].credit,
      debit: monthly[m].debit
    };
  }

  return report;
}

module.exports = checkRules;