function groupByMonth(transactions){

  const map = {};

  transactions.forEach(tx=>{
    const [d,m,y] = tx.date.split("-");
    const key = `${m}-${y}`;

    if(!map[key]) map[key] = [];
    map[key].push(tx);
  });

  return map;
}

module.exports = groupByMonth;