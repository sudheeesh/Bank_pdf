function fixDate(date){
  if(!date) return null;

  let year = parseInt(date.slice(-4));

  // impossible year detected
  if(year > new Date().getFullYear() + 1){
    // remove last digit and shift
    date = date.slice(0,9) + date.slice(10);
  }

  return date;
}

function fixAmount(amount){
  if(!amount) return null;

  // remove absurd lakhs caused by glued year
  if(amount.length > 10){
    amount = amount.slice(1);
  }

  return amount;
}

function cleanTransaction(tx){
  return {
    date: fixDate(tx.date),
    valueDate: fixDate(tx.valueDate),
    amount: fixAmount(tx.amount),
    balance: tx.balance
  };
}

module.exports = cleanTransaction;
