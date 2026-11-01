import {createSession} from './store.js';
import {ModelCalculator} from '../engine/model-calculator.js';

export function cgNativeMemoryState(profile,calculator){
  const saved=calculator.save(),system=profile.cgWorkspace?.system||{},statistics=profile.cgWorkspace?.statistics||{};
  return {workspace:profile.cgWorkspace,variables:saved.vars,matrices:profile.matrices,vectors:profile.vectors,nativeAnswers:saved.nativeAnswers,
    settings:{angle:calculator.angle,complex:system.complex||'real',display:{mode:profile.format||'Norm',digits:profile.digits??10,norm:system.norm||1},engineering:system.engineering===true,statWindow:statistics.autoWindow===false?'Manual':'Auto',listFile:(statistics.listFile||0)+1,quartile:statistics.quartile||'Std',paymentBegin:calculator.financialSettings?.begin===true,days:calculator.financialSettings?.days||365}};
}

/** Convert a staged native import to the same validated profile as a restart. */
export function cgProfileFromNative(profile,calculator,staged){
  for(const value of Object.values(staged.matrices||{}))calculator.checkMatrix(value);
  for(const value of Object.values(staged.vectors||{}))calculator.checkVector(value);
  if(staged.nativeAnswers?.matrix)calculator.checkMatrix(staged.nativeAnswers.matrix);
  if(staged.nativeAnswers?.vector)calculator.checkVector(staged.nativeAnswers.vector);
  const source=calculator.save(),settings=staged.settings||{},display=settings.display||{},workspace=staged.workspace;
  workspace.system??={};
  if(['real','a+bi','polar'].includes(settings.complex))workspace.system.complex=settings.complex;
  if(settings.engineering!==undefined)workspace.system.engineering=settings.engineering===true;
  if([1,2].includes(display.norm))workspace.system.norm=display.norm;
  const format=['Fix','Sci','Norm'].includes(display.mode)?display.mode:profile.format,digits=format==='Norm'?10:Number.isInteger(display.digits)?format==='Sci'&&display.digits===0?10:display.digits:format===profile.format?profile.digits:format==='Fix'?2:10;
  const financial=source.financialNative||{},financialSettings={...financial.settings};
  if(typeof settings.paymentBegin==='boolean')financialSettings.begin=settings.paymentBegin;
  if([360,365].includes(settings.days))financialSettings.days=settings.days;
  const next={...profile,cgWorkspace:workspace,matrices:staged.matrices,vectors:staged.vectors,format,digits,calculator:{...source,vars:staged.variables,nativeAnswers:staged.nativeAnswers,angle:['Deg','Rad','Gra'].includes(settings.angle)?settings.angle:calculator.angle,financialNative:{...financial,settings:financialSettings}}};
  const candidate=createSession(next,profile.language,'cg50'),restored=new ModelCalculator('cg50',candidate.calculator);
  return {profile:candidate,calculator:restored};
}
