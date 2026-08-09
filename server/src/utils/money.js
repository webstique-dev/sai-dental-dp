// Decimal-safe money helpers.
// All monetary totals are computed in integer paise (1 rupee = 100 paise) so
// float arithmetic is never used. Convert to/from rupees only at the boundary.

function toPaise(rupees) {
  const n = Number(rupees);
  if (!Number.isFinite(n)) return 0;
  // Round to the nearest whole paise to absorb float input noise.
  return Math.round(n * 100);
}

function toRupees(paise) {
  const n = Number(paise);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n) / 100;
}

// Sum paise amounts using integer arithmetic only.
function sumPaise(list) {
  return list.reduce((acc, p) => acc + (Number.isFinite(Number(p)) ? Math.round(Number(p)) : 0), 0);
}

module.exports = { toPaise, toRupees, sumPaise };