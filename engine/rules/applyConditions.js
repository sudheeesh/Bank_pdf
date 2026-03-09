const groupByMonth = require("../groupByMonth");

function toNumber(value){
  return parseFloat(String(value).replace(/,/g, ""));
}   

function applyConditions(transactions, config){

  const months = groupByMonth(transactions);
  const result = [];

  for(const month in months){

    let monthCredit = 0;
    let monthDebit = 0;

    months[month].forEach(tx=>{
      
        let amount = toNumber(tx.amount);

      // decide debit/credit by balance movement later
      if(monthCredit < config.maxCredit){
        monthCredit += amount;
        tx.type = "CR";
      }else{
        tx.type = "DR";
        monthDebit += amount;
      }

      // cap debit
      if(monthDebit > config.maxDebit){
        amount = Math.min(amount, config.maxDebit - (monthDebit - amount));
      }

      tx.amount = amount.toFixed(2);
      result.push(tx);

    });
  }

  return result;
}

module.exports = applyConditions;