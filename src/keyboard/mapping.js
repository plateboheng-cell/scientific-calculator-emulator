// Desktop shortcuts are separate from physical key legends and DOM handling.
export function shortcutAction(model, event, shifted = false, alpha = false) {
  const shift = event.shiftKey || shifted;
  const shared = {F1:'help', F2:'shift', F4:shift?'setup':'menu', Home:'menu', F8:'conversions', F11:'setup', Insert:'insert'};
  if (event.key === 'F12') return 'toggle-language';
  if (event.key === 'F10') return 'expand';
  if (model.family === 'cg') {
    return {F1:shift?'graph-trace':'cg-f1',F2:shift?'graph-zoom':'cg-f2',F3:shift?'graph-window':'cg-f3',F4:shift?'graph-sketch':'cg-f4',F5:shift?'graph-root':'cg-f5',F6:shift?'graph-toggle':'cg-f6',F7:'help',F9:'sd'}[event.key] ?? shared[event.key];
  }
  if (model.family === 'ti') {
    return {F3:'variables',F5:'options',F6:shift?'solve':'definitions',F9:shift?'mixed':'sd',F11:'ti-mode'}[event.key] ?? shared[event.key];
  }
  if (model.family === 'cw') {
    return {F3:'variables', F5:shift?'tools':'catalog', F6:shift?'solve':'definitions', F7:'constants', F9:shift?'sd':'format'}[event.key] ?? shared[event.key];
  }
  return {F3:'alpha', F5:'options', F6:alpha?'=':shift?'solve':'calc', F7:'constants', F9:shift?'mixed':'sd'}[event.key] ?? shared[event.key];
}

export function modifiedKeyAction(model, key, modifier) {
  const match = [...model.keyboard.science, ...model.keyboard.digits].find(k => k[0].toLowerCase() === key.toLowerCase() || k[1] === key);
  return match?.[modifier === 'shift' ? 3 : 5];
}
