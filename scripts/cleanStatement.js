function cleanTransaction(row) {
  const clean = (txt = "") =>
    txt
      // remove dates
      .replace(/\b\d{2}-\d{2}-\d{4}\b/g, "")

      // remove money values
      .replace(/\b\d{1,3}(,\d{3})*(\.\d{2})?(CR|DR)?\b/g, "")

      // remove long ids
      .replace(/\b\d{5,}\b/g, "")

      // cleanup slashes
      .replace(/\/{2,}/g, "/");

  return {
    date: "",        // blank column
    valueDate: "",   // blank column
    debit: "",
    credit: "",
    balance: "",
    desc: clean(row.desc),
    ref: clean(row.ref)
  };
}

module.exports = cleanTransaction;