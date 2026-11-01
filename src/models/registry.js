import {scienceKeys, digitKeys} from '../keys.js';
import * as cw from '../keyboard/cw.js';
import {createModes} from './modes.js';
import {cg50} from './cg50.js';
import {ti36xpro} from './ti36xpro.js';
import {ex} from './ex.js';

const variables = ['A','B','C','D','E','F','x','y','z'];
const cwManual = 'https://support.casio.com/global/cn/calc/manual/fx-991CNCW_999CNCW_cn/';
const cwShared={family:'cw',status:'experimental',selectable:true,solveLocation:'equation',variables,registeredFunctions:true,constants:'codata2018',
  tableRows:{single:45,dual:30},keyboard:{science:cw.scienceKeys,digits:cw.digitKeys,controls:cw.controls,physicalLayout:cw.physicalLayout},references:[cwManual]};
const models = [
  {
    id:'cnx', name:'fx-991CN X', family:'x', status:'available', selectable:true,solveLocation:'calc',menuShortcuts:'classwiz',
    summary:{zh:'十种模式 · 保留经典按键与 CALC / SOLVE', en:'Ten modes · classic keys with CALC / SOLVE'},
    coverage:{zh:'现有功能可用，尚未完成全真机对照', en:'Existing features available; hardware parity unverified'},
    modes:createModes(['calc','complex','base','matrix','vector','stat','table','equation','inequality','ratio']),
    variables:[...variables, 'M'], registeredFunctions:false, constants:'codata2010',
    // Retain the legacy dual-function limit as a documented desktop extension.
    tableRows:{single:45, dual:45},
    keyboard:{science:scienceKeys, digits:digitKeys, controls:{
      left:[['SHIFT','shift'],['ALPHA','alpha'],['OPTN','options'],['CALC','calc','SOLVE','solve','=','=']],
      right:[['MENU','menu','设置','setup'],['ON','on'],['∫','integral','d/dx','derivative'],['x','x','Σ','sigma']],
    }},
    references:['https://www.casio.com.cn/scientific-calculators/product.FX-991CNX-BK/'],
  },
  {
    ...cwShared,id:'cncw', name:'fx-991CN CW',
    summary:{zh:'HOME / 目录 / 工具 / 转换 · 注册 f(x)、g(x)', en:'HOME / Catalog / Tools / Format · register f(x), g(x)'},
    coverage:{zh:'实验实现：已验证子集，详见兼容清单', en:'Experimental: tested subset; see compatibility matrix'},
    modes:createModes(['calc','stat','table','equation','inequality','complex','base','matrix','vector','ratio']),
  },
  {
    ...cwShared,id:'cn999cw',name:'fx-999CN CW',appearance:'white-cw',distribution:true,spreadsheet:true,
    summary:{zh:'十二种应用 · 七种分布计算 · A1:E45 数据表格',en:'Twelve apps · seven distributions · A1:E45 spreadsheet'},
    coverage:{zh:'实验实现：官方手册示例已纳入测试，非完整固件仿真',en:'Experimental: manual examples tested; incomplete hardware parity'},
    modes:createModes(['calc','stat','distribution','spreadsheet','table','equation','inequality','complex','base','matrix','vector','ratio']),
    references:[cwManual,'https://www.casio.com.cn/scientific-calculators/product.FX-999CNCW-WE'],
  },
  cg50,
  ti36xpro,
  ex,
];

function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze); Object.freeze(value);
  }
  return value;
}
export const MODELS = freeze(models);
export function getModel(id) {
  const model = MODELS.find(model => model.id === id);
  if (!model?.selectable) throw new RangeError('Model is unavailable: ' + id);
  return model;
}
