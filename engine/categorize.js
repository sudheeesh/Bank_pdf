function categorize(t){
  const d=(t.description||"").toLowerCase();

  if(/salary|neft|rtgs/.test(d)) return "Income";
  if(/upi/.test(d)) return "UPI Spend";
  if(/atm|cash|wdl/.test(d)) return "Cash Withdrawal";
  if(/interest/.test(d)) return "Interest";
  if(/charge|fee/.test(d)) return "Bank Charges";
  return "Other";
}

module.exports=categorize;