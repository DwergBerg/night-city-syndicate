// Drive the REAL game code (extracted.js) as an engaged player, measure tier times.
var fs=require('fs');
var src=fs.readFileSync(require('path').join(__dirname,'..','tests','extracted.js'),'utf8');
function makeCtx(){var g={addColorStop:function(){}};return new Proxy({},{get:function(t,p){if(p==='canvas')return{width:800,height:600};if(p==='createLinearGradient'||p==='createRadialGradient')return function(){return g;};return function(){};},set:function(){return true;}});}
function makeEl(id){var el={id:id,style:{},children:[],classList:{add:function(){},remove:function(){},toggle:function(){}},_text:'',innerHTML:'',appendChild:function(c){this.children.push(c);return c;},addEventListener:function(){},querySelectorAll:function(){return [];},getBoundingClientRect:function(){return{left:100,top:100,width:50,height:20};},getContext:function(){return makeCtx();},setAttribute:function(){},getAttribute:function(){return null;},parentNode:null};Object.defineProperty(el,'textContent',{get:function(){return this._text;},set:function(v){this._text=String(v);}});return el;}
var els={};function getEl(id){if(!els[id])els[id]=makeEl(id);return els[id];}
var store={};var localStorage={getItem:function(k){return store[k]||null;},setItem:function(k,v){store[k]=String(v);},removeItem:function(k){delete store[k];}};
var document={getElementById:getEl,createElement:function(t){return makeEl(t);},querySelectorAll:function(){return[];},body:makeEl('body')};
var window={innerWidth:1280,innerHeight:800,devicePixelRatio:1,AudioContext:function(){throw 0;},addEventListener:function(){},confirm:function(){return true;},localStorage:localStorage};
var sandbox={document:document,window:window,localStorage:localStorage,requestAnimationFrame:function(){return 0;},performance:{now:function(){return Date.now();}},navigator:{},location:{reload:function(){}},setTimeout:setTimeout,clearTimeout:clearTimeout,Math:Math,JSON:JSON,Date:Date,console:console,Array:Array,Object:Object,String:String,Number:Number,Boolean:Boolean,RegExp:RegExp,Error:Error,parseInt:parseInt,parseFloat:parseFloat,isNaN:isNaN,isFinite:isFinite};
sandbox.window.window=window;
var vm=require('vm');vm.createContext(sandbox);
vm.runInContext(src,sandbox,{timeout:10000});
var G=window.__game;

function runOnce(){
  var s=G.state();
  // reset to fresh
  var fresh={eddies:100,crew:0,crewCost:G.C.crewBase,heat:0,bribes:0,cds:[0,0,0,0,0],gear:[0,0,0,0,0,0],gearCost:G.GEAR.map(function(g){return g.cost;}),ops:[0,0,0,0],opCost:G.OPS.map(function(o){return o.cost;}),labs:[0,0],labCost:G.LABS.map(function(l){return l.cost;}),members:[],legend:1,prestiges:0,crimesDone:0,crimesWon:0,totalEarned:0,playTime:0,seed:(Math.random()*1e9)|0,lastTier:0,lastSave:Date.now(),sound:false};
  for(var k in fresh) s[k]=fresh[k];
  var DT=0.25, t=0, acc=0;
  var t2=0,t3=0,t4=0,t5=0;
  var SIM=60*90; // 90 min horizon
  while(t<SIM){
    t+=DT;
    G.tick(DT);
    // engaged player: click best available crime ~1.2/s
    acc+=1.2*DT;
    while(acc>=1){ acc-=1;
      var best=-1;
      for(var i=4;i>=0;i--){
        var c=G.CRIMES[i];
        if(s.crew>=c.req && s.cds[i]<=0){
          if(best===-1||G.payout(i)/c.cd>G.payout(best)/G.CRIMES[best].cd) best=i;
        }
      }
      if(best>=0) G.commit(best,400,400);
    }
    // buy crew at 1.5x cost
    if(s.eddies>s.crewCost*1.5 && s.eddies>G.ips()*5) G.hire();
    // buy gear when affordable
    for(var gi=0;gi<6;gi++) if(s.eddies>s.gearCost[gi]) G.buyGear(gi);
    // buy ops when affordable and unlocked
    for(var oi=0;oi<4;oi++) if(!s.ops[oi]&&s.crew>=G.OPS[oi].req&&s.eddies>s.opCost[oi]) G.buyOps(oi);
    for(var li=0;li<2;li++) if(!s.labs[li]&&s.crew>=G.LABS[li].req&&s.eddies>s.labCost[li]) G.buyLabs(li);
    // bribe when hot
    if(s.heat>70 && s.eddies>30000*Math.pow(1.12,s.bribes)*1.5) G.bribe();
    if(s.crew===3&&!t2)t2=t/60;
    if(s.crew===10&&!t3)t3=t/60;
    if(s.crew===30&&!t4)t4=t/60;
    if(s.crew===80&&!t5)t5=t/60;
    if(G.netWorth()>G.C.prestigeAt){
      // don't prestige in this check — just note it
    }
  }
  return {t2:t2,t3:t3,t4:t4,t5:t5};
}
var runs=[];
for(var r=0;r<3;r++) runs.push(runOnce());
runs.forEach(function(x,i){ console.log('run '+(i+1)+': T2='+(x.t2?x.t2.toFixed(1):'--')+'m T3='+(x.t3?x.t3.toFixed(1):'--')+'m T4='+(x.t4?x.t4.toFixed(1):'--')+'m T5='+(x.t5?x.t5.toFixed(1):'--')+'m'); });
var avg=function(k){var v=runs.map(function(x){return x[k];}).filter(Boolean);return v.length?(v.reduce(function(a,b){return a+b;},0)/v.length).toFixed(1):'never';};
console.log('AVG: T2='+avg('t2')+'m T3='+avg('t3')+'m T4(Syndicate)='+avg('t4')+'m T5(Cartel)='+avg('t5')+'m');
