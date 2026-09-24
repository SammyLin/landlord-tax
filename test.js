const assert = require('assert');
const { TYPES, calcAll } = require('./calc.js');

// 長信物管公開範例：月租 20,000、綜所稅率 20% 的年度綜所稅
// 一般自租 27,360／公益出租人 6,840／包租代管 4,800
const rows = calcAll({
  rent: 20000, bracket: 0.20, houseValue: 0, landValue: 0,
  discount: 1, agentMonths: 0, mgmtRate: 0, subsidy: 0,
});
const tax = k => Math.round(rows.find(r => r.t.key === k).incomeTax);
assert.strictEqual(tax('self'), 27360);
assert.strictEqual(tax('charity'), 6840);
assert.strictEqual(tax('social'), 4800);
assert.strictEqual(tax('agency'), 27360);

// 月租低於免稅額時課稅所得為 0，不得為負
const low = calcAll({ rent: 12000, bracket: 0.4, houseValue: 0, landValue: 0,
  discount: 1, agentMonths: 0, mgmtRate: 0, subsidy: 0 });
assert.strictEqual(low.find(r => r.t.key === 'charity').taxable, 0);

// 淨收益：成本扣除、補助加回
const full = calcAll({ rent: 30000, bracket: 0.3, houseValue: 1000000, landValue: 500000,
  discount: 0.8, agentMonths: 1, mgmtRate: 0.1, subsidy: 18000 });
const social = full.find(r => r.t.key === 'social');
assert.strictEqual(social.annual, 288000);            // 30000 × 80% × 12
assert.strictEqual(social.houseTax, 12000);           // 1,000,000 × 1.2%
assert.strictEqual(social.landTax, 1000);             // 500,000 × 0.2%
assert.strictEqual(social.agentCost, 0);              // 業者負擔招租
assert.strictEqual(social.support, 18000);
const agency = full.find(r => r.t.key === 'agency');
assert.strictEqual(agency.mgmtCost, 36000);           // 360,000 × 10%
assert.strictEqual(agency.agentCost, 30000);

console.log('ok');
