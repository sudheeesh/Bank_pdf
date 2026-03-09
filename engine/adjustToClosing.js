function toNumber(v){
  return parseFloat(String(v).replace(/,/g,""));
}

function adjustToClosing(transactions, opening, targetClosing){

  const requiredNet = targetClosing - opening;

  let totalDebit = 0;
  let totalCredit = 0;

  transactions.forEach(tx=>{
    const amt = toNumber(tx.amount);
    if(tx.type === "DR") totalDebit += amt;
    else totalCredit += amt;
  });

  const currentNet = totalCredit - totalDebit;
  let diff = requiredNet - currentNet;

  // adjust last credit transaction (least suspicious)
  for(let i=transactions.length-1; i>=0; i--){
    if(transactions[i].type === "CR"){
      let amt = toNumber(transactions[i].amount);
      amt += diff;
      if(amt < 1) amt = 1;
      transactions[i].amount = amt.toFixed(2);
      break;
    }
  }

  return transactions;
}

module.exports = adjustToClosing;