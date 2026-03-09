function extractTransactions(text){

  const dateRegex = /\d{2}-\d{2}-\d{4}/g;
  const moneyRegex = /\d{1,3}(?:,\d{3})*\.\d{2}/g;

  const dates = [...text.matchAll(dateRegex)].map(m => m[0]);
  const amounts = [...text.matchAll(moneyRegex)].map(m => m[0]);

  let transactions = [];

  for(let i=0; i<Math.min(dates.length/2, amounts.length/2); i++){
    transactions.push({
      date: dates[i*2],
      valueDate: dates[i*2+1],
      amount: amounts[i*2],
      balance: amounts[i*2+1]
    });
  }

  return transactions;
}

module.exports = extractTransactions;
