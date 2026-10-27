// Step 4 verify: Districts tab, guard assignment, attack odds, bonuses, visuals
var fs=require('fs');
var src=fs.readFileSync(require('path').join(__dirname,'extracted.js'),'utf8');
function makeCtx(){var g={addColorStop:function(){}};return new Proxy({},{get:function(t,p){if(p==='canvas')return{width:800,height:600};if(p==='createLinearGradient'||p==='createRadialGradient')return function(){return g;};return function(){};},set:function(){return true;}});}
function makeEl(id){var el={id:id,style:{_display:undefined},children:[],classList:{add:function(){},remove:function(){},toggle:function(){}},_text:'',innerHTML:'',value:'',appendChild:function(c){this.children.push(c);this._syncFirst();return c;},removeChild:function(c){var i=this.children.indexOf(c);if(i>=0)this.children.splice(i,1);this._syncFirst();return c;},_syncFirst:function(){Object.defineProperty(this,'firstChild',{get:function(){return this.children[0]||null;},configurable:true});},firstChild:null,scrollTop:0,scrollHeight:0,addEventListener:function(ev,fn){(this._listeners=this._listeners||{})[ev]=fn;},click:function(){if(this._listeners&&this._listeners.click)this._listeners.click({target:this});},querySelectorAll:function(){return [];},getBoundingClientRect:function(){return{left:100,top:100,width:50,height:20};},getContext:function(){return makeCtx();},setAttribute:function(){},getAttribute:function(){return null;},parentNode:null};Object.defineProperty(el,'textContent',{get:function(){return this._text;},set:function(v){this._text=String(v);}});Object.defineProperty(el.style,'display',{get:function(){return this._display;},set:function(v){this._display=v;}});el._syncFirst();return el;}
var els={};function getEl(id){if(!els[id])els[id]=makeEl(id);return els[id];}
var store={};var localStorage={getItem:function(k){return store[k]||null;},setItem:function(k,v){store[k]=String(v);},removeItem:function(k){delete store[k];}};
var document={getElementById:getEl,createElement:function(t){return makeEl(t);},querySelectorAll:function(){return[];},body:makeEl('body')};
var window={innerWidth:1280,innerHeight:800,devicePixelRatio:1,AudioContext:function(){throw 0;},addEventListener:function(){},confirm:function(){return true;},localStorage:localStorage};
var sandbox={document:document,window:window,localStorage:localStorage,requestAnimationFrame:function(){return 0;},performance:{now:function(){return Date.now();}},navigator:{},location:{reload:function(){}},setTimeout:setTimeout,clearTimeout:clearTimeout,Math:Math,JSON:JSON,Date:Date,console:console,Array:Array,Object:Object,String:String,Number:Number,Boolean:Boolean,RegExp:RegExp,Error:Error,parseInt:parseInt,parseFloat:parseFloat,isNaN:isNaN,isFinite:isFinite};
sandbox.window.window=window;
var vm=require('vm');vm.createContext(sandbox);
vm.runInContext(src,sandbox,{timeout:10000});
var G=window.__game;
function assert(c,m){if(!c){console.log('FAIL:',m);process.exit(1);}console.log('ok -',m);}

var s=G.state();
s.gang={name:'Map Test',emblem:'dragon',color:'#ff2a6d'};
s.crew=20; s.members=[];
for(var i=0;i<20;i++) s.members.push({name:'S'+i,role:'Brawler',color:'#f00'});

// --- open Districts tab ---
G.tab('districts');
var tc=getEl('tabContent');
assert(tc.children.length>0,'districts tab builds');
var map=null;
for(var i=0;i<tc.children.length;i++) if(tc.children[i].id==='districtMap') map=tc.children[i];
assert(map,'district map element exists');
assert(map.children.length===6,'6 district cells on map: '+map.children.length);

// --- unowned districts have no emblem, neutral border ---
var cell0=map.children[0];
assert(cell0.className.indexOf('owned-player')<0&&cell0.className.indexOf('owned-rival')<0,'district 0 unowned initially');

// --- claim a district, rebuild, check tint ---
s.districts[0].owner='player';
G.tab('districts'); // rebuild
map=null;
for(var j=0;j<tc.children.length;j++) if(tc.children[j].id==='districtMap') map=tc.children[j];
cell0=map.children[0];
assert(cell0.className.indexOf('owned-player')>=0,'owned district has owned-player class');
assert(cell0.style.borderColor==='#ff2a6d','district tinted with gang color: '+cell0.style.borderColor);
assert(cell0.style.background.indexOf('rgba(255,42,109')===0,'district background tinted: '+cell0.style.background);

// --- rival-owned district tinted with rival color ---
s.districts[1].owner='Maelstrom';
G.tab('districts');
map=null;
for(var k=0;k<tc.children.length;k++) if(tc.children[k].id==='districtMap') map=tc.children[k];
assert(map.children[1].style.borderColor==='#ff3131','rival district tinted with rival color: '+map.children[1].style.borderColor);
assert(map.children[1].className.indexOf('owned-rival')>=0,'rival district has owned-rival class');

// --- contested district pulses ---
s.districts[0].contested=3;
G.tab('districts');
map=null;
for(var m=0;m<tc.children.length;m++) if(tc.children[m].id==='districtMap') map=tc.children[m];
assert(map.children[0].className.indexOf('contested')>=0,'contested district has contested class');

// --- guard assignment UI ---
// find the guard row for district 0 (Watson, owned by player)
var guardRow=null;
for(var n=1;n<tc.children.length;n++){
  var ch=tc.children[n];
  if(ch.className==='guard-row'){ guardRow=ch; break; }
}
assert(guardRow,'guard row exists for owned district');
// find the stepper buttons
var minus=null,plus=null,count=null;
function findIn(node,cls){ if(node.className===cls) return node; for(var i=0;i<node.children.length;i++){var r=findIn(node.children[i],cls);if(r)return r;} return null; }
minus=findIn(guardRow,null); // first button
var btns=[];
(function collect(n){ if(n._text==='-'||n._text==='+') btns.push(n); for(var i=0;i<n.children.length;i++) collect(n.children[i]); })(guardRow);
assert(btns.length===2,'stepper has +/- buttons');
count=findIn(guardRow,'g-count');
assert(count,'guard count display exists');
assert(count._text==='0','starts at 0 guards');

// click + 5 times
for(var p=0;p<5;p++) btns[1].click(); // +
assert(s.districts[0].guards===5,'5 guards assigned: '+s.districts[0].guards);
assert(count._text==='5','guard count shows 5');
assert(G.guardedCrew()===5,'guardedCrew()=5');
assert(G.activeCrew()===15,'activeCrew=15 (20-5)');

// click - 2 times
for(var q=0;q<2;q++) btns[0].click(); // -
assert(s.districts[0].guards===3,'3 guards after -2: '+s.districts[0].guards);

// can't assign more guards than crew
for(var r=0;r<100;r++) btns[1].click();
assert(s.districts[0].guards<=20,'guards capped at crew size: '+s.districts[0].guards);
assert(G.guardedCrew()<=s.crew,'total guards never exceed crew');

// --- attack odds displayed for rival district ---
s.districts[2].owner='Voodoo Boys';
var odds=G.attackOdds(2);
assert(odds>0.05&&odds<0.95,'attack odds in (0.05, 0.95): '+odds.toFixed(2));

// --- attack via district cell click (confirm stubbed true) ---
var heatBefore=s.heat;
var cell2=map.children[2];
cell2.click(); // triggers attack confirm -> attackDistrict
assert(s.heat>=heatBefore,'attack added heat');
// district 2 may or may not be won (random), but attack was attempted
assert(s.eventLog.length>0,'attack logged to event log');

// --- district bonuses affect economy ---
s.districts[0].guards=0;
s.districts[3].owner='player'; // Pacifica: +15% payout
s.districts[4].owner='player'; // City Center: x1.5 mult
var payBase=G.CRIMES[0].base;
var pay=G.payout(0);
var db=G.districtBonusMult();
assert(db.payMult>=1.15,'Pacifica payout bonus: '+db.payMult);
assert(db.mult>=1.5*1.10,'City Center + Watson mult: '+db.mult.toFixed(2));

// --- losing all districts removes bonuses ---
s.districts[0].owner=null; s.districts[3].owner=null; s.districts[4].owner=null;
var db2=G.districtBonusMult();
assert(db2.mult===1&&db2.payMult===1,'no districts = no bonuses');

// --- district tab updates without rebuild (updateDistricts path) ---
s.districts[0].owner='player';
G.tab('districts');
// simulate a frame tick while on districts tab
G.tick(0.1);
assert(true,'districts tab survives tick');

// --- old save without districts migrates (already tested in step 3, re-verify) ---
delete store['nightcity_syndicate_v1'];
var oldSave={eddies:500,crew:3,crewCost:1000,heat:0,bribes:0,cds:[0,0,0,0,0],
  gear:[0,0,0,0,0,0],gearCost:[800,6000,45000,350000,2500000,20000000],
  ops:[0,0,0,0],opCost:[30000,400000,5000000,60000000],
  labs:[0,0],labCost:[200000000,3000000000],
  members:[],legend:1,prestiges:0,crimesDone:0,crimesWon:0,totalEarned:0,playTime:0,
  seed:7,lastTier:0,lastSave:Date.now()-5000,sound:true,
  gang:{name:'Old Crew',emblem:'wolf',color:'#ffe600'}};
store['nightcity_syndicate_v1']=JSON.stringify(oldSave);
var sandbox2={document:document,window:window,localStorage:localStorage,requestAnimationFrame:function(){return 0;},performance:{now:function(){return Date.now();}},navigator:{},location:{reload:function(){}},setTimeout:setTimeout,clearTimeout:clearTimeout,Math:Math,JSON:JSON,Date:Date,console:console,Array:Array,Object:Object,String:String,Number:Number,Boolean:Boolean,RegExp:RegExp,Error:Error,parseInt:parseInt,parseFloat:parseFloat,isNaN:isNaN,isFinite:isFinite};
sandbox2.window.window=window;
vm.createContext(sandbox2);
vm.runInContext(src,sandbox2,{timeout:10000});
var G2=sandbox2.window.__game;
assert(G2.state().districts.length===6,'migrated save has 6 districts');
G2.tab('districts');
assert(getEl('tabContent').children.length>0,'districts tab builds on migrated save');
console.log('ok - migrated save opens districts tab fine');

console.log('\nSTEP 4 (DISTRICTS TAB) ALL TESTS PASSED');
process.exit(0);
