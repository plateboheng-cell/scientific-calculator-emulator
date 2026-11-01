// fx-CG50 Software 3.00, beta-1..beta-4. This is the simulator's session state;
// no physical calculator, USB disconnect or proctoring status is asserted.
export const CG_EXAM_DURATION=12*60*60*1000;
export const CG_EXAM_DISABLED_MODES=new Set(['eactivity','memory','econ','program','geometry','pictureplot','graph3d','vector']);
const copy=value=>JSON.parse(JSON.stringify(value));
const setupKeys=['inputOutput','fracResult','complex','norm','language','menuLanguage','batteryType'];
export function cgExamElapsed(exam,now=Date.now()){
  return exam?.active?Math.max(0,now-exam.enteredAt):0;
}
export function cgExamAllowsMode(exam,mode){return !exam?.active||!CG_EXAM_DISABLED_MODES.has(mode);}
export function enterCGExam(profile,now=Date.now()){
  if(!Number.isFinite(now)||now<0)throw Error('Invalid examination clock');
  const original=copy(profile.cgExam?.active?profile.cgExam.backup:profile);delete original.cgExam;
  const system=profile.cgWorkspace?.system||{};
  return {mode:'calc',calculator:{angle:profile.calculator?.angle||'Rad',vars:{}},format:profile.format||'Norm',digits:profile.digits??10,
    cgWorkspace:{system:Object.fromEntries(setupKeys.filter(key=>Object.hasOwn(system,key)).map(key=>[key,system[key]])),statistics:{quartile:profile.cgWorkspace?.statistics?.quartile||'Std'}},
    cgExam:{active:true,enteredAt:now,backup:original}};
}
export function exitCGExam(profile){
  if(!profile.cgExam?.active)return copy(profile);
  const restored=copy(profile.cgExam.backup);delete restored.cgExam;return restored;
}
export function powerOnCGExam(profile,now=Date.now()){
  return profile.cgExam?.active&&cgExamElapsed(profile.cgExam,now)>=CG_EXAM_DURATION?exitCGExam(profile):profile;
}
export function sanitizeCGExam(source,sanitizeBackup){
  if(!source||source.active!==true||!Number.isFinite(source.enteredAt)||source.enteredAt<0||!source.backup||typeof source.backup!=='object'||Array.isArray(source.backup))return null;
  return {active:true,enteredAt:source.enteredAt,backup:sanitizeBackup(source.backup)};
}
