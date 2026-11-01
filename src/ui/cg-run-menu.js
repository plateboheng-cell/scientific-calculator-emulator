// Math I/O bottom menus: OS 3.00 1-16/1-20/1-22.
export function createCGRunMenu({type,onChange=()=>{},onAction=()=>{},onExit=()=>{}}){
  let current=type,page=0;
  const labels=()=>current==='jump'?['TOP','BTM','','','','']:current==='delete'?['DEL-LINE','DEL-ALL','','','','']:current==='delete-confirm'?['Yes','','','','','No']:current==='matrix-natural'?(page?['1×2','1×3','','','','▶']:['2×2','3×3','m×n','2×1','3×1','▶']):(page?['∫dx','Σ(','','','','▶']:['MAT/VCT','logab','Abs','d/dx','d²/dx²','▶']);
  const update=(next,index=0)=>{current=next;page=index;onChange();};
  function press(index){
    if(current==='jump'){if(index<=2){onAction(index===1?'top':'bottom');onExit();}return;}
    if(current==='delete'){if(index===1){onAction('delete-line');onExit();}else if(index===2)update('delete-confirm');return;}
    if(current==='delete-confirm'){if(index===1){onAction('delete-all');onExit();}else if(index===6)update('delete');return;}
    if(index===6){page=1-page;onChange();return;}
    if(current==='matrix-natural'){const dimensions=page?[[1,2],[1,3]]:[[2,2],[3,3],null,[2,1],[3,1]];if(!page&&index===3)onAction('matrix-dimensions');else if(dimensions[index-1])onAction('matrix-template',dimensions[index-1]);return;}
    if(!page&&index===1){update('matrix-natural');return;}
    const command=page?['integral','sum'][index-1]:['','log','abs','derivative','second-derivative'][index-1];if(command)onAction(command);
  }
  return {labels,press,back(){if(current==='matrix-natural')update('math');else if(current==='delete-confirm')update('delete');else onExit();}};
}
