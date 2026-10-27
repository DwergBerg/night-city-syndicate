function run(cfg) {
  const { crewInc2, crewSyn2, crewIncome2, crewPayout2, heatDecay2, heistSucc3, heistCD, heistHeat2, netheistBase3, netheistSucc3, netheistCD, gearCostMult, bribeMult, heistMult, netheistMult, gearIncMult2, crewBaseCost, taxPct2, taxAt2, mugCD2, gearBuyMult, opsBuyMult, crewBuyMult, opsCrewDiv, pickCD2, mugHeat2, pickHeat2, gearCrewDiv, bribeThresh, clickRate, pickDSucc2, mugDSucc2, robDSucc2, heistDSucc2, netheistDSucc2, gearSucMult2, labCostMult2, labMultBoost3, opsCostMult3, opsMultBoost3, opsCostInc2, labMultBoost, robCD2, robHeat2, netheistHeat, pickSucc3, robSucc4, heistBase3, mugBase5, pickBase5, robBase5, mugSucc4, crewSyn3, pickSucc4, mugSucc5, robSucc5, heistSucc4, netheistSucc4, pickDSucc3, mugDSucc3, robDSucc3, heistDSucc3, netheistDSucc3, pickHeat3, mugHeat3, robHeat3, heistHeat3, netheistHeat3, pickCD3, mugCD3, robCD3, heistCD3, netheistCD3, pickBase6, mugBase6, robBase6, heistBase4, netheistBase4, crewBaseCost2 } = cfg;
  const SIM = 60 * 500, DT = 0.25;
  const P = { crewBase: crewBaseCost2, crewInc: crewInc2, crewIncome: crewIncome2, heatDecay: heatDecay2, heatTaxAt: taxAt2, heatTaxPct: taxPct2, heatFailAt: 75, heatFailPct: 0.004, bribeBase: 30000 * bribeMult, bribeInc: 1.12, prestigeAt: 5e9, legendMult: 1.5 };
  const CRIMES = [
    { base: pickBase6, cd: pickCD3, succ: pickSucc4, crew: 0, dSucc: pickDSucc3, heat: pickHeat3 },
    { base: mugBase6, cd: mugCD3, succ: mugSucc5, crew: 3, dSucc: mugDSucc3, heat: mugHeat3 },
    { base: robBase6, cd: robCD3, succ: robSucc5, crew: 10, dSucc: robDSucc3, heat: robHeat3 },
    { base: heistBase4 * heistMult, cd: heistCD3, succ: heistSucc4, crew: 30, dSucc: heistDSucc3, heat: heistHeat3 },
    { base: netheistBase4 * netheistMult, cd: netheistCD3, succ: netheistSucc4, crew: 80, dSucc: netheistDSucc3, heat: netheistHeat3 },
  ];
  const GEAR = [
    { cost: 800 * gearCostMult, inc: 0.15 * gearIncMult2, succ: 0.03 * gearSucMult2 }, { cost: 6000 * gearCostMult, inc: 0.25 * gearIncMult2, succ: 0.05 * gearSucMult2 },
    { cost: 45000 * gearCostMult, inc: 0.4 * gearIncMult2, succ: 0.07 * gearSucMult2 }, { cost: 350000 * gearCostMult, inc: 0.6 * gearIncMult2, succ: 0.08 * gearSucMult2 },
    { cost: 2.5e6 * gearCostMult, inc: 0.9 * gearIncMult2, succ: 0.1 * gearSucMult2 }, { cost: 2e7 * gearCostMult, inc: 1.5 * gearIncMult2, succ: 0.12 * gearSucMult2 },
  ];
  const GEAR_INC = 1.25;
  const OPS = [
    { cost: 30000 * opsCostMult3, mult: 2.0 + opsMultBoost3, inc: 1.8 * opsCostInc2, crew: 5 / opsCrewDiv }, { cost: 400000 * opsCostMult3, mult: 2.2 + opsMultBoost3, inc: 1.9 * opsCostInc2, crew: 15 / opsCrewDiv },
    { cost: 5e6 * opsCostMult3, mult: 3.0 + opsMultBoost3, inc: 2.0 * opsCostInc2, crew: 30 / opsCrewDiv }, { cost: 60e6 * opsCostMult3, mult: 3.5 + opsMultBoost3, inc: 2.1 * opsCostInc2, crew: 50 / opsCrewDiv },
  ];
  const LABS = [ { cost: 2e8 * labCostMult2, mult: 5 + labMultBoost + labMultBoost3, inc: 2.0, crew: 80 }, { cost: 3e9 * labCostMult2, mult: 8 + labMultBoost + labMultBoost3, inc: 2.2, crew: 120 } ];
  const TIERS = [0, 3, 10, 30, 80];
  let eddies = 0, crew = 0, heat = 0, bribes = 0;
  let gear = GEAR.map(() => 0), gearCost = GEAR.map(g => g.cost);
  let ops = OPS.map(() => 0), opCost = OPS.map(o => o.cost);
  let labs = LABS.map(() => 0), labCost = LABS.map(l => l.cost);
  let crewCost = P.crewBase, legend = 1;
  const cd = CRIMES.map(() => 0);
  const gInc = () => GEAR.reduce((s, g, i) => s + gear[i] * g.inc, 0);
  const gSuc = () => GEAR.reduce((s, g, i) => s + gear[i] * g.succ, 0);
  let m = () => { let x = 1 + gInc(); for (let i = 0; i < 4; i++) for (let k = 0; k < ops[i]; k++) x *= OPS[i].mult; for (let i = 0; i < 2; i++) for (let k = 0; k < labs[i]; k++) x *= LABS[i].mult; return x * legend; };
  let ips = () => crew * P.crewIncome * (1 + crew * crewSyn3) * m();
  const tax = () => heat > P.heatTaxAt ? Math.min(0.9, (heat - P.heatTaxAt) * P.heatTaxPct) : 0;
  let sc = i => { let s = CRIMES[i].succ + crew * CRIMES[i].dSucc + gSuc(); if (heat > P.heatFailAt) s -= (heat - P.heatFailAt) * P.heatFailPct; return Math.min(0.97, Math.max(0.05, s)); };
  let po = i => CRIMES[i].base * (1 + crew * crewPayout2 + gInc()) * (1 - tax());
  let nw = () => eddies + crew * crewCost * 0.3 + gear.reduce((s, g, i) => s + gear[i] * gearCost[i] * 0.5, 0) + ops.reduce((s, o, i) => s + o * opCost[i] * 0.5, 0) + labs.reduce((s, l, i) => s + l * labCost[i] * 0.5, 0);
  let tier = () => { for (let t = 4; t >= 0; t--) if (crew >= TIERS[t]) return t; return 0; };
  let t = 0, lastTier = -1, acc = 0; const tt = [];
  while (t < SIM) {
    t += DT;
    heat = Math.max(0, heat - P.heatDecay * DT);
    for (let i = 0; i < cd.length; i++) cd[i] = Math.max(0, cd[i] - DT);
    acc += clickRate * DT;
    if (acc >= 1) { acc -= 1; let b = -1; for (let i = 4; i >= 0; i--) if (CRIMES[i].crew <= crew && cd[i] <= 0 && (b === -1 || po(i) / CRIMES[i].cd > po(b) / CRIMES[b].cd)) b = i;
      if (b >= 0) { cd[b] = CRIMES[b].cd; if (Math.random() < sc(b)) { eddies += po(b); heat = Math.min(100, heat + CRIMES[b].heat); } else heat = Math.min(100, heat + CRIMES[b].heat * 0.5); } }
    if (eddies > crewCost * crewBuyMult && eddies > ips() * 5) { eddies -= crewCost; crew++; crewCost *= crewInc2; }
    for (let i = 0; i < 6; i++) if (!gear[i] && eddies > gearCost[i] * gearBuyMult && crew >= i * 5 / gearCrewDiv) { eddies -= gearCost[i]; gear[i] = 1; gearCost[i] *= GEAR_INC; }
    for (let i = 0; i < 4; i++) if (!ops[i] && eddies > opCost[i] * opsBuyMult && crew >= OPS[i].crew) { eddies -= opCost[i]; ops[i] = 1; opCost[i] *= OPS[i].inc; }
    for (let i = 0; i < 2; i++) if (!labs[i] && eddies > labCost[i] && crew >= LABS[i].crew) { eddies -= labCost[i]; labs[i] = 1; labCost[i] *= LABS[i].inc; }
    if (heat > bribeThresh && eddies > P.bribeBase * Math.pow(P.bribeInc, bribes) * 1.5) { eddies -= P.bribeBase * Math.pow(P.bribeInc, bribes); bribes++; heat = 0; }
    eddies += ips() * DT;
    if (tier() > lastTier) { lastTier = tier(); tt[lastTier] = t / 60; }
    if (nw() > P.prestigeAt) { legend *= P.legendMult; eddies = 0; crew = 0; heat = 0; bribes = 0; crewCost = P.crewBase; gear = GEAR.map(() => 0); gearCost = GEAR.map(g => g.cost); ops = OPS.map(() => 0); opCost = OPS.map(o => o.cost); labs = LABS.map(() => 0); labCost = LABS.map(l => l.cost); lastTier = -1; }
  }
  return tt;
}
const base = {
  crewBaseCost2: 700, crewInc2: 1.21, crewSyn3: 0.03, crewIncome2: 2.8, crewPayout2: 0.06,
  heatDecay2: 0.08, taxPct2: 0.002, taxAt2: 20, bribeMult: 1, bribeThresh: 70,
  clickRate: 1.2, gearBuyMult: 1, opsBuyMult: 1, crewBuyMult: 1.5, opsCrewDiv: 1, gearCrewDiv: 1,
  pickBase6: 40, pickCD3: 2, pickSucc4: 0.95, pickDSucc3: 0.012, pickHeat3: 1,
  mugBase6: 300, mugCD3: 5, mugSucc5: 0.87, mugDSucc3: 0.008, mugHeat3: 3,
  robBase6: 1800, robCD3: 12, robSucc5: 0.75, robDSucc3: 0.006, robHeat3: 8,
  heistBase4: 70000, heistCD3: 28, heistSucc4: 0.50, heistDSucc3: 0.004, heistHeat3: 18,
  netheistBase4: 150000, netheistCD3: 60, netheistSucc4: 0.55, netheistDSucc3: 0.003, netheistHeat3: 40,
  gearCostMult: 1, gearIncMult2: 1, gearSucMult2: 0.3,
  opsCostMult3: 1, opsMultBoost3: 0, opsCostInc2: 1,
  labCostMult2: 1, labMultBoost3: 0, labMultBoost: 0,
  heistMult: 1, netheistMult: 1,
};
const configs = [
  ['base', {}],
  ['ci 2.5', { crewIncome2: 2.5 }],
  ['ci 2.5 + crewInc 1.22', { crewIncome2: 2.5, crewInc2: 1.22 }],
  ['ci 2.5 + crewInc 1.215', { crewIncome2: 2.5, crewInc2: 1.215 }],
  ['ci 2.5 + crewInc 1.215 + mug 280', { crewIncome2: 2.5, crewInc2: 1.215, mugBase6: 280 }],
  ['ci 2.5 + crewInc 1.215 + mug 280 + pick 35', { crewIncome2: 2.5, crewInc2: 1.215, mugBase6: 280, pickBase6: 35 }],
  ['ci 2.5 + crewInc 1.215 + mug 280 + pick 35 + rob 1700', { crewIncome2: 2.5, crewInc2: 1.215, mugBase6: 280, pickBase6: 35, robBase6: 1700 }],
  ['ci 2.5 + crewInc 1.215 + mug 280 + pick 35 + rob 1700 + heist 65k', { crewIncome2: 2.5, crewInc2: 1.215, mugBase6: 280, pickBase6: 35, robBase6: 1700, heistBase4: 65000 }],
  ['ci 2.5 + crewInc 1.215 + mug 280 + pick 35 + rob 1700 + heist 65k + netheist 130k', { crewIncome2: 2.5, crewInc2: 1.215, mugBase6: 280, pickBase6: 35, robBase6: 1700, heistBase4: 65000, netheistBase4: 130000 }],
  ['ci 2.5 + crewInc 1.215 + mug 280 + pick 35 + rob 1700 + heist 65k + netheist 130k + lab x0.6 mult+2', { crewIncome2: 2.5, crewInc2: 1.215, mugBase6: 280, pickBase6: 35, robBase6: 1700, heistBase4: 65000, netheistBase4: 130000, labCostMult2: 0.6, labMultBoost3: 2 }],
  ['ci 2.5 + crewInc 1.215 + mug 280 + pick 35 + rob 1700 + heist 65k + netheist 130k + lab x0.6 mult+2 + ops x0.7 mult+0.3', { crewIncome2: 2.5, crewInc2: 1.215, mugBase6: 280, pickBase6: 35, robBase6: 1700, heistBase4: 65000, netheistBase4: 130000, labCostMult2: 0.6, labMultBoost3: 2, opsCostMult3: 0.7, opsMultBoost3: 0.3 }],
];
for (const [label, over] of configs) {
  const cfg = { ...base, ...over };
  const r = [];
  for (let k = 0; k < 3; k++) r.push(run(cfg));
  const avg = [1,2,3,4].map(i => { const v = r.map(x => x[i]).filter(Boolean); return v.length ? (v.reduce((a,b)=>a+b,0)/v.length).toFixed(1) : 'never'; });
  console.log(`${label} -> T2:${avg[0]}m T3:${avg[1]}m T4:${avg[2]}m T5:${avg[3]}m`);
}
