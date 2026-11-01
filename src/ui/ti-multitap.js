import {multiTapTokens} from '../keyboard/ti36xpro.js';
import {insertIntoMath,isMathInput} from '../math-input.js';

// A repeated physical key replaces its previous token only while both the
// expression and cursor are unchanged. Other input ends the multi-tap sequence.
export function createTiMultiTap(insert) {
  let last=null;
  return {
    reset(){last=null;},
    tap(name){
      const tokens=multiTapTokens[name];
      if(!tokens)throw new Error('Unknown multi-tap key');
      const field=document.activeElement;
      if(!isMathInput(field)){
        if(!field?.matches('#entry')){insert(tokens[0]);last=null;return;}
        const continuing=last?.name===name&&last.field===field&&last.after===field.value&&last.afterSelection===field.selectionStart+':'+field.selectionEnd;
        const before=continuing?last.before:field.value,selection=continuing?last.selection:[field.selectionStart,field.selectionEnd];
        const index=continuing?(last.index+1)%tokens.length:0;
        if(continuing){field.value=before;field.setSelectionRange(...selection);}
        if(name==='prob'&&index>0){
          const left=before.slice(0,selection[0]),match=left.match(/(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$|[A-Za-z]+$/);
          if(!match)throw new Error('请先输入操作数');
          field.setSelectionRange(selection[0]-match[0].length,selection[1]);insert(tokens[index]+match[0]+',');
        }else insert(tokens[index]);
        last={name,field,before,selection,index,after:field.value,afterSelection:field.selectionStart+':'+field.selectionEnd};return;
      }
      const continuing=last?.name===name&&last.field===field&&last.after===field.value&&last.afterSelection===JSON.stringify(field.selection);
      const before=continuing?last.before:field.value;
      const selection=continuing?last.selection:structuredClone(field.selection);
      const index=continuing?(last.index+1)%tokens.length:0;
      if(continuing){field.value=before;field.selection=selection;}
      const token=tokens[index];
      if(name==='prob'&&index>0)insertIntoMath(field,index===1?String.raw`\binom{#@}{#?}`:String.raw`\operatorname{nPr}\left(#@,#?\right)`);
      else insert(token);
      last={name,field,before,selection,index,after:field.value,afterSelection:JSON.stringify(field.selection)};
    },
  };
}
