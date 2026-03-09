let lastBalance = null;

function toNumber(v) {
  if (!v) return null;
  const n = Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function isDate(str) {
  return /^\d{2}-\d{2}-\d{4}$/.test(str);
}

function tokenize(row) {
  if (Array.isArray(row)) return row;
  if (typeof row === "string") return row.trim().split(/\s+/);
  return [];
}

function parseRow(row) {

  const tokens = tokenize(row);
  if (tokens.length < 4) return null;

  /* -------- FIND BALANCE (RIGHTMOST NUMBER) -------- */

  let balance = null;
  let balanceIndex = -1;

  for (let i = tokens.length - 1; i >= 0; i--) {
    const num = toNumber(tokens[i]);
    if (num !== null) {
      balance = num;
      balanceIndex = i;
      break;
    }
  }

  if (balance === null) return null;

  /* -------- FIND DATES -------- */

  const dateIndexes = [];
  tokens.forEach((t, i) => {
    if (isDate(t)) dateIndexes.push(i);
  });

  if (dateIndexes.length < 1) return null;

  const date = tokens[dateIndexes[0]];
  const valueDate = dateIndexes[1] ? tokens[dateIndexes[1]] : date;

  /* -------- DESCRIPTION -------- */

  const description = tokens
    .slice(dateIndexes[dateIndexes.length - 1] + 1, balanceIndex)
    .join(" ");

  /* -------- DERIVE AMOUNT FROM BALANCE MOVEMENT -------- */

  let amount = 0;
  let type = "CR";

  if (lastBalance !== null) {
    const delta = Number((balance - lastBalance).toFixed(2));

    if (delta > 0) {
      type = "CR";
      amount = delta;
    } else {
      type = "DR";
      amount = Math.abs(delta);
    }
  }

  lastBalance = balance;

  // ignore header / opening balance line
  if (amount === 0) return null;

  return {
    date,
    valueDate,
    description: description || "Transaction",
    amount,
    balance,
    type
  };
}

module.exports = parseRow;