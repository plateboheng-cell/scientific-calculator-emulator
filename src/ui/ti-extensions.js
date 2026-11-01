import {assert} from '../engine/calculator.js';
import {sanitizeTiExtensionSettings,validateStoredOperation,runStoredOperation,tiConversionGroups,tiMixedNumberExpression} from '../engine/ti-operations.js';

// All application state is supplied by the host so model changes never share TI
// memory. Persist operation/contrast inside the current profile's tiSettings.
export function createTiExtensions({state,calculator,list,item,form,field,result,showCalc,insert,setAnswer,persist,resetProfile,readExpression,scope=()=>({}),host=()=>document.querySelector('.lcd')}){
  Object.assign(state.tiSettings,sanitizeTiExtensionSettings(state.tiSettings));
  let count=0,lastAnswer=null;
  const english=()=>state.language==='en';
  function applyContrast(){
    const target=host();if(!target)return;
    // The desktop screen has no LCD drive voltage; simulate its visible contrast.
    target.style.filter=`contrast(${.65+state.tiSettings.contrast*.07})`;
    target.dataset.tiContrast=String(state.tiSettings.contrast);
  }
  function setOperation(){
    form('SET OP',[field('operation','OP',state.tiSettings.operation,{type:'area',optional:true})],values=>{
      state.tiSettings.operation=validateStoredOperation(calculator,values.operation);count=0;lastAnswer=null;
      persist();showCalc();
    });
  }
  function operation(){
    const current=readExpression?.()??state.expr;
    const repeat=state.hasAnswer&&lastAnswer===state.answer;
    const input=state.hasAnswer||!current?.trim()?'Ans':current;
    const out=runStoredOperation(calculator,state.tiSettings.operation,input,{scope:scope(),complex:state.mode==='complex',count:repeat?count:0});
    count=out.count;lastAnswer=out.value;state.expr=out.expression;state.latex='';
    setAnswer(out.value,out.approximate);
    state.history.push({expr:out.expression,latex:'',answer:String(out.value),mode:state.mode});
    state.history=state.history.slice(-100);state.historyIndex=state.history.length;
    persist();showCalc();
    // Keep the counter in its own compact line; it is never part of the answer.
    const screen=typeof document==='undefined'?null:document.querySelector('#answer');if(screen){const counter=document.createElement('small');counter.className='ti-op-count';counter.textContent=`n=${count}`;counter.style.cssText='display:block;font:11px monospace;text-align:left';screen.prepend(counter);}
  }
  function conversions(){
    const conversionItem=conversion=>item(conversion.label,()=>{
      const current=readExpression?.()??state.expr;
      form(conversion.label,[field('value',conversion.from,state.hasAnswer?'Ans':current||'')],values=>{
        const value=calculator.evaluate(values.value,scope());assert(typeof value==='number','请输入实数');
        const approximate=calculator.lastEvaluationApproximate===true;
        const converted=conversion.convert(value);assert(Number.isFinite(converted),'超出数值范围');
        setAnswer(converted,approximate);persist();result(conversion.label,[[conversion.to,converted]],approximate);
      });
    });
    list('CONVERSIONS',tiConversionGroups.map(group=>item(group.name,()=>list(group.name,group.conversions.map(conversionItem)))));
  }
  function reset(){
    list('RESET',[item(english()?'No':'否',showCalc),item(english()?'Yes · reset this calculator':'是 · 初始化当前计算器',()=>{count=0;lastAnswer=null;resetProfile();})],true,0);
  }
  function handleAction(action){
    if(!['ti-op','shift','ti-contrast-light','ti-contrast-dark'].includes(action)){count=0;lastAnswer=null;}
    if(action==='clear'&&state.view==='form'&&state.form?.title==='SET OP'){
      const input=document.querySelector('#param-0');if(input){input.value='';input.focus();}return true;
    }
    if(action==='ti-setop'){setOperation();return true;}
    if(action==='ti-op'){operation();return true;}
    if(action==='ti-conversions'||action==='conversions'){conversions();return true;}
    if(action==='ti-reset'){reset();return true;}
    if(action==='ti-mixed-entry'){
      if(state.tiSettings.input==='classic')form('U n/d',[field('whole',english()?'Whole':'整数'),field('numerator',english()?'Numerator':'分子'),field('denominator',english()?'Denominator':'分母')],values=>{
        const expression=tiMixedNumberExpression(values.whole,values.numerator,values.denominator);showCalc();insert(expression);
      });
      else insert('mixed-input');
      return true;
    }
    if(action==='ti-contrast-light'||action==='ti-contrast-dark'){
      state.tiSettings.contrast=Math.max(0,Math.min(10,state.tiSettings.contrast+(action==='ti-contrast-dark'?1:-1)));applyContrast();persist();return true;
    }
    return false;
  }
  return {handleAction,applyContrast};
}
