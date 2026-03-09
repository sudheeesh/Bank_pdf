function toNumber(value){
  if(!value) return 0;
  return parseFloat(String(value).replace(/,/g, ""));
}

function recalculateBalance(transactions, openingBalance){

  let balance = toNumber(openingBalance);

  return transactions.map(tx => {

    const amount = toNumber(tx.amount);

    if(isNaN(amount)){
      console.log("Invalid amount detected:", tx);
      return tx;
    }

    if(tx.type === "DR")
      balance -= amount;
    else
      balance += amount;

    tx.balance = balance.toFixed(2);

    return tx;
  });

}

module.exports = recalculateBalance;