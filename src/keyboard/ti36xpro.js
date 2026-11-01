// Physical key positions and legends from TI's official front photograph.
// Tuple: [primary legend, primary action, 2nd legend, 2nd action].
// Two short rows sit beside the cursor pad; seven complete five-key rows follow.
export const topRows = [
  [['2nd','shift'],['mode','ti-mode','quit','ti-quit'],['delete','delete','insert','insert']],
  [['ln\nlog','ti-multi:log','d/dx','derivative'],['math','options','matrix','mode:matrix'],['data','ti-data','stat-reg/distr','ti-stats']],
];
export const rows = [
  [['eˣ\n10ˣ','ti-multi:exp','∫□dx','integral'],['EE','*10^','vector','mode:vector'],['!\nnCr\nnPr','ti-multi:prob','random','ti-random'],['table','mode:table','expr-eval','calc'],['clear','clear']],
  [['π\ne\ni','ti-multi:pi','complex','ti-complex'],['sin\nsin⁻¹','ti-multi:sin','num-solv','solve'],['cos\ncos⁻¹','ti-multi:cos','poly-solv','ti-polynomial'],['tan\ntan⁻¹','ti-multi:tan','sys-solv','ti-system'],['÷','/','%','/100']],
  [['x^□','^','ⁿ√','root'],['n/d','frac','n/d↔U n/d','mixed'],['(','(','constants','constants'],[')',')','op','ti-op'],['×','*','setop','ti-setop']],
  [['x²','^2','√','sqrt('],['7','7','U n/d','ti-mixed-entry'],['8','8','convert','ti-conversions'],['9','9','base n','ti-base'],['−','-','◀☼','ti-contrast-light']],
  [['x y z t\na b c d','ti-multi:variables','clear var','ti-clearvar'],['4','4','D','D'],['5','5','E','E'],['6','6','F','F'],['+','+','☼▶','ti-contrast-dark']],
  [['sto→','store','recall','recall'],['1','1','A','A'],['2','2','B','B'],['3','3','C','C'],['◀▶≈','sd','F↔D','ti-fraction-decimal']],
  [['on','on','off','off'],['0','0','reset','ti-reset'],['.','.',',',','],['(−)','-','answer','Ans'],['enter','execute']],
];
export const multiTapTokens = {
  log:['ln(','log('], exp:['exp(','10^('], pi:['pi','e','i'],
  variables:['x','y','z','t','a','b','c','d'], prob:['!','nCr(','nPr('],
  sin:['sin(','asin(','sinh(','asinh('], cos:['cos(','acos(','cosh(','acosh('], tan:['tan(','atan(','tanh(','atanh('],
};
export const physicalLayout = {topRows,rows,columns:5,topColumns:3,multiTapTokens};
// Legacy exports; this model's renderer must prefer physicalLayout.
export const scienceKeys = rows.slice(0,3).flat();
export const digitKeys = rows.slice(3).flat();
export const controls = {left:topRows.flat(),right:[]};
