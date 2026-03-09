function monthlySummary(txns){

  const map={};

  txns.forEach(t=>{
    const m=t.date.slice(3,10);
    if(!map[m]) map[m]={credit:0,debit:0};

   const toMoney = require("./money");

if(t.type==="CR") map[m].credit = toMoney(map[m].credit + t.amount);
else map[m].debit = toMoney(map[m].debit + t.amount);
  });

  return map;
}

module.exports=monthlySummary;