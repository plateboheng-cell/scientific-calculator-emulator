import * as keys from '../keyboard/cg50.js';
import {createModes} from './modes.js';
import {CG_VARIABLE_NAMES} from './cg-variables.js';
import {CG_CALC_EXPRESSION_FUNCTIONS} from '../engine/cg-calc-expression.js';

export const cg50 = {
  id:'cg50',name:'fx-CG50',brand:'Casio',family:'cg',status:'experimental',selectable:true,
  summary:{zh:'图形、统计、电子表格、递归、程序、财务与几何',en:'Graph, Statistics, Spreadsheet, Recursion, Program, Finance and Geometry'},
  coverage:{zh:'按官方 OS 3.00 手册扩展，逐项验收进行中',en:'Expanded against the official OS 3.00 manual; item-by-item verification in progress'},
  modes:createModes(['graph','calc','stat','eactivity','spreadsheet','dynamic','table','recursion','conic','equation','program','financial','geometry','pictureplot','graph3d','memory','system','link','econ','matrix','vector','complex','base','distribution']),
  nativeMenu:[['Run-Matrix','1','RUN','calc'],['Statistics','2','STAT','stat'],['eActivity','3','eAct','eactivity'],['Spreadsheet','4','S·SHT','spreadsheet'],['Graph','5','Y=','graph'],['Dyna Graph','6','DYNA','dynamic'],['Table','7','TABLE','table'],['Recursion','8','RECUR','recursion'],['Conic Graphs','9','CONICS','conic'],['Equation','A','EQUA','equation'],['Program','B','PRGM','program'],['Financial','C','TVM','financial'],['Geometry','D','GEO','geometry'],['Picture Plot','E','PLOT','pictureplot'],['3D Graph','F','3D','graph3d'],['Memory','G','MEM','memory'],['System','H','SYS','system'],['Link','I','LINK','link'],['E-CON4','J','E-CON','econ']],
  variables:CG_VARIABLE_NAMES,registeredFunctions:false,constants:null,
  variableLabels:{x:'X',y:'Y',z:'Z',theta:'θ'},
  graphing:true,defaultMode:'graph',graphFunctions:20,
  statDistributions:true,distribution:true,
  matrixNames:Array.from({length:26},(_,i)=>'Mat'+String.fromCharCode(65+i)),matrixMax:999,matrixCells:4096,valueLimit:1000,inputArrayLimit:999,
  vectorNames:Array.from({length:26},(_,i)=>'Vct'+String.fromCharCode(65+i)),vectorDimensions:Array.from({length:999},(_,i)=>i+1),
  polynomialDegrees:[2,3,4,5,6],linearSizes:[2,3,4,5,6],
  extraFunctions:['List','Dim','Sum','Prod','Mean','Median','Med','Min','Max','Cuml','Percent','Delta','SortA','SortD','Augment','Seq','ListToMat','MatToList','Det','Trn','Identity','Ref','Rref','Abs','Arg','Conjg','ReP','ImP','DotP','CrossP','Angle','UnitV','Norm','diff2','CGMetricConvert',...CG_CALC_EXPRESSION_FUNCTIONS],
  tableRows:{single:999,dual:999},
  keyboard:{science:keys.scienceKeys,digits:keys.digitKeys,controls:keys.controls,functionKeys:keys.functionKeys,controlRows:keys.controlRows},
  references:[
    'https://www.casio.com/content/dam/casio/global/support/manuals/calculators/pdf/004-en/f/fx-CG50_Soft_v300_EN.pdf',
    'https://edu.casio.com/support/qsg/pdf/fx-CG50/02_CASIO_QuickStartGuide_fx-CG50_GRAPH.pdf',
  ],
};
