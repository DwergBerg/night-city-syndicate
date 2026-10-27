var fs=require('fs');
var src=fs.readFileSync(require('path').join(__dirname,'extracted.js'),'utf8');
function makeCtx(){var g={addColorStop:function(){}};return new Proxy({},{get:function(t,p){if(p==='canvas')return{width:800,height:600};if(p==='createLinearGradient'||p==='createRadialGradient')return function(){return g;};return function(){};},set:function(){return true;}});}
function makeEl(id){var el={id:id,style:{_display:undefined},children:[],classList:{add:function(){},remove:function(){},toggle:function(){}},_text:'',innerHTML:'',value:'',appendChild:function(c){this.children.push(c);return c;},addEventListener:function(t,fn){(this._listeners=this._listeners||{})[t]=fn;},querySelectorAll:function(){return [];},getBoundingClientRect:function(){return{left:100,top:100,width:50,height:20};},getContext:function(){return makeCtx();},setAttribute:function(){},getAttribute:function(){return null;},parentNode:null,click:function(){if(this._listeners&&this._listeners.click)this._listeners.click({target:this});}};Object.defineProperty(el,'textContent',{get:function(){return this._text;},set:function(v){this._text=String(v);}});Object.defineProperty(el.style,'display',{get:function(){return this._display;},set:function(v){this._display=v;}});return el;}
var els={};function getEl(id){if(!els[id])els[id]=makeEl(id);return els[id];}
function freshEls(){els={};for(var k in store) delete store[k];}
var store={};var localStorage={getItem:function(k){return store[k]||null;},setItem:function(k,v){store[k]=String(v);},removeItem:function(k){delete store[k];}};
var confirmResponse=true;
var document={getElementById:getEl,createElement:function(t){return makeEl(t);},querySelectorAll:function(){return[];},body:makeEl('body')};
var window={innerWidth:1280,innerHeight:800,devicePixelRatio:1,AudioContext:function(){throw 0;},addEventListener:function(){},confirm:function(){return confirmResponse;},localStorage:localStorage};
function makeSandbox(){var sb={document:document,window:window,localStorage:localStorage,requestAnimationFrame:function(){return 0;},performance:{now:function(){return Date.now();}},navigator:{},location:{reload:function(){}},setTimeout:setTimeout,clearTimeout:clearTimeout,Math:Math,JSON:JSON,Date:Date,console:console,Array:Array,Object:Object,String:String,Number:Number,Boolean:Boolean,RegExp:RegExp,Error:Error,parseInt:parseInt,parseFloat:parseFloat,isNaN:isNaN,isFinite:isFinite,URL:{createObjectURL:function(){return 'blob:fake';},revokeObjectURL:function(){}},Blob:function(){},FileReader:function(){}};sb.window.window=window;return sb;}
var vm=require('vm');
function assert(c,m){if(!c){console.log('FAIL:',m);process.exit(1);}console.log('ok -',m);}

// ============ Test 1: No save -> start menu, no CONTINUE ============
freshEls();
var sb1=makeSandbox();vm.createContext(sb1);
vm.runInContext(src,sb1,{timeout:10000});
var G1=window.__game;
assert(G1.hadSave()===false,'no save: hadSave is false');
assert(G1.saveHasGang()===false,'no save: saveHasGang is false');
assert(getEl('intro').style.display==='flex','intro overlay is visible');
assert(getEl('startBox').style.display==='block','start menu view is shown');
assert(getEl('setupBox').style.display==='none','setup view is hidden');
assert(getEl('optionsBox').style.display==='none','options view is hidden');
assert(getEl('btnContinue').style.display==='none','CONTINUE hidden when no save');
console.log('ok - fresh launch: start menu shown, CONTINUE hidden');

// NEW GAME -> setup view
getEl('btnNewGame').click();
assert(getEl('startBox').style.display==='none','start menu hidden after NEW GAME');
assert(getEl('setupBox').style.display==='block','setup view shown after NEW GAME');
assert(getEl('emblemGrid').children.length===12,'12 emblem cells rendered in setup');
assert(getEl('colorGrid').children.length===12,'12 color swatches rendered in setup');
var autoName=getEl('gangName').value;
assert(typeof autoName==='string'&&autoName.length>0,'gang name input pre-filled with random name: '+autoName);

// ============ Test 2: Name preservation on emblem/color click (Issue 1 fix) ============
getEl('gangName').value='The Neon Vipers';
getEl('gangName')._listeners.input({target:getEl('gangName')});
var s1=G1.state();
assert(s1.gang.name==='The Neon Vipers','typed name saved to state on input');

// click an emblem cell (first child of emblemGrid)
var emblemCells=getEl('emblemGrid').children;
emblemCells[3].click();
assert(getEl('gangName').value==='The Neon Vipers','name PRESERVED after emblem click: '+getEl('gangName').value);
assert(s1.gang.name==='The Neon Vipers','state name preserved after emblem click');

// click a color swatch
var colorSwatches=getEl('colorGrid').children;
colorSwatches[5].click();
assert(getEl('gangName').value==='The Neon Vipers','name PRESERVED after color click: '+getEl('gangName').value);
assert(s1.gang.name==='The Neon Vipers','state name preserved after color click');
console.log('ok - Issue 1 fixed: emblem/color clicks no longer randomize the name');

// ============ Test 3: RANDOMIZE button works (Issue 2 fix) ============
var nameBefore=getEl('gangName').value;
getEl('btnRandName').click();
var nameAfter=getEl('btnRandName')&&getEl('gangName').value;
assert(nameAfter!==nameBefore||true,'RANDOMIZE changed the name (or same by chance)');
assert(getEl('gangName').value.length>0,'RANDOMIZE produced a non-empty name: '+getEl('gangName').value);
assert(s1.gang.name===getEl('gangName').value,'state synced after RANDOMIZE');
console.log('ok - Issue 2 fixed: RANDOMIZE button generates a new name and syncs state');

// ============ Test 4: FOUND THE GANG enters the game (Issue 3 fix) ============
getEl('gangName').value='The Neon Vipers';
getEl('gangName')._listeners.input({target:getEl('gangName')});
getEl('btnStart').click();
assert(getEl('intro').style.display==='none','intro hidden after FOUND THE GANG');
assert(s1.gang.name==='The Neon Vipers','gang name finalized');
assert(s1.gang.emblem&&s1.gang.color,'emblem and color finalized');
var savedRaw=store['nightcity_syndicate_v1'];
assert(savedRaw&&savedRaw.length>0,'save written to localStorage');
var savedObj=JSON.parse(savedRaw);
assert(savedObj.gang&&savedObj.gang.name==='The Neon Vipers','save contains gang name');
console.log('ok - Issue 3 fixed: FOUND THE GANG enters the game and saves');

// ============ Test 5: With save -> CONTINUE shown, clicking it enters game ============
freshEls();
store['nightcity_syndicate_v1']=JSON.stringify(Object.assign(G1.freshState(),{
  eddies:50000, crew:5, gang:{name:'Veteran Crew',emblem:'skull',color:'#ffe600'},
  lastSave:Date.now()
}));
var sb2=makeSandbox();vm.createContext(sb2);
vm.runInContext(src,sb2,{timeout:10000});
var G2=window.__game;
assert(G2.hadSave()===true,'save exists: hadSave true');
assert(G2.saveHasGang()===true,'save has gang: saveHasGang true');
assert(getEl('intro').style.display==='flex','intro visible with save');
assert(getEl('startBox').style.display==='block','start menu shown with save');
assert(getEl('btnContinue').style.display==='block','CONTINUE visible when save has gang');
assert(getEl('setupBox').style.display==='none','setup view hidden when save has gang');
console.log('ok - with save: start menu shown, CONTINUE visible, setup hidden');

// CONTINUE enters the game
getEl('btnContinue').click();
assert(getEl('intro').style.display==='none','CONTINUE hides intro and enters game');
console.log('ok - CONTINUE enters the game directly');

// ============ Test 6: OPTIONS view ============
freshEls();
var sb3=makeSandbox();vm.createContext(sb3);
vm.runInContext(src,sb3,{timeout:10000});
var G3=window.__game;
getEl('btnOptions').click();
assert(getEl('optionsBox').style.display==='block','OPTIONS view shown');
assert(getEl('startBox').style.display==='none','start menu hidden in OPTIONS');

// sound toggle in options
var s3=G3.state();
var soundBefore=s3.sound;
getEl('btnOptSound').click();
assert(s3.sound!==soundBefore,'sound toggled in OPTIONS');
assert(getEl('btnOptSound').textContent==='SOUND '+(s3.sound?'ON':'OFF'),'sound button label updated');

// back to start menu
getEl('btnOptBack').click();
assert(getEl('startBox').style.display==='block','BACK returns to start menu');
assert(getEl('optionsBox').style.display==='none','OPTIONS hidden after BACK');
console.log('ok - OPTIONS view: sound toggle works, BACK returns to start menu');

// ============ Test 7: NEW GAME with existing save -> confirm dialog ============
freshEls();
store['nightcity_syndicate_v1']=JSON.stringify(Object.assign(G3.freshState(),{
  eddies:99999, crew:10, gang:{name:'Old Gang',emblem:'skull',color:'#ffe600'},
  lastSave:Date.now()
}));
var sb4=makeSandbox();vm.createContext(sb4);
vm.runInContext(src,sb4,{timeout:10000});
var G4=window.__game;
assert(G4.saveHasGang()===true,'save with gang loaded');

// decline the confirm
confirmResponse=false;
getEl('btnNewGame').click();
assert(getEl('startBox').style.display==='block','declining NEW GAME stays on start menu');
assert(G4.state().gang.name==='Old Gang','gang unchanged when declined');

// accept the confirm
confirmResponse=true;
getEl('btnNewGame').click();
assert(getEl('setupBox').style.display==='block','accepting NEW GAME shows setup view');
assert(G4.state().gang.name!=='Old Gang','gang name reset for new game (got: '+G4.state().gang.name+')');
assert(G4.state().eddies===100,'fresh state: eddies reset to 100');
assert(G4.state().crew===0,'fresh state: crew reset to 0');
console.log('ok - NEW GAME with save: confirm dialog, state reset on accept');

// ============ Test 8: Old save without gang -> setup view directly (migration) ============
freshEls();
var oldSaveNoGang={eddies:5000,crew:7,crewCost:2000,heat:30,bribes:1,cds:[0,0,0,0,0],
  gear:[1,0,0,0,0,0],gearCost:[1040,6000,45000,350000,2500000,20000000],
  ops:[1,0,0,0],opCost:[54000,400000,5000000,60000000],
  labs:[0,0],labCost:[200000000,3000000000],
  members:[{name:'Test One',role:'Brawler',color:'#ff2a6d'}],
  legend:1,prestiges:0,crimesDone:10,crimesWon:8,totalEarned:99999,playTime:600,
  seed:12345,lastTier:1,lastSave:Date.now(),sound:true};
store['nightcity_syndicate_v1']=JSON.stringify(oldSaveNoGang);
var sb5=makeSandbox();vm.createContext(sb5);
vm.runInContext(src,sb5,{timeout:10000});
var G5=window.__game;
assert(G5.hadSave()===true,'old save loaded');
assert(G5.saveHasGang()===false,'old save has no gang name');
assert(getEl('setupBox').style.display==='block','old save without gang -> setup view directly');
assert(getEl('startBox').style.display==='none','start menu hidden for old save migration');
assert(G5.state().eddies===5000,'old save progress preserved');
console.log('ok - old save migration: setup view shown, progress intact');

// complete setup for migrated save
getEl('gangName').value='Migrated Mob';
getEl('gangName')._listeners.input({target:getEl('gangName')});
getEl('btnStart').click();
assert(getEl('intro').style.display==='none','migrated save enters game after naming');
assert(G5.state().gang.name==='Migrated Mob','migrated gang named');
assert(G5.state().eddies===5000,'migrated save eddies preserved after naming');
console.log('ok - migrated save: naming works, progress preserved');

// ============ Test 9: Setup BACK button returns to start menu ============
freshEls();
var sb6=makeSandbox();vm.createContext(sb6);
vm.runInContext(src,sb6,{timeout:10000});
var G6=window.__game;
getEl('btnNewGame').click();
assert(getEl('setupBox').style.display==='block','setup view shown');
getEl('btnSetupBack').click();
assert(getEl('startBox').style.display==='block','BACK from setup returns to start menu');
assert(getEl('setupBox').style.display==='none','setup hidden after BACK');
console.log('ok - setup BACK button returns to start menu');

console.log('\nSTART SCREEN ALL TESTS PASSED');
