// Final balance sim with tuned parameters, 10 hours, reports all tiers + prestige
const SIM_SECONDS = 60 * 90;
const DT = 0.25;
const P = { crewBase: 250, crewInc: 1.19, crewIncome: 2.4, heatDecay: 0.12, heatTaxAt: 40, heatTaxPct: 0.006, heatFailAt: 75, heatFailPct: 0.004, bribeBase: 30000, bribeInc: 1.12, prestigeAt: 5e9, legendMult: 1.5 };
const CRIMES = [
  { name: 'Pickpocket', base: 60,    cd: 2,  succ: 0.95, crew: 0,  dSucc: 0.012, heat: 1 },
  { name: 'Mugging',    base: 400,   cd: 5,  succ: 0.85, crew: 3,  dSucc: 0.008, heat: 3 },
  { name: 'Robbery',    base: 2500,  cd: 12, succ: 0.75, crew: 10, dSucc: 0.006, heat: 8 },
  { name: 'Heist',      base: 18000, cd: 28, succ: 0.60, crew: 30, dSucc: 0.004, heat: 18 },
  { name: 'NetHeist',   base: 150000, cd: 60, succ: 0.55, crew: 80, dSucc: 0.003, heat: 40 },
];
const GEAR = [
  { name: 'Rusty Pistol',       cost: 800,    inc: 0.15, succ: 0.03 },
  { name: 'Mono-wire Garrote',  cost: 6000,   inc: 0.25, succ: 0.05 },
  { name: 'Smart SMG',          cost: 45000,  inc: 0.4,  succ: 0.07 },
  { name: 'Militech Rifle',     cost: 350000, inc: 0.6,  succ: 0.08 },
  { name: 'Sandevistan Spine',  cost: 2.5e6,  inc: 0.9,  succ: 0.1 },
  { name: 'Militech Cyberdeck', cost: 2e7,    inc: 1.5,  succ: 0.12 },
];
const GEAR_INC = 1.25;
const CREW_HIRE = { base: 250, inc: 1.19, succ: 0.004 };
const OPS = [
  { name: 'Street Corner Rackets', cost: 30000,  mult: 2.0, inc: 1.8, crew: 5 },
  { name: 'Back-Alley Chop Shop',  cost: 400000, mult: 2.2, inc: 1.9, crew: 15 },
  { name: 'Numbers Laundry',       cost: 5e6,    mult: 3.0, inc: 2.0, crew: 30 },
  { name: 'Neon Diner Front',      cost: 60e6,   mult: 3.5, inc: 2.1, crew: 50 },
];
const LABS = [
  { name: 'Pop-Up Drug Lab',   cost: 2e8,   mult: 5, inc: 2.0, crew: 80 },
  { name: 'Synth-Drug Factory', cost: 3e9,   mult: 8, inc: 2.2, crew: 120 },
];
const TIERS = [
  { name: 'Solo Hustler', crew: 0 }, { name: 'Small Crew', crew: 3 },
  { name: 'Established Gang', crew: 10 }, { name: 'Syndicate', crew: 30 }, { name: 'Cartel', crew: 80 },
];
let eddies = 0, crew = 0, heat = 0, bribes = 0;
let gear = GEAR.map(() => 0), gearCost = GEAR.map(g => g.cost);
let ops = OPS.map(() => 0), opCost = OPS.map(o => o.cost);
let labs = LABS.map(() => 0), labCost = LABS.map(l => l.cost);
let crewCost = CREW_HIRE.base, legend = 1;
const cd = new Array(CRIMES.length).fill(0);
const gearInc = () => GEAR.reduce((s, g, i) => s + gear[i] * g.inc, 0);
const gearSucc = () => GEAR.reduce((s, g, i) => s + gear[i] * g.succ, 0);
function incomeMult() { let m = 1 + gearInc(); for (let i = 0; i < OPS.length; i++) for (let k = 0; k < ops[i]; k++) m *= OPS[i].mult; for (let i = 0; i < LABS.length; i++) for (let k = 0; k < labs[i]; k++) m *= LABS[i].mult; return m * legend; }
function incomePerSec() { return crew * P.crewIncome * (1 + crew * 0.025) * incomeMult(); }
const heatTax = () => heat > P.heatTaxAt ? Math.min(0.9, (heat - P.heatTaxAt) * P.heatTaxPct) : 0;
function succ(i) { const c = CRIMES[i]; let s = c.succ + crew * c.dSucc + gearSucc(); if (heat > P.heatFailAt) s -= (heat - P.heatFailAt) * P.heatFailPct; return Math.min(0.97, Math.max(0.05, s)); }
function payout(i) { return CRIMES[i].base * (1 + crew * 0.07 + gearInc()) * (1 - heatTax()); }
function netWorth() { return eddies + crew * crewCost * 0.3 + gear.reduce((s, g, i) => s + gear[i] * gearCost[i] * 0.5, 0) + ops.reduce((s, o, i) => s + o * opCost[i] * 0.5, 0) + labs.reduce((s, l, i) => s + l * labCost[i] * 0.5, 0); }
function tier() { for (let t = TIERS.length - 1; t >= 0; t--) if (crew >= TIERS[t].crew) return t; return 0; }
let t = 0, lastTier = -1, clickAcc = 0;
const tierTimes = [];
while (t < SIM_SECONDS) {
  t += DT;
  heat = Math.max(0, heat - P.heatDecay * DT);
  for (let i = 0; i < cd.length; i++) cd[i] = Math.max(0, cd[i] - DT);
  clickAcc += 1.2 * DT;
  if (clickAcc >= 1) {
    clickAcc -= 1;
    let best = -1;
    for (let i = CRIMES.length - 1; i >= 0; i--) if (CRIMES[i].crew <= crew && cd[i] <= 0 && (best === -1 || payout(i) / CRIMES[i].cd > payout(best) / CRIMES[best].cd)) best = i;
    if (best >= 0) {
      cd[best] = CRIMES[best].cd;
      if (Math.random() < succ(best)) { eddies += payout(best); heat = Math.min(100, heat + CRIMES[best].heat); }
      else heat = Math.min(100, heat + CRIMES[best].heat * 0.5);
    }
  }
  if (eddies > crewCost * 1.5 && eddies > incomePerSec() * 5) { eddies -= crewCost; crew++; crewCost *= CREW_HIRE.inc; }
  for (let i = 0; i < GEAR.length; i++) if (!gear[i] && eddies > gearCost[i] * 2.5 && crew >= i * 5) { eddies -= gearCost[i]; gear[i] = 1; gearCost[i] *= GEAR_INC; }
  for (let i = 0; i < OPS.length; i++) if (!ops[i] && eddies > opCost[i] && crew >= OPS[i].crew) { eddies -= opCost[i]; ops[i] = 1; opCost[i] *= OPS[i].inc; }
  for (let i = 0; i < LABS.length; i++) if (!labs[i] && eddies > labCost[i] && crew >= LABS[i].crew) { eddies -= labCost[i]; labs[i] = 1; labCost[i] *= LABS[i].inc; }
  if (heat > 70 && eddies > P.bribeBase * Math.pow(P.bribeInc, bribes) * 1.5) { eddies -= P.bribeBase * Math.pow(P.bribeInc, bribes); bribes++; heat = 0; }
  eddies += incomePerSec() * DT;
  if (tier() > lastTier) { lastTier = tier(); tierTimes[lastTier] = t; console.log(`[${(t/60).toFixed(1)}m] TIER ${lastTier+1} ${TIERS[lastTier].name} | nw=${netWorth().toExponential(1)} crew=${crew} ips=${incomePerSec().toExponential(1)}`); }
  if (netWorth() > P.prestigeAt) { legend *= P.legendMult; console.log(`[${(t/60).toFixed(1)}m] PRESTIGE legend=x${legend}`); eddies = 0; crew = 0; heat = 0; bribes = 0; crewCost = CREW_HIRE.base; gear = GEAR.map(() => 0); gearCost = GEAR.map(g => g.cost); ops = OPS.map(() => 0); opCost = OPS.map(o => o.cost); labs = LABS.map(() => 0); labCost = LABS.map(l => l.cost); lastTier = -1; }
}
console.log('tier minutes:', tierTimes.map(x => x ? (x/60).toFixed(1) : 'never').join(', '));
console.log('final:', { eddies: eddies.toExponential(1), crew, tier: TIERS[tier()].name, legend, ips: incomePerSec().toExponential(1) });
