export const CG_GRAPH_VARIABLES=Object.freeze(['','Right'].flatMap(prefix=>[
  ...['X','Y'].flatMap(axis=>['min','max','scl','dot'].map(part=>({name:(prefix?'R-':'')+axis+part,parserName:prefix+axis+part,kind:'variable'}))),
  ...['min','max','ptch'].map(part=>({name:(prefix?'R-':'')+'Tθ'+part,parserName:prefix+'TTheta'+part,kind:'variable'})),
]).map(Object.freeze));
