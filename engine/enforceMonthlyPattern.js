function enforceMonthlyPattern(transactions){

  const map={};

  transactions.forEach(tx=>{
    const key = tx.date.slice(3); // mm-yyyy
    if(!map[key]) map[key]=[];
    map[key].push(tx);
  });

  Object.values(map).forEach(month=>{

    let debitCount=0;

    month.forEach(tx=>{
      if(debitCount < 8){
        tx.type="DR";
        debitCount++;
      }else{
        tx.type="CR";
      }
    });

  });

  return transactions;
}

module.exports = enforceMonthlyPattern;