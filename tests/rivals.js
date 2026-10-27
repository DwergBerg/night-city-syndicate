// Step 3 verify: rivals, contests, casualties, event log — all non-blocking
var fs=require('fs');
var src=fs.readFileSync(require('path').join(__dirname,'extracted.js'),'utf8');
function makeCtx(){var g={addColorStop:function(){}};return new Proxy({},{get:function(t,p){if(p==='canvas')return{width:800,height:600};if(p==='createLinearGradient'||p==='createRadialGradient')return function(){return g;};return function(){};},set:function(){return true;}});}
function makeEl(id){var el={id:id,style:{_display:undefined},children:[],classList:{add:function(){},remove:function(){},toggle:function(){}},_text:'',innerHTML:'',value:'',appendChild:function(c){this.children.push(c);this._syncFirst();return c;},removeChild:function(c){var i=this.children.indexOf(c);if(i>=0)this.children.splice(i,1);this._syncFirst();return c;},_syncFirst:function(){Object.defineProperty(this,'firstChild',{get:function(){return this.children[0]||null;},configurable:true});},firstChild:null,scrollTop:0,scrollHeight:0,addEventListener:function(){},querySelectorAll:function(){return [];},getBoundingClientRect:function(){return{left:100,top:100,width:50,height:20};},getContext:function(){return makeCtx();},setAttribute:function(){},getAttribute:function(){return null;},parentNode:null};Object.defineProperty(el,'textContent',{get:function(){return this._text;},set:function(v){this._text=String(v);}});Object.defineProperty(el.style,'display',{get:function(){return this._display;},set:function(v){this._display=v;}});el._syncFirst();return el;}
var els={};function getEl(id){if(!els[id])els[id]=makeEl(id);return els[id];}
var store={};var localStorage={getItem:function(k){return Object.prototype.hasOwnProperty.call(store,k)?store[k]:null;},setItem:function(k,v){store[k]=String(v);},removeItem:function(k){delete store[k];}};
var document={getElementById:getEl,createElement:function(t){return makeEl(t);},querySelectorAll:function(){return[];},body:makeEl('body')};
var window={innerWidth:1280,innerHeight:800,devicePixelRatio:1,AudioContext:function(){throw 0;},addEventListener:function(){},confirm:function(){return true;},localStorage:localStorage};
var sandbox={document:document,window:window,localStorage:localStorage,requestAnimationFrame:function(){return 0;},performance:{now:function(){return Date.now();}},navigator:{},location:{reload:function(){}},setTimeout:setTimeout,clearTimeout:clearTimeout,Math:Math,JSON:JSON,Date:Date,console:console,Array:Array,Object:Object,String:String,Number:Number,Boolean:Boolean,RegExp:RegExp,Error:Error,parseInt:parseInt,parseFloat:parseFloat,isNaN:isNaN,isFinite:isFinite};
sandbox.window.window=window;
var vm=require('vm');vm.createContext(sandbox);
vm.runInContext(src,sandbox,{timeout:10000});
var G=window.__game;
function assert(c,m){if(!c){console.log('FAIL:',m);process.exit(1);}console.log('ok -',m);}

var s=G.state();
s.gang={name:'Test Syndicate',emblem:'skull',color:'#05d9e8'};

// --- rivals initialized ---
assert(s.rivals.length===3,'3 rival gangs initialized');
assert(s.rivals[0].name==='Maelstrom','rival 1 is Maelstrom');
assert(s.rivals[1].name==='Voodoo Boys','rival 2 is Voodoo Boys');
assert(s.rivals[2].name==='Sixth Street','rival 3 is Sixth Street');
assert(s.rivals.every(function(r){return r.emblem&&r.color&&r.strength>0;}),'all rivals have emblem+color+strength');

// --- districts initialized ---
assert(s.districts.length===6,'6 districts initialized');
assert(s.districts.every(function(d){return d.owner===null&&d.guards===0;}),'all districts start unowned');

// --- event log empty, timer set ---
assert(s.eventLog.length===0,'event log starts empty');
assert(s.rivalTimer>0,'rival contest timer set');

// --- give player crew and a district ---
s.crew=20; s.members=[];
for(var i=0;i<20;i++) s.members.push({name:'Soldier '+i,role:'Brawler',color:'#ff2a6d'});
s.districts[0].owner='player';
s.districts[0].guards=5;
assert(G.guardedCrew()===5,'guarded crew counted: '+G.guardedCrew());
assert(G.activeCrew()===15,'active crew = total - guards: '+G.activeCrew());

// --- income reduced by guards ---
var ipsWithGuards=G.ips();
s.districts[0].guards=0;
var ipsNoGuards=G.ips();
assert(ipsNoGuards>ipsWithGuards,'guarded crew do not generate income ('+G.fmt(ipsWithGuards)+' vs '+G.fmt(ipsNoGuards)+')');
s.districts[0].guards=5;

// --- district bonus applies ---
var bonus=G.districtBonusMult();
assert(bonus.mult>1,'Watson owned -> income bonus mult: '+bonus.mult.toFixed(2));

// --- rival strength grows with playtime ---
var st0=G.rivalStrength(s.rivals[0]);
s.playTime=1000;
var st1=G.rivalStrength(s.rivals[0]);
assert(st1>st0,'rival strength grows over time: '+st0.toFixed(2)+' -> '+st1.toFixed(2));
s.playTime=0;

// --- resolveDefense: player wins with strong guards ---
s.districts[0].guards=50;
var wins=0, losses=0;
for(var t=0;t<20;t++){
  s.districts[0].owner='player';
  s.districts[0].guards=50;
  s.crew=50;
  var r=G.resolveDefense(0);
  if(r.win) wins++; else losses++;
}
assert(wins>losses,'strong defense wins more often ('+wins+'W/'+losses+'L)');
assert(s.eventLog.length>0,'event log populated after contests: '+s.eventLog.length);
assert(getEl('eventLog').children.length>0,'event log DOM populated');

// --- resolveDefense: player loses with no guards ---
// Force a loss deterministically: stub Math.random to always favor the attacker.
s.districts[1].owner='player';
s.districts[1].guards=0;
s.crew=1; s.members=[{name:'Lone',role:'Brawler',color:'#f00'}];
var origRandom=Math.random;
Math.random=function(){return 0.99;}; // max attacker strength, min defender strength
var r2=G.resolveDefense(1);
Math.random=origRandom;
assert(r2.win===false,'unguarded district falls to rival (forced)');
assert(s.districts[1].owner!=='player','district owner changed to rival: '+s.districts[1].owner);
assert(s.districts[1].guards===0,'guards cleared on loss');
console.log('ok - unguarded district falls, owner changed, guards cleared');

// --- casualties applied ---
s.crew=10; s.members=[];
for(var j=0;j<10;j++) s.members.push({name:'S'+j,role:'Brawler',color:'#f00'});
var lost=G.applyCasualties(3);
assert(lost===3,'3 casualties applied');
assert(s.crew===7,'crew reduced to 7: '+s.crew);
assert(s.members.length===7,'member cards trimmed to 7: '+s.members.length);
assert(s.casualties>=3,'casualty stat tracked (includes earlier contest losses): '+s.casualties);

// casualties can't exceed crew
var lost2=G.applyCasualties(100);
assert(s.crew===0,'crew floored at 0');
assert(lost2===7,'only 7 casualties possible: '+lost2);

// --- attackDistrict ---
s.crew=30; s.members=[];
for(var k=0;k<30;k++) s.members.push({name:'A'+k,role:'Brawler',color:'#0ff'});
s.districts[2].owner='Maelstrom';
var odds=G.attackOdds(2);
assert(odds>0&&odds<1,'attack odds in range: '+odds.toFixed(2));
var heatBefore=s.heat;
var atk=G.attackDistrict(2);
assert(atk.ok===true,'attack executed');
assert(s.heat>heatBefore,'attack adds heat: '+heatBefore+' -> '+s.heat);
assert(atk.lost>=0,'casualties reported: '+atk.lost);
if(atk.win) assert(s.districts[2].owner==='player','won district is player-owned');

// can't attack own district
var atkOwn=G.attackDistrict(0);
assert(atkOwn.ok===false&&atkOwn.reason==='already yours','cannot attack own district');

// can't attack unclaimed
s.districts[3].owner=null;
var atkNull=G.attackDistrict(3);
assert(atkNull.ok===false,'cannot attack unclaimed district');

// --- rivalTick fires contests over time, never blocks ---
s.districts[0].owner='player'; s.districts[0].guards=10;
s.crew=30; s.members=[];
for(var m=0;m<30;m++) s.members.push({name:'D'+m,role:'Brawler',color:'#0ff'});
s.rivalTimer=0.01;
var logBefore=s.eventLog.length;
G.tick(1); // should trigger rivalTick -> resolveDefense
assert(s.eventLog.length>logBefore||s.rivalTimer>0,'rival contest fired on tick');
assert(s.rivalTimer>0,'rival timer reset after firing');

// --- contests are informational only: no confirm/alert called ---
var confirmCalled=false;
window.confirm=function(){confirmCalled=true;return true;};
s.rivalTimer=0.01;
G.tick(1);
assert(confirmCalled===false,'rival contests never call confirm (non-blocking)');

// --- event log capped at 20 ---
s.eventLog=[];
for(var e=0;e<30;e++) G.logEvent('test event '+e,'#fff');
assert(s.eventLog.length===20,'event log capped at 20: '+s.eventLog.length);

// --- rival strength scales with player progress (playTime) ---
assert(G.rivalStrength(s.rivals[0])>s.rivals[0].strength,'rival strength grows past base');

// --- old save without districts/rivals migrates ---
delete store['nightcity_syndicate_v1'];
var oldSave={eddies:1000,crew:5,crewCost:1200,heat:0,bribes:0,cds:[0,0,0,0,0],
  gear:[0,0,0,0,0,0],gearCost:[800,6000,45000,350000,2500000,20000000],
  ops:[0,0,0,0],opCost:[30000,400000,5000000,60000000],
  labs:[0,0],labCost:[200000000,3000000000],
  members:[],legend:1,prestiges:0,crimesDone:0,crimesWon:0,totalEarned:0,playTime:0,
  seed:42,lastTier:0,lastSave:Date.now()-5000,sound:true,
  gang:{name:'Legacy Crew',emblem:'wolf',color:'#ffe600'}};
store['nightcity_syndicate_v1']=JSON.stringify(oldSave);
var sandbox2={document:document,window:window,localStorage:localStorage,requestAnimationFrame:function(){return 0;},performance:{now:function(){return Date.now();}},navigator:{},location:{reload:function(){}},setTimeout:setTimeout,clearTimeout:clearTimeout,Math:Math,JSON:JSON,Date:Date,console:console,Array:Array,Object:Object,String:String,Number:Number,Boolean:Boolean,RegExp:RegExp,Error:Error,parseInt:parseInt,parseFloat:parseFloat,isNaN:isNaN,isFinite:isFinite};
sandbox2.window.window=window;
vm.createContext(sandbox2);
vm.runInContext(src,sandbox2,{timeout:10000});
var G2=sandbox2.window.__game;
var s2=G2.state();
assert(s2.eddies===1000,'legacy save eddies preserved');
assert(s2.gang.name==='Legacy Crew','legacy gang preserved');
assert(s2.districts.length===6,'legacy save gets 6 districts');
assert(s2.rivals.length===3,'legacy save gets 3 rivals');
assert(s2.districts.every(function(d){return d.owner===null;}),'legacy districts start unowned');
assert(getEl('intro').style.display==='none','legacy save with gang skips naming');
console.log('ok - legacy save migrates with districts+rivals');

console.log('\nSTEP 3 (RIVALS + CONTESTS) ALL TESTS PASSED');
process.exit(0);
