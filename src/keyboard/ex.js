// Independent fx-991EX legends, checked against CASIO's official front image.
// [keycap, action, SHIFT legend, SHIFT action, ALPHA legend, ALPHA action]
export const scienceKeys = [
  ['□/□','frac','Mixed','mixed-input'], ['√','sqrt(','³√','cbrt('],
  ['x²','^2','x³','^3','','','DEC'], ['xⁿ','^','ⁿ√','root','','','HEX'],
  ['logₐ','log(','10ˣ','10^(','','','BIN'], ['ln','ln(','eˣ','exp(','','','OCT'],
  ['(−)','-','log','log10(','A','A'], ['°′″','dms','FACT','factor','B','B'],
  ['x⁻¹','^(-1)','x!','!','C','C'], ['sin','sin(','sin⁻¹','asin(','D','D'],
  ['cos','cos(','cos⁻¹','acos(','E','E'], ['tan','tan(','tan⁻¹','atan(','F','F'],
  ['STO','store','RECALL','recall'], ['ENG','eng','←','engback','i','i'],
  ['(','(','Abs','abs('], [')',')',',',',','x','x'],
  ['S⇔D','sd','a b/c','mixed','y','y'], ['M+','mplus','M−','mminus','M','M'],
];

export const digitKeys = [
  ['7','7','CONST','constants'], ['8','8','CONV','conversions'], ['9','9','RESET','reset'],
  ['DEL','delete','INS','insert','UNDO','undo'], ['AC','clear','OFF','off'],
  ['4','4'], ['5','5'], ['6','6'], ['×','*','nPr','perm'], ['÷','/','nCr','comb'],
  ['1','1'], ['2','2'], ['3','3'], ['+','+','Pol','pol'], ['−','-','Rec','rec'],
  ['0','0','Rnd','Rnd('], ['.','.','Ran#','Ran()','RanInt','ranint'],
  ['×10ˣ','*10^','π','pi','e','e'], ['Ans','Ans','%','/100'], ['=','execute','≈','approx'],
];

export const controls = {
  left: [
    ['SHIFT','shift'], ['ALPHA','alpha'],
    ['OPTN','options','QR','ex-qr'], ['CALC','calc','SOLVE','solve','=','='],
  ],
  right: [
    ['MENU','menu','SETUP','setup'], ['ON','on'],
    ['∫','integral','d/dx','derivative'], ['x','x','Σ','sigma'],
  ],
};
