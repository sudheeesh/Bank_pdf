const fs = require("fs");
const pdf = require("pdf-parse");

async function readConditions(path){

  const data = await pdf(fs.readFileSync(path));
  const text = data.text;

  function find(label){
    const r = new RegExp(label + ".*?(\\d+)", "i");
    const m = text.match(r);
    return m ? parseInt(m[1]) : 0;
  }

  return {
    maxCredit: find("MAXIMUM MONTHLY CREDIT"),
    maxDebit: find("MAXIMUM MONTHLY DEBIT"),
    plannedSpend: find("Amount planning to spend")
  };
}

module.exports = readConditions;