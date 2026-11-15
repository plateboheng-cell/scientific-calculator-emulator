const isMath = field => field?.tagName==='MATH-FIELD';
const limit = 100;

export function cwEntrySnapshot(field) {
  if(!field)return null;
  const selection=isMath(field)
    ? structuredClone(field.selection)
    : [field.selectionStart,field.selectionEnd,field.selectionDirection];
  return {value:field.value,selection};
}

export function restoreCWEntrySelection(field,snapshot) {
  if(!field||!snapshot||field.value!==snapshot.value)return false;
  if(isMath(field)&&!Array.isArray(snapshot.selection))field.selection=snapshot.selection;
  else if(!isMath(field)&&Array.isArray(snapshot.selection))field.setSelectionRange(...snapshot.selection);
  else return false;
  return true;
}

export function createCWEditHistory() {
  const past=[],future=[];
  let field,last,before,applying=false,toolRedo=false;
  function record(previous,next) {
    if(!previous||!next||previous.value===next.value)return;
    past.push({previous,next});
    if(past.length>limit)past.shift();
    future.length=0;
    toolRedo=false;
  }
  function capture(target) {
    if(target!==field||applying)return;
    const snapshot=cwEntrySnapshot(target);
    before=snapshot;
    queueMicrotask(()=>{if(before===snapshot)before=null;});
  }
  function attach(target) {
    field=target;last=cwEntrySnapshot(target);before=null;
    target.addEventListener('beforeinput',()=>{
      if(!before&&target===field&&target.value===last?.value)capture(target);
    });
    const rememberCaret=()=>{
      if(target===field&&!applying&&target.value===last?.value)last=cwEntrySnapshot(target);
    };
    for(const event of ['selection-change','select','pointerup','keyup'])target.addEventListener(event,rememberCaret);
    target.addEventListener('input',()=>{
      if(target!==field||applying)return;
      const next=cwEntrySnapshot(target);
      record(before??last,next);
      last=next;before=null;
    });
  }
  function step(action) {
    if(!field?.isConnected||field.readOnly)return false;
    const redo=action==='redo'||action==='toggle'&&toolRedo;
    const entry=(redo?future:past).pop();
    if(!entry)return false;
    const snapshot=redo?entry.next:entry.previous;
    (redo?past:future).push(entry);
    toolRedo=action==='toggle'&&!redo;
    before=null;
    applying=true;
    try{
      field.value=snapshot.value;
      field.focus({preventScroll:true});
      field.dispatchEvent(new Event('input',{bubbles:true}));
      restoreCWEntrySelection(field,snapshot);
      last=cwEntrySnapshot(field);
    }finally{applying=false;}
    return true;
  }
  function clear() {
    past.length=future.length=0;
    before=null;toolRedo=false;
    last=cwEntrySnapshot(field?.isConnected?field:null);
  }
  return {attach,capture,record,step,clear};
}

function depth(field,offset) {
  return field.getElementInfo(offset)?.depth??-1;
}

function nextAtom(field,start) {
  const branchDepth=depth(field,start);
  let end=start+1;
  while(end<=field.lastOffset&&depth(field,end)>branchDepth)end++;
  if(end>field.lastOffset||depth(field,end)!==branchDepth)return null;
  return {end,latex:field.getValue(start,end,'latex').trim()};
}

export function selectCWArgument(field) {
  if(!isMath(field))return null;
  const [range]=field.selection.ranges;
  if(range&&range[0]!==range[1]){
    return {start:Math.min(...range),end:Math.max(...range),value:field.value};
  }
  const start=field.position;
  const first=nextAtom(field,start);
  if(!first?.latex||/^[+*/=<>]$|^\\(?:div|times)$/.test(first.latex))return null;
  let end=first.end;
  if(/^[\d.−-]$/.test(first.latex)){
    if(/^[−-]$/.test(first.latex)){
      const operand=nextAtom(field,end);
      if(!operand?.latex)return null;
      end=operand.end;
    }
    let digit=nextAtom(field,end);
    while(digit&&/^[\d.]$/.test(digit.latex)){
      end=digit.end;
      digit=nextAtom(field,end);
    }
  }else if(/^\\[A-Za-z]+$|^\\operatorname\{[^}]+\}$/.test(first.latex)){
    const group=nextAtom(field,end);
    if(group?.latex.startsWith('\\left('))end=group.end;
  }
  field.selection={ranges:[[start,end]],direction:'forward'};
  return {start,end,value:field.value};
}

export function cwArgumentMatches(field,argument) {
  const [range]=field.selection.ranges;
  return !!(argument&&field.value===argument.value&&range&&
    Math.min(...range)===argument.start&&Math.max(...range)===argument.end);
}

export function cwArgumentTemplate(action,latex) {
  if(latex.includes('#@'))return latex;
  const slots=[...latex.matchAll(/#\?/g)];
  if(!slots.length||!(/(?:\(|-input)$/.test(action)||['root','integral','derivative','sigma'].includes(action)))return null;
  const slot=['root','integral','sigma','log('].includes(action)?slots.at(-1):slots[0];
  return latex.slice(0,slot.index)+'#@'+latex.slice(slot.index+2);
}

export function jumpCWTemplate(field,direction) {
  const branchDepth=depth(field,field.position);
  if(branchDepth<=0)return false;
  const step=direction==='left'?-1:1;
  let position=field.position;
  do{position+=step;}
  while(position>0&&position<field.lastOffset&&depth(field,position)>=branchDepth);
  field.position=position;
  return true;
}

export function moveCWEntryHorizontally(field,direction) {
  const position=field.position,branchDepth=depth(field,position);
  const collapsed=field.selection.ranges.every(([start,end])=>start===end);
  if(branchDepth>0&&collapsed){
    if(direction==='left'){
      const atBranchStart=depth(field,position-1)<=branchDepth&&
        !field.getValue(position-1,position,'latex').trim();
      if(atBranchStart&&jumpCWTemplate(field,direction))return;
    }else{
      const nextDepth=depth(field,position+1);
      const atBranchEnd=nextDepth<branchDepth||nextDepth===branchDepth&&
        !field.getValue(position,position+1,'latex').trim();
      if(atBranchEnd&&jumpCWTemplate(field,direction))return;
    }
  }
  field.executeCommand(direction==='left'?'moveToPreviousChar':'moveToNextChar');
}
