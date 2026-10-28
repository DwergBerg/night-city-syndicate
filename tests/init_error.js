var fs=require('fs');
var src=fs.readFileSync(require('path').join(__dirname,'extracted.js'),'utf8');
function makeCtx(){var g={addColorStop:function(){}};return new Proxy({},{get:function(t,p){if(p==='canvas')return{width:800,height:600};if(p==='createLinearGradient'||p==='createRadialGradient')return function(){return g;};return function(){};},set:function(){return true;}});}
function makeEl(id){var el={id:id,style:{_display:undefined},children:[],className:'',classList:{add:function(c){(this._cls=this._cls||[]).push(c);},remove:function(){},toggle:function(){},contains:function(c){return (this._cls||[]).indexOf(c)>=0;}},_text:'',_innerHTML:'',value:'',appendChild:function(c){this.children.push(c);return c;},addEventListener:function(ev,fn){(this._listeners=this._listeners||{})[ev]=fn;},click:function(){if(this._listeners&&this._listeners.click)this._listeners.click({target:this});},querySelectorAll:function(sel){if(sel==='.tab'&&id==='tabs'){var tabs=[];for(var i=0;i<4;i++){var t=makeEl('tab'+i);t.className='tab';t._dt=['crew','ops','districts','stats'][i];tabs.push(t);}return tabs;}return [];},getBoundingClientRect:function(){return{left:100,top:100,width:50,height:20};},getContext:function(){return makeCtx();},setAttribute:function(k,v){if(k==='data-tab')this._dt=v;},getAttribute:function(k){return k==='data-tab'?(this._dt||null):null;},parentNode:null,disabled:false};Object.defineProperty(el,'textContent',{get:function(){return this._text;},set:function(v){this._text=String(v);}});Object.defineProperty(el,'innerHTML',{get:function(){return this._innerHTML;},set:function(v){this._innerHTML=v;if(v==='')this.children=[];}});Object.defineProperty(el.style,'display',{get:function(){return this._display;},set:function(v){this._display=v;}});return el;}
var els={};function getEl(id){if(!els[id]){els[id]=makeEl(id);if(id==='tabs'){var tabNames=['crew','ops','districts','stats'];tabNames.forEach(function(name){var t=makeEl('tab-'+name);t.className='tab';t._dt=name;els[id].children.push(t);});els[id].appendChild=function(c){this.children.push(c);return c;};}}return els[id];}
var store={};var localStorage={getItem:function(k){return store[k]||null;},setItem:function(k,v){store[k]=String(v);},removeItem:function(k){delete store[k];}};
var document={getElementById:getEl,createElement:function(t){return makeEl(t);},querySelectorAll:function(){return[];},body:makeEl('body')};
var window={innerWidth:1280,innerHeight:800,devicePixelRatio:1,AudioContext:function(){throw 0;},addEventListener:function(){},confirm:function(){return true;},localStorage:localStorage};
var sandbox={document:document,window:window,localStorage:localStorage,requestAnimationFrame:function(){return 0;},performance:{now:function(){return Date.now();}},navigator:{},location:{reload:function(){}},setTimeout:setTimeout,clearTimeout:clearTimeout,Math:Math,JSON:JSON,Date:Date,console:console,Array:Array,Object:Object,String:String,Number:Number,Boolean:Boolean,RegExp:RegExp,Error:Error,parseInt:parseInt,parseFloat:parseFloat,isNaN:isNaN,isFinite:isFinite,URL:{createObjectURL:function(){return'';},revokeObjectURL:function(){}},Blob:function(){},FileReader:function(){}};
sandbox.window.window=window;
var vm=require('vm');vm.createContext(sandbox);
function assert(c,m){if(!c){console.log('FAIL:',m);process.exit(1);}console.log('ok -',m);}

// Run the game - this should NOT throw "b is not defined"
var initError=null;
try{
  vm.runInContext(src,sandbox,{timeout:10000});
}catch(e){
  initError=e;
}
assert(initError===null,'init() does not throw (was: '+(initError?initError.message:'no error')+')');

var G=window.__game;
assert(G,'window.__game exists after init');

// Verify wireTabs worked: tab buttons should have click listeners
var tabsEl=getEl('tabs');
assert(tabsEl.children.length===4,'4 tab buttons in nav children');
var withListeners=tabsEl.children.filter(function(t){return t._listeners&&t._listeners.click;});
assert(withListeners.length===4,'all 4 tab buttons have click listeners attached ('+withListeners.length+' found)');

// Verify main buttons have listeners
assert(getEl('btnContinue')._listeners&&getEl('btnContinue')._listeners.click,'btnContinue has click listener');
assert(getEl('btnNewGame')._listeners&&getEl('btnNewGame')._listeners.click,'btnNewGame has click listener');
assert(getEl('btnOptions')._listeners&&getEl('btnOptions')._listeners.click,'btnOptions has click listener');
assert(getEl('btnSound')._listeners&&getEl('btnSound')._listeners.click,'btnSound has click listener');

// Verify tab switching works
getEl('btnNewGame').click();
assert(getEl('setupBox').style.display==='block','NEW GAME click works: setup shown');
assert(getEl('btnStart')._listeners&&getEl('btnStart')._listeners.click,'btnStart has click listener');
assert(getEl('btnRandName')._listeners&&getEl('btnRandName')._listeners.click,'btnRandName has click listener');

// Enter the game
getEl('btnNewGame').click();
getEl('gangName').value='Click Test Gang';
getEl('gangName')._listeners.input({target:getEl('gangName')});
getEl('btnStart').click();
var s=G.state();
s.eddies=1e6;
s.crew=5;
s.cds=[0,0,0,0,0];

// Test crime COMMIT button (crimes panel is permanent, in #crimePanel)
var crimePanel=getEl('crimePanel');
var commitBtn=null;
crimePanel.children.forEach(function(card){
  card.children.forEach(function(ch){
    if(ch._listeners&&ch._listeners.click&&ch._text==='COMMIT'&&ch.className&&ch.className.indexOf('crime-btn')>=0){
      if(!commitBtn) commitBtn=ch;
    }
  });
});
assert(commitBtn,'COMMIT button found with click listener in crimePanel');
var crimesBefore=s.crimesDone;
commitBtn.click();
assert(s.crimesDone>crimesBefore,'clicking COMMIT increments crimesDone (before='+crimesBefore+', after='+s.crimesDone+', crew='+s.crew+', cds='+JSON.stringify(s.cds)+')');

// Test HIRE button (upgrades panel is permanent, in #upgradePanel)
var upgradePanel=getEl('upgradePanel');
var hireBtn=null;
upgradePanel.children.forEach(function(row){
  if(row.children) row.children.forEach(function(ch){
    if(ch.children) ch.children.forEach(function(cch){
      if(cch._listeners&&cch._listeners.click&&cch._text==='HIRE') hireBtn=cch;
    });
    if(ch._listeners&&ch._listeners.click&&ch._text==='HIRE') hireBtn=ch;
  });
});
assert(hireBtn,'HIRE button found with click listener in upgradePanel');
var crewBefore=s.crew;
hireBtn.click();
assert(s.crew>crewBefore,'clicking HIRE increments crew');

// Test BUY gear button (in upgradePanel)
var buyBtn=null;
upgradePanel.children.forEach(function(row){
  if(row.children&&row.children.length>0){
    row.children.forEach(function(ch){
      if(ch.children) ch.children.forEach(function(cch){
        if(cch._listeners&&cch._listeners.click&&cch._text==='BUY') buyBtn=cch;
      });
    });
  }
});
assert(buyBtn,'BUY button found with click listener in upgradePanel');
var gearBefore=s.gear[0];
s.eddies=1e12;
buyBtn.click();
var gearTotal=s.gear.reduce(function(a,b){return a+b;},0);
assert(gearTotal>gearBefore,'clicking BUY increments gear (before='+gearBefore+', after='+gearTotal+', eddies='+s.eddies+')');

// Test crew assignment stepper
s.crew=10;
s.members=[];
for(var mi=0;mi<10;mi++) s.members.push({name:'M'+mi,role:'Brawler',color:'#ff2a6d',jail:0,assignedCrime:-1});
assert(G.assignCrewToCrime(0,2)===true,'assignCrewToCrime(0,2) succeeds');
assert(s.crimeCrew[0]===2,'crimeCrew[0]===2 after assign');
var assignedCount=0;
s.members.forEach(function(m){ if(m.assignedCrime===0) assignedCount++; });
assert(assignedCount===2,'2 members assigned to crime 0');
assert(G.activeCrew()===8,'activeCrew is 8 (10 - 2 assigned)');

console.log('\nINIT ERROR FIX ALL TESTS PASSED');
