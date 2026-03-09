function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function format(d) {
  return d.toISOString().slice(0, 10);
}

function distributeDates(transactions, start, end) {

  const startDate = new Date(start);
  const endDate = new Date(end);

  const totalDays =
    Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

  if (totalDays <= 0)
    throw new Error("Invalid date range");

  const perDay = Math.ceil(transactions.length / totalDays);

  let index = 0;
  let current = new Date(startDate);

  const result = [];

  while (index < transactions.length) {

    for (let i = 0; i < perDay && index < transactions.length; i++) {
      result.push({
        ...transactions[index],
        date: format(current),
        valueDate: format(current)
      });
      index++;
    }

    current = addDays(current, 1);

    // safety stop
    if (current > endDate && index < transactions.length) {
      // continue assigning to last day instead of looping forever
      current = new Date(endDate);
    }
  }

  return result;
}

module.exports = distributeDates;