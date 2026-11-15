const slots = {
  shift: [2, '<text x="0" y="8">S</text>'],
  math: [24, '<path d="M0 5h2v2h1V4h1V2h6v1H5v3H4v3H2V7H0zm6-1h5v3H6zm1 1v1h3V5z" fill-rule="evenodd"/><path d="M11 5h1V4h1V3h1v2h-1v1h-1v1h-1z"/>'],
  angle: [43, '<path fill-rule="evenodd" d="M0 1h6v7H0zm1 1v5h4V2z"/><text x="1.5" y="6.6" class="cw-lcd-angle-letter">D</text>'],
  fix: [55, '<text x="0" y="8">FIX</text>'],
  sci: [55, '<text x="0" y="8">SCI</text>'],
  engineering: [98, '<text x="0" y="8">E</text>'],
  complex: [112, '<text x="0" y="8">i</text>'],
  simplify: [125, '<path d="M0 3h7v1H0zm0 3h7v1H0zM2 1h1v2H2zm2 6h1v2H4z"/>'],
  verify: [139, '<path d="M1 4h1v1h1v1h1V5h1V4h1V3h1V2h1v2H7v1H6v1H5v1H4v1H3V7H2V6H1z"/>'],
  previous: [158, '<path d="M2 2h2v2h1v2h1v2H0V6h1V4h1z"/>'],
  next: [168, '<path d="M0 2h6v2H5v2H4v2H2V6H1V4H0z"/>'],
  statements: [182, '<path d="M0 8h8V1H7v1H6v1H5v1H4v1H3v1H2v1H0z"/>'],
  overwrite: [72, '<text x="0" y="8">OVR</text>'],
};

export function cwLCDStatusHTML() {
  const artwork=Object.entries(slots).map(([name,[x,icon]])=>
    '<g data-cw-indicator="'+name+'" transform="translate('+x+' 0)" hidden>'+icon+'</g>',
  ).join('');
  return '<div class="status cw-lcd-status" role="img" aria-label="计算器指示符">'+
    '<svg viewBox="0 0 196 9" shape-rendering="crispEdges" aria-hidden="true">'+artwork+'</svg></div>';
}

export function updateCWLCDStatus(strip,state,angle) {
  const letter={Deg:'D',Rad:'R',Gra:'G'}[angle];
  const calculation=state.view==='calc'&&state.mode!=='base';
  const line=state.cwSettings.inputOutput.startsWith('line');
  const replay=state.cwReplay===true;
  const indicators={
    shift:state.shift,
    math:!line&&(calculation||state.form?.layout?.kind==='cw-entry'),
    angle:state.mode!=='base',
    fix:calculation&&state.format==='Fix',
    sci:calculation&&state.format==='Sci',
    engineering:calculation&&state.cwSettings.engineering,
    complex:calculation&&state.mode==='complex',
    simplify:calculation&&state.mode==='calc'&&state.cwManualSimplify,
    verify:calculation&&state.cwVerify,
    previous:calculation&&state.history.length>0&&(!replay||state.historyIndex>0),
    next:calculation&&replay&&state.historyIndex<state.history.length-1,
    statements:calculation&&state.pending.length>0,
    overwrite:calculation&&line&&state.overwrite,
  };
  for(const node of strip.querySelectorAll('[data-cw-indicator]')){
    node.toggleAttribute('hidden',!indicators[node.dataset.cwIndicator]);
  }
  const polar=state.cwSettings.polar?'∠':'i';
  strip.querySelector('[data-cw-indicator="angle"] text').textContent=letter;
  strip.querySelector('[data-cw-indicator="complex"] text').textContent=polar;
  const label={
    shift:'SHIFT',math:'Math',angle:letter,fix:'FIX',sci:'SCI',engineering:'E',complex:polar,
    simplify:'Simp',verify:'Verify',previous:'↑',next:'↓',statements:'◢',overwrite:'OVR',
  };
  strip.setAttribute('aria-label',Object.keys(indicators).filter(key=>indicators[key]).map(key=>label[key]).join(' '));
}
