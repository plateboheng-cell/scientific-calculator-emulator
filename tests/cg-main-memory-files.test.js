import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {parseG3M,encodeG3M} from '../src/engine/casio-files.js';
import {
  parseCGMainMemory,stageCGMainMemoryImport,encodeCGMainMemory,restoreCGMainMemorySource,
  decodeCGMainMemoryProgram,encodeCGMainMemoryProgram,decodeCGMainMemoryBCD,encodeCGMainMemoryBCD,
  decodeCGMainMemoryCells,encodeCGMainMemoryCells,decodeCGMainMemorySetup,encodeCGMainMemorySetup,
} from '../src/engine/cg-main-memory-files.js';
import {sanitizeCGStatistics,switchCGListFile} from '../src/engine/cg-statistics.js';

const bytes=text=>Uint8Array.from(text.replace(/\s/g,'').match(/../g).map(x=>parseInt(x,16)));
const concat=(...parts)=>Uint8Array.from(parts.flatMap(part=>Array.from(part)));
const header=(rows,columns=0,title='')=>{const out=new Uint8Array(16);out.set(Array.from(title,c=>c.charCodeAt(0)));new DataView(out.buffer).setUint16(8,rows);new DataView(out.buffer).setUint16(10,columns);return out;};
// These are hand-written BCD numbers, not values obtained from our encoder.
const zero=bytes('00 00 00 00 00 00 00 00 00 00 00 00');
const one=bytes('10 01 00 00 00 00 00 00 00 00 00 00');
const two=bytes('10 02 00 00 00 00 00 00 00 00 00 00');
const three=bytes('10 03 00 00 00 00 00 00 00 00 00 00');
const four=bytes('10 04 00 00 00 00 00 00 00 00 00 00');
const five=bytes('10 05 00 00 00 00 00 00 00 00 00 00');
const fixture=name=>fs.readFileSync(new URL('./fixtures/casio-main-memory/'+name,import.meta.url));
const authors={PONG:'a8d286ba4ee02e45154eb2e78b7af17bbb58ac6f',CONNECT4:'7b2f77130e5bb1714d5c4eb667fbb443328ecd50','3DRENDER':'5ce12b60c30a10747e81af1e89994a5baaed0cfb',MINESWPR:'599ef792f59c449b0732492375c88fd593215a8d',SNAKE:'1f7b6397fe29c3c9fe26dc51d9840ded048bacd6',TICTACTO:'bb6a13b99052949022ffe6c2af27c2005409c53b'};

// CASIO TXT export spellings are deliberately different from display glyphs:
// _@xxxx_ is a mini glyph, // is ASCII '/', Char! is ASCII '!', and commands
// displayed inside strings are surrounded by underscores. Normalize only
// these observed export spellings and insignificant spaces outside strings.
function comparableTXT(source,author=false){
  let text=source.replace(/\r/g,'').replace(/^'ProgramMode:RUN\n/,'')
    .replace(/_@([A-F0-9]{4})_/g,'_#$1_')
    .replace(/_#(E5B8|E690|E691|E69B|E6A3|E6A4)_/gi,(_,n)=>({E5B8:'⌸',E690:'←',E691:'→',E69B:'▶',E6A3:'○',E6A4:'●'}[n.toUpperCase()]))
    .replace(/_ And _/g,' And ').replace(/_->\_/g,'→').replace(/\(-\)/g,'-')
    .replace(/->/g,'→').replace(/Disps/g,'◢').replace(/<>/g,'≠').replace(/>=/g,'≥').replace(/<=/g,'≤').replace(/=>/g,'⇒')
    .replace(/Sqrt/g,'√').replace(/Imaginary/g,'i');
  if(author)text=text.replace(/\/\//g,'/').replace(/Char!/g,'!').replace(/_(ViewWindow |ClrGraph|F-Line )_/g,'$1');
  let quoted=false,out='';for(const c of text){if(c==='"')quoted=!quoted;if(!quoted&&(c===' '||c==='\t'))continue;out+=c;}return out.trimEnd();
}

for(const [name,gitBlob]of Object.entries(authors))test('original '+name+': author TXT agreement, native token regeneration, producer integrity and exact archive retention',async()=>{
  const input=fixture(name+'.g3m');
  assert.equal(createHash('sha1').update('blob '+input.length+'\0').update(input).digest('hex'),gitBlob,'fixture differs from the original author Git blob');
  const parsed=await parseCGMainMemory(input),entry=parsed.entries[0],decoded=entry.decoded;
  assert.equal(parsed.archive.header.producerProfile,'cg50-public-basic-exports');
  assert.equal(input[28],(input[18]+input[19]+0x11)&255);assert.equal(input[29],(input[19]+0x17)&255);
  assert.equal(entry.status,'decoded');assert.deepEqual(parsed.issues,[]);
  assert.equal(comparableTXT(decoded.nativeText),comparableTXT(fixture(name+'.txt').toString('utf8'),true));
  // This path does NOT pass original/raw bytes: it re-lexes the decoded text.
  assert.deepEqual(decodeCGMainMemoryProgram(encodeCGMainMemoryProgram({source:decoded.source,password:decoded.password})).codes,decoded.codes);
  assert.deepEqual(await encodeCGMainMemory({archive:parsed.archive}),new Uint8Array(input));
  assert.deepEqual((await restoreCGMainMemorySource(JSON.parse(JSON.stringify(parsed.source)))).archive,parsed.archive);
});

test('new program emits real native tokens, preserves literal ASCII strings, and does not terminate at If low byte zero',()=>{
  const data=encodeCGMainMemoryProgram({source:'If A>=1\nThen "A/B+_#0E_"\n(-)2→A\nIfEnd\nSquare',password:'SECRET'});
  assert.deepEqual(Array.from(data.slice(0,10)),[83,69,67,82,69,84,0,0,0,0]);
  const decoded=decodeCGMainMemoryProgram(data);
  assert.deepEqual(decoded.codes,[0xf700,65,0x12,49,13,0xf701,34,65,47,66,43,14,34,13,0x87,50,14,65,13,0xf703,13,0xf74d]);
  assert.equal(decoded.password,'SECRET');assert.equal(decoded.complete,true);assert.equal(data.length%4,0);
  assert.deepEqual(decodeCGMainMemoryProgram(encodeCGMainMemoryProgram({source:decoded.source})).codes,decoded.codes);
  assert.throws(()=>encodeCGMainMemoryProgram({source:'FictionalCommand(1)'}),/Unsupported native/);
  assert.throws(()=>encodeCGMainMemoryProgram({source:'"_#00_"'}),/NUL/);
});

test('native statistics coefficients keep their distinct parser aliases from ordinary polar r',()=>{
  const decoded=decodeCGMainMemoryProgram(concat(new Uint8Array(10),bytes('C8 89 C9 89 CA 89 CD 00')));
  assert.equal(decoded.source,'CGStat_a+CGStat_b+CGStat_r+r');
  assert.deepEqual(decodeCGMainMemoryProgram(encodeCGMainMemoryProgram({source:decoded.source})).codes,decoded.codes);
});

test('BCD literals decode published sign/exponent/mantissa and complex flag independently of self roundtrip',()=>{
  const negative=bytes('60 11 25 00 00 00 00 00 00 00 00 00'),pi=bytes('10 03 14 00 00 00 00 00 00 00 00 00');
  assert.equal(decodeCGMainMemoryBCD(negative).value,-12.5);assert.equal(decodeCGMainMemoryBCD(pi).value,3.14);
  const flagged=pi.slice();flagged[0]|=128;assert.equal(decodeCGMainMemoryBCD(flagged).complex,true);
  assert.deepEqual(encodeCGMainMemoryBCD(-12.5),negative);assert.deepEqual(encodeCGMainMemoryBCD(3.14),pi);
  assert.equal(decodeCGMainMemoryBCD(zero).value,0);
  assert.throws(()=>decodeCGMainMemoryBCD(bytes('10 A1 00 00 00 00 00 00 00 00 00 00')),/fractional\/special/);
  assert.throws(()=>encodeCGMainMemoryBCD(Infinity),/finite/);
});

test('native cells use a big-endian 16-byte header and separate row-major real/imaginary planes',()=>{
  const complexOne=one.slice();complexOne[0]|=128;
  const native=concat(header(2,2),complexOne,two,three,four,five,zero,zero,zero);
  const decoded=decodeCGMainMemoryCells(native);
  assert.deepEqual(decoded.values,[[{re:1,im:5},2],[3,4]]);assert.equal(decoded.hasImaginary,true);
  assert.deepEqual(encodeCGMainMemoryCells(decoded.values),native);
  const list=concat(header(2,0,'AGE'),one,two);assert.deepEqual(decodeCGMainMemoryCells(list,{kind:'list'}).values,[1,2]);
  assert.deepEqual(encodeCGMainMemoryCells([1,2],{kind:'list',title:'AGE'}),list);
  assert.deepEqual(decodeCGMainMemoryCells(encodeCGMainMemoryCells([1,2],{kind:'vector'}),{kind:'vector'}).values,[[1,2]]);
  assert.throws(()=>decodeCGMainMemoryCells(native.subarray(0,native.length-1)),/Truncated native imaginary/);
  assert.throws(()=>encodeCGMainMemoryCells([[1,2],[3,4]],{kind:'vector'}),/one row or column/);
});

test('patching cells preserves opaque header and numeric extensions, or explicitly rejects losing them',()=>{
  const native=concat(header(1,1,'LABEL'),one,three);native[16]|=128;native[12]=0x94;native[25]=0x81;native[37]=0x53;
  const original=decodeCGMainMemoryCells(native);
  assert.deepEqual(encodeCGMainMemoryCells(original.values,{original}),native);
  const changed=encodeCGMainMemoryCells([[{re:2,im:4}]],{original});
  assert.equal(changed[12],0x94);assert.equal(changed[25],0x81);assert.equal(changed[37],0x53);assert.equal(decodeCGMainMemoryCells(changed).title,'LABEL');
  assert.throws(()=>encodeCGMainMemoryCells([[2]],{original}),/imaginary numeric extensions/);
  assert.throws(()=>encodeCGMainMemoryCells([[{re:1,im:3},2]],{original}),/extensions prevent safe native resizing/);
});

const archiveOf=groups=>encodeG3M({groups});
test('staging all supported record types is atomic and retains all six active/inactive List Files with complex elements',async()=>{
  const complex=one.slice();complex[0]|=128;
  const setup=new Uint8Array(200);setup[0x13]=1;setup[0x2a]=2;setup[0x2b]=0x10;setup[0x2e]=6;setup[0x5c]=1;
  const input=archiveOf([
    {name:'LISTFILE 6',files:[{name:'1LIST26',type:5,data:concat(header(2,0,'DATA'),complex,two,three,zero)}]},
    {name:'MAT A',files:[{name:'MAT_A',type:6,data:concat(header(1,2),one,two)}]},
    {name:'VCT Z',files:[{name:'VCT_Z',type:6,data:concat(header(2,1),three,four)}]},
    {name:'MAT Ans',files:[{name:'MAT_Ans',type:6,data:concat(header(1,1),five)}]},
    {name:'ALPHA MEM',files:[{name:'X',type:0,data:concat(complex,three)}]},
    {name:'SETUP',files:[{name:'SETUP',type:0x14,data:setup}]},
  ]);
  const statistics=sanitizeCGStatistics({lists:[[99]],elementColors:[['#ff0000']]});
  const state={workspace:{statistics},variables:{A:7},matrices:{},vectors:{}};const saved=structuredClone(state);
  const staged=await stageCGMainMemoryImport(await parseCGMainMemory(input),state);
  assert.deepEqual(state,saved);assert.equal(staged.applied.length,6);assert.deepEqual(staged.skipped,[]);
  assert.deepEqual(staged.workspace.statistics.lists[25],[{re:1,im:3},2]);assert.equal(staged.workspace.statistics.listFile,5);
  const back=switchCGListFile(staged.workspace.statistics,0);assert.deepEqual(back.lists[0],[99]);assert.deepEqual(back.elementColors[0],['#ff0000']);
  assert.deepEqual(staged.matrices.MatA,[[1,2]]);assert.deepEqual(staged.vectors.VctZ,[[3],[4]]);assert.deepEqual(staged.nativeAnswers.matrix,[[5]]);
  assert.deepEqual(staged.variables.x,{re:1,im:3});assert.equal(staged.variables.A,7);assert.equal(staged.settings.angle,'Rad');assert.equal(staged.workspace.system.complex,'polar');
  const restored=await restoreCGMainMemorySource(staged.workspace.nativeMainMemory);assert.deepEqual(restored.archive,parseG3M(input));
});

test('semantic conflicts are reported without mutating original workspace, and replace writes the requested native value',async()=>{
  const input=await parseCGMainMemory(archiveOf([{name:'LISTFILE 1',files:[{name:'1LIST1',type:5,data:concat(header(1),one)}]}]));
  const state={workspace:{statistics:sanitizeCGStatistics({lists:[[8]]})}},before=structuredClone(state);
  const skipped=await stageCGMainMemoryImport(input,state);assert.equal(skipped.skipped.length,1);assert.deepEqual(skipped.workspace.statistics.lists[0],[8]);assert.deepEqual(state,before);
  const replaced=await stageCGMainMemoryImport(input,state,{replace:true});assert.deepEqual(replaced.workspace.statistics.lists[0],[1]);
});

test('fresh native generation encodes data as BCD/token records instead of text or JSON',async()=>{
  const statistics=sanitizeCGStatistics({lists:[[1,{re:2,im:3}]],names:['NUM']});
  const encoded=await encodeCGMainMemory({workspace:{program:{programs:[{name:'HELLO',source:'1→A\nA◢'}]},statistics},matrices:{MatZ:[[4]]},vectors:{VctZ:[5,3]},variables:{A:{re:2,im:1},x:3}});
  const parsed=await parseCGMainMemory(encoded);assert.deepEqual(parsed.issues,[]);
  assert.equal(parsed.archive.header.producerProfile,'cg50-public-basic-exports');assert.equal(parsed.entries.length,6);
  const list=parsed.entries.find(e=>e.kind==='list');assert.equal(list.decoded.title,'NUM');assert.deepEqual(list.decoded.values,[1,{re:2,im:3}]);
  assert.deepEqual(parsed.entries.find(e=>e.kind==='matrix').decoded.values,[[4]]);assert.deepEqual(parsed.entries.find(e=>e.kind==='vector').decoded.values,[[5,3]]);
  assert.deepEqual(parsed.entries.find(e=>e.name==='A').decoded.values,[{re:2,im:1}]);
  assert.equal(parsed.entries.find(e=>e.kind==='program').decoded.source,'1→A\nA◢');
  const answers=await parseCGMainMemory(await encodeCGMainMemory({nativeAnswers:{matrix:[[1]],vector:[[2]]}}));
  assert.deepEqual(answers.entries.map(e=>e.name),['MAT_Ans','VCT_Ans']);assert(answers.entries.every(e=>e.destination.answer));
});

test('polar/compound alpha names cannot be silently imported into A and single-variable edits preserve extension bytes',async()=>{
  const source=concat(one,two);source[9]=0x82;source[21]=0x53;
  const input=archiveOf([{name:'ALPHA MEM',files:[
    {name:'A',type:0,data:source},
    {nameBytes:bytes('CD 00 00 00 00 00 00 00'),type:0,data:concat(three,zero)},
    {name:'COMPOUND',type:0,data:concat(one,zero,two,zero)},
  ]}]);
  const parsed=await parseCGMainMemory(input),staged=await stageCGMainMemoryImport(parsed,{});
  assert.equal(parsed.entries[1].status,'opaque');assert.equal(parsed.entries[2].status,'opaque');assert.deepEqual(staged.variables.A,{re:1,im:2});
  staged.variables.A={re:4,im:5};const next=await parseCGMainMemory(await encodeCGMainMemory(staged));
  const record=next.archive.groups[0].files[0].data;assert.equal(record[9],0x82);assert.equal(record[21],0x53);
  assert.deepEqual(next.archive.groups[0].files[1].data,parsed.archive.groups[0].files[1].data);
});

test('SETUP edits only verified offsets and never invents a template or silently coerces invalid fields',()=>{
  const source=new Uint8Array(200).fill(0xab);source[0x2b]=0x80;const original=decodeCGMainMemorySetup(source);
  const changed=encodeCGMainMemorySetup({angle:'Gra',complex:'polar',display:{mode:'Fix',digits:7},listFile:6,quartile:'OnData',days:360},{original});
  const edited=new Set([0x13,0x2a,0x2b,0x2e,0x5c,0x28]);for(let i=0;i<source.length;i++)if(!edited.has(i))assert.equal(changed[i],source[i]);
  assert.equal(changed[0x2b],0x80|39);assert.equal(decodeCGMainMemorySetup(changed).settings.engineering,true);
  assert.throws(()=>encodeCGMainMemorySetup({angle:'Rad'}),/original SETUP template/);
  assert.throws(()=>encodeCGMainMemorySetup({display:{mode:'Fix'}},{original}),/digits\/norm/);
  assert.throws(()=>encodeCGMainMemorySetup({quartile:'guess'},{original}),/quartile/);
});

test('opaque unknown records and unknown numeric variants survive semantic import/export, with refusal to overwrite them',async()=>{
  const input=archiveOf([
    {name:'UNKNOWN',files:[{name:'RAW',type:0x44,data:bytes('00 FF 7F 00 F7 00 11'),reservedBytes:[7,8,9]}]},
    {name:'LISTFILE 1',files:[{name:'1LIST1',type:5,data:concat(header(1),bytes('10 A1 00 00 00 00 00 00 00 00 00 00'))}]},
    {name:'PROGRAM',files:[{name:'SECRET',type:1,data:concat(new Uint8Array(10),bytes('F9 FF 00 01'))}]},
  ]);
  const parsed=await parseCGMainMemory(input);assert.equal(parsed.issues.length,3);assert(parsed.entries.every(e=>e.status==='opaque'));
  const staged=await stageCGMainMemoryImport(parsed,{});assert.equal(staged.skipped.length,3);assert.deepEqual(await encodeCGMainMemory(staged),input);
  staged.workspace.statistics.lists[0]=[1];await assert.rejects(()=>encodeCGMainMemory(staged),/Cannot overwrite an opaque/);
  await assert.rejects(()=>encodeCGMainMemory({workspace:{strings:['Text']}}),/not verified/);
  await assert.rejects(()=>encodeCGMainMemory({settings:{angle:'Rad'}}),/requires a real template/);
});

test('retained source is bounded JSON-safe data with SHA256 enforcement and a persistent merge provenance',async()=>{
  const first=await parseCGMainMemory(fixture('PONG.g3m')),state=await stageCGMainMemoryImport(first,{});
  const second=await stageCGMainMemoryImport(await parseCGMainMemory(fixture('SNAKE.g3m')),state);
  assert.equal(second.workspace.program.programs.length,2);
  const restored=await restoreCGMainMemorySource(JSON.parse(JSON.stringify(second.workspace.nativeMainMemory)));
  assert.equal(restored.entries.length,2);assert.equal(restored.source.provenance.length,3);
  assert(restored.source.chunks.every(chunk=>typeof chunk==='string'&&chunk.length<=65536));
  const corrupt=structuredClone(second.workspace.nativeMainMemory);corrupt.sha256='0'.repeat(64);await assert.rejects(()=>restoreCGMainMemorySource(corrupt),/hash mismatch/);
  const wrong=structuredClone(second.workspace.nativeMainMemory);wrong.byteLength++;await assert.rejects(()=>restoreCGMainMemorySource(wrong),/size mismatch/);
});

test('current export deletes managed Program, empty lists in all six files, Mat/Vct and their cleared answers without reviving old bytes',async()=>{
  let statistics=sanitizeCGStatistics({});for(let file=0;file<6;file++){statistics=switchCGListFile(statistics,file);statistics.lists[0]=[file+1];}
  const original=await encodeCGMainMemory({workspace:{program:{programs:[{name:'DELETE',source:'1→A'}]},statistics},matrices:{MatZ:[[1]]},vectors:{VctZ:[[2,3]]},nativeAnswers:{matrix:[[4]],vector:[[5]]}});
  const parsed=await parseCGMainMemory(original),staged=await stageCGMainMemoryImport(parsed,{});
  staged.workspace.program.programs=[];staged.matrices={};staged.vectors={};staged.nativeAnswers={};
  for(let file=0;file<6;file++){staged.workspace.statistics=switchCGListFile(staged.workspace.statistics,file);staged.workspace.statistics.lists[0]=[];}
  const current=await parseCGMainMemory(await encodeCGMainMemory(staged,{selection:['program','list','matrix','vector'],preserveUnknown:true}));
  assert.deepEqual(current.entries,[]);assert.deepEqual(current.archive.groups,[]);
  // Original native SAVE is a separate operation and still retains all bytes.
  assert.deepEqual(await encodeCGMainMemory({archive:parsed.archive}),original);
});

test('clearing a noninitial List File deletes only that list while retaining the other file and list destinations',async()=>{
  let statistics=sanitizeCGStatistics({lists:[[11]]});statistics=switchCGListFile(statistics,5);statistics.lists[25]=[66];
  const parsed=await parseCGMainMemory(await encodeCGMainMemory({workspace:{statistics}}));
  const staged=await stageCGMainMemoryImport(parsed,{});staged.workspace.statistics=switchCGListFile(staged.workspace.statistics,5);staged.workspace.statistics.lists[25]=[];
  const current=await parseCGMainMemory(await encodeCGMainMemory(staged,{selection:['list'],preserveUnknown:true}));
  assert.equal(current.entries.length,1);assert.deepEqual(current.entries[0].destination,{file:1,list:1});assert.deepEqual(current.entries[0].decoded.values,[11]);
});

test('current snapshot deletion keeps opaque and unselected original records and does not treat an omitted runtime bank as deletion',async()=>{
  const original=archiveOf([
    {name:'PROGRAM',files:[{name:'DELETE',type:1,data:encodeCGMainMemoryProgram({source:'1→A'})},{name:'UNKNOWN',type:1,data:concat(new Uint8Array(10),bytes('F9 FF 00 00'))}]},
    {name:'MAT A',files:[{name:'MAT_A',type:6,data:concat(header(1,1),one)}]},
    {name:'LISTFILE 1',files:[{name:'1LIST1',type:5,data:concat(header(1),two)}]},
    {name:'OPAQUE',files:[{name:'RAW',type:0x44,data:bytes('00 FF F7 00'),reservedBytes:[3,2,1]}]},
  ]);
  const parsed=await parseCGMainMemory(original),staged=await stageCGMainMemoryImport(parsed,{});
  staged.workspace.program.programs=[];staged.workspace.statistics.lists[0]=[];staged.matrices={};
  const programOnly=await parseCGMainMemory(await encodeCGMainMemory(staged,{selection:['program'],preserveUnknown:true}));
  assert.deepEqual(programOnly.entries.map(entry=>entry.name),['UNKNOWN','MAT_A','1LIST1','RAW']);
  assert.deepEqual(programOnly.archive.groups[0].files[0].data,parsed.archive.groups[0].files[1].data);
  assert.deepEqual(programOnly.archive.groups.at(-1).files[0].reservedBytes,Uint8Array.of(3,2,1));
  // Caller supplying only a native archive has no runtime snapshot to delete.
  assert.deepEqual(await encodeCGMainMemory({archive:parsed.archive},{selection:['program','list','matrix'],preserveUnknown:true}),original);
});

test('native answer deletion follows its explicitly supplied answer bank and selected array kind',async()=>{
  const original=await encodeCGMainMemory({matrices:{MatA:[[1]]},vectors:{VctA:[[2]]},nativeAnswers:{matrix:[[3]],vector:[[4]]}}),parsed=await parseCGMainMemory(original);
  const namedCleared=await parseCGMainMemory(await encodeCGMainMemory({archive:parsed.archive,matrices:{}},{selection:['matrix','vector'],preserveUnknown:true}));
  assert.deepEqual(namedCleared.entries.map(entry=>entry.name),['MAT_Ans','VCT_A','VCT_Ans']);
  const answersCleared=await parseCGMainMemory(await encodeCGMainMemory({archive:parsed.archive,nativeAnswers:{}},{selection:['matrix'],preserveUnknown:true}));
  assert.deepEqual(answersCleared.entries.map(entry=>entry.name),['MAT_A','VCT_A','VCT_Ans']);
});
