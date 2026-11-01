import {createModes} from './modes.js';
import {scienceKeys, digitKeys, controls, physicalLayout} from '../keyboard/ti36xpro.js';

const guidebook='https://education.ti.com/download/en/ed-tech/858D1A4A484E493DBA150F4F3BD1DC9D/86DCDB61D56D40F79E597C4AEEDD24AD/TI-36XPro_Guidebook_EN.pdf';

export const ti36xpro = {
  id:'ti36xpro', name:'TI-36X Pro', brand:'Texas Instruments', family:'ti',
  status:'experimental', selectable:true,
  statDistributions:true,distributionListLimit:42,
  summary:{
    zh:'2nd / data / table · 八变量 · 单函数 Auto / Ask-x 表格',
    en:'2nd / data / table · eight variables · single-function Auto / Ask-x table',
  },
  coverage:{
    zh:'实验子集：3×3 矩阵、二/三次方程；非固件仿真',
    en:'Experimental subset: 3×3 matrices, quadratic/cubic solvers; no firmware emulation',
  },
  // Desktop application groups; TI changes formats/number bases through MODE.
  modes:createModes(['calc','stat','table','equation','matrix','vector','complex','base']),
  variables:['x','y','z','t','a','b','c','d'],
  registeredFunctions:true, functionNames:['f'], constants:'ti20',
  matrixNames:['MatA','MatB','MatC'], matrixMax:3,
  vectorNames:['VctA','VctB','VctC'], vectorDimensions:[1,2,3],
  vectorLabels:{VctA:'u',VctB:'v',VctC:'w'},
  linearSizes:[2,3], polynomialDegrees:[2,3],
  allowDualTable:false, tableModes:['auto','ask-x'],
  // A bounded desktop result size, not a claim about the handheld's capacity.
  tableRows:{single:45,dual:0},
  keyboard:{science:scienceKeys,digits:digitKeys,controls,physicalLayout,scienceColumns:5},
  references:[
    'https://education.ti.com/en/products/calculators/scientific-calculators/ti-36x-pro',
    'https://education.ti.com/en/guidebook/details/en/858D1A4A484E493DBA150F4F3BD1DC9D/36xpro',
    guidebook,
  ],
};
