const assert = require('assert');
const { calcAll, taxSplit, nhiPremium, normalize } = require('./public/calc.js');

const split = rent => Object.fromEntries(taxSplit(rent).map(r => [r.key, Math.round(r.taxable)]));
const pick = (rows, k) => rows.find(r => r.plan.key === k);
const flat = { vacancy: 0, nhiOn: false, houseTax: 0, landTax: 0, repairCost: 0 };

// 測試 A：月租 30,000 每月應稅所得
assert.deepStrictEqual(split(30000), { self: 17100, charity: 8550, agency: 12280, social: 6000 });

// 測試 B：月租 26,000 每月應稅所得與 20% 年所得稅
assert.deepStrictEqual(split(26000), { self: 14820, charity: 6270, agency: 10000, social: 4400 });
const b = calcAll({ ...flat, rent: 26000, bracket: 0.2 });
assert.strictEqual(pick(b, 'self').incomeTax, 35568);
assert.strictEqual(pick(b, 'charity').incomeTax, 15048);
assert.strictEqual(pick(b, 'agency').incomeTax, 24000);
assert.strictEqual(pick(b, 'socialLease').incomeTax, 10560);
assert.strictEqual(pick(b, 'socialManage').incomeTax, 10560);

// 測試 C：公司每月給付 26,000，補充保費 549 × 12
const c = calcAll({ ...flat, rent: 26000, nhiOn: true });
assert.strictEqual(pick(c, 'socialLease').nhi.each[0], 549);
assert.strictEqual(pick(c, 'socialLease').nhi.total, 6588);
assert.strictEqual(pick(c, 'self').nhi.total, 0);            // 個人房客不扣
// 給付者改公司，自行出租也要扣
const c2 = calcAll({ ...flat, rent: 26000, nhiOn: true, payers: { self: 'company' } });
assert.strictEqual(pick(c2, 'self').nhi.total, 6588);

// 測試 D：市場租金折扣
const d = calcAll({ ...flat, rent: 26000, basis: 'market' });
assert.strictEqual(pick(d, 'self').rent, 26000);
assert.strictEqual(pick(d, 'socialManage').rent, 23400);
assert.strictEqual(pick(d, 'socialLease').rent, 20800);
assert.strictEqual(pick(d, 'socialLease').taxableMonthly, 2320);   // (20800 − 15000) × 40%
const dn = calcAll({ ...flat, rent: 26000, basis: 'market', nhiOn: true });
assert.strictEqual(pick(dn, 'socialLease').nhi.each[0], 439);     // ROUND(20800 × 2.11%)

// 邊界：門檻與級距交界
assert.deepStrictEqual(split(6000), { self: 3420, charity: 0, agency: 0, social: 0 });
assert.deepStrictEqual(split(15000), { self: 8550, charity: 0, agency: 4230, social: 0 });
assert.strictEqual(split(20000).agency, 6580);
assert.strictEqual(+taxSplit(20001).find(r => r.key === 'agency').taxable.toFixed(2), 6580.57);
for (const r of taxSplit(20001)) assert.ok(Math.abs(r.exempt + r.expense + r.taxable - 20001) < 1e-9);

// 未達補充保費門檻：19,999 不扣；一次付兩個月 39,998 要扣
assert.strictEqual(nhiPremium(12, 19999, normalize({})).total, 0);
const two = nhiPremium(12, 19999, normalize({ payEvery: 2 }));
assert.strictEqual(two.payments.length, 6);
assert.strictEqual(two.each[0], Math.round(39998 * 0.0211));
// 11 個月、兩月一付：最後一次只付一個月
assert.deepStrictEqual(nhiPremium(11, 30000, normalize({ payEvery: 2 })).payments.at(-1), 30000);

// 租金 0、空置 12 個月：全部歸零，不出現 NaN
for (const rows of [calcAll({ rent: 0 }), calcAll({ rent: 30000, vacancy: 12, guarantee: 0 })]) {
  for (const r of rows) {
    assert.strictEqual(r.income, 0);
    assert.strictEqual(r.incomeTax, 0);
    assert.strictEqual(r.nhi.total, 0);
  }
}
// 社宅包租保證收租：空置不影響
assert.strictEqual(pick(calcAll({ rent: 30000, vacancy: 12 }), 'socialLease').months, 12);

// 非數字、負數輸入
for (const r of calcAll({ rent: 'abc', vacancy: -3, bracket: 'x', houseTax: -100 })) {
  assert.ok(Number.isFinite(r.net));
  assert.strictEqual(r.income, 0);
  assert.strictEqual(r.houseTax, 0);
}
assert.strictEqual(normalize({ vacancy: 99 }).vacancy, 12);

// 淨現金流：收入 + 補助 − 稅費 − 成本，不重複計算
const n = pick(calcAll({ rent: 30000, vacancy: 0, bracket: 0.3, nhiOn: true, houseTax: 6000, landTax: 1500,
  repairCost: 10000, mgmt: 0, repairSub: 10000, insureSub: 3500, notarySub: 4500 }), 'socialLease');
assert.strictEqual(n.houseTax, 3000);
assert.strictEqual(n.landTax, 300);
assert.strictEqual(n.subsidy, 18000);
assert.strictEqual(n.net, 360000 + 18000 - n.incomeTax - n.nhi.total - 3000 - 300 - 10000);
// 政府補助為 0
assert.strictEqual(pick(calcAll({ repairSub: 0, insureSub: 0, notarySub: 0 }), 'socialLease').subsidy, 0);

console.log('ok');
