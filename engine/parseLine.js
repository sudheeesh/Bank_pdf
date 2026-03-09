function cleanText(text = "") {
  return text
    // remove dates
    .replace(/\d{2}-\d{2}-\d{4}/g, "")

    // remove amounts
    .replace(/\d{1,3}(?:,\d{3})*\.\d{2}(CR|DR)?/g, "")

    // remove long reference numbers
    .replace(/\b\d{5,}\b/g, "")

    // remove leftover slashes from UPI refs
    .replace(/\/{2,}/g, "/")

    // collapse spaces but DO NOT trim start
    .replace(/[ ]{2,}/g, " ");
}

function parseLine(line){

  // --- extract dates (we detect but don't keep) ---
  let date = line.substring(0,10);

  let secondDateMatch = line.slice(10).match(/\d{2}-\d{2}-\d{4}/);
  let valueDate = secondDateMatch ? secondDateMatch[0] : null;

  // cut before value date so only transaction part remains
  if(valueDate){
    const idx = line.indexOf(valueDate);
    line = line.slice(idx + valueDate.length);
  }

  // --- CLEAN THE REMAINING TEXT ---
  const description = cleanText(line);

  return {
    date: "",        // blank columns
    valueDate: "",
    desc: description,
    ref: "",
    debit: "",
    credit: "",
    balance: ""
  };
}

module.exports = parseLine;