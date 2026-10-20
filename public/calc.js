// 房東租賃稅務試算引擎。純函式，index.html 與 test.js 共用。
// 規則版本：適用 2026 年度（115 年）申報，標示「待確認」者上線前需再對官方公告。

const RULES = {
  version: '2026-10',
  year: 2026,
  // 租賃所得稅：monthlyTaxable(R) 回傳每月應稅租賃所得
  tax: {
    self: {
      name: '一般出租', exempt: () => 0,
      taxable: R => R * 0.57,
      formula: 'R × 57%（必要費用 43%）',
    },
    charity: {
      name: '公益出租人', exempt: R => Math.min(R, 15000),
      taxable: R => Math.max(0, R - 15000) * 0.57,
      formula: 'MAX(0, R − 15,000) × 57%',
    },
    agency: {
      name: '一般包租代管', exempt: R => Math.min(R, 6000),
      taxable: R => Math.max(0, Math.min(R, 20000) - 6000) * 0.47 + Math.max(0, R - 20000) * 0.57,
      formula: 'MAX(0, MIN(R, 20,000) − 6,000) × 47% + MAX(0, R − 20,000) × 57%',
    },
    social: {
      name: '社宅包租代管', exempt: R => Math.min(R, 15000),
      taxable: R => Math.max(0, R - 15000) * 0.40,
      formula: 'MAX(0, R − 15,000) × 40%',
    },
  },
  nhi: { rate: 0.0211, threshold: 20000, cap: 10000000 },
};

// 五種出租方案。taxRule 指向 RULES.tax；payer 為預設租金給付者
const PLANS = [
  { key: 'self', name: '自行出租', taxRule: 'self', payer: 'person', lease: false, preferential: false, subsidised: false, agencyFee: false, discount: 100 },
  { key: 'charity', name: '公益出租人', taxRule: 'charity', payer: 'person', lease: false, preferential: true, subsidised: false, agencyFee: false, discount: 100 },
  { key: 'agency', name: '一般包租代管', taxRule: 'agency', payer: 'company', lease: false, preferential: false, subsidised: false, agencyFee: true, discount: 100 },
  { key: 'socialLease', name: '社宅包租', taxRule: 'social', payer: 'company', lease: true, preferential: true, subsidised: true, agencyFee: false, discount: 80 },
  { key: 'socialManage', name: '社宅代管', taxRule: 'social', payer: 'person', lease: false, preferential: true, subsidised: true, agencyFee: false, discount: 90 },
];

const DEFAULTS = {
  rent: 26000,
  basis: 'contract',            // contract：各方案皆收 rent；market：rent × 各方案折扣
  discounts: Object.fromEntries(PLANS.map(p => [p.key, p.discount])),
  bracket: 0.20,
  plan: 'socialLease',
  nhiOn: true,
  payers: Object.fromEntries(PLANS.map(p => [p.key, p.payer])),
  payEvery: 1,                  // 每次給付幾個月租金
  nhiRate: 0.0211,
  nhiThreshold: 20000,
  vacancy: 1,                   // 年空置月份
  guarantee: 12,                // 社宅包租保證收租月份
  houseTax: 6000,               // 一般出租年房屋稅
  landTax: 1500,                // 一般出租年地價稅
  houseRatio: 50,               // 優惠身分房屋稅為一般的 %（待確認）
  landRatio: 20,                // 優惠身分地價稅為一般的 %（待確認）
  mgmt: 0,                      // 年度管理費（大樓）
  repairCost: 10000,            // 年度維修成本
  agencyRate: 10,               // 一般包租代管服務費 % 年租金
  repairSub: 10000,             // 修繕補助（年度）
  insureSub: 3500,              // 保險補助（年度）
  notarySub: 4500,              // 公證費補助（一次性，每份契約）
  oneTime: 0,
  otherYearly: 0,
};

// 非數字、負數、無限大一律變 0；max 為上限
const clean = (v, max = Infinity) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.min(n, max) : 0;
};

function normalize(input) {
  const s = { ...DEFAULTS, ...input };
  const out = { ...s };
  for (const k of ['rent', 'nhiThreshold', 'houseTax', 'landTax', 'mgmt', 'repairCost',
    'repairSub', 'insureSub', 'notarySub', 'oneTime', 'otherYearly']) out[k] = clean(s[k]);
  out.vacancy = Math.round(clean(s.vacancy, 12));
  out.guarantee = Math.round(clean(s.guarantee, 12));
  out.payEvery = Math.max(1, Math.round(clean(s.payEvery, 12)));
  out.bracket = clean(s.bracket, 1);
  out.nhiRate = clean(s.nhiRate, 1);
  out.houseRatio = clean(s.houseRatio, 100);
  out.landRatio = clean(s.landRatio, 100);
  out.agencyRate = clean(s.agencyRate, 100);
  out.discounts = Object.fromEntries(PLANS.map(p => [p.key, clean((s.discounts || {})[p.key] ?? p.discount, 100)]));
  out.payers = Object.fromEntries(PLANS.map(p => [p.key, (s.payers || {})[p.key] === 'company' ? 'company' : (s.payers || {})[p.key] === 'person' ? 'person' : p.payer]));
  out.basis = s.basis === 'market' ? 'market' : 'contract';
  out.nhiOn = s.nhiOn !== false && s.nhiOn !== 'false';
  return out;
}

// 二代健保：依每次給付金額計算，達門檻才扣，元以下四捨五入
function nhiPremium(months, monthlyRent, s) {
  const payments = [];
  for (let left = months; left > 0; left -= s.payEvery) payments.push(monthlyRent * Math.min(s.payEvery, left));
  const each = payments.map(amt => amt >= s.nhiThreshold ? Math.round(Math.min(amt, RULES.nhi.cap) * s.nhiRate) : 0);
  return { payments, each, total: each.reduce((a, b) => a + b, 0) };
}

function calcPlan(plan, input) {
  const s = normalize(input);
  const rule = RULES.tax[plan.taxRule];
  const rent = s.basis === 'market' ? Math.round(s.rent * s.discounts[plan.key] / 100) : s.rent;
  const months = plan.lease ? Math.max(12 - s.vacancy, s.guarantee) : 12 - s.vacancy;
  const income = rent * months;

  const exemptMonthly = rule.exempt(rent);
  const taxableMonthly = rule.taxable(rent);
  const expenseMonthly = rent - exemptMonthly - taxableMonthly;
  const taxableYear = taxableMonthly * months;
  const incomeTax = Math.round(taxableYear * s.bracket);

  const payer = s.payers[plan.key];
  const nhiApplies = s.nhiOn && payer === 'company';
  const nhi = nhiApplies ? nhiPremium(months, rent, s) : { payments: [], each: [], total: 0 };

  const houseTax = Math.round(s.houseTax * (plan.preferential ? s.houseRatio / 100 : 1));
  const landTax = Math.round(s.landTax * (plan.preferential ? s.landRatio / 100 : 1));
  const agencyFee = plan.agencyFee ? Math.round(income * s.agencyRate / 100) : 0;
  const costs = s.mgmt + s.repairCost + agencyFee + s.oneTime + s.otherYearly;
  const subsidyYearly = plan.subsidised ? s.repairSub + s.insureSub : 0;
  const subsidyOnce = plan.subsidised ? s.notarySub : 0;
  const subsidy = subsidyYearly + subsidyOnce;

  const taxes = incomeTax + nhi.total + houseTax + landTax;
  const net = income + subsidy - taxes - costs;
  return {
    plan, rule, rent, months, income,
    exemptMonthly, expenseMonthly, taxableMonthly, taxableYear, incomeTax,
    payer, nhiApplies, nhi, houseTax, landTax, agencyFee, costs,
    subsidyYearly, subsidyOnce, subsidy, taxes, net, monthlyNet: net / 12,
  };
}

const calcAll = input => PLANS.map(p => calcPlan(p, input));

// 四種稅務身分在同一月租下的稅務分配（區段為稅務概念，不是實際支出）
const taxSplit = rent => Object.entries(RULES.tax).map(([key, rule]) => {
  const R = clean(rent);
  const exempt = rule.exempt(R), taxable = rule.taxable(R);
  return { key, name: rule.name, rent: R, exempt, expense: R - exempt - taxable, taxable };
});

if (typeof module !== 'undefined') module.exports = { RULES, PLANS, DEFAULTS, normalize, nhiPremium, calcPlan, calcAll, taxSplit };
