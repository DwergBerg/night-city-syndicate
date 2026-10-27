// Final integration: drive real rAF frame loop with rivals + districts active
var fs=require('fs');
var src=fs.readFileSync(require('path').join(__dirname,'extracted.js'),'utf8');
function makeCtx(){var g={addColorStop:function(){}};return new Proxy({},{get:function(t,p){if(p==='canvas')return{width:800,height:600};if(p==='createLinearGradient'||p==='createRadialGradient')return function(){return g;};return function(){};},set:function(){return true;}});}
function makeEl(id){var el={id:id,style:{_display:undefined},children:[],classList:{add:function(){},remove:function(){},toggle:function(){}},_text:'',innerHTML:'',value:'',appendChild:function(c){this.children.push(c);this._syncFirst();return c;},removeChild:function(c){var i=this.children.indexOf(c);if(i>=0)this.children.splice(i,1);this._syncFirst();return c;},_syncFirst:function(){Object.defineProperty(this,'firstChild',{get:function(){return this.children[0]||null;},configurable:true});},firstChild:null,scrollTop:0,scrollHeight:0,addEventListener:function(){},querySelectorAll:function(){return [];},getBoundingClientRect:function(){return{left:100,top:100,width:50,height:20};},getContext:function(){return makeCtx();},setAttribute:function(){},getAttribute:function(){return null;},parentNode:null};Object.defineProperty(el,'textContent',{get:function(){return this._text;},set:function(v){this._text=String(v);}});Object.defineProperty(el.style,'display',{get:function(){return this._display;},set:function(v){this._display=v;}});el._syncFirst();return el;}
var els={};function getEl(id){if(!els[id])els[id]=makeEl(id);return els[id];}
var store={};var localStorage={getItem:function(k){return store[k]||null;},setItem:function(k,v){store[k]=String(v);},removeItem:function(k){delete store[k];}};
var document={getElementById:getEl,createElement:function(t){return makeEl(t);},querySelectorAll:function(){return[];},body:makeEl('body')};
var rafQ=[];var fakeNow=1000;
var window={innerWidth:1280,innerHeight:800,devicePixelRatio:1,AudioContext:function(){throw 0;},addEventListener:function(){},confirm:function(){return true;},localStorage:localStorage};
var sandbox={document:document,window:window,localStorage:localStorage,requestAnimationFrame:function(cb){rafQ.push(cb);return rafQ.length;},performance:{now:function(){return fakeNow;}},navigator:{},location:{reload:function(){}},setTimeout:setTimeout,clearTimeout:clearTimeout,Math:Math,JSON:JSON,Date:Date,console:console,Array:Array,Object:Object,String:String,Number:Number,Boolean:Boolean,RegExp:RegExp,Error:Error,parseInt:parseInt,parseFloat:parseFloat,isNaN:isNaN,isFinite:isFinite};
sandbox.window.window=window;
var vm=require('vm');vm.createContext(sandbox);
vm.runInContext(src,sandbox,{timeout:10000});
var G=window.__game;
var s=G.state();
s.gang={name:'Final Test',emblem:'dragon',color:'#ff2a6d'};
s.crew=40; s.eddies=1e8;
for(var i=0;i<40;i++){ s.members.push({name:'F'+i,role:'Brawler',color:'#f00'}); G.hire(); }
// claim 2 districts, assign guards
s.districts[0].owner='player'; s.districts[0].guards=5;
s.districts[1].owner='Maelstrom';
// rival contests will fire during frames
var frames=0,errors=0;
function run(n){for(var i=0;i<n;i++){var q=rafQ;rafQ=[];fakeNow+=16.7;frames++;for(var j=0;j<q.length;j++){try{q[j](fakeNow);}catch(e){errors++;if(errors<3)console.log('ERR:',e.message);}}}}
run(60);
G.tab('districts'); run(30);
G.tab('crimes'); run(30);
G.tab('crew'); run(30);
G.tab('gear'); run(30);
G.tab('ops'); run(30);
G.tab('stats'); run(30);
// force many rival contests
s.rivalTimer=0.01;
for(var k=0;k<10;k++){ s.rivalTimer=0.01; G.tick(1); run(2); }
// attack rival district
G.attackDistrict(1);
run(30);
// prestige
s.eddies=6e9;
G.prestige();
run(30);
assert(errors===0,'no frame errors across '+frames+' frames with all systems active, errors='+errors);
assert(s.eventLog.length>0,'event log has entries: '+s.eventLog.length);
assert(getEl('eventLog').children.length>0,'event log DOM populated');
function assert(c,m){if(!c){console.log('FAIL:',m);process.exit(1);}console.log('ok -',m);}
console.log('ok - event log entries: '+s.eventLog.length);
console.log('ok - districts: '+s.districts.filter(function(d){return d.owner==='player';}).length+' held by player');
console.log('\nFINAL INTEGRATION PASSED ('+frames+' frames, 0 errors)');
process.exit(0);
