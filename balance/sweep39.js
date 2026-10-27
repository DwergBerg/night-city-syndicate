// Sweep gear repeatable with varied cost growth; ops/labs one-time (locked)
function run(cfg) {
  const { crewBase, crewInc, crewSyn, crewIncome, crewPayout, heatDecay, taxPct, taxAt, bribeThresh,
          clickRate, crewBuyMult, gearBuyMult, opsBuyMult, gearInc } = cfg;
  const SIM = 60 * 500, DT = 0.25;
  const CRIMES = [
    { base: 40, cd: 2, succ: 0.95, crew: 0, dSucc: 0.012, heat: 1 },
    { base: 300, cd: 5, succ: 0.87, crew: 3, dSucc: 0.008, heat: 3 },
    { base: 1800, cd: 12, succ: 0.75, crew: 10, dSucc: 0.006, heat: 8 },
    { base: 70000, cd: 28, succ: 0.5, crew: 30, dSucc: 0.004, heat: 18 },
    { base: 150000, cd: 60, succ: 0.55, crew: 80, dSucc: 0.003, heat: 40 },
  ];
  const GEAR = [
    { cost: 800, inc: 0.15, succ: 0.03 }, { cost: 6000, inc: 0.25, succ: 0.05 },
    { cost: 45000, inc: 0.4, succ: 0.07 }, { cost: 350000, inc: 0.6, succ: 0.08 },
    { cost: 2.5e6, inc: 0.9, succ: 0.1 }, { cost: 2e7, inc: 1.5, succ: 0.12 },
  ];
  const GEAR_SUC = 0.3;
  const OPS = [
    { cost: 30000, mult: 2.0, inc: 1.8, crew: 5 }, { cost: 400000, mult: 2.2, inc: 1.9, crew: 15 },
    { cost: 5e6, mult: 3.0, inc: 2.0, crew: 30 }, { cost: 60e6, mult: 3.5, inc: 2.1, crew: 50 },
  ];
  const LABS = [ { cost: 2e8, mult: 5, inc: 2.0, crew: 80 }, { cost: 3e9, mult: 8, inc: 2.2, crew: 120 } ];
  const TIERS = [0, 3, 10, 30, 80];
  let eddies = 0, crew = 0, heat = 0, bribes = 0;
  let gear = GEAR.map(() => 0), gearCost = GEAR.map(g => g.cost);
  let ops = OPS.map(() => 0), opCost = OPS.map(o => o.cost);
  let labs = LABS.map(() => 0), labCost = LABS.map(l => l.cost);
  let crewCost = crewBase, legend = 1;
  const cd = CRIMES.map(() => 0);
  const gInc = () => GEAR.reduce((s, g, i) => s + gear[i] * g.inc, 0);
  const gSuc = () => GEAR.reduce((s, g, i) => s + gear[i] * g.succ * GEAR_SUC, 0);
  let m = () => { let x = 1 + gInc(); for (let i = 0; i < 4; i++) for (let k = 0; k < ops[i]; k++) x *= OPS[i].mult; for (let i = 0; i < 2; i++) for (let k = 0; k < labs[i]; k++) x *= LABS[i].mult; return x * legend; };
  let ips = () => crew * crewIncome * (1 + crew * crewSyn) * m();
  const tax = () => heat > taxAt ? Math.min(0.9, (heat - taxAt) * taxPct) : 0;
  let sc = i => { let s = CRIMES[i].succ + crew * CRIMES[i].dSucc + gSuc(); if (heat > 75) s -= (heat - 75) * 0.004; return Math.min(0.97, Math.max(0.05, s)); };
  let po = i => CRIMES[i].base * (1 + crew * crewPayout + gInc()) * (1 - tax());
  let tier = () => { for (let t = 4; t >= 0; t--) if (crew >= TIERS[t]) return t; return 0; };
  let t = 0, lastTier = -1, acc = 0; const tt = [];
  while (t < SIM) {
    t += DT;
    heat = Math.max(0, heat - heatDecay * DT);
    for (let i = 0; i < cd.length; i++) cd[i] = Math.max(0, cd[i] - DT);
    acc += clickRate * DT;
    if (acc >= 1) { acc -= 1; let b = -1; for (let i = 4; i >= 0; i--) if (CRIMES[i].crew <= crew && cd[i] <= 0 && (b === -1 || po(i) / CRIMES[i].cd > po(b) / CRIMES[b].cd)) b = i;
      if (b >= 0) { cd[b] = CRIMES[b].cd; if (Math.random() < sc(b)) { eddies += po(b); heat = Math.min(100, heat + CRIMES[b].heat); } else heat = Math.min(100, heat + CRIMES[b].heat * 0.5); } }
    if (eddies > crewCost * crewBuyMult && eddies > ips() * 5) { eddies -= crewCost; crew++; crewCost *= crewInc; }
    for (let i = 0; i < 6; i++) if (eddies > gearCost[i] * gearBuyMult) { eddies -= gearCost[i]; gear[i]++; gearCost[i] *= gearInc; }
    for (let i = 0; i < 4; i++) if (!ops[i] && crew >= OPS[i].crew && eddies > opCost[i] * opsBuyMult) { eddies -= opCost[i]; ops[i] = 1; opCost[i] *= OPS[i].inc; }
    for (let i = 0; i < 2; i++) if (!labs[i] && crew >= LABS[i].crew && eddies > labCost[i]) { eddies -= labCost[i]; labs[i] = 1; labCost[i] *= LABS[i].inc; }
    if (heat > bribeThresh && eddies > 30000 * Math.pow(1.12, bribes) * 1.5) { eddies -= 30000 * Math.pow(1.12, bribes); bribes++; heat = 0; }
    eddies += ips() * DT;
    if (tier() > lastTier) { lastTier = tier(); tt[lastTier] = t / 60; }
    if (eddies > 5e9) { legend *= 1.5; eddies = 0; crew = 0; heat = 0; bribes = 0; crewCost = crewBase; gear = GEAR.map(() => 0); gearCost = GEAR.map(g => g.cost); ops = OPS.map(() => 0); opCost = OPS.map(o => o.cost); labs = LABS.map(() => 0); labCost = LABS.map(l => l.cost); lastTier = -1; }
  }
  return tt;
}
const base = { crewBase: 700, crewInc: 1.21, crewSyn: 0.03, crewIncome: 2.8, crewPayout: 0.06,
  heatDecay: 0.08, taxPct: 0.002, taxAt: 20, bribeThresh: 70,
  clickRate: 1.2, crewBuyMult: 1.5, gearBuyMult: 1, opsBuyMult: 1, gearInc: 1.25 };
const configs = [
  ['gear x1.25 (target 30-45m)', { gearInc: 1.25 }],
  ['gear x1.30', { gearInc: 1.30 }],
  ['gear x1.35', { gearInc: 1.35 }],
  ['gear x1.30 + crewInc 1.215', { gearInc: 1.30, crewInc: 1.215 }],
  ['gear x1.35 + crewInc 1.215', { gearInc: 1.35, crewInc: 1.215 }],
  ['gear x1.40', { gearInc: 1.40 }],
];
for (const [label, over] of configs) {
  const cfg = { ...base, ...over };
  const r = [];
  for (let k = 0; k < 3; k++) r.push(run(cfg));
  const avg = [1,2,3,4].map(i => { const v = r.map(x => x[i]).filter(Boolean); return v.length ? (v.reduce((a,b)=>a+b,0)/v.length).toFixed(1) : 'never'; });
  console.log(`${label} -> T2:${avg[0]}m T3:${avg[1]}m T4:${avg[2]}m T5:${avg[3]}m`);
}
