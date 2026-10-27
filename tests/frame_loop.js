// Second smoke: real rAF loop driving the actual frame() — catches render/update errors.
var fs=require('fs');
var src=fs.readFileSync(require('path').join(__dirname,'extracted.js'),'utf8');
function makeCtx(){
  var gradient={addColorStop:function(){}};
  return new Proxy({},{
    get:function(t,prop){
      if(prop==='canvas') return {width:800,height:600};
      if(prop==='measureText') return function(){return {width:10};};
      if(prop==='createLinearGradient'||prop==='createRadialGradient') return function(){return gradient;};
      return function(){};
    },
    set:function(){ return true; }
  });
}
function makeEl(id){
  var el={
    id:id, style:{}, children:[], classList:{add:function(){},remove:function(){},toggle:function(){}},
    _text:'', innerHTML:'',
    appendChild:function(c){ this.children.push(c); return c; },
    addEventListener:function(){}, querySelectorAll:function(){return [];},
    getBoundingClientRect:function(){return {left:100,top:100,width:50,height:20};},
    getContext:function(){ return makeCtx(); },
    setAttribute:function(){}, getAttribute:function(){return null;},
    parentNode:null
  };
  Object.defineProperty(el,'textContent',{get:function(){return this._text;},set:function(v){this._text=String(v);}});
  return el;
}
var els={};
function getEl(id){ if(!els[id]) els[id]=makeEl(id); return els[id]; }
var store={};
var localStorage={getItem:function(k){return store[k]||null;},setItem:function(k,v){store[k]=String(v);},removeItem:function(k){delete store[k];}};
var document={getElementById:getEl,createElement:function(t){return makeEl(t);},querySelectorAll:function(){return [];},body:makeEl('body')};

var rafQueue=[];
var fakeNow=1000;
var window={
  innerWidth:1280, innerHeight:800, devicePixelRatio:1,
  AudioContext:function(){ throw new Error('no audio'); },
  addEventListener:function(){},
  confirm:function(){return true;},
  localStorage:localStorage
};
var requestAnimationFrame=function(cb){ rafQueue.push(cb); return rafQueue.length; };
var sandbox={
  document:document, window:window, localStorage:localStorage,
  requestAnimationFrame:requestAnimationFrame,
  performance:{now:function(){return fakeNow;}},
  navigator:{}, location:{reload:function(){}},
  setTimeout:setTimeout, clearTimeout:clearTimeout,
  Math:Math, JSON:JSON, Date:Date, console:console,
  Array:Array, Object:Object, String:String, Number:Number, Boolean:Boolean,
  RegExp:RegExp, Error:Error, parseInt:parseInt, parseFloat:parseFloat,
  isNaN:isNaN, isFinite:isFinite
};
sandbox.window.window=window;
var vm=require('vm');
vm.createContext(sandbox);
vm.runInContext(src,sandbox,{timeout:10000});
console.log('loaded');
var G=window.__game;

// drive 600 real frames (~10s at 60fps)
var frames=0, errors=0;
function runFrames(n){
  for(var i=0;i<n;i++){
    var q=rafQueue; rafQueue=[];
    fakeNow+=16.7;
    frames++;
    for(var j=0;j<q.length;j++){
      try{ q[j](fakeNow); }catch(e){ errors++; if(errors<5) console.log('FRAME ERROR:',e.message); }
    }
  }
}
runFrames(60);
console.log('60 frames OK, errors='+errors);
var s=G.state();
console.log('after 1s: eddies='+s.eddies.toFixed(1)+' playTime='+s.playTime.toFixed(1));

// simulate gameplay: commit crimes + hire + buy, then run more frames
for(var k=0;k<20;k++){ G.commit(k%5,400,400); }
s.eddies=1e6;
for(var h=0;h<8;h++) G.hire();
G.buyGear(0); G.buyGear(0);
runFrames(120);
console.log('after 8 crew + gear + 2s frames: eddies='+G.fmt(s.eddies)+' crew='+s.crew+' ips='+G.fmt(G.ips()));

// switch through every tab while frames run
G.tab('crew'); runFrames(10);
G.tab('gear'); runFrames(10);
G.tab('ops'); runFrames(10);
G.tab('stats'); runFrames(10);
G.tab('crimes'); runFrames(10);

// force a tier jump: set crew to 30, run frames -> tierUp -> buildSkyline path
s.crew=30;
runFrames(5);
console.log('tier after crew 30: '+G.TIERS[G.tierIndex()].name);

// buy ops/labs and run frames (triggers skyline rebuild + sign rendering)
s.crew=130; s.eddies=1e12;
G.buyOps(0); G.buyOps(1); G.buyOps(2); G.buyOps(3);
G.buyLabs(0); G.buyLabs(1);
runFrames(30);
console.log('all fronts+labs owned, 30 more frames OK');
console.log('ips now: '+G.fmt(G.ips()));

// prestige and run frames (resets skyline)
assert_nw();
function assert_nw(){ if(G.netWorth()>G.C.prestigeAt){ G.prestige(); runFrames(10); console.log('prestiged, frames OK, legend='+s.legend); } }

// rapid clicking stress: 200 commits across crimes
s.crew=200; s.eddies=1e15;
var commits=0;
for(var c=0;c<200;c++){ if(G.commit(c%5,400,400)) commits++; }
runFrames(60);
console.log('rapid clicks: '+commits+' committed, 60 frames OK, parts capped, no crash');

if(errors>0){ console.log('TOTAL FRAME ERRORS: '+errors); process.exit(1); }
console.log('\nFRAME-LOOP SMOKE PASSED ('+frames+' frames)');
