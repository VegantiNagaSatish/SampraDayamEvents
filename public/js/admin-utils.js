export function formatINR(amount) {
  const n = Number(amount);
  if (Number.isNaN(n)) return '₹0.00';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(n);
}

const BELOW_20 = [
  'Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function belowHundred(n) {
  if (n < 20) return BELOW_20[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return TENS[t] + (o ? ' ' + BELOW_20[o] : '');
}

function belowThousand(n) {
  if (n < 100) return belowHundred(n);
  const h = Math.floor(n / 100);
  const r = n % 100;
  return BELOW_20[h] + ' Hundred' + (r ? ' ' + belowHundred(r) : '');
}

/** 0–99,999 (below one lakh). */
function belowOneLakh(n) {
  if (n < 1000) return belowThousand(n);
  const thou = Math.floor(n / 1000);
  const r = n % 1000;
  return belowHundred(thou) + ' Thousand' + (r ? ' ' + belowThousand(r) : '');
}

/** Whole rupees only; Indian grouping wording (lakh / crore). */
export function rupeesToWords(num) {
  let n = Math.floor(Math.abs(Number(num)));
  if (n === 0) return 'Zero Rupees Only';

  const parts = [];
  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;

  if (crore) parts.push(belowHundred(crore) + ' Crore');
  if (lakh) parts.push(belowHundred(lakh) + ' Lakh');
  if (n) parts.push(belowOneLakh(n));

  return parts.join(' ') + ' Rupees Only';
}

/** Line amount: quantity × unit price (no tax). */
export function computeLine(qty, price) {
  const q = Number(qty) || 0;
  const p = Number(price) || 0;
  const lineTotal = q * p;
  return { lineTotal };
}

/** Sum line totals for estimation documents. */
export function sumLineTotals(lines) {
  return lines.reduce(
    (acc, line) => {
      const { lineTotal } = computeLine(line.qty, line.price);
      acc.grand += lineTotal;
      return acc;
    },
    { grand: 0 }
  );
}
