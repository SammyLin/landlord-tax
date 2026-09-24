// 房東稅賦試算核心。純函式，index.html 與 test.js 共用。
const TYPES = [
  { key:'social', name:'社宅包租代管', note:'參與中央社宅包租代管',
    exempt:15000, expense:0.60, houseRate:0.012, landRate:0.002,
    discounted:true, subsidised:true, agentPaid:true, mgmtPaid:true },
  { key:'charity', name:'公益出租人', note:'房客領租金補貼即可申請',
    exempt:15000, expense:0.43, houseRate:0.012, landRate:0.002,
    discounted:false, subsidised:false, agentPaid:false, mgmtPaid:true },
  { key:'self', name:'房東自租自管', note:'一般出租，自己找客自己管',
    exempt:0, expense:0.43, houseRate:0.024, landRate:0.010,
    discounted:false, subsidised:false, agentPaid:false, mgmtPaid:true },
  { key:'agency', name:'一般宅包租代管', note:'委託業者，無租稅優惠',
    exempt:0, expense:0.43, houseRate:0.024, landRate:0.010,
    discounted:false, subsidised:false, agentPaid:false, mgmtPaid:false },
];

function calcRow(t, p) {
  const monthly = t.discounted ? p.rent * p.discount : p.rent;
  const annual = monthly * 12;
  const taxable = Math.max(0, monthly - t.exempt) * 12 * (1 - t.expense);
  const incomeTax = taxable * p.bracket;
  const houseTax = p.houseValue * t.houseRate;
  const landTax = p.landValue * t.landRate;
  const agentCost = t.agentPaid ? 0 : monthly * p.agentMonths;
  const mgmtCost = t.mgmtPaid ? 0 : annual * p.mgmtRate;
  const support = t.subsidised ? p.subsidy : 0;
  return { t, annual, taxable, incomeTax, houseTax, landTax, agentCost, mgmtCost, support,
    totalTax: incomeTax + houseTax + landTax,
    net: annual - incomeTax - houseTax - landTax - agentCost - mgmtCost + support };
}

const calcAll = p => TYPES.map(t => calcRow(t, p));

if (typeof module !== 'undefined') module.exports = { TYPES, calcRow, calcAll };
