import {Calculator, CalcError, compileSafe, assert, validateValue, math, normalize} from './calculator.js';
import {getModel} from '../models/registry.js';
import {table} from './modes.js';
import {polynomialRoots,linearSystem} from './modes.js';
import {distribution} from './distributions.js';
import {Spreadsheet} from './spreadsheet.js';
import {normalizeCGVariableExpression} from '../models/cg-variables.js';
import {cgMatrix,cgVector,cgMemoryJSON,createCGVectorScope,createCGArrayScope,sanitizeCGAnswers} from './cg-array-memory.js';
import {readOnlyCalculator} from './read-only-calculator.js';
import {cgSecondDerivative} from './cg-second-derivative.js';
import {sanitizeCGFunctionMemory,expandCGMemoryExpression} from './cg-function-memory.js';
import {initializeCGGraphState,createCGGraphVariableScope} from './cg-graph-state.js';
import {transformCGListOperators,CG_LIST_OPERATOR_SCOPE} from './cg-list-operators.js';
import {evaluateCGRationalExpression,cgRationalJSON,reduceCGRational} from './cg-rational-display.js';
import {cgExactForValue,cgExactEnvironment,sanitizeCGExactState} from './cg-exact-state.js';
import {convertCGMetric,CGMetricError} from './cg-metric-conversion.js';
import {rewriteCGMetricExpression} from './cg-metric-expression.js';
import {rewriteCGCalcExpression} from './cg-calc-expression.js';
import {cgIntegerQuotient,cgIntegerRemainder,cgLogarithmBase} from './cg-calc-arithmetic.js';
import {evaluateCGFMin,evaluateCGFMax,evaluateCGSolveN,evaluateCGSolve} from './cg-numerical-functions.js';
import {evaluateCGIntegral,evaluateCGSigma} from './cg-native-calculus.js';
import {CG_STATISTICAL_FUNCTION_NAMES,normalizeCGStatisticalExpression,createCGStatisticalScope,sanitizeCGStatisticalNative,snapshotCGStatisticalNative} from './cg-statistical-functions.js';
import {CG_FINANCIAL_FUNCTION_NAMES,normalizeCGFinancialExpression,createCGFinancialScope,sanitizeCGFinancialNative,snapshotCGFinancialNative} from './cg-financial-functions.js';

// Model policy wraps the shared engine; numerical algorithms remain model-free.
export class ModelCalculator extends Calculator {
  constructor(modelId, saved = {}) {
    const model=getModel(modelId);
    super(saved, [...model.variables, 'Ans'],{complexVariables:model.family==='cg'});
    this.model=model;
    if(model.family==='cg'&&!['Deg','Rad','Gra'].includes(saved.angle))this.angle='Rad';
    if(model.family==='cg')this.graphMemory=initializeCGGraphState({expressions:Array(20).fill(''),enabled:Array(20).fill(true),types:Array(20).fill('y'),window:{xmin:-6.3,xmax:6.3,ymin:-3.1,ymax:3.1},xscale:1,yscale:1,parameter:{min:0,max:2*Math.PI,step:2*Math.PI/100}});
    this.valueLimit=model.valueLimit||16;
    this.booleanNumbers=model.family==='cg';
    if(model.family==='cg'){this.nativeAnswers=sanitizeCGAnswers(saved.nativeAnswers);this.functionMemory=sanitizeCGFunctionMemory(saved.functionMemory);}
    if(model.family==='cg'){const exact=sanitizeCGExactState(saved,this.vars);this.exactAnswer=exact.exactAnswer;this.exactVariables=exact.exactVariables;this.lastExactResult=null;this.cgSimplify='Auto';this.cgComplexMode='real';}
    if(model.family==='cg'){const native=sanitizeCGStatisticalNative(saved.statisticalNative);this.statisticalMemory=native.registers;this.statisticalRegression=native.regression;}
    if(model.family==='cg'){const financial=sanitizeCGFinancialNative(saved.financialNative);this.financialSettings=financial.settings;this.financialMemory=financial.memory;}
    this.definitions={};
    this.functionCallStack=[];
    this.approximateVariables=new Set((Array.isArray(saved.approximateVariables)?saved.approximateVariables:[]).filter(name=>Object.hasOwn(this.vars,name)));
    if (model.registeredFunctions) for (const name of this.functionNames()) {
      if (typeof saved.definitions?.[name] === 'string') {
        try {this.define(name, saved.definitions[name]);} catch { /* Reject invalid saved expressions. */ }
      }
    }
  }
  functionNames() {return this.model?.registeredFunctions ? (this.model.functionNames||['f','g']) : [];}
  integrate(...args){return Calculator.prototype.integrate.apply(readOnlyCalculator(this),args);}
  differentiate(...args){return Calculator.prototype.differentiate.apply(readOnlyCalculator(this),args);}
  sequence(...args){return Calculator.prototype.sequence.apply(readOnlyCalculator(this),args);}
  solve(...args){return Calculator.prototype.solve.apply(readOnlyCalculator(this),args);}
  distribution(type,parameters){assert(this.model.distribution||this.model.statDistributions,'此型号不支持分布应用');return distribution(type,parameters);}
  createSpreadsheet(){assert(this.model.spreadsheet,'此型号不支持数据表格应用');return new Spreadsheet(this);}
  prepareCGExpression(expression){return normalizeCGVariableExpression(normalizeCGStatisticalExpression(normalizeCGFinancialExpression(rewriteCGMetricExpression(rewriteCGCalcExpression(expandCGMemoryExpression(expression,{functionMemory:this.functionMemory,relations:this.graphMemory}))))));}
  compile(expression) {
    if(this.model?.family==='cg')expression=this.prepareCGExpression(expression);
    if(this.examination)assert(!/\b(?:Vct[A-Z]|VctAns|cross|dot|angleBetween|unitVector|norm|DotP|CrossP|Angle|UnitV|Norm)\b/.test(expression),'Examination Mode: vector commands are disabled');
    const code=compileSafe(expression,[...this.functionNames(),...(this.model.extraFunctions||[]),...(this.model.family==='cg'?[...CG_FINANCIAL_FUNCTION_NAMES,...CG_STATISTICAL_FUNCTION_NAMES]:[])],{maxArrayLength:this.model.inputArrayLimit||16});
    if(this.model?.matrixNames||this.model?.vectorNames)math.parse(normalize(expression)).traverse(node=>{
      if(node.isArrayNode&&this.model.matrixMax)assert(node.items.length<=Math.max(this.model.matrixMax,...(this.model.vectorDimensions||[2,3])),'矩阵尺寸超出型号限制');
      if(!node.isSymbolNode)return;
      if(/^Mat[A-Z]$/.test(node.name))assert((this.model.matrixNames||['MatA','MatB','MatC','MatD']).includes(node.name),'此型号不支持该矩阵变量');
      if(/^Vct[A-Z]$/.test(node.name))assert((this.model.vectorNames||['VctA','VctB','VctC','VctD']).includes(node.name),'此型号不支持该向量变量');
    });
    return this.model?.family==='cg'?transformCGListOperators(math.parse(normalize(expression))).compile():code;
  }
  define(name, expression) {
    assert(this.functionNames().includes(name), '此型号不支持注册函数');
    this.compile(expression); // Validate without evaluating at a potentially singular x.
    const definitions={...this.definitions, [name]:expression};
    const visit=(key, path=[])=>{
      assert(!path.includes(key),'循环引用错误');
      const body=definitions[key]; if (!body) return;
      const inspect=(expression, depth=0)=>{
        assert(depth<16,'算式过长');this.compile(expression);
        math.parse(normalize(expression)).traverse(node=>{
          if(!node.isFunctionNode)return;
          if(['f','g'].includes(node.fn.name)) visit(node.fn.name,[...path,key]);
          if(['integral','diff','sum','prod'].includes(node.fn.name) && typeof node.args[0]?.value==='string')inspect(node.args[0].value,depth+1);
        });
      };
      inspect(body);
    };
    visit(name); this.definitions=definitions;
  }
  isApproximate(expression, seen = [], depth = 0) {
    if(depth>=16)return true;
    let approximate=false;
    try {math.parse(normalize(expression)).traverse(node=>{
      if(node.isSymbolNode && this.approximateVariables.has(node.name))approximate=true;
      if(!node.isFunctionNode)return;
      const name=node.fn.name;
      if(['integral','diff','diff2'].includes(name)||this.model.family==='cg'&&[...CG_FINANCIAL_FUNCTION_NAMES,...CG_STATISTICAL_FUNCTION_NAMES,'CGMetricConvert','CGIntegral','CGSum','CGSolve','CGSolveN','CGFMin','CGFMax'].includes(name))approximate=true;
      if(['f','g'].includes(name) && !seen.includes(name) && this.definitions[name]) approximate ||= this.isApproximate(this.definitions[name],[...seen,name],depth+1);
      if(['sum','prod'].includes(name) && typeof node.args[0]?.value==='string')approximate ||= this.isApproximate(node.args[0].value,seen,depth+1);
    });} catch { /* Evaluation reports invalid syntax separately. */ }
    return approximate;
  }
  captureExactResult(expression,value,extra={},complex=false){
    if(this.model?.family!=='cg')return null;let exact=null;
    if(typeof value==='number'&&Number.isFinite(value))try{exact=cgExactForValue(evaluateCGRationalExpression(expression,{variables:cgExactEnvironment(this,extra)}),value);}catch{/* Exact display is optional when a valid numerical expression exceeds its budget. */}
    if(exact&&(this.cgSimplify!=='Manual'||complex||this.cgComplexMode!=='real'))exact=reduceCGRational(exact);this.lastExactResult=exact;return exact;
  }
  evaluate(expression, extra = {}, complex = false) {
    if(this.model.family==='cg')this.cgNumericalNotice=null;
    if(this.model.family==='cg')expression=this.prepareCGExpression(expression);
    if(this.model.matrixMax||this.model.vectorDimensions){
      const inspect=(source,depth=0)=>{
        assert(depth<16,'算式过长');
        math.parse(normalize(source)).traverse(node=>{
          if(node.isSymbolNode&&/^Mat[A-Z]$/.test(node.name)&&extra[node.name]!==undefined)this.checkMatrix(extra[node.name]);
          if(node.isSymbolNode&&/^Vct[A-Z]$/.test(node.name)&&extra[node.name]!==undefined)this.checkVector(extra[node.name]);
          if(node.isFunctionNode&&['integral','diff','sum','prod'].includes(node.fn.name)&&typeof node.args[0]?.value==='string')inspect(node.args[0].value,depth+1);
        });
      };
      inspect(expression);
    }
    const result=super.evaluate(expression,extra,complex);
    if(this.model.matrixMax&&(Array.isArray(result)||math.isMatrix(result))){const value=math.isMatrix(result)?result.toArray():result;if(Array.isArray(value[0]))this.checkMatrix(value);}
    this.lastEvaluationApproximate=this.isApproximate(expression);
    if(this.model.family==='cg')this.captureExactResult(expression,result,extra,complex);
    if(this.model.family==='cg'&&(Array.isArray(result)||math.isMatrix(result))){const value=math.isMatrix(result)?result.toArray():result;if(Array.isArray(value[0])){const matrix=cgMemoryJSON(cgMatrix(value));this.nativeAnswers={...this.nativeAnswers,matrix};if(matrix.length===1||matrix[0].length===1)this.nativeAnswers.vector=matrix;}else this.nativeAnswers={...this.nativeAnswers,list:cgMemoryJSON(value)};}
    return result;
  }
  assign(name, value, approximate = false,exactValue=undefined) {
    if(this.model?.family==='cg'&&name==='Ans'&&(Array.isArray(value)||math.isMatrix(value)))return;
    assert(Object.hasOwn(this.vars,name),'变量或函数未定义');
    validateValue(value,true,this.valueLimit);const unchanged=Object.is(this.vars[name],value);this.vars[name]=value;
    if(approximate)this.approximateVariables.add(name);else this.approximateVariables.delete(name);
    if(this.model?.family==='cg'){
      const existing=name==='Ans'?this.exactAnswer:this.exactVariables?.[name];let exact=!approximate?cgExactForValue(exactValue===undefined&&unchanged?existing:exactValue,value):null;if(exact&&(this.cgSimplify!=='Manual'||this.cgComplexMode!=='real'))exact=reduceCGRational(exact);
      if(name==='Ans')this.exactAnswer=exact?cgRationalJSON(exact):null;else{this.exactVariables??={};if(exact)this.exactVariables[name]=cgRationalJSON(exact);else delete this.exactVariables[name];}
    }
  }
  calculate(expression, complex = false) {
    const value=this.evaluate(expression,{},complex);this.assign('Ans',value,this.lastEvaluationApproximate,this.lastExactResult);return value;
  }
  scope(extra = {}) {
    if(this.model?.family==='cg')extra={...createCGArrayScope(this,this.arrayMemory),...extra};
    const scope=super.scope(extra);
    if(this.model?.family==='cg'){
      for(const name of this.model.matrixNames||[])if(extra[name]!==undefined)scope[name]=cgMatrix(extra[name]);
      for(const name of this.model.vectorNames||[])if(extra[name]!==undefined)scope[name]=cgVector(extra[name]);
      for(const [name,kind]of [['MatAns','matrix'],['VctAns','vector'],['ListAns','list']]){const saved=this.nativeAnswers?.[kind];if(saved!==undefined)scope[name]=kind==='matrix'?cgMatrix(saved):kind==='vector'?cgVector(saved):saved.map(value=>typeof value==='object'?math.complex(value.re,value.im):value);}
      Object.assign(scope,createCGVectorScope(this));
      Object.assign(scope,CG_LIST_OPERATOR_SCOPE);
      scope.CGMetricConvert=(value,from,to)=>{try{return convertCGMetric(math.isMatrix(value)?value.toArray():value,from,to);}catch(error){if(error instanceof CGMetricError)throw new CalcError(error.message);throw error;}};
      scope.diff2=(expression,x)=>cgSecondDerivative(this,expression,x,extra);
      scope.CGIntDiv=cgIntegerQuotient;scope.CGRmdr=cgIntegerRemainder;
      scope.CGLogab=(base,value)=>{if(typeof base==='number'&&base>0&&typeof value==='number'&&value>0)return cgLogarithmBase(base,value);assert([base,value].every(v=>typeof v==='number'||math.isComplex(v)),'Invalid Type');assert(!math.equal(base,0)&&!math.equal(base,1)&&!math.equal(value,0),'Ma ERROR');return math.divide(math.log(value),math.log(base));};
      scope.CGFMin=(expression,a,b,n)=>evaluateCGFMin(this,expression,a,b,n,extra);
      scope.CGFMax=(expression,a,b,n)=>evaluateCGFMax(this,expression,a,b,n,extra);
      scope.CGSolve=(expression,guess,a,b)=>evaluateCGSolve(this,expression,guess,a,b,extra);
      scope.CGSolveN=(expression,variable,a,b)=>{const result=evaluateCGSolveN(this,expression,variable,a,b,extra);if(!result.roots.length)throw new CalcError('No Solution');this.cgNumericalNotice=result.notice||null;return result.roots;};
      scope.CGIntegral=(expression,a,b,tolerance)=>evaluateCGIntegral(this,expression,a,b,tolerance,extra);
      scope.integral=scope.CGIntegral;
      scope.CGSum=(expression,variable,a,b,step)=>{const result=evaluateCGSigma(this,expression,variable,a,b,step,extra);this.assign(result.variable,result.lastBinding,false,null);return result.value;};
    }
    if(this.model?.family==='cg')for(const [key,descriptor]of Object.entries(Object.getOwnPropertyDescriptors(createCGFinancialScope(this))))if(!Object.hasOwn(extra,key))Object.defineProperty(scope,key,descriptor);
    if(this.model?.family==='cg')for(const [key,descriptor]of Object.entries(Object.getOwnPropertyDescriptors(createCGStatisticalScope(this))))if(!Object.hasOwn(extra,key))Object.defineProperty(scope,key,descriptor);
    if(this.model?.family==='cg'&&this.graphMemory)for(const [key,descriptor]of Object.entries(Object.getOwnPropertyDescriptors(createCGGraphVariableScope(this.graphMemory))))if(!Object.hasOwn(extra,key))Object.defineProperty(scope,key,descriptor);
    scope.identity=n=>{assert(Number.isInteger(n)&&n>=1&&n<=(this.model?.matrixMax||4),'矩阵尺寸超出型号限制');if(this.model?.matrixCells)assert(n*n<=this.model.matrixCells,'Matrix Memory Full');return math.identity(n);};
    if (!this.model?.registeredFunctions) return scope;
    const evaluate=(name, x, path=[])=>{
      assert(typeof x === 'number' && Number.isFinite(x));
      assert(!this.functionCallStack.includes(name),'循环引用错误');
      assert(this.definitions[name], '请先定义函数');
      this.functionCallStack.push(name);
      try {
        const calls=Object.fromEntries(this.functionNames().map(key=>[key,t=>evaluate(key,t,[...path,name])]));
        const value=this.compile(this.definitions[name]).evaluate({...scope,x,...calls});
        validateValue(value,false); return value;
      } finally {this.functionCallStack.pop();}
    };
    return {...scope,...Object.fromEntries(this.functionNames().map(name=>[name,x=>evaluate(name,x)]))};
  }
  checkMatrix(value){
    if(this.model?.family==='cg'){cgMatrix(value,{max:this.model.matrixMax,cells:this.model.matrixCells});return;}
    const matrix=math.isMatrix(value)?value.toArray():value,max=this.model.matrixMax||4;
    assert(Array.isArray(matrix)&&matrix.length>=1&&matrix.length<=max&&matrix.every(row=>Array.isArray(row)&&row.length===matrix[0].length&&row.length>=1&&row.length<=max),'矩阵尺寸超出型号限制');
    if(this.model.matrixCells)assert(matrix.length*matrix[0].length<=this.model.matrixCells,'矩阵内存不足');
  }
  checkVector(value){if(this.model?.family==='cg'){cgVector(value);return;}const vector=math.isMatrix(value)?value.toArray():value;assert(Array.isArray(vector)&&(this.model.vectorDimensions||[2,3]).includes(vector.length)&&vector.every(item=>typeof item==='number'&&Number.isFinite(item)),'向量维数超出型号限制');}
  statisticsCapacity(paired=false,frequency=false){return this.model.statisticsCells?Math.floor(this.model.statisticsCells/((paired?2:1)+(frequency?1:0))):100;}
  checkStatisticsData(rows,paired=false,frequency=false){assert(Array.isArray(rows)&&rows.length<=this.statisticsCapacity(paired,frequency),'统计行数超出型号限制');}
  solvePolynomial(coefficients){const degrees=this.model.polynomialDegrees||[2,3,4];assert(degrees.includes(coefficients.length-1),'方程次数超出型号限制');return polynomialRoots(coefficients,Math.max(...degrees));}
  solveLinearSystem(rows){const sizes=this.model.linearSizes||[2,3,4];assert(sizes.includes(rows.length),'未知数个数超出型号限制');return linearSystem(rows,Math.max(...sizes));}
  makeTable(f,g,start,end,step) {
    assert(this.model.allowDualTable!==false||!g.trim(),'此型号仅支持单函数表格');
    return table(this,f,g,start,end,step,g.trim()?this.model.tableRows.dual:this.model.tableRows.single);
  }
  makeAskTable(expression,values){
    assert(this.model.tableModes?.includes('ask-x'),'此型号不支持 Ask-x');
    assert(Array.isArray(values)&&values.length>0&&values.length<=this.model.tableRows.single&&values.every(value=>typeof value==='number'&&Number.isFinite(value)),'表格输入数量或数值错误');
    return values.map(x=>[x,this.evaluate(expression,{x})]);
  }
  save() {return {...super.save(), definitions:{...this.definitions},approximateVariables:[...this.approximateVariables],...(this.model?.family==='cg'?{financialNative:snapshotCGFinancialNative(this),nativeAnswers:sanitizeCGAnswers(this.nativeAnswers),statisticalNative:snapshotCGStatisticalNative(this),functionMemory:sanitizeCGFunctionMemory(this.functionMemory),...sanitizeCGExactState(this,this.vars)}:{})};}
}
