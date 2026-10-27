// Step 2 verify: export/import roundtrip + old save still loads
var fs=require('fs');
var src=fs.readFileSync(require('path').join(__dirname,'extracted.js'),'utf8');
function makeCtx(){var g={addColorStop:function(){}};return new Proxy({},{get:function(t,p){if(p==='canvas')return{width:800,height:600};if(p==='createLinearGradient'||p==='createRadialGradient')return function(){return g;};return function(){};},set:function(){return true;}});}
function makeEl(id){var el={id:id,style:{_display:undefined},children:[],classList:{add:function(){},remove:function(){},toggle:function(){}},_text:'',innerHTML:'',value:'',appendChild:function(c){this.children.push(c);return c;},addEventListener:function(ev,fn){(this._listeners=this._listeners||{})[ev]=fn;},click:function(){if(this._listeners&&this._listeners.click)this._listeners.click({target:this});},querySelectorAll:function(){return [];},getBoundingClientRect:function(){return{left:100,top:100,width:50,height:20};},getContext:function(){return makeCtx();},setAttribute:function(){},getAttribute:function(){return null;},parentNode:null};Object.defineProperty(el,'textContent',{get:function(){return this._text;},set:function(v){this._text=String(v);}});Object.defineProperty(el.style,'display',{get:function(){return this._display;},set:function(v){this._display=v;}});return el;}
var els={};function getEl(id){if(!els[id])els[id]=makeEl(id);return els[id];}
var store={};var localStorage={getItem:function(k){return Object.prototype.hasOwnProperty.call(store,k)?store[k]:null;},setItem:function(k,v){store[k]=String(v);},removeItem:function(k){delete store[k];}};

// capture downloads
var downloads=[];
var URLStub={createObjectURL:function(blob){downloads.push(blob);return 'blob:fake';},revokeObjectURL:function(){}};
var _body=makeEl('body');_body.removeChild=function(c){var i=this.children.indexOf(c);if(i>=0)this.children.splice(i,1);return c;};var document={getElementById:getEl,createElement:function(t){return makeEl(t);},querySelectorAll:function(){return[];},body:_body};
var window={innerWidth:1280,innerHeight:800,devicePixelRatio:1,AudioContext:function(){throw 0;},addEventListener:function(){},confirm:function(){return true;},localStorage:localStorage};
var sandbox={document:document,window:window,localStorage:localStorage,requestAnimationFrame:function(){return 0;},performance:{now:function(){return Date.now();}},navigator:{},location:{reload:function(){sandbox._reloaded=true;}},setTimeout:setTimeout,clearTimeout:clearTimeout,Math:Math,JSON:JSON,Date:Date,console:console,Array:Array,Object:Object,String:String,Number:Number,Boolean:Boolean,RegExp:RegExp,Error:Error,parseInt:parseInt,parseFloat:parseFloat,isNaN:isNaN,isFinite:isFinite,Blob:function(parts,opts){this.parts=parts;this.type=opts&&opts.type;},URL:URLStub,FileReader:function(){this.readAsText=function(f){var self=this;setTimeout(function(){self.result=f._content;self.onload&&self.onload();},0);};}};
sandbox.window.window=window;
var vm=require('vm');vm.createContext(sandbox);
vm.runInContext(src,sandbox,{timeout:10000});
var G=window.__game;
function assert(c,m){if(!c){console.log('FAIL:',m);process.exit(1);}console.log('ok -',m);}

// set up a save with gang identity
var s=G.state();
s.gang={name:'Save Test Crew',emblem:'dragon',color:'#ff2a6d'};
s.eddies=123456; s.crew=15; s.heat=42;
s.gear[0]=3; s.ops[1]=1;

// trigger save via the game's internal save (called by prestige path or autosave)
// We don't export save(); call exportSave via the stats tab button instead.
G.tab('stats');
// find the EXPORT SAVE button in tabContent children
var tc=getEl('tabContent');
var exportBtn=null, importBtn=null;
function findBtn(node,text){
  if(node._text===text) return node;
  for(var i=0;i<node.children.length;i++){ var r=findBtn(node.children[i],text); if(r) return r; }
  return null;
}
exportBtn=findBtn(tc,'EXPORT SAVE');
importBtn=findBtn(tc,'IMPORT SAVE');
assert(exportBtn,'export button exists in stats tab');
assert(importBtn,'import button exists in stats tab');

// click export (confirm stubbed true) — but exportSave calls save() first which writes to store
// then creates a blob. Our Blob stub captures parts.
downloads.length=0;
exportBtn.click();
assert(downloads.length===1,'export produced a download blob');
assert(store['nightcity_syndicate_v1'],'save written to localStorage on export');

// read the blob content
var blob=downloads[0];
var exported=JSON.parse(blob.parts[0]);
assert(exported.eddies===123456,'exported save has eddies: '+exported.eddies);
assert(exported.crew===15,'exported save has crew');
assert(exported.gang.name==='Save Test Crew','exported save has gang name');
assert(exported.gear[0]===3,'exported save has gear');
assert(exported.ops[1]===1,'exported save has ops');

// --- Import roundtrip: wipe store, import the exported JSON, reload ---
delete store['nightcity_syndicate_v1'];
assert(!store['nightcity_syndicate_v1'],'store wiped before import');

// simulate file import: create a fake file object with _content
var fakeFile={_content:blob.parts[0],name:'save.json'};
// importSave is not exported; trigger via the hidden file input change event
var importFile=getEl('importFile');
importFile.files=[fakeFile];
// call the change listener registered in init
if(importFile._listeners&&importFile._listeners.change){
  importFile._listeners.change({target:importFile});
}else{
  // fallback: the import button clicks importFile; we need the change handler.
  // It's registered in init via addEventListener('change',...). Our stub stores it.
  assert(false,'import change listener registered');
}
// FileReader is async via setTimeout(0) — wait
setTimeout(function(){
  assert(store['nightcity_syndicate_v1'],'import wrote to localStorage');
  var imported=JSON.parse(store['nightcity_syndicate_v1']);
  assert(imported.eddies===123456,'imported eddies match: '+imported.eddies);
  assert(imported.crew===15,'imported crew match');
  assert(imported.gang.name==='Save Test Crew','imported gang name match');
  assert(imported.gear[0]===3,'imported gear match');
  console.log('ok - import roundtrip preserves all fields');

  // reload the game with the imported save
  var sandbox2={document:document,window:window,localStorage:localStorage,requestAnimationFrame:function(){return 0;},performance:{now:function(){return Date.now();}},navigator:{},location:{reload:function(){}},setTimeout:setTimeout,clearTimeout:clearTimeout,Math:Math,JSON:JSON,Date:Date,console:console,Array:Array,Object:Object,String:String,Number:Number,Boolean:Boolean,RegExp:RegExp,Error:Error,parseInt:parseInt,parseFloat:parseFloat,isNaN:isNaN,isFinite:isFinite,Blob:sandbox.Blob,URL:URLStub,FileReader:sandbox.FileReader};
  sandbox2.window.window=window;
  vm.createContext(sandbox2);
  vm.runInContext(src,sandbox2,{timeout:10000});
  var G2=sandbox2.window.__game;
  var s2=G2.state();
  assert(s2.eddies===123456,'reloaded eddies: '+s2.eddies);
  assert(s2.crew===15,'reloaded crew: '+s2.crew);
  assert(s2.gang.name==='Save Test Crew','reloaded gang name: '+s2.gang.name);
  assert(s2.gear[0]===3,'reloaded gear');
  assert(getEl('intro').style.display==='none','reloaded save with gang skips naming screen');
  console.log('ok - full export -> wipe -> import -> reload cycle preserves everything');

  // --- Old save (no gang) still loads after this update ---
  delete store['nightcity_syndicate_v1'];
  var oldSave={eddies:777,crew:4,crewCost:1500,heat:10,bribes:0,cds:[0,0,0,0,0],
    gear:[0,0,0,0,0,0],gearCost:[800,6000,45000,350000,2500000,20000000],
    ops:[0,0,0,0],opCost:[30000,400000,5000000,60000000],
    labs:[0,0],labCost:[200000000,3000000000],
    members:[],legend:1,prestiges:0,crimesDone:0,crimesWon:0,totalEarned:0,playTime:0,
    seed:999,lastTier:0,lastSave:Date.now()-5000,sound:true};
  store['nightcity_syndicate_v1']=JSON.stringify(oldSave);
  var sandbox3={document:document,window:window,localStorage:localStorage,requestAnimationFrame:function(){return 0;},performance:{now:function(){return Date.now();}},navigator:{},location:{reload:function(){}},setTimeout:setTimeout,clearTimeout:clearTimeout,Math:Math,JSON:JSON,Date:Date,console:console,Array:Array,Object:Object,String:String,Number:Number,Boolean:Boolean,RegExp:RegExp,Error:Error,parseInt:parseInt,parseFloat:parseFloat,isNaN:isNaN,isFinite:isFinite,Blob:sandbox.Blob,URL:URLStub,FileReader:sandbox.FileReader};
  sandbox3.window.window=window;
  vm.createContext(sandbox3);
  vm.runInContext(src,sandbox3,{timeout:10000});
  var G3=sandbox3.window.__game;
  assert(G3.state().eddies===777,'pre-identity save still loads: eddies='+G3.state().eddies);
  assert(G3.state().crew===4,'pre-identity save crew: '+G3.state().crew);
  assert(getEl('intro').style.display==='flex','pre-identity save gets naming screen once');
  console.log('ok - old (pre-identity) save loads and gets naming screen');

  // --- Invalid import is rejected ---
  delete store['nightcity_syndicate_v1'];
  s.eddies=555;
  var badFile={_content:'{"not":"a save"}',name:'bad.json'};
  var importFile2=getEl('importFile');
  importFile2.files=[badFile];
  importFile2._listeners.change({target:importFile2});
  setTimeout(function(){
    assert(!store['nightcity_syndicate_v1'],'invalid import rejected, store untouched');
    console.log('\nSTEP 2 (SAVE MANAGEMENT) ALL TESTS PASSED');
  },10);
},10);
