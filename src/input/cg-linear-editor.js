import {CG_LINEAR_TOKEN_SPECS} from './cg-linear-token-data.js';
import {CG_GRAPH_VARIABLES} from './cg-graph-token-data.js';
import {metricUnitToken,metricArrowToken,scanCGMetricSource} from './cg-metric-symbols.js';
import {CG_CALC_FUNCTIONS,CG_CALC_INFIXES,cgCalcTokenMeta,cgCalcInfixSpec,scanCGCalcInfixSource} from './cg-calc-symbols.js';

const specs=new Map([...CG_LINEAR_TOKEN_SPECS,...CG_GRAPH_VARIABLES,...CG_CALC_FUNCTIONS,...CG_CALC_INFIXES].map(spec=>[spec.parserName,spec]));
const word=char=>!!char&&/[\p{L}\p{N}_]/u.test(char);
const text=value=>{if(typeof value!=='string')throw Error('Line expression must be text');return value.replace(/[\r\n]+/g,' ');};
const clamp=(value,min,max)=>Math.max(min,Math.min(max,Number.isFinite(value)?Math.trunc(value):min));
function maskQuotes(value){const mask=new Uint8Array(value.length);let quote='';for(let i=0;i<value.length;i++){const c=value[i];if(quote){mask[i]=1;if(c==='\\'&&i+1<value.length)mask[++i]=1;else if(c===quote)quote='';}else if(c==='"'||c==="'"){quote=c;mask[i]=1;}}return mask;}
function quotedPosition(value,position){let quote='';for(let i=0;i<position;i++){const c=value[i];if(quote){if(c==='\\')i++;else if(c===quote)quote='';}else if(c==='"'||c==="'")quote=c;}return !!quote;}
function quotedEnd(value,start){const quote=value[start];for(let i=start+1;i<value.length;i++){if(value[i]==='\\'){i++;continue;}if(value[i]===quote)return i+1;}return value.length;}
function parenthesisEnd(value,start){let level=0;for(let i=start;i<value.length;i++){if(value[i]==='"'||value[i]==="'"){i=quotedEnd(value,i)-1;continue;}if(value[i]==='(')level++;if(value[i]===')'&&--level===0)return i;}return -1;}
function atomicOperand(value){const s=value.trim();if(/^[-+]?(?:(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?|[\p{L}_][\p{L}\p{N}_]*)$/iu.test(s))return true;if(s[0]==='('&&parenthesisEnd(s,0)===s.length-1)return true;const fn=/^[A-Za-z_][A-Za-z0-9_]*\s*\(/.exec(s);return !!fn&&parenthesisEnd(s,fn[0].lastIndexOf('('))===s.length-1;}
function normalizeMeta(meta){
  if(meta?.kind==='metric-unit')return metricUnitToken(meta.unitId??meta.id);if(meta?.kind==='metric-arrow')return metricArrowToken();
  if(meta?.kind==='infix'||meta?.syntax==='infix'){const token=cgCalcTokenMeta(meta.parserName??meta.name);if(token?.kind==='infix')return token;}
  if(typeof meta==='string')meta=specs.get(meta)||{name:meta,parserName:meta};if(!meta||typeof meta!=='object')throw Error('Native token metadata is required');
  const parserName=String(meta.parserName??meta.canonical??meta.source??meta.key??meta.name??'').replace(/\($/,'');if(!/^[A-Za-z_][A-Za-z0-9_]{0,119}$/.test(parserName))throw Error('Invalid native token identifier');
  const known=specs.get(parserName),kind=meta.syntax==='postfix'||meta.kind==='postfix'||/^CGStat_[xy]hat$/.test(parserName)?'postfix':meta.kind||meta.type||(Array.isArray(meta.args)||meta.function===true||String(meta.canonical||meta.source||'').endsWith('(')?'function':known?.kind||'variable');
  const name=String(meta.name??meta.label??known?.name??parserName.replace(/^(?:Finance|CGStat)_/,''));if(!name||name.length>120||/[\r\n\0]/.test(name))throw Error('Invalid native token label');
  const normalized={name,parserName,kind:kind==='prefix'?'function':kind};specs.set(parserName,normalized);return normalized;
}
function tokenText(spec){if(spec.kind==='metric-unit'||spec.kind==='metric-arrow'||spec.kind==='infix'&&cgCalcInfixSpec(spec.parserName))return {display:spec.name,canonical:spec.canonical};if(spec.kind==='postfix'){const x=spec.parserName==='CGStat_xhat'||spec.name.startsWith('x');return {display:x?'x̂':'ŷ',canonical:x?' x-hat':' y-hat'};}return spec.kind==='function'?{display:spec.name.replace(/\($/,'')+'(',canonical:spec.parserName+'('}:{display:spec.name,canonical:spec.parserName};}
function renderCanonical(source,depth=0){
  if(depth>30)throw Error('Line token nesting is too deep');let display='',tokens=[],lastMetric=false;const metric=new Map([...scanCGMetricSource(source),...scanCGCalcInfixSource(source)].map(token=>[token.start,token]));
  const append=(value,spec,canonical)=>{const start=display.length;display+=value;lastMetric=spec?.kind==='metric-unit'||spec?.kind==='metric-arrow'||spec?.kind==='infix';if(spec)tokens.push({start,end:display.length,display:value,canonical,parserName:spec.parserName,kind:spec.kind,...(spec.unitId?{unitId:spec.unitId}:{})});};
  for(let i=0;i<source.length;){const c=source[i];if(c==='"'||c==="'"){const end=quotedEnd(source,i);append(source.slice(i,end));i=end;continue;}
    const unit=metric.get(i);if(unit){append(unit.display,unit,unit.canonical);i=unit.end;continue;}
    if(/\s/.test(c)){let end=i;while(end<source.length&&/\s/.test(source[end]))end++;if(metric.has(end)||lastMetric||/^(?:x-hat|y-hat|x̂|ŷ|ŷ)/.test(source.slice(end))){i=end;continue;}}
    const postfix=/^(x-hat|y-hat|x̂|ŷ|ŷ)/.exec(source.slice(i));if(postfix){const x=postfix[0].startsWith('x'),spec=normalizeMeta({name:x?'x̂':'ŷ',parserName:x?'CGStat_xhat':'CGStat_yhat',kind:'postfix'}),native=tokenText(spec);append(native.display,spec,native.canonical);i+=postfix[0].length;continue;}
    if(i===0||!word(source[i-1])){
      const estimate=/^(CGStat_[xy]hat)\s*\(/.exec(source.slice(i));if(estimate){const open=i+estimate[0].lastIndexOf('('),end=parenthesisEnd(source,open);if(end>=0){const argument=source.slice(open+1,end),part=renderCanonical(argument,depth+1),wrap=!atomicOperand(argument),offset=display.length+(wrap?1:0);append((wrap?'(':'')+part.display+(wrap?')':''));tokens.push(...part.tokens.map(token=>({...token,start:token.start+offset,end:token.end+offset})));const spec=normalizeMeta({name:estimate[1]==='CGStat_xhat'?'x̂':'ŷ',parserName:estimate[1],kind:'postfix'}),native=tokenText(spec);append(native.display,spec,native.canonical);i=end+1;continue;}}
      const nativeFunction=[...specs.values()].filter(spec=>spec.kind==='function'&&spec.name!==spec.parserName).sort((a,b)=>b.name.length-a.name.length).find(spec=>source.startsWith(spec.name,i)&&/^\s*\(/.test(source.slice(i+spec.name.length)));
      if(nativeFunction){const open=i+nativeFunction.name.length+/^\s*/.exec(source.slice(i+nativeFunction.name.length))[0].length,native=tokenText(nativeFunction);append(native.display,nativeFunction,native.canonical);i=open+1;continue;}
      const identifier=/^[A-Za-z_][A-Za-z0-9_]*/.exec(source.slice(i));if(identifier){const name=identifier[0],known=specs.get(name),alias=/^(Finance|CGStat)_/.test(name),reference=/^(?:fn|xt|yt|x|y|r)(?:[1-9]|1\d|20)$/i.test(name),spec=known||alias?known||normalizeMeta({name:name.replace(/^(Finance|CGStat)_/,''),parserName:name}):reference?{name,parserName:name,kind:'reference'}:null;
        if(spec){const end=i+name.length,spaces=/^\s*/.exec(source.slice(end))[0].length,call=source[end+spaces]==='(';if((spec.kind==='function'||reference)&&call){const fn={...spec,kind:'function'},native=tokenText(fn);append(native.display,fn,native.canonical);i=end+spaces+1;continue;}if(spec.kind!=='function'){const native=tokenText(spec);append(native.display,spec,native.canonical);i=end;continue;}}
        append(name);i+=name.length;continue;
      }
    }
    append(c);i++;
  }
  return {display,tokens:tokens.sort((a,b)=>a.start-b.start)};
}

/** Offsets always address the visible UTF-16 input,never the longer aliases. */
export class CGLinearTokenModel{
  constructor(source=''){this.setSource(source);}
  setSource(source){source=text(source);if(source.length>40000)throw Error('Line expression is too long');const rendered=renderCanonical(source);this.display=rendered.display;this.tokens=rendered.tokens;return this;}
  getDisplay(){return this.display;}
  getTokens(){return this.tokens.map(token=>({...token}));}
  source(){let value='',at=0,previousToken=null;for(const token of this.tokens){const plain=this.display.slice(at,token.start);if(previousToken&&(word(value.at(-1))||previousToken.kind?.startsWith('metric-'))&&word(plain[0]))value+=' ';value+=plain;if(token.kind?.startsWith('metric-')&&value&&!/\s$/.test(value)||word(value.at(-1))&&word(token.canonical[0]))value+=' ';value+=token.canonical;at=token.end;previousToken=token;}const tail=this.display.slice(at);if(previousToken&&(word(value.at(-1))||previousToken.kind?.startsWith('metric-'))&&word(tail[0]))value+=' ';return value+tail;}
  snapshot(){return {display:this.display,tokens:this.getTokens()};}
  restore(snapshot){this.display=String(snapshot.display);this.tokens=snapshot.tokens.map(token=>({...token}));return this;}
  expandRange(start,end=start){let s=clamp(Math.min(start,end),0,this.display.length),e=clamp(Math.max(start,end),0,this.display.length);for(const token of this.tokens)if(s===e?s>token.start&&s<token.end:s<token.end&&e>token.start){s=Math.min(s,token.start);e=Math.max(e,token.end);}return {start:s,end:e};}
  replace(start,end,value,insertedToken=null){
    value=text(value);const range=this.expandRange(start,end),s=range.start,e=range.end,change=value.length-(e-s),quoted=quotedPosition(this.display,s);this.display=this.display.slice(0,s)+value+this.display.slice(e);
    this.tokens=this.tokens.filter(token=>token.end<=s||token.start>=e).map(token=>token.start>=e?{...token,start:token.start+change,end:token.end+change}:token);
    if(insertedToken&&!quoted&&value.length)this.tokens.push({...insertedToken,start:s,end:s+value.length,display:value});
    const mask=maskQuotes(this.display);this.tokens=this.tokens.filter(token=>{for(let i=token.start;i<token.end;i++)if(mask[i])return false;return true;}).sort((a,b)=>a.start-b.start);
    // A pasted/typed native conversion has an explicit ▶ delimiter. Bind its
    // unit commands just like menu insertion, while ordinary List indices and
    // quoted text remain ordinary text. Do not promote unrelated native names.
    if(this.display.includes('▶')){for(const span of scanCGMetricSource(this.display)){if(this.tokens.some(token=>span.start<token.end&&span.end>token.start))continue;this.tokens.push({start:span.start,end:span.end,display:this.display.slice(span.start,span.end),canonical:span.canonical,parserName:span.parserName,kind:span.kind,...(span.unitId?{unitId:span.unitId}:{})});}this.tokens.sort((a,b)=>a.start-b.start);}
    for(const span of scanCGCalcInfixSource(this.display)){if(this.tokens.some(token=>span.start<token.end&&span.end>token.start))continue;this.tokens.push({start:span.start,end:span.end,display:this.display.slice(span.start,span.end),canonical:span.canonical,parserName:span.parserName,kind:span.kind});}this.tokens.sort((a,b)=>a.start-b.start);
    return {...range,caret:s+value.length,display:this.display,canonical:this.source()};
  }
  insertToken(meta,start=this.display.length,end=start){const spec=normalizeMeta(meta),native=tokenText(spec);return this.replace(start,end,native.display,{...spec,canonical:native.canonical});}
  insertSource(source,start=this.display.length,end=start){
    const rendered=renderCanonical(text(source)),range=this.expandRange(start,end),quoted=quotedPosition(this.display,range.start),result=this.replace(start,end,rendered.display);
    if(!quoted){
      const mask=maskQuotes(this.display),inserted=rendered.tokens.map(token=>({...token,start:token.start+result.start,end:token.end+result.start})).filter(token=>{for(let i=token.start;i<token.end;i++)if(mask[i])return false;return true;});
      // replace() binds typed/pasted Metric and integer operators already.
      // Prefer the explicit source metadata at those spans; keeping both would
      // serialize the same visible command twice during a native CLIP paste.
      this.tokens=this.tokens.filter(token=>!inserted.some(other=>token.start<other.end&&token.end>other.start));
      this.tokens.push(...inserted);this.tokens.sort((a,b)=>a.start-b.start);
    }
    return {...result,canonical:this.source()};
  }
  sourceSelection(start=0,end=this.display.length){if(start===end)return '';const range=this.expandRange(start,end),selected=Object.create(CGLinearTokenModel.prototype);selected.display=this.display.slice(range.start,range.end);selected.tokens=this.tokens.filter(token=>token.start>=range.start&&token.end<=range.end).map(token=>({...token,start:token.start-range.start,end:token.end-range.start}));return selected.source();}
  deleteBackward(position){const end=clamp(position,0,this.display.length),token=this.tokens.find(token=>end>token.start&&end<=token.end);let start=token?token.start:Math.max(0,end-1);if(!token&&start>0&&/[\uDC00-\uDFFF]/.test(this.display[start])&&/[\uD800-\uDBFF]/.test(this.display[start-1]))start--;return this.replace(start,end,'');}
  deleteForward(position){const start=clamp(position,0,this.display.length),token=this.tokens.find(token=>start>=token.start&&start<token.end);let end=token?token.end:Math.min(this.display.length,start+1);if(!token&&/[\uD800-\uDBFF]/.test(this.display[start])&&/[\uDC00-\uDFFF]/.test(this.display[end]))end++;return this.replace(start,end,'');}
}

export function createCGLinearEditor(input,{source='',onChange=()=>{}}={}){
  if(!input||typeof input.setSelectionRange!=='function')throw Error('CG Line editor requires a text input');let model=new CGLinearTokenModel(source),destroyed=false,pending=null,lastSelection={start:0,end:0};const abort=new AbortController(),{signal}=abort,undo=[],redo=[];
  const selection=()=>({start:input.selectionStart??0,end:input.selectionEnd??input.selectionStart??0});
  const notify=()=>{if(!destroyed)onChange(model.source(),model.getDisplay());};
  const paint=caret=>{input.value=model.getDisplay();const at=clamp(caret,0,input.value.length);input.setSelectionRange(at,at);lastSelection={start:at,end:at};};
  const remember=()=>{undo.push({model:model.snapshot(),selection:selection()});if(undo.length>100)undo.shift();redo.length=0;};
  function edit(fn){if(destroyed||input.disabled||input.readOnly)return false;remember();const result=fn();paint(result.caret);notify();return result;}
  function history(from,to){if(destroyed||!from.length)return false;to.push({model:model.snapshot(),selection:selection()});const previous=from.pop();model.restore(previous.model);input.value=model.getDisplay();input.setSelectionRange(previous.selection.start,previous.selection.end);lastSelection=selection();notify();return true;}
  function fallback(value,range=pending){const old=model.getDisplay();let start,end,inserted;if(range&&value.startsWith(old.slice(0,range.start))&&value.endsWith(old.slice(range.end))&&value.length>=range.start+old.length-range.end){start=range.start;end=range.end;inserted=value.slice(start,value.length-(old.length-end));}else {start=0;while(start<old.length&&start<value.length&&old[start]===value[start])start++;let tail=0;while(tail<old.length-start&&tail<value.length-start&&old[old.length-1-tail]===value[value.length-1-tail])tail++;end=old.length-tail;inserted=value.slice(start,value.length-tail);if(value===old&&lastSelection.end>lastSelection.start){start=lastSelection.start;end=lastSelection.end;inserted=value.slice(start,end);}}
    remember();const caret=input.selectionStart??start+inserted.length,result=model.replace(start,end,inserted);input.value=model.getDisplay();input.setSelectionRange(Math.min(caret,result.caret),Math.min(caret,result.caret));lastSelection=selection();notify();}
  input.addEventListener('beforeinput',event=>{if(destroyed)return;const range=selection(),type=event.inputType||'';pending={...range};
    if(event.cancelable&&type==='historyUndo'){event.preventDefault();history(undo,redo);pending=null;return;}if(event.cancelable&&type==='historyRedo'){event.preventDefault();history(redo,undo);pending=null;return;}
    if(event.cancelable&&!event.isComposing&&(type==='insertText'||type==='insertReplacementText')&&typeof event.data==='string'){event.preventDefault();edit(()=>model.replace(range.start,range.end,event.data));pending=null;return;}
    if(event.cancelable&&type.startsWith('delete')){event.preventDefault();edit(()=>{if(range.start!==range.end)return model.replace(range.start,range.end,'');if(type==='deleteContentBackward')return model.deleteBackward(range.start);if(type==='deleteContentForward')return model.deleteForward(range.start);let start=range.start,end=range.end;if(type.includes('Backward')){while(start>0&&/\s/.test(model.display[start-1]))start--;while(start>0&&/[\p{L}\p{N}\p{M}_]/u.test(model.display[start-1]))start--;if(start===end)start=Math.max(0,start-1);}else {while(end<model.display.length&&/\s/.test(model.display[end]))end++;while(end<model.display.length&&/[\p{L}\p{N}\p{M}_]/u.test(model.display[end]))end++;if(start===end)end=Math.min(model.display.length,end+1);}return model.replace(start,end,'');});pending=null;return;}
    const expanded=model.expandRange(range.start,range.end);if(expanded.start!==range.start||expanded.end!==range.end){input.setSelectionRange(expanded.start,expanded.end);pending=expanded;}
  },{signal});
  input.addEventListener('input',()=>{if(!destroyed)fallback(input.value,pending);pending=null;},{signal});
  input.addEventListener('paste',event=>{const value=event.clipboardData?.getData('text/plain');if(typeof value!=='string')return;event.preventDefault();const range=selection();edit(()=>model.replace(range.start,range.end,value));pending=null;},{signal});
  input.addEventListener('select',()=>{lastSelection=selection();},{signal});
  input.addEventListener('keydown',event=>{lastSelection=selection();if((event.ctrlKey||event.metaKey)&&!event.altKey&&event.key.toLowerCase()==='z'){event.preventDefault();event.stopPropagation();history(event.shiftKey?redo:undo,event.shiftKey?undo:redo);}else if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='y'){event.preventDefault();event.stopPropagation();history(redo,undo);}},{signal});
  paint(model.getDisplay().length);
  return {insertToken(meta){const range=selection();input.focus();return edit(()=>model.insertToken(meta,range.start,range.end));},insertText(value){const range=selection();input.focus();return edit(()=>model.replace(range.start,range.end,value));},insertSource(value){const range=selection();input.focus();return edit(()=>model.insertSource(value,range.start,range.end));},sourceSelection(){const range=selection();return model.sourceSelection(range.start,range.end);},source:()=>model.source(),getDisplay:()=>model.getDisplay(),getTokens:()=>model.getTokens(),setSource(value,{emit=false}={}){if(destroyed)return false;model=new CGLinearTokenModel(value);undo.length=redo.length=0;paint(model.getDisplay().length);if(emit)notify();return true;},undo:()=>history(undo,redo),redo:()=>history(redo,undo),destroy(){destroyed=true;pending=null;abort.abort();}};
}
