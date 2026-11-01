import {createModes} from './modes.js';
import {scienceKeys, digitKeys, controls} from '../keyboard/ex.js';

const modeOrder = [
  'calc','complex','base','matrix','vector','stat','distribution','spreadsheet',
  'table','equation','inequality','ratio',
];

// CASIO fx-570EX/fx-991EX User's Guide, RJA532432-001V01:
// pp.5,13,19,20,25,28,31–33,37. Main-menu shortcuts: Quick Start Guide p.2.
export const ex = {
  id:'ex', name:'fx-991EX', brand:'Casio', family:'ex', appearance:'classwiz-ex',
  status:'experimental', selectable:true, solveLocation:'calc', menuShortcuts:'classwiz',
  summary:{
    zh:'经典英文按键 · 十二种模式 · 分布与数据表格',
    en:'Classic English keys · twelve modes · distributions and spreadsheet',
  },
  coverage:{
    zh:'实验实现：基于官方说明书的可验证子集，非完整固件仿真',
    en:'Experimental: a verifiable manual-based subset; incomplete hardware parity',
  },
  modes:createModes(modeOrder).map((mode,index) => [mode[0], '123456789ABC'[index], mode[2], mode[3]]),
  variables:['A','B','C','D','E','F','M','x','y'],
  registeredFunctions:false, discardDefinitions:true, constants:'codata2010',
  baseKeys:{'^2':10,'^':16,'log(':2,'ln(':8},
  tableRows:{single:45, dual:30},
  matrixNames:['MatA','MatB','MatC','MatD'], matrixMax:4,
  vectorNames:['VctA','VctB','VctC','VctD'], vectorDimensions:[2,3],
  linearSizes:[2,3,4], polynomialDegrees:[2,3,4],
  distribution:true, distributionListLimit:45,
  distributionOrder:['normalPDF','normalCDF','inverseNormal','binomialPDF','binomialCDF','poissonPDF','poissonCDF'],
  distributionParameterOrder:{
    normalPDF:['x','σ','μ'], normalCDF:['下限','上限','σ','μ'], inverseNormal:['区域','σ','μ'],
  },
  spreadsheet:true, spreadsheetLifecycle:'leave-app',
  spreadsheetMemory:{constantBytes:10,formulaOverhead:11,constantInputBytes:10},
  volatileStatistics:true, statisticsCells:160,
  keyboard:{science:scienceKeys, digits:digitKeys, controls},
  references:[
    'https://www.casio.com/us/scientific-calculators/product.FX-991EX/',
    'https://www.casio.com/content/dam/casio/global/support/manuals/calculators/pdf/004-en/f/fx-570_991EX_EN.pdf',
    'https://www.casio.com/content/dam/casio/local/us/cpd/pdf/Casio-fx-991EX-QSG.pdf',
  ],
};
