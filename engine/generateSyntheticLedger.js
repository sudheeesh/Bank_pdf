function toMoney(n){
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function rand(min,max){
  return Math.random()*(max-min)+min;
}

function splitAmount(total,min,max){
  const parts=[];
  let remaining=toMoney(total);

  while(remaining>0){
    let amt=toMoney(rand(min,max));
    if(amt>remaining) amt=remaining;
    if(amt<min) amt=min;
    parts.push(amt);
    remaining=toMoney(remaining-amt);
  }
  return parts;
}

function backward(balance,type,amount){
  return type==="CR" ? balance-amount : balance+amount;
}

function generateSyntheticLedger({
  opening,
  closing,
  months,
  monthlyCredit,
  monthlyDebit
}){

  let balance = toMoney(closing);
  const reverseTxns=[];

  // salary required per month
  const salary = toMoney(
    ((closing-opening)/months) - (monthlyCredit-monthlyDebit)
  );

  /* ---------- BUILD BACKWARD ---------- */

  for(let m=months;m>=1;m--){

    const date=`28-${String(m).padStart(2,'0')}-2025`;

    // debits
    splitAmount(monthlyDebit,500,3000).forEach(a=>{
      balance=backward(balance,"DR",a);
      reverseTxns.push({date,type:"DR",amount:a,balance,description:"UPI DEBIT"});
    });

    // credits
    splitAmount(monthlyCredit,500,3000).forEach(a=>{
      balance=backward(balance,"CR",a);
      reverseTxns.push({date,type:"CR",amount:a,balance,description:"UPI CREDIT"});
    });

    // salary
    balance=backward(balance,"CR",salary);
    reverseTxns.push({date,type:"CR",amount:salary,balance,description:"SALARY"});
  }

  /* ---------- FIX OPENING ---------- */

  const calculatedOpening = toMoney(balance);
  let diff = toMoney(opening - calculatedOpening);

// first txn in forward order = last in reverse
const firstSalary = reverseTxns[reverseTxns.length-1];

if(firstSalary.description !== "SALARY"){
  throw new Error("Top transaction is not salary — cannot reconcile");
}

firstSalary.amount = toMoney(firstSalary.amount + diff);
firstSalary.balance = toMoney(firstSalary.balance + diff);

  /* ---------- REBUILD FORWARD ---------- */

  const forward = reverseTxns.reverse();

  let running = opening;

  forward.forEach(t=>{
    running = t.type==="CR"
      ? running + t.amount
      : running - t.amount;

    t.balance = toMoney(running);
  });

  /* ---------- FIX CLOSING ---------- */

  let lastBalance = forward[forward.length-1].balance;
  let closingDiff = toMoney(closing - lastBalance);

  if(Math.abs(closingDiff)>0){

    const lastDate = forward[forward.length-1].date;
    const type = closingDiff>0?"CR":"DR";
    const amt = Math.abs(closingDiff);

    running = type==="CR"
      ? running + amt
      : running - amt;

    forward.push({
      date:lastDate,
      type,
      amount:toMoney(amt),
      balance:toMoney(running),
      description:"ADJUSTMENT"
    });
  }

  return {
    openingBalance: toMoney(opening),
    closingBalance: toMoney(closing),
    transactions: forward
  };
}

module.exports = generateSyntheticLedger;