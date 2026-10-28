var fs=require('fs');
var src=fs.readFileSync(require('path').join(__dirname,'extracted.js'),'utf8');
var html=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');
function makeCtx(){var g={addColorStop:function(){}};return new Proxy({},{get:function(t,p){if(p==='canvas')return{width:800,height:600};if(p==='createLinearGradient'||p==='createRadialGradient')return function(){return g;};return function(){};},set:function(){return true;}});}
function makeEl(id){var el={id:id,style:{_display:undefined},children:[],classList:{add:function(){},remove:function(){},toggle:function(){}},_text:'',innerHTML:'',value:'',appendChild:function(c){this.children.push(c);return c;},addEventListener:function(ev,fn){(this._listeners=this._listeners||{})[ev]=fn;},click:function(){if(this._listeners&&this._listeners.click)this._listeners.click({target:this});},querySelectorAll:function(){return [];},getBoundingClientRect:function(){return{left:100,top:100,width:50,height:20};},getContext:function(){return makeCtx();},setAttribute:function(){},getAttribute:function(){return null;},parentNode:null,disabled:false};Object.defineProperty(el,'textContent',{get:function(){return this._text;},set:function(v){this._text=String(v);}});Object.defineProperty(el.style,'display',{get:function(){return this._display;},set:function(v){this._display=v;}});return el;}
var els={};function getEl(id){if(!els[id])els[id]=makeEl(id);return els[id];}
var store={};var localStorage={getItem:function(k){return store[k]||null;},setItem:function(k,v){store[k]=String(v);},removeItem:function(k){delete store[k];}};
var document={getElementById:getEl,createElement:function(t){return makeEl(t);},querySelectorAll:function(){return[];},body:makeEl('body')};
var window={innerWidth:1280,innerHeight:800,devicePixelRatio:1,AudioContext:function(){throw 0;},addEventListener:function(){},confirm:function(){return true;},localStorage:localStorage};
var sandbox={document:document,window:window,localStorage:localStorage,requestAnimationFrame:function(){return 0;},performance:{now:function(){return Date.now();}},navigator:{},location:{reload:function(){}},setTimeout:setTimeout,clearTimeout:clearTimeout,Math:Math,JSON:JSON,Date:Date,console:console,Array:Array,Object:Object,String:String,Number:Number,Boolean:Boolean,RegExp:RegExp,Error:Error,parseInt:parseInt,parseFloat:parseFloat,isNaN:isNaN,isFinite:isFinite,URL:{createObjectURL:function(){return'';},revokeObjectURL:function(){}},Blob:function(){},FileReader:function(){}};
sandbox.window.window=window;
var vm=require('vm');vm.createContext(sandbox);
vm.runInContext(src,sandbox,{timeout:10000});
var G=window.__game;
function assert(c,m){if(!c){console.log('FAIL:',m);process.exit(1);}console.log('ok -',m);}

// Test 1: VERSION constant in JS
assert(G.VERSION==='1.4.0','VERSION exported as 1.4.0, got: '+G.VERSION);
assert(src.indexOf("var VERSION='1.4.0'")>=0,'VERSION constant defined in source');

// Test 2: version string in HTML start screen
assert(html.indexOf('v1.4.0')>=0,'version string "v1.4.0" present in HTML');
assert(html.indexOf('class="start-ver"')>=0,'start-ver CSS class present in HTML');

// Test 3: CSS for start-ver
assert(html.indexOf('.start-ver{')>=0,'start-ver CSS rule exists');

// Test 4: init() wrapped in try/catch (error screen)
assert(src.indexOf('function init(){')>=0,'init function exists');
assert(src.indexOf('INIT ERROR')>=0,'init error screen text present');
assert(src.indexOf('try{')>=0&&src.indexOf('}catch(e){')>=0,'try/catch present in source');

// Test 5: frame loop has per-section error isolation
assert(src.indexOf("try{ gameTick(dt); }catch(e)")>=0,'gameTick wrapped in try/catch');
assert(src.indexOf("try{ updateHUD(); }catch(e)")>=0,'updateHUD wrapped in try/catch');
assert(src.indexOf("try{ updateCrimes(); }catch(e)")>=0,'updateCrimes wrapped in try/catch');
assert(src.indexOf("try{ updateGear(); }catch(e)")>=0,'updateGear wrapped in try/catch');

// Test 6: touchend handler uses closest('button') and .click()
assert(src.indexOf("t.closest('button')")>=0,'touchend uses closest(button)');
assert(src.indexOf("t.closest('button').click()")>=0,'touchend calls .click()');

// Test 7: offline modal shows even with 0 gain if heat/districts changed
assert(src.indexOf('if(gain>0.01||heatBefore>0||lostD.length>0||defended.length>0)')>=0,'offline modal condition includes heat/district changes');

// Test 8: CSS touch-action:manipulation on global selector
assert(html.indexOf('touch-action:manipulation')>=0,'touch-action:manipulation present in CSS');

// Test 9: #gangName has user-select:text
assert(html.indexOf('#gangName{')>=0&&html.indexOf('-webkit-user-select:text;user-select:text')>=0,'gangName has user-select:text');

// Test 10: city background removed
assert(html.indexOf('id="city"')<0,'no #city canvas in HTML');
assert(html.indexOf('id="rain"')<0,'no #rain canvas in HTML');
assert(src.indexOf('buildSkyline')<0,'no buildSkyline in JS');
assert(src.indexOf('renderCity')<0,'no renderCity in JS');
assert(src.indexOf('updateRain')<0,'no updateRain in JS');
assert(src.indexOf('initRain')<0,'no initRain in JS');

// Test 11: 3-column layout
assert(html.indexOf('id="main"')>=0,'#main 3-column container present');
assert(html.indexOf('id="crimePanel"')>=0,'#crimePanel (left column) present');
assert(html.indexOf('id="upgradePanel"')>=0,'#upgradePanel (middle column) present');
assert(html.indexOf('id="tabContent"')>=0,'#tabContent (right column) present');
assert(html.indexOf('grid-template-columns:340px 340px 1fr')>=0,'3-column grid CSS present');

// Test 12: BUSINESSES tab label
assert(html.indexOf('>BUSINESSES</button>')>=0,'BUSINESSES tab label present');
assert(html.indexOf('>OPS</button>')<0,'old OPS tab label removed');

// Test 13: FLATLINED instead of BUSTED
assert(src.indexOf("'FLATLINED!'")>=0,'FLATLINED! text present in JS');
assert(src.indexOf("'BUSTED!'")<0,'old BUSTED! text removed from JS');

console.log('\nVERSION & ROBUSTNESS ALL TESTS PASSED');
