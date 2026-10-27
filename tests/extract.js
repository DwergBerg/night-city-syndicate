// Extracts the inline <script> from index.html into tests/extracted.js
// Usage: node tests/extract.js   (run from repo root)
var fs=require('fs'), path=require('path');
var root=path.join(__dirname,'..');
var html=fs.readFileSync(path.join(root,'index.html'),'utf8');
var m=html.match(/<script>([\s\S]*)<\/script>/);
if(!m){ console.error('no inline <script> found in index.html'); process.exit(1); }
var out=path.join(__dirname,'extracted.js');
fs.writeFileSync(out,m[1]);
console.log('wrote '+out+' ('+m[1].length+' chars)');
