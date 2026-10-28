// v1.5.0 economy tests: crew scaling, fixer, drugs, heat death, upgrade math
var fs=require('fs');
var src=fs.readFileSync(require('path').join(__dirname,'extracted.js'),'utf8');
function makeCtx(){var g={addColorStop:function(){}};return new Proxy({},{get:function(t,p){if(p==='canvas')return{width:800,height:600};return function(){};},set:function(){return true;}});}
function makeEl(id){var el={id:id,style:{},children:[],className:'',classList:{add:function(){},remove:function(){},toggle:function(){},contains:function(){return false;}},_text:'',_innerHTML:'',value:'',appendChild:function(c){this.children.push(c);return c;},addEventListener:function(ev,fn){(this._l=this._l||{})[ev]=fn;},click:function(){if(this._l&&this._l.click)this._l.click({target:this});},querySelectorAll:function(){return [];},getBoundingClientRect:function(){return{left:100,top:100,width:50,height:20};},getContext:function(){return makeCtx();},setAttribute:function(){},getAttribute:function(){return null;},parentNode:null,disabled:false};Object.defineProperty(el,'textContent',{get:function(){return this._text;},set:function(v){this._text=String(v);}});Object.defineProperty(el,'innerHTML',{get:function(){return this._innerHTML;},set:function(v){this._innerHTML=v;if(v==='')this.children=[];}});return el;}
var els={};function getEl(id){if(!els[id]){els[id]=makeEl(id);if(id==='tabs'){['crew','ops','districts','stats','jobs'].forEach(function(name){var t=makeEl('tab-'+name);t.className='tab';t._dt=name;els[id].children.push(t);});}}return els[id];}
var store={};var localStorage={getItem:function(k){return store[k]||null;},setItem:function(k,v){store[k]=String(v);},removeItem:function(k){delete store[k];}};
var document={getElementById:getEl,createElement:function(t){return makeEl(t);},querySelectorAll:function(){return[];},body:makeEl('body')};
var window={innerWidth:1280,innerHeight:800,AudioContext:function(){throw 0;},addEventListener:function(){},confirm:function(){return true;},localStorage:localStorage};
var sandbox={document:document,window:window,localStorage:localStorage,requestAnimationFrame:function(){return 0;},performance:{now:function(){return Date.now();}},navigator:{},location:{reload:function(){}},setTimeout:setTimeout,clearTimeout:clearTimeout,Math:Math,JSON:JSON,Date:Date,console:console,Array:Array,Object:Object,String:String,Number:Number,Boolean:Boolean,RegExp:RegExp,Error:Error,parseInt:parseInt,parseFloat:parseFloat,isNaN:isNaN,isFinite:isFinite,URL:{createObjectURL:function(){},revokeObjectURL:function(){}},Blob:function(){},FileReader:function(){}};
sandbox.window.window=window;
var vm=require('vm');vm.createContext(sandbox);vm.runInContext(src,sandbox,{timeout:10000});
var G=window.__game,S=G.state();
function assert(c,m){if(!c){console.log('FAIL:',m);process.exit(1);}console.log('ok -',m);}

S.crew=10;S.members=[];
for(var i=0;i<10;i++)S.members.push({name:'M'+i,role:'Brawler',color:'#f00',assignedCrime:-1,injury:0});
S.eddies=1e9;S.heat=0;S.gear=[0,0,0,0,0,0];S.ops=[0,0,0,0];S.labs=[0,0];S.drugCook=0;S.drugSell=0;

// Test 1: assigning crew to jobs does NOT lower crime payout anymore
var payBefore=G.payout(0);
G.assignCrewToCrime(0,5);
var payAfter=G.payout(0);
assert(Math.abs(payAfter-payBefore)<0.001,'crime payout unchanged when crew assigned to jobs ('+payBefore.toFixed(1)+' -> '+payAfter.toFixed(1)+')');
S.crimeCrew=[0,0,0,0,0];S.members.forEach(function(m){m.assignedCrime=-1;});

// Test 2: success chance uses total crew
var succ10=G.succChance(0);
S.crimeCrew=[0,0,0,0,0];S.members.forEach(function(m){m.assignedCrime=-1;});
G.assignCrewToCrime(0,10);
assert(Math.abs(G.succChance(0)-succ10)<1e-9,'success chance uses total crew, not active crew');

// Test 3: gear multiplier is multiplicative — +150% gear gives exactly +150% payout
S.crimeCrew=[0,0,0,0,0];S.members.forEach(function(m){m.assignedCrime=-1;});
S.gear=[0,0,0,0,0,0];S.gearCost=[800,6000,45000,350000,2.5e6,2e7];
var base=G.payout(0);
S.eddies=1e9;G.buyGear(5);
assert(Math.abs(G.payout(0)/base-2.5)<0.001,'+150% gear gives exactly x2.5 payout (got x'+(G.payout(0)/base).toFixed(3)+')');

// Test 4: max-heat permanent death on auto-crime failure
S.gear=[0,0,0,0,0,0];S.heat=100;S.cds=[0,0,0,0,0];
S.crimeCrew=[0,0,0,0,0];S.members.forEach(function(m){m.assignedCrime=-1;});
var crewBefore=S.crew;
G.assignCrewToCrime(0,1);
var seq=[0.5,0.999,0.001]; // worker, fail, death roll passes (heatDeathPct=0.05)
var si=0;Math.random=function(){return seq[si++%seq.length];};
S.cds=[0,0,0,0,0];
G.autoCrimeTick(0.1);
Math.random=Math.random;
assert(S.crew===crewBefore-1,'crew permanently lost at max heat ('+crewBefore+' -> '+S.crew+')');
assert(S.casualties>0,'casualty counted for heat death');
S.heat=0;

// Test 5: fixer hire + auto-bribe at max heat
S.fixerHires=0;S.fixerTimer=0;S.eddies=1e12;
var fcost=G?undefined:0;
var cost1=2e6;
assert(G.fixerCost()===cost1,'fixer first hire costs 2M');
assert(G.hireFixer()===true,'fixer hired');
assert(S.fixerTimer>0,'fixer timer running');
assert(G.fixerCost()===4e6,'fixer price doubles after hire');
S.heat=100;S.bribes=0;S.eddies=1e12;
var bribeCost1=30000; // bribeBase
G.fixerTick(1);
assert(S.heat===0,'fixer cleared heat at 100');
assert(S.eddies<1e12,'fixer paid the bribe from your cash');
// retainer expiry
S.fixerTimer=0.5;S.heat=100;
G.fixerTick(1);
assert(S.fixerTimer===0,'fixer retainer expired');

// Test 6: fixer waits when cash is short
S.fixerTimer=100;S.heat=100;S.eddies=100;S.bribes=0;
G.fixerTick(1);
assert(S.heat===100,'fixer waits when cash short (heat stays)');

// Test 7: drug income requires cook AND dealer AND lab
S.labs=[0,0];S.drugCook=0;S.drugSell=0;
assert(G?true:true,'noop');
var ipsNoLab=G.ips();
S.labs=[1,0];S.drugCook=1;S.drugSell=0;
assert(G.ips()===ipsNoLab,'no drug income without a dealer');
S.drugSell=1;
assert(G.ips()>ipsNoLab,'drug income flows with cook + dealer + lab');
S.drugCook=2;S.drugSell=2;
assert(G.ips()>ipsNoLab*1.5,'more drug crew = more income');

// Test 8: drug bust kills workers and destroys lab
S.labs=[1,0];S.labCost=[2e8,3e9];S.drugCook=2;S.drugSell=1;S.heat=0;
S.crew=10;S.members=[];for(i=0;i<10;i++)S.members.push({name:'D'+i,role:'Brawler',color:'#f00',assignedCrime:-1,injury:0});
Math.random=function(){return 0.0001;}; // force bust
G.drugTick(1);
Math.random=Math.random;
assert(S.labs[0]===0,'bust destroys the lab (rebuy required)');
assert(S.casualties>0,'bust kills drug crew');
assert(S.heat>0,'bust adds heat');
assert(S.drugCook===0&&S.drugSell===0,'drug slots cleared after bust');

// Test 9: JOBS log records failures not successes
S.heat=0;S.cds=[0,0,0,0,0];S.crimeCrew=[0,0,0,0,0];
S.members.forEach(function(m){m.assignedCrime=-1;m.injury=0;});
S.jobLog=[];
S.labs=[0,0];
G.assignCrewToCrime(0,1);
Math.random=function(){return 0.001;}; // always succeed
S.cds=[0,0,0,0,0];
G.autoCrimeTick(0.1);
Math.random=Math.random;
assert(S.jobLog.length===0,'successes are not logged to JOBS');

console.log('\nECONOMY v1.5.0 ALL TESTS PASSED');
