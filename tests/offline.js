// Step 5 verify: offline "laying low" mode
var fs=require('fs');
var src=fs.readFileSync(require('path').join(__dirname,'extracted.js'),'utf8');
function makeCtx(){var g={addColorStop:function(){}};return new Proxy({},{get:function(t,p){if(p==='canvas')return{width:800,height:600};if(p==='createLinearGradient'||p==='createRadialGradient')return function(){return g;};return function(){};},set:function(){return true;}});}
function makeEl(id){var el={id:id,style:{_display:undefined},children:[],classList:{add:function(){},remove:function(){},toggle:function(){}},_text:'',innerHTML:'',value:'',appendChild:function(c){this.children.push(c);this._syncFirst();return c;},removeChild:function(c){var i=this.children.indexOf(c);if(i>=0)this.children.splice(i,1);this._syncFirst();return c;},_syncFirst:function(){Object.defineProperty(this,'firstChild',{get:function(){return this.children[0]||null;},configurable:true});},firstChild:null,scrollTop:0,scrollHeight:0,addEventListener:function(){},querySelectorAll:function(){return [];},getBoundingClientRect:function(){return{left:100,top:100,width:50,height:20};},getContext:function(){return makeCtx();},setAttribute:function(){},getAttribute:function(){return null;},parentNode:null};Object.defineProperty(el,'textContent',{get:function(){return this._text;},set:function(v){this._text=String(v);}});Object.defineProperty(el.style,'display',{get:function(){return this._display;},set:function(v){this._display=v;}});el._syncFirst();return el;}
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
s.gang={name:'Offline Test',emblem:'skull',color:'#05d9e8'};

// --- Test 1: offline income at 30% rate ---
s.eddies=0; s.crew=10; s.heat=0;
s.members=[]; for(var i=0;i<10;i++) s.members.push({name:'S'+i,role:'Brawler',color:'#f00'});
var ipsFull=G.ips();
s.lastSave=Date.now()-3600*1000; // 1 hour ago
G.offline();
var expected=ipsFull*0.30*3600;
assert(Math.abs(s.eddies-expected)<expected*0.01,'offline income = 30% of active rate: '+G.fmt(s.eddies)+' vs expected '+G.fmt(expected));
assert(getEl('offline').style.display==='flex','offline modal shown');
assert(getEl('offlineGain')._text.indexOf('+')===0,'gain displayed: '+getEl('offlineGain')._text);

// --- Test 2: 8h cap ---
s.eddies=0;
s.lastSave=Date.now()-24*3600*1000; // 24 hours ago
G.offline();
var expectedCapped=ipsFull*0.30*8*3600;
assert(Math.abs(s.eddies-expectedCapped)<expectedCapped*0.01,'offline capped at 8h: '+G.fmt(s.eddies)+' vs '+G.fmt(expectedCapped));
assert(getEl('offlineTime')._text.indexOf('capped at 8 hours')>=0,'cap message shown: '+getEl('offlineTime')._text);

// --- Test 3: heat decays offline (3x faster) ---
s.heat=60;
s.eddies=0;
s.lastSave=Date.now()-3600*1000; // 1h = 3600s
G.offline();
// heat decay offline = 0.08 * 3.0 * 3600 = 864 -> fully cleared
assert(s.heat===0,'heat fully cleared after 1h offline (was 60): '+s.heat);
assert(getEl('offlineHeat')._text.indexOf('fully cleared')>=0||getEl('offlineHeat')._text.indexOf('Heat faded')>=0,'heat line shown: '+getEl('offlineHeat')._text);

// partial decay: 100s away
s.heat=50;
s.lastSave=Date.now()-100*1000;
G.offline();
// decay = 0.08*3*100 = 24 -> heat should be 26
assert(Math.abs(s.heat-26)<1,'partial heat decay: '+s.heat.toFixed(1)+' (expected ~26)');

// --- Test 4: no heat earned offline (crimes don't run) ---
s.heat=0;
s.lastSave=Date.now()-3600*1000;
var heatBefore=s.heat;
G.offline();
assert(s.heat===0,'no heat earned while offline');

// --- Test 5: districts can be lost/defended while away ---
s.districts[0].owner='player'; s.districts[0].guards=20;
s.districts[1].owner='player'; s.districts[1].guards=0; // unguarded -> will be lost
s.crew=30; s.members=[];
for(var j=0;j<30;j++) s.members.push({name:'D'+j,role:'Brawler',color:'#f00'});
s.lastSave=Date.now()-3600*1000; // 1h = 12 contest steps
// vm has its own Math; loop offline calls until the unguarded district falls.
var attempts=0;
while(s.districts[1].owner==='player'&&attempts<20){
  s.lastSave=Date.now()-3600*1000;
  G.offline();
  attempts++;
}
assert(s.districts[1].owner!=='player','unguarded district lost while away after '+attempts+' attempts: owner='+s.districts[1].owner);
var distText=getEl('offlineDistricts')._text;
assert(distText.length>0,'district summary shown: '+distText);

// --- Test 6: defended districts reported ---
s.districts[2].owner='player'; s.districts[2].guards=30;
s.crew=50; s.members=[];
for(var k=0;k<50;k++) s.members.push({name:'G'+k,role:'Brawler',color:'#f00'});
// Strongly guarded (30 guards, crew 50) should usually hold. Loop until a defense is reported.
var defAttempts=0, sawHeld=false;
while(defAttempts<20&&!sawHeld){
  s.districts[2].owner='player'; s.districts[2].guards=30;
  s.crew=50; s.members=[];
  for(var k2=0;k2<50;k2++) s.members.push({name:'G'+k2,role:'Brawler',color:'#f00'});
  s.lastSave=Date.now()-3600*1000;
  G.offline();
  if(getEl('offlineDistricts')._text.indexOf('Held')>=0) sawHeld=true;
  defAttempts++;
}
assert(s.districts[2].owner==='player','strongly guarded district held while away');
assert(sawHeld,'defended districts reported: '+getEl('offlineDistricts')._text);

// --- Test 7: offline doesn't run when away < 30s ---
s.eddies=1000;
s.lastSave=Date.now()-10*1000; // 10s
G.offline();
assert(s.eddies===1000,'no offline award under 30s: '+s.eddies);

// --- Test 8: casualties from offline contests reduce crew ---
s.districts[3].owner='player'; s.districts[3].guards=5;
s.crew=10; s.members=[];
for(var m=0;m<10;m++) s.members.push({name:'C'+m,role:'Brawler',color:'#f00'});
var crewBefore=s.crew;
var lossAttempts=0, sawLoss=false;
while(lossAttempts<20&&!sawLoss){
  s.districts[3].owner='player'; s.districts[3].guards=5;
  if(s.crew<10){ s.crew=10; s.members=[]; for(var m2=0;m2<10;m2++) s.members.push({name:'C'+m2,role:'Brawler',color:'#f00'}); }
  s.lastSave=Date.now()-3600*1000;
  G.offline();
  if(s.crew<crewBefore||s.districts[3].owner!=='player') sawLoss=true;
  lossAttempts++;
}
assert(sawLoss,'offline contest caused casualties or district loss after '+lossAttempts+' attempts');

// --- Test 9: old save (pre-offline-update) still loads and gets offline ---
delete store['nightcity_syndicate_v1'];
var oldSave={eddies:0,crew:5,crewCost:1200,heat:50,bribes:0,cds:[0,0,0,0,0],
  gear:[0,0,0,0,0,0],gearCost:[800,6000,45000,350000,2500000,20000000],
  ops:[0,0,0,0],opCost:[30000,400000,5000000,60000000],
  labs:[0,0],labCost:[200000000,3000000000],
  members:[],legend:1,prestiges:0,crimesDone:0,crimesWon:0,totalEarned:0,playTime:0,
  seed:3,lastTier:0,lastSave:Date.now()-7200*1000,sound:true,
  gang:{name:'Legacy',emblem:'bolt',color:'#ffe600'},
  districts:[{owner:null,guards:0,contested:0},{owner:null,guards:0,contested:0},{owner:null,guards:0,contested:0},{owner:null,guards:0,contested:0},{owner:null,guards:0,contested:0},{owner:null,guards:0,contested:0}],
  rivals:[{name:'Maelstrom',emblem:'circuit',color:'#ff3131',strength:0.5},{name:'Voodoo Boys',emblem:'eye',color:'#b967ff',strength:0.6},{name:'Sixth Street',emblem:'fist',color:'#ffe600',strength:0.7}],
  eventLog:[],rivalTimer:300,casualties:0};
store['nightcity_syndicate_v1']=JSON.stringify(oldSave);
var sandbox2={document:document,window:window,localStorage:localStorage,requestAnimationFrame:function(){return 0;},performance:{now:function(){return Date.now();}},navigator:{},location:{reload:function(){}},setTimeout:setTimeout,clearTimeout:clearTimeout,Math:Math,JSON:JSON,Date:Date,console:console,Array:Array,Object:Object,String:String,Number:Number,Boolean:Boolean,RegExp:RegExp,Error:Error,parseInt:parseInt,parseFloat:parseFloat,isNaN:isNaN,isFinite:isFinite};
sandbox2.window.window=window;
vm.createContext(sandbox2);
vm.runInContext(src,sandbox2,{timeout:10000});
var G2=sandbox2.window.__game;
var s2=G2.state();
assert(s2.eddies>0,'legacy save gets offline income: '+G2.fmt(s2.eddies));
assert(s2.heat<50,'legacy save heat decayed offline: '+s2.heat.toFixed(1));
assert(getEl('offline').style.display==='flex','offline modal shown for legacy save');
console.log('ok - legacy save gets laying-low offline on load');

// --- Test 10: pre-district save (no districts field) migrates and offline works ---
delete store['nightcity_syndicate_v1'];
var olderSave={eddies:0,crew:5,crewCost:1200,heat:80,bribes:0,cds:[0,0,0,0,0],
  gear:[0,0,0,0,0,0],gearCost:[800,6000,45000,350000,2500000,20000000],
  ops:[0,0,0,0],opCost:[30000,400000,5000000,60000000],
  labs:[0,0],labCost:[200000000,3000000000],
  members:[],legend:1,prestiges:0,crimesDone:0,crimesWon:0,totalEarned:0,playTime:0,
  seed:3,lastTier:0,lastSave:Date.now()-7200*1000,sound:true,
  gang:{name:'Ancient',emblem:'hex',color:'#b967ff'}};
store['nightcity_syndicate_v1']=JSON.stringify(olderSave);
var sandbox3={document:document,window:window,localStorage:localStorage,requestAnimationFrame:function(){return 0;},performance:{now:function(){return Date.now();}},navigator:{},location:{reload:function(){}},setTimeout:setTimeout,clearTimeout:clearTimeout,Math:Math,JSON:JSON,Date:Date,console:console,Array:Array,Object:Object,String:String,Number:Number,Boolean:Boolean,RegExp:RegExp,Error:Error,parseInt:parseInt,parseFloat:parseFloat,isNaN:isNaN,isFinite:isFinite};
sandbox3.window.window=window;
vm.createContext(sandbox3);
vm.runInContext(src,sandbox3,{timeout:10000});
var G3=sandbox3.window.__game;
var s3=G3.state();
assert(s3.districts.length===6,'pre-district save migrated to 6 districts');
assert(s3.eddies>0,'pre-district save gets offline income: '+G3.fmt(s3.eddies));
assert(s3.heat<80,'pre-district save heat decayed: '+s3.heat.toFixed(1));
console.log('ok - pre-district save migrates and gets offline');

console.log('\nSTEP 5 (OFFLINE LAYING LOW) ALL TESTS PASSED');
process.exit(0);
