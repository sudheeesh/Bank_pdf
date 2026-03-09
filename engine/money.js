function toMoney(n){
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

module.exports = toMoney;