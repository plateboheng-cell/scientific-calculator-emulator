// Original vector geometry for the stacked fraction legend, not a firmware or
// manufacturer image. TI's n/d legend remains text on its own physical layout.
export function keySymbolHTML(key){
  if(key[1]!=='frac'||key[0]!=='□/□')return null;
  return '<svg class="fraction-key-symbol" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="8" y="2.5" width="8" height="5.5"/><path d="M5 12h14"/><rect x="8" y="16" width="8" height="5.5"/></svg>';
}
export function shiftKeySymbolHTML(key){
  if(key[3]!=='mixed-input')return null;
  return '<svg class="mixed-key-symbol" viewBox="0 0 30 18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="1.5" y="5" width="6" height="8"/><rect x="16" y="1" width="6" height="4"/><path d="M12 9h14"/><rect x="16" y="13" width="6" height="4"/></svg>';
}
