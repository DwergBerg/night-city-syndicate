// Final tuning: crewBase/crewInc to hit T4 ~38-42m
function run(cfg){
  let ed=100, crew=0, gear=[0,0,0,0,0,0], ops=[0,0,0,0], labs=[0,0], bribes=0, heat=0, t=0;
  let crewCost=cfg.crewBase, t2=0,t3=0,t4=0,t5=0; const DT=0.25;
  let gInc=()=>cfg.GEAR.reduce((s,g,i)=>s+g.inc*gear[i],0);
  let gSucc=()=>cfg.GEAR.reduce((s,g,i)=>s+g.succ*gear[i]*0.3,0);
  let incMult=()=>(1+gInc())*cfg.OPS.reduce((m,o,i)=>m*(ops[i]?o.mult:1),1)*cfg.LABS.reduce((m,o,i)=>m*(labs[i]?o.mult:1),1)*cfg.legend;
  let ips=()=>crew*cfg.crewIncome*(1+crew*cfg.crewSyn)*incMult();
  let tax=()=>Math.min(0.9,Math.max(0,(heat-cfg.heatTaxAt)*cfg.heatTaxPct));
  while(t<500*60){
    ed+=ips()*DT; heat=Math.max(0,heat-cfg.heatDecay*DT); t+=DT;
    // buy crew at 1.5x cost
    while(ed>=crewCost*1.5 && crew<200){ ed-=crewCost; crew++; crewCost*=cfg.crewInc;
      if(crew===3&&!t2)t2=t; if(crew===10&&!t3)t3=t; if(crew===30&&!t4)t4=t; if(crew===80&&!t5)t5=t; }
    for(let i=0;i<6;i++){ let c=cfg.GEAR[i].cost*Math.pow(1.25,gear[i]); if(ed>=c){ed-=c;gear[i]++;} }
    for(let i=0;i<4;i++){ if(crew>=cfg.OPS[i].req){ let c=cfg.OPS[i].cost*Math.pow(cfg.OPS[i].inc,ops[i]); if(!ops[i]&&ed>=c){ed-=c;ops[i]=1;} } }
    for(let i=0;i<2;i++){ if(crew>=cfg.LABS[i].req){ let c=cfg.LABS[i].cost*Math.pow(cfg.LABS[i].inc,labs[i]); if(!labs[i]&&ed>=c){ed-=c;labs[i]=1;} } }
    if(heat>cfg.bribeThresh && ed>=cfg.bribeBase*Math.pow(cfg.bribeInc,bribes)){ ed-=cfg.bribeBase*Math.pow(cfg.bribeInc,bribes); bribes++; heat=0; }
    if(Math.random()<1.2*DT){
      let unlocked=cfg.CRIMES.filter(c=>!c.req||crew>=c.req);
      let c=unlocked[Math.floor(Math.random()*unlocked.length)];
      let succ=Math.min(0.97,Math.max(0.05,c.succ+crew*c.dSucc+gSucc()-Math.max(0,(heat-75)*0.004)));
      if(Math.random()<succ){ ed+=c.base*(1+crew*cfg.crewPayout+gInc())*(1-tax()); heat+=c.heat; }
      else heat+=c.heat/2;
    }
  }
  return {t2,t3,t4,t5};
}
const base={crewBase:700,crewInc:1.21,crewSyn:0.03,crewIncome:2.8,crewPayout:0.06,legend:1,
  heatDecay:0.08,heatTaxAt:20,heatTaxPct:0.002,bribeThresh:70,bribeBase:30000,bribeInc:1.12,
  CRIMES:[{base:40,succ:0.95,dSucc:0.012,heat:1},{base:300,succ:0.87,dSucc:0.008,heat:3},{base:1800,succ:0.75,dSucc:0.006,heat:8,req:10},{base:70000,succ:0.5,dSucc:0.004,heat:18,req:30},{base:150000,succ:0.55,dSucc:0.003,heat:40,req:80}],
  GEAR:[{cost:800,inc:0.15,succ:0.03},{cost:6000,inc:0.25,succ:0.05},{cost:45000,inc:0.4,succ:0.07},{cost:350000,inc:0.6,succ:0.08},{cost:2500000,inc:0.9,succ:0.1},{cost:20000000,inc:1.5,succ:0.12}],
  OPS:[{cost:30000,mult:2,inc:1.8,req:5},{cost:400000,mult:2.2,inc:1.9,req:15},{cost:5000000,mult:3,inc:2,req:30},{cost:60000000,mult:3.5,inc:2.1,req:50}],
  LABS:[{cost:200000000,mult:5,inc:2,req:80},{cost:3000000000,mult:8,inc:2.2,req:120}]};
function avg(f){let a={t2:0,t3:0,t4:0,t5:0};for(let i=0;i<3;i++){const r=f();a.t2+=r.t2;a.t3+=r.t3;a.t4+=r.t4;a.t5+=r.t5;}for(const k in a)a[k]/=3;return a;}
for(const [name,mod] of [
  ['base(700/1.21)',{}],
  ['crewBase 650 inc 1.205',{crewBase:650,crewInc:1.205}],
  ['crewBase 600 inc 1.20',{crewBase:600,crewInc:1.20}],
  ['650/1.205 + ci 2.6',{crewBase:650,crewInc:1.205,crewIncome:2.6}],
]){
  const cfg=Object.assign({},base,mod);
  const t=avg(()=>run(cfg));
  console.log(name,'-> T2:'+(t.t2?t.t2.toFixed(1):'--')+'m T3:'+(t.t3?t.t3.toFixed(1):'--')+'m T4:'+(t.t4?t.t4.toFixed(1):'--')+'m T5:'+(t.t5?t.t5.toFixed(1):'--')+'m');
}
