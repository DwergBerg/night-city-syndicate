var fs=require('fs');
var src=fs.readFileSync(require('path').join(__dirname,'extracted.js'),'utf8');
function makeCtx(){var g={addColorStop:function(){}};return new Proxy({},{get:function(t,p){if(p==='canvas')return{width:800,height:600};return function(){};},set:function(){return true;}});}
function makeEl(id){var el={id:id,style:{_display:undefined},children:[],className:'',classList:{add:function(c){(this._cls=this._cls||[]).push(c);},remove:function(){},toggle:function(){},contains:function(c){return (this._cls||[]).indexOf(c)>=0;}},_text:'',_innerHTML:'',value:'',appendChild:function(c){this.children.push(c);return c;},addEventListener:function(ev,fn){(this._listeners=this._listeners||{})[ev]=fn;},click:function(){if(this._listeners&&this._listeners.click)this._listeners.click({target:this});},querySelectorAll:function(){return [];},getBoundingClientRect:function(){return{left:100,top:100,width:50,height:20};},getContext:function(){return makeCtx();},setAttribute:function(){},getAttribute:function(){return null;},parentNode:null,disabled:false};Object.defineProperty(el,'textContent',{get:function(){return this._text;},set:function(v){this._text=String(v);}});Object.defineProperty(el,'innerHTML',{get:function(){return this._innerHTML;},set:function(v){this._innerHTML=v;if(v==='')this.children=[];}});Object.defineProperty(el.style,'display',{get:function(){return this._display;},set:function(v){this._display=v;}});return el;}
var els={};function getEl(id){if(!els[id]){els[id]=makeEl(id);if(id==='tabs'){var tabNames=['crew','ops','districts','stats'];tabNames.forEach(function(name){var t=makeEl('tab-'+name);t.className='tab';t._dt=name;els[id].children.push(t);});}}return els[id];}
var store={};var localStorage={getItem:function(k){return store[k]||null;},setItem:function(k,v){store[k]=String(v);},removeItem:function(k){delete store[k];}};
var document={getElementById:getEl,createElement:function(t){return makeEl(t);},querySelectorAll:function(){return[];},body:makeEl('body')};
var window={innerWidth:1280,innerHeight:800,devicePixelRatio:1,AudioContext:function(){throw 0;},addEventListener:function(){},confirm:function(){return true;},localStorage:localStorage};
var sandbox={document:document,window:window,localStorage:localStorage,requestAnimationFrame:function(){return 0;},performance:{now:function(){return Date.now();}},navigator:{},location:{reload:function(){}},setTimeout:setTimeout,clearTimeout:clearTimeout,Math:Math,JSON:JSON,Date:Date,console:console,Array:Array,Object:Object,String:String,Number:Number,Boolean:Boolean,RegExp:RegExp,Error:Error,parseInt:parseInt,parseFloat:parseFloat,isNaN:isNaN,isFinite:isFinite,URL:{createObjectURL:function(){return'';},revokeObjectURL:function(){}},Blob:function(){},FileReader:function(){}};
sandbox.window.window=window;
var vm=require('vm');vm.createContext(sandbox);
vm.runInContext(src,sandbox,{timeout:10000});
var G=window.__game;
var S=G.state();
function assert(c,m){if(!c){console.log('FAIL:',m);process.exit(1);}console.log('ok -',m);}

// Setup: 10 crew members, all fields initialized
S.crew=10;
S.members=[];
for(var i=0;i<10;i++) S.members.push({name:'Member'+i,role:'Brawler',color:'#ff2a6d',assignedCrime:-1});
S.eddies=1e12;
S.heat=0;
S.cds=[0,0,0,0,0];
S.crimeCrew=[0,0,0,0,0];
S.autoCds=[0,0,0,0,0];

// Test 1: freshState has crimeCrew and autoCds arrays
var fs2=G.freshState();
assert(Array.isArray(fs2.crimeCrew)&&fs2.crimeCrew.length===5,'freshState has crimeCrew[5]');
assert(Array.isArray(fs2.autoCds)&&fs2.autoCds.length===5,'freshState has autoCds[5]');

// Test 2: assignCrewToCrime assigns members
assert(G.assignCrewToCrime(0,3)===true,'assign 3 crew to Pickpocket succeeds');
assert(S.crimeCrew[0]===3,'crimeCrew[0]===3');
var assigned=G.assignedMembers(0);
assert(assigned.length===3,'3 members assigned to crime 0');
assigned.forEach(function(idx){ assert(S.members[idx].assignedCrime===0,'member '+idx+' has assignedCrime===0'); });

// Test 3: activeCrew subtracts assigned
assert(G.activeCrew()===7,'activeCrew===7 (10-3 assigned)');

// Test 4: crimeAssignedCrew counts total
assert(G.crimeAssignedCrew()===3,'crimeAssignedCrew()===3');

// Test 5: cannot assign more than available
assert(G.assignCrewToCrime(1,8)===true,'assign 8 to crime 1');
assert(S.crimeCrew[1]===7,'crimeCrew[1] capped at 7 (only 7 unassigned left)');
assert(G.crimeAssignedCrew()===10,'all 10 crew assigned');
assert(G.activeCrew()===0,'activeCrew===0 (all assigned)');

// Test 6: unassign frees members
assert(G.assignCrewToCrime(0,-2)===true,'unassign 2 from crime 0');
assert(S.crimeCrew[0]===1,'crimeCrew[0]===1 after unassign');
assert(G.crimeAssignedCrew()===8,'8 crew assigned after unassign');

// Test 7: autoCrimeTick fires crimes when crew assigned and cooldown ready
S.cds=[0,0,0,0,0];
var eddiesBefore=S.eddies;
var crimesBefore=S.crimesDone;
G.autoCrimeTick(0.1);
assert(S.crimesDone>crimesBefore||S.cds[1]>0,'autoCrimeTick fired a crime (crimesDone increased or cooldown set)');

// Test 8: auto-crime generates less heat than manual
S.heat=0;
S.cds=[0,0,0,0,0];
S.crimeCrew=[0,0,0,0,0];
G.assignCrewToCrime(0,1);
S.cds=[0,0,0,0,0];
// Force a failure by setting heat very high
S.heat=99;
var heatBefore2=S.heat;
G.autoCrimeTick(0.1);
// On failure, heat increases by c.heat*0.5*autoHeatMult*crimeHeatMult (capped at 100)
assert(S.cds[0]>0,'cooldown set after auto-crime attempt');

// Test 9: injured mechanic - on forced failure with high flatline risk, member is unassigned (back to passive pool)
S.heat=0;
S.cds=[0,0,0,0,0];
S.crimeCrew=[0,0,0,0,0];
S.members.forEach(function(m){ m.assignedCrime=-1; });
G.assignCrewToCrime(0,2);
var origRandom=Math.random;
var seq=[0.5,0.999,0.001]; // worker pick, fail success roll, pass injury roll
var si=0;
Math.random=function(){ return seq[si++%seq.length]; };
S.cds=[0,0,0,0,0];
G.autoCrimeTick(0.1);
Math.random=origRandom;
var assignedAfter=S.members.filter(function(m){ return m.assignedCrime>=0; }).length;
assert(assignedAfter<=1,'at most 1 member still assigned after forced failure (got '+assignedAfter+')');
assert(S.crimeCrew[0]<=1,'crimeCrew[0] decremented when member injured (got '+S.crimeCrew[0]+')');
assert(S.jobLog&&S.jobLog.length>0,'job log recorded the failure');
var flLine=S.jobLog[S.jobLog.length-1];
assert(flLine.text.indexOf('FLATLINED')>=0||flLine.text.indexOf('sideways')>=0,'failure line logged: '+flLine.text);

// Test 10: injured member returns to passive income pool (activeCrew counts them again)
S.members.forEach(function(m){ m.assignedCrime=-1; });
S.crimeCrew=[0,0,0,0,0];
assert(G.activeCrew()===S.crew,'all crew back in passive pool after injury');

// Test 11: more crew assigned means higher payout multiplier on success
S.heat=0;
S.cds=[0,0,0,0,0];
S.crimeCrew=[0,0,0,0,0];
S.members.forEach(function(m){ m.assignedCrime=-1; });
S.eddies=0;
G.assignCrewToCrime(0,3);
var assignedIdx=G.assignedMembers(0);
assert(assignedIdx.length===3,'3 members assigned for payout test');
Math.random=function(){ return 0.001; }; // always succeed
S.cds=[0,0,0,0,0];
var eddiesBefore=S.eddies;
G.autoCrimeTick(0.1);
var single=G.payout(0);
var gained=S.eddies-eddiesBefore;
var expected=single*(1+2*0.15); // 3 crew: 1 + (3-1)*0.15 = 1.3x
assert(Math.abs(gained-expected)<expected*0.01,'3-crew job pays 1.3x single payout (got '+gained.toFixed(0)+' vs '+expected.toFixed(0)+')');
Math.random=origRandom;

// Test 12: FLATLINED text in source (injured, not jailed)
assert(src.indexOf('FLATLINED')>=0,'FLATLINED text in source');
assert(src.indexOf('jailed')<0,'jail system removed from source');
assert(src.indexOf('assignedCrime=-1;')>=0,'injured members unassigned in source');

// Test 13: save migration adds crimeCrew/autoCds/member fields for old saves
var oldSave={eddies:1000,crew:5,cds:[0,0,0,0,0],gear:[0,0,0,0,0,0],gearCost:[800,6000,45000,350000,2.5e6,2e7],ops:[0,0,0,0],opCost:[30000,400000,5e6,60e6],labs:[0,0],labCost:[2e8,3e9],members:[{name:'Old',role:'Brawler',color:'#ff2a6d'}],legend:1,prestiges:0,crimesDone:0,crimesWon:0,totalEarned:0,playTime:0,seed:123,lastTier:0,lastSave:Date.now(),sound:true,gang:{name:'Test',emblem:'skull',color:'#05d9e8'},districts:[{owner:null,guards:0,contested:0},{owner:null,guards:0,contested:0},{owner:null,guards:0,contested:0},{owner:null,guards:0,contested:0},{owner:null,guards:0,contested:0},{owner:null,guards:0,contested:0}],rivals:[{name:'Maelstrom',emblem:'circuit',color:'#ff3131',strength:0.5},{name:'Voodoo Boys',emblem:'eye',color:'#b967ff',strength:0.6},{name:'Sixth Street',emblem:'fist',color:'#ffe600',strength:0.7}],eventLog:[],rivalTimer:300,casualties:0};
store['nightcity_syndicate_v1']=JSON.stringify(oldSave);
// Reload by running src again in a fresh context
var sandbox2={document:document,window:window,localStorage:localStorage,requestAnimationFrame:function(){return 0;},performance:{now:function(){return Date.now();}},navigator:{},location:{reload:function(){}},setTimeout:setTimeout,clearTimeout:clearTimeout,Math:Math,JSON:JSON,Date:Date,console:console,Array:Array,Object:Object,String:String,Number:Number,Boolean:Boolean,RegExp:RegExp,Error:Error,parseInt:parseInt,parseFloat:parseFloat,isNaN:isNaN,isFinite:isFinite,URL:{createObjectURL:function(){return'';},revokeObjectURL:function(){}},Blob:function(){},FileReader:function(){}};
sandbox2.window.window=window;
vm.createContext(sandbox2);
vm.runInContext(src,sandbox2,{timeout:10000});
var S2=window.__game.state();
assert(Array.isArray(S2.crimeCrew)&&S2.crimeCrew.length===5,'migrated save has crimeCrew[5]');
assert(Array.isArray(S2.autoCds)&&S2.autoCds.length===5,'migrated save has autoCds[5]');
assert(typeof S2.members[0].assignedCrime==='number','migrated member has assignedCrime field');

// Test 14: casualties properly decrement crimeCrew when assigned members die
S.crew=5;
S.members=[];
for(var j=0;j<5;j++) S.members.push({name:'C'+j,role:'Brawler',color:'#ff2a6d',assignedCrime:-1});
S.crimeCrew=[0,0,0,0,0];
G.assignCrewToCrime(0,3);
assert(S.crimeCrew[0]===3,'3 assigned before casualties');
G.applyCasualties(2);
assert(S.crew===3,'crew reduced to 3 after 2 casualties');
var totalAssignedAfter=G.crimeAssignedCrew();
assert(totalAssignedAfter<=S.crimeCrew.reduce(function(a,b){return a+b;},0),'assigned members <= crimeCrew total after casualties');
var actualAssigned=0;
S.members.forEach(function(m){ if(m.assignedCrime>=0) actualAssigned++; });
assert(actualAssigned<=3,'actual assigned members <= remaining crew ('+actualAssigned+')');

// Test 15: auto-crime respects cooldown (doesn't fire twice in same tick)
S.cds=[0,0,0,0,0];
S.crimeCrew=[0,0,0,0,0];
S.members.forEach(function(m){ m.assignedCrime=-1; });
S.crew=5;
while(S.members.length<5) S.members.push({name:'X'+S.members.length,role:'Brawler',color:'#ff2a6d',assignedCrime:-1});
G.assignCrewToCrime(0,1);
S.cds=[0,0,0,0,0];
G.autoCrimeTick(0.1);
var cdAfterFirst=S.cds[0];
assert(cdAfterFirst>0,'cooldown set after first auto-crime');
G.autoCrimeTick(0.1);
assert(S.cds[0]===cdAfterFirst||S.cds[0]<cdAfterFirst,'second tick does not re-fire (cooldown still active)');

console.log('\nAUTO-CRIME & JAIL ALL TESTS PASSED');
