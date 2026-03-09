function toNumber(v){
  if(typeof v === "number") return v;
  return Number(String(v).replace(/,/g,""));
}

function reconcileStatement(txns, opening){

  let balance = toNumber(opening);
  const errors = [];

  txns.forEach((t,i)=>{
    balance += t.type === "CR" ? t.amount : -t.amount;

    if(Math.abs(balance - t.balance) > 0.01){
      errors.push({
        row:i+1,
        expected:Number(balance.toFixed(2)),
        actual:t.balance,
        description:t.description
      });
    }
  });

  return {
    computedClosing:Number(balance.toFixed(2)),
    errors
  };
}

module.exports = reconcileStatement;