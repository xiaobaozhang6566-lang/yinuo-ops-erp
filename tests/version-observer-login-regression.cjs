'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
let observers=[],writes=0;
function node(value){let text=value;return {get textContent(){return text},set textContent(x){writes++;text=x;if(writes>30)throw Error('MutationObserver version update loop');for(const f of observers)f()}}}
const title=node('V1.2'),caption=node('运营任务 V1.2');
const context={window:{},S:{member:null},document:{documentElement:{},querySelectorAll(sel){return sel==='.top small'?[title]:sel==='.box .muted'?[caption]:[]}},MutationObserver:class{constructor(fn){this.fn=fn}observe(){observers.push(this.fn)}},};
vm.createContext(context);
vm.runInContext(fs.readFileSync('v13.js','utf8'),context);
vm.runInContext(fs.readFileSync('v14.js','utf8'),context);
assert.equal(title.textContent,'V1.4');
assert.equal(caption.textContent,'运营任务 V1.4');
const before=writes;
for(const f of [...observers])f();
assert.equal(writes,before,'Version observers must not write unchanged DOM text');
title.textContent='V1.2';
assert.equal(title.textContent,'V1.4');
assert.ok(writes<30);
console.log('PASS: V1.3/V1.4 version observers converge without login render lock.');
