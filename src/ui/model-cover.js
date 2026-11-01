// Only the separate case moves. The calculator stays at its final position.
// X/EX, CG50 and TI use rails; the first-generation CW cover lifts off clips.
const slide = (release, travel, tilt = 0) => [
  {offset:0,transform:'translate3d(0,0,2px)',opacity:1,easing:'cubic-bezier(.4,0,.7,1)'},
  {offset:.13,transform:`translate3d(0,${release}%,3px)`,easing:'cubic-bezier(.3,.05,.35,1)'},
  {offset:.82,transform:`translate3d(0,${travel}%,3px)`,opacity:1,easing:'ease-out'},
  {offset:1,transform:`translate3d(${tilt}%,112%,20px) rotateX(6deg) rotateZ(${tilt / 2}deg)`,opacity:0},
];
const lift = side => [
  {offset:0,transform:'translate3d(0,0,2px)',easing:'ease-in-out'},
  {offset:.16,transform:`translate3d(0,-.3%,7px) rotateX(-3deg) rotateY(${side * 2}deg)`,easing:'cubic-bezier(.2,.6,.3,1)'},
  {offset:.43,transform:`translate3d(${side * 14}%,-4%,32px) rotateX(-18deg) rotateY(${side * 12}deg)`,easing:'cubic-bezier(.4,0,.3,1)'},
  {offset:.83,transform:`translate3d(${side * 92}%,0,40px) rotateX(-12deg) rotateY(${side * 22}deg) rotateZ(${side * 9}deg)`,opacity:1,easing:'ease-out'},
  {offset:1,transform:`translate3d(${side * 118}%,4%,12px) rotateX(-8deg) rotateY(${side * 26}deg) rotateZ(${side * 12}deg)`,opacity:0},
];
const profiles = {
  cnx:{mechanism:'slide',duration:1420,frames:slide(2,103,-4)},
  ex:{mechanism:'slide',duration:1300,frames:slide(1.3,105,3)},
  cncw:{mechanism:'lift',duration:1510,frames:lift(-1)},
  cn999cw:{mechanism:'lift',duration:1590,frames:lift(1)},
  cg50:{mechanism:'slide',duration:1660,frames:slide(3.2,102,2)},
  ti36xpro:{mechanism:'slide',duration:1490,frames:slide(2.6,106,6)},
};

export function revealModelCover(calculator,model) {
  const profile=profiles[model.id];
  if(!calculator||!profile)return {finish(){}};
  const scene=document.createElement('div');
  scene.className=`calculator-cover-scene cover-${model.id}`;
  scene.dataset.coverModel=model.id;scene.dataset.coverMechanism=profile.mechanism;
  scene.setAttribute('aria-hidden','true');scene.setAttribute('data-user-content','');scene.inert=true;
  scene.innerHTML=`<div class="calculator-cover"><div class="cover-face"><span class="cover-inset"></span><span class="cover-grip"></span></div><div class="cover-inside"><span class="cover-rib"></span><span class="cover-rib"></span></div><span class="cover-rail cover-rail-left"></span><span class="cover-rail cover-rail-right"></span><span class="cover-lip"></span></div>`;
  calculator.append(scene);
  const shell=scene.firstElementChild,reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let animation,done=false;
  const finish=()=>{if(done)return;done=true;animation?.cancel();scene.remove();};
  // Paint the covered calculator at rest before the removal starts.
  requestAnimationFrame(()=>{
    if(done)return;
    animation=shell.animate(reduced?[{opacity:1},{opacity:0}]:profile.frames,{
      duration:reduced?120:profile.duration,delay:reduced?80:360,fill:'both',easing:'linear',
    });
    animation.finished.then(finish,finish);
  });
  return {finish};
}
