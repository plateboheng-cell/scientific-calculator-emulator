// First-generation fx-991CN CW. Positions/legends checked against Casio's
// official front photograph and the CN CW guide, 2026-10-22 (not CW II).
// Tuple: primary legend/action, SHIFT legend/action. No ALPHA layer.
export const controlKeys = {
  on:['ON','on'], home:['HOME','menu'], setup:['设置','setup'], back:['返回','back'],
  shift:['SHIFT','shift'], variables:['变量','variables'], definitions:['功能','definitions'],
  catalog:['目录','catalog'], tools:['工具','tools'],
  up:['上','up'], left:['左','left'], ok:['OK','execute'], right:['右','right'], down:['下','down'],
  pageUp:['上翻页','page-up'], pageDown:['下翻页','page-down'],
};
export const scienceRows = [
  [
    ['x','x','°′″','dms'], ['□/□','frac','a b/c','mixed-input'],
    ['√','sqrt(','ⁿ√','root'], ['xⁿ','^','x⁻¹','^(-1)'],
    ['x²','^2','log','cw-log'], ['logₐ','log(','ln','ln('],
  ],
  [
    ['(−)','-','e','e'], ['sin','sin(','sin⁻¹','asin('],
    ['cos','cos(','cos⁻¹','acos('], ['tan','tan(','tan⁻¹','atan('],
    ['(','(','=','='], [')',')',',',','],
  ],
];
export const digitRows = [
  [['7','7','π','pi'],['8','8','∠','polar-angle'],['9','9','i','i'],['DEL','delete','插入','insert'],['AC','clear','关机','off']],
  [['4','4','A','A'],['5','5','B','B'],['6','6','C','C'],['×','*','∫','integral'],['÷','/','d/dx','derivative']],
  [['1','1','D','D'],['2','2','E','E'],['3','3','F','F'],['+','+','nPr','perm'],['−','-','nCr','comb']],
  [['0','0','x','x'],['.','.','y','y'],['×10ˣ','*10^','z','z'],['格式','format','Ans','Ans'],['EXE','execute','≈','approx']],
];
export const scienceKeys=scienceRows.flat();
export const digitKeys=digitRows.flat();
export const controls={
  left:[controlKeys.shift,controlKeys.back],
  right:[controlKeys.home,controlKeys.setup,controlKeys.on,controlKeys.ok,controlKeys.variables,controlKeys.definitions,controlKeys.catalog,controlKeys.tools],
};
export const physicalLayout={controlKeys,scienceRows,digitRows};
