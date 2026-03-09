function num(x){
  return parseFloat(String(x).replace(/,/g,''));
}

function getOpeningBalance(transactions){

  if(transactions.length === 0) return 0;

  const first = transactions[0];

  const bal = num(first.balance);
  const amt = num(first.amount);

  // reverse first transaction
  if(first.type === "DR")
    return bal + amt;
  else
    return bal - amt;
}

module.exports = getOpeningBalance;