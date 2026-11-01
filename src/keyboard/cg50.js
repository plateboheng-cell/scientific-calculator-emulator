// Physical positions checked against the official fx-CG50 Hardware User's Guide
// EN-7 and Casio's front product photograph, 2026-10-22. Original text/data only.
// [primary legend, action, SHIFT legend, action, ALPHA legend, action]
export const functionKeys = [
  ['F1','cg-f1','Trace','graph-trace'],
  ['F2','cg-f2','Zoom','graph-zoom'],
  ['F3','cg-f3','V-Window','graph-window'],
  ['F4','cg-f4','Sketch','graph-sketch'],
  ['F5','cg-f5','G-Solv','graph-root'],
  ['F6','cg-f6','G↔T','graph-toggle'],
];

// The navigation ring sits to the RIGHT of this 4-column, 2-row block.
export const controlRows = [
  [
    ['SHIFT','shift'], ['OPTN','options'],
    ['VARS','variables','PRGM','cg-prgm'],
    ['MENU','menu','SET UP','setup'],
  ],
  [
    ['ALPHA','alpha','A-LOCK','cg-alpha-lock'],
    ['x²','^2','√','sqrt('], ['^','^','ˣ√','root'],
    ['EXIT','back','QUIT','cg-quit'],
  ],
];

// Two complete rows of six keys, left to right, below the controls/navigation.
export const scienceKeys = [
  ['X,θ,T','x','∠','polar-angle','A','A'],
  ['log','log(','10ˣ','10^(','B','B'],
  ['ln','ln(','eˣ','exp(','C','C'],
  ['sin','sin(','sin⁻¹','asin(','D','D'],
  ['cos','cos(','cos⁻¹','acos(','E','E'],
  ['tan','tan(','tan⁻¹','atan(','F','F'],
  ['□/□','frac','a b/c','mixed','G','G'],
  ['S↔D','sd','a b/c↔d/c','mixed','H','H'],
  ['(','(','³√','cbrt(','I','I'],
  [')',')','x⁻¹','^(-1)','J','J'],
  [',',',','','','K','K'],
  ['→','cg-store-arrow','','','L','L'],
];

// Four complete rows of five keys. Ans is SHIFT+(−), not a separate key.
export const digitKeys = [
  ['7','7','CAPTURE','cg-capture','M','M'],
  ['8','8','CLIP','cg-clip','N','N'],
  ['9','9','PASTE','cg-paste','O','O'],
  ['DEL','delete','INS','insert','UNDO','undo'],
  ['AC/ON','cg-clear-on','OFF','off'],
  ['4','4','CATALOG','cg-catalog','P','P'],
  ['5','5','FORMAT','cg-format','Q','Q'],
  ['6','6','','','R','R'],
  ['×','*','{','cg-open-list','S','S'],
  ['÷','/','}','cg-close-list','T','T'],
  ['1','1','List','cg-list','U','U'],
  ['2','2','Mat','cg-matrix','V','V'],
  ['3','3','','','W','W'],
  ['+','+','[','cg-open-matrix','X','X'],
  ['−','-',']','cg-close-matrix','Y','Y'],
  ['0','0','i','i','Z','Z'],
  ['.','.','=','cg-equals','SPACE','cg-space'],
  ['×10ˣ','*10^','π','pi','”','cg-strings'],
  ['(−)','-','Ans','Ans'],
  ['EXE','execute','↵','cg-newline'],
];

// Compatibility export. A faithful renderer uses controlRows and puts the
// direction ring to their right, rather than between these two rows.
export const controls = {left:controlRows[0],right:controlRows[1]};
