// UI text is kept separate from expressions, input values and stored data.
const english = {
  'CNX 科学计算器': 'CNX Scientific Calculator',
  '计算器屏幕': 'Calculator display', '方向键': 'Navigation',
  '上': 'Up', '下': 'Down', '左': 'Left', '右': 'Right', '算式': 'Expression',
  '计算': 'Calculate', '复数': 'Complex', '基数': 'Base-N', '矩阵': 'Matrix',
  '向量': 'Vector', '统计': 'Statistics', '表格': 'Table',
  '方程/函数': 'Equation/Function', '不等式': 'Inequality', '比例': 'Ratio',
  '设置': 'Settings', '常数': 'CONST', '换算': 'CONV', '复位': 'Reset',
  '插入': 'Insert', '关机': 'Off', '带分数': 'a b/c',
  'F1 键盘帮助': 'F1 Keyboard help', '关闭 Esc': 'Close Esc', '键盘操作': 'Keyboard controls',
  '帮助': 'Help', '直接输入函数': 'Entering functions', '参数与数据': 'Parameters and data',
  'SHIFT / ALPHA（按一次后再按目标键）': 'SHIFT / ALPHA (press once, then the target key)',
  '主菜单；数字 1–9、0 选择十种模式': 'Main menu; 1–9 and 0 select the ten modes',
  '当前模式选项 / 函数目录': 'Mode options / function catalog',
  '科学常数 / 单位换算': 'Scientific constants / unit conversions',
  'S⇔D / 带分数': 'S⇔D / mixed fraction', '展开屏幕 / 设置': 'Expand display / settings',
  '计算；参数页面下一项，最后一项提交': 'Calculate; next parameter, submit at the last field',
  '返回 / 清空算式（AC）': 'Back / clear expression (AC)',
  '删除左边 / 右边字符': 'Delete character to the left / right',
  '菜单选择；算式内 ↑↓ 调用历史，←→ 移动光标': 'Navigate menus; ↑↓ history, ←→ move the cursor',
  '切换输入框或按键': 'Move between input fields and keys',
  '撤销输入 / 复制选择内容或结果 / 粘贴算式': 'Undo / copy selection or answer / paste expression',
  '可以直接输入': 'Enter functions such as',
  '。支持小键盘、括号、π（输入 pi）、i、Ans 和变量 A–F、x、y、z、M。': '. Numpad, parentheses, π (type pi), i, Ans and variables A–F, x, y, z, M are supported.',
  '积分': 'Integral', '；求导': '; derivative', '；求和': '; summation',
  '。F5 目录提供模板。角度单位对所有三角函数及数值微积分生效。': '. F5 provides function forms. The angle unit applies to trigonometry and numerical calculus.',
  '输入参数后按 Enter 跳到下一项；最后一项 Enter 计算。矩阵每行一行、同一行用逗号或空格分列；统计为 x,y,频数（单变量第二列是频数）。方向键浏览菜单，结果页面上下滚动。所有页面支持 Tab 访问。': 'Enter moves to the next parameter and calculates at the last field. Enter one matrix row per line, with commas or spaces between columns. Statistics use x,y,frequency (the second column is frequency in single-variable mode). Use arrow keys to navigate menus and scroll results. Tab works throughout.',
  'F12 / 中文与英文': 'F12 / Chinese and English',
  '切换界面语言': 'Switch interface language', '语言 / Language': 'Language',
  '↑↓ = · Esc 返回': '↑↓ = · Esc Back', '↑↓ 浏览 · Esc 返回': '↑↓ Scroll · Esc Back',
  'Enter 下一项 / 计算': 'Enter: Next / Calculate', '= 计算': '= Calculate',
  '基数 · 32 位': 'Base-N · 32 bit', '十进制 DEC': 'Decimal DEC',
  '十六进制 HEX': 'Hexadecimal HEX', '二进制 BIN': 'Binary BIN', '八进制 OCT': 'Octal OCT',
  '逻辑运算': 'Logic operations', '联立方程（2–4 元）': 'Simultaneous equations (2–4 unknowns)',
  '未知数个数': 'Unknowns', '多项式方程（2–4 次）': 'Polynomial equations (degree 2–4)',
  'SOLVE 数值求解': 'SOLVE numerical solution', '不等式次数': 'Inequality degree',
  '多项式次数': 'Polynomial degree', '符号': 'Relation', '解集': 'Solution set',
  '方程的根': 'Roots', '联立方程解': 'Simultaneous solution', '比例结果': 'Ratio result',
  '函数表格': 'Function table', 'g(x)（可空）': 'g(x) (optional)',
  '起始值': 'Start', '终止值': 'End', '步长': 'Step', '方程': 'Equation',
  'x 初始值': 'Initial x', '求解结果': 'Solution', 'CALC · 变量代入': 'CALC · Substitute variables',
  '定积分': 'Definite integral', '下限': 'Lower bound', '上限': 'Upper bound',
  '数值微分': 'Numerical derivative', '求和 Σ': 'Summation Σ', '求积 Π': 'Product Π',
  '起始整数': 'First integer', '终止整数': 'Last integer', '结果': 'Result',
  '1 变量': 'Single variable', '输入数据 / 计算统计量': 'Enter data / calculate statistics',
  '统计数据': 'Statistical data', '类型': 'Type',
  '单变量 x,频数 · 双变量 x,y,频数': 'Single: x,frequency · Paired: x,y,frequency',
  '统计结果': 'Statistical results', '查看统计结果': 'View results', '回归预测': 'Regression prediction',
  '定义 / 编辑矩阵': 'Define / edit matrix', '矩阵变量': 'Matrix variables',
  '每行一行，逗号分列': 'One row per line, comma-separated', '矩阵运算': 'Matrix calculation',
  '行列式 det': 'Determinant det', '逆矩阵 inv': 'Inverse inv', '转置 transpose': 'Transpose',
  '简化行阶梯 rref': 'Reduced row echelon rref', '单位矩阵 identity': 'Identity matrix',
  '定义 / 编辑向量': 'Define / edit vector', '向量变量': 'Vector variables',
  '分量': 'Components', '向量运算': 'Vector calculation', '点积 dot(A,B)': 'Dot product dot(A,B)',
  '叉积 cross(A,B)': 'Cross product cross(A,B)', '模 norm(A)': 'Magnitude norm(A)',
  '夹角 angleBetween(A,B)': 'Angle angleBetween(A,B)', '单位向量 unitVector(A)': 'Unit vector unitVector(A)',
  '函数目录': 'Function catalog', '三角 / 双曲函数': 'Trigonometric / hyperbolic',
  '三角与双曲': 'Trigonometric and hyperbolic', '数值积分 / 微分 / Σ / Π': 'Integral / derivative / Σ / Π',
  '微积分': 'Calculus', '∫ 定积分': '∫ Definite integral', 'd/dx 微分': 'd/dx Derivative',
  'Σ 求和': 'Σ Summation', 'Π 求积': 'Π Product', '整数 / 随机 / 排列组合': 'Integers / random / combinatorics',
  '整数与组合': 'Integers and combinatorics', '绝对值 Abs': 'Absolute value Abs', '阶乘 x!': 'Factorial x!',
  '排列 nPr(n,r)': 'Permutation nPr(n,r)', '组合 nCr(n,r)': 'Combination nCr(n,r)',
  '取整 Int': 'Truncate Int', '向下取整 Intg': 'Floor Intg', '四舍五入 Rnd': 'Round Rnd',
  '随机数 Ran#': 'Random Ran#', '随机整数': 'Random integer', '素因子分解': 'Prime factorization',
  '坐标 / 角度 / 度分秒': 'Coordinates / angles / DMS', '坐标与角度': 'Coordinates and angles',
  '输入度分秒': 'Enter DMS', '结果 → 度分秒': 'Result → DMS', '度分秒输入': 'DMS input',
  '度分秒': 'DMS', '度': 'Degrees', '分': 'Minutes', '秒': 'Seconds',
  '指定度 deg(x)': 'Degrees deg(x)', '指定弧度 rad(x)': 'Radians rad(x)', '指定梯度 gra(x)': 'Gradians gra(x)',
  '科学常数': 'Scientific constants', '公制换算': 'Unit conversions', '变量 / 存储器': 'Variables / memory',
  '计算历史': 'History', '复数函数': 'Complex functions', '共轭 conj': 'Conjugate conj',
  '模 abs': 'Magnitude abs', '辐角 arg': 'Argument arg', '实部 re': 'Real part re', '虚部 im': 'Imaginary part im',
  '极坐标输入 r∠θ': 'Polar input r∠θ', '结果 → r∠θ': 'Result → r∠θ', '极坐标': 'Polar form',
  'STO · 存储结果': 'STO · Store answer', 'RCL · 调用变量': 'RCL · Recall variable',
  '变量列表': 'Variable list', '变量': 'Variables', 'STO → 变量': 'STO → Variable', 'RCL · 变量': 'RCL · Variable',
  '角度单位': 'Angle unit', '度（D）': 'Degrees (D)', '弧度（R）': 'Radians (R)', '梯度（G）': 'Gradians (G)',
  '输入/输出': 'Input/output', '输出格式': 'Output format', '数学结果（分数 / 根式）': 'Natural results (fractions / radicals)',
  '小数结果': 'Decimal results', '显示格式': 'Number format', '小数位 0–9': 'Decimal places 0–9',
  '有效位 1–10': 'Significant digits 1–10', '展开 / 收起屏幕': 'Expand / collapse display',
  '清除变量': 'Clear variables', '恢复设置': 'Reset settings', '全部初始化': 'Reset all',
  '全部初始化？': 'Reset all?', '是 · 清除本软件数据': 'Yes · Clear application data', '取消': 'Cancel',
  '错误': 'Error', '提示': 'Message', '请输入算式': 'Enter an expression', '请输入实数': 'Enter a real number',
  '输入错误': 'Input error', '最高次系数不能为零': 'The leading coefficient cannot be zero',
  '请先输入数据': 'Enter data first', '请先完成回归': 'Calculate a regression first',
  '矩阵维数须为 1–4': 'Matrix dimensions must be 1–4', '请输入 2 或 3 个分量': 'Enter 2 or 3 components',
  '分、秒须在 0–60 之间': 'Minutes and seconds must be between 0 and 60',
  '位数超出范围': 'Digit count out of range', '数学错误': 'Math error', '算式为空或过长': 'Expression is empty or too long',
  'n 次根': 'nth root', '被开方数': 'Radicand', '次数': 'Degree',
  '算式过长': 'Expression too long', '不支持的算式': 'Unsupported expression', '不支持的函数': 'Unsupported function',
  '指数超出范围': 'Exponent out of range', '数据长度超出范围': 'Data length out of range',
  '超出数值范围': 'Numeric value out of range', '变量或函数未定义': 'Undefined variable or function',
  '语法错误': 'Syntax error', '积分未收敛': 'Integral did not converge', '积分区间存在奇点': 'Singularity in the integration interval',
  '范围错误': 'Range error', '方程格式错误': 'Invalid equation', '无法求解：请更换初始值': 'Cannot solve: try another initial value',
  '无法求解': 'Cannot solve', '非实数结果：请使用复数模式': 'Non-real result: use Complex mode',
  '结果类型不支持': 'Unsupported result type', '请输入 1 至 10¹² 的正整数': 'Enter a positive integer from 1 to 10¹²',
  '次数须为 1 至 4': 'Degree must be from 1 to 4', '系数格式错误': 'Invalid coefficients', '无唯一解': 'No unique solution',
  '数据或频数错误': 'Invalid data or frequency', '无法回归：x 数据无变化': 'Cannot regress: x values do not vary',
  '表格最多 45 行': 'A table can contain at most 45 rows', '基数算式格式错误': 'Invalid Base-N expression',
  '括号不匹配': 'Unmatched parentheses', '数字格式错误': 'Invalid number', '数字与进制不符': 'Invalid digit for this base',
  '超出 32 位范围': '32-bit range exceeded', '算式格式错误': 'Invalid expression',
  '真空中的光速': 'Speed of light in vacuum', '普朗克常数': 'Planck constant', '约化普朗克常数': 'Reduced Planck constant',
  '万有引力常数': 'Gravitational constant', '普朗克长度': 'Planck length', '普朗克时间': 'Planck time',
  '真空磁导率': 'Vacuum permeability', '真空介电常数': 'Vacuum permittivity', '真空特性阻抗': 'Vacuum impedance',
  '摄氏温标零点': 'Celsius zero point', '元电荷': 'Elementary charge', '玻尔磁子': 'Bohr magneton',
  '核磁子': 'Nuclear magneton', '磁通量子': 'Magnetic flux quantum', '电导量子': 'Conductance quantum',
  '约瑟夫森常数': 'Josephson constant', '冯克里青常数': 'von Klitzing constant', '电子质量': 'Electron mass',
  'μ 子质量': 'Muon mass', '质子质量': 'Proton mass', '中子质量': 'Neutron mass', 'τ 子质量': 'Tau mass',
  '原子质量常数': 'Atomic mass constant', '法拉第常数': 'Faraday constant', '阿伏伽德罗常数': 'Avogadro constant',
  '玻尔兹曼常数': 'Boltzmann constant', '理想气体摩尔体积': 'Ideal-gas molar volume', '摩尔气体常数': 'Molar gas constant',
  '第一辐射常数': 'First radiation constant', '第二辐射常数': 'Second radiation constant',
  '斯忒藩－玻尔兹曼常数': 'Stefan–Boltzmann constant', '约定约瑟夫森常数': 'Conventional Josephson constant',
  '精细结构常数': 'Fine-structure constant', '玻尔半径': 'Bohr radius', '经典电子半径': 'Classical electron radius',
  '电子康普顿波长': 'Electron Compton wavelength', '质子康普顿波长': 'Proton Compton wavelength',
  '中子康普顿波长': 'Neutron Compton wavelength', '里德伯常数': 'Rydberg constant', '质子回旋磁比': 'Proton gyromagnetic ratio',
  '电子磁矩': 'Electron magnetic moment', '质子磁矩': 'Proton magnetic moment', '中子磁矩': 'Neutron magnetic moment',
  'μ 子磁矩': 'Muon magnetic moment', '约定冯克里青常数': 'Conventional von Klitzing constant',
  '标准重力加速度': 'Standard gravity', '标准大气压': 'Standard atmosphere',
};

Object.assign(english,{
  '公式输入':'Formula entry','数据输入':'Data entry',
  '按分数、根号、乘方等按键插入数学模板，在公式空位中填写。方向键移动公式光标，Tab 切换空位；Enter 进入下一项，最后一项 Enter 计算，Ctrl+Enter 可直接计算。':'Use the fraction, root and power keys to insert mathematical templates. Fill the empty positions directly. Arrows move the formula cursor, Tab moves between positions, and Enter moves to the next parameter or calculates at the last one. Ctrl+Enter calculates directly.',
  '矩阵、向量、方程和统计数据按单元格填写。所有空位起始为空，返回编辑会保留本人输入的内容。':'Enter matrices, vectors, equations and statistics in their cells. Positions start empty; returning to edit preserves your entries.',
  '请填写公式空位':'Fill all formula positions','不支持的数学符号':'Unsupported mathematical notation','请填写上下限':'Enter the lower and upper limits',
  '请填写完整数据行':'Complete the data row','矩阵行数':'Matrix rows','矩阵列数':'Matrix columns','向量维数':'Vector dimension',
  '行列式':'Determinant','逆矩阵':'Inverse matrix','转置矩阵':'Transpose matrix','简化行阶梯形':'Reduced row echelon form','单位矩阵':'Identity matrix','阶数':'Order',
  '数量积':'Dot product','向量积':'Cross product','向量的模':'Vector magnitude','向量夹角':'Angle between vectors','单位向量':'Unit vector',
  '求解方程':'Solve equation','代入计算':'Substitute variables','最大公约数':'Greatest common divisor','最小公倍数':'Least common multiple',
  '整数部分':'Integer part','向下取整':'Floor','四舍五入':'Round','绝对值':'Absolute value','阶乘':'Factorial','排列':'Permutation','组合':'Combination','随机数':'Random number',
  '共轭复数':'Complex conjugate','复数的模':'Complex magnitude','辐角':'Argument','实部':'Real part','虚部':'Imaginary part','极坐标输入':'Polar input',
  '直角坐标转极坐标':'Cartesian to polar','极坐标转直角坐标':'Polar to Cartesian','按度输入':'Degrees','按弧度输入':'Radians','按梯度输入':'Gradians',
  '微分':'Derivative','求和':'Summation','求积':'Product','频数':'Frequency','＋ 添加行':'+ Add row','− 删除末行':'− Remove last row'
  ,'角度':'Angle'
});
const phrases = Object.keys(english).filter(key => /\p{Script=Han}/u.test(key)).sort((a,b) => b.length-a.length);
const phrasePattern = new RegExp(phrases.map(key => key.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),'gu');

export function translate(source, language) {
  if (language !== 'en' || !/\p{Script=Han}/u.test(source)) return source;
  const text=source.trim();
  if (english[text]) return source.replace(text,english[text]);
  if (/^请输入「(.+)」$/.test(text)) return `Enter ${translate(text.slice(4,-1),language)}`;
  let translated=source
    .replace(/(\d+) 元联立方程/g,'$1 unknowns')
    .replace(/(\d+) 元方程 · 系数与常数/g,'$1 unknowns · coefficients and constants')
    .replace(/(\d+) 次不等式/g,'Degree $1 inequality')
    .replace(/(\d+) 次方程/g,'Degree $1 equation')
    .replace(/(\d+) 次/g,'Degree $1')
    .replace(/第 (\d+) 行/g,'Row $1')
    .replace(/(\d+) 行/g,'$1 rows')
    .replace(/(\d+) 列/g,'$1 columns')
    .replace(/(\d+) 维/g,'$1 dimensions')
    .replace(/定义 (Mat[A-D])（最大 4×4）/g,'Define $1 (up to 4×4)')
    .replace(/定义 (Vct[A-D])（2 或 3 维）/g,'Define $1 (2D or 3D)');
  return translated.replace(phrasePattern,match=>english[match]);
}

export function createLocalizer(root, initialLanguage='zh') {
  let language=initialLanguage;
  const sources=new WeakMap();
  const attributes=new WeakMap();
  function localize() {
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    while(walker.nextNode()) {
      const node=walker.currentNode;
      if(node.parentElement?.closest('input,textarea,code,kbd,.katex,[data-user-content]')) continue;
      const previous=sources.get(node);
      const source=previous&&node.data===previous.rendered?previous.source:node.data;
      const rendered=translate(source,language);
      sources.set(node,{source,rendered});
      if(node.data!==rendered) node.data=rendered;
    }
    for(const element of root.querySelectorAll('[title],[aria-label]')) {
      const previous=attributes.get(element)||{};
      for(const attribute of ['title','aria-label']) {
        const current=element.getAttribute(attribute);
        if(current===null) continue;
        const old=previous[attribute];
        const source=old&&current===old.rendered?old.source:current;
        const rendered=translate(source,language);
        previous[attribute]={source,rendered};
        if(current!==rendered) element.setAttribute(attribute,rendered);
      }
      attributes.set(element,previous);
    }
  }
  const observer=new MutationObserver(localize);
  observer.observe(root,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['aria-label','title']});
  function setLanguage(next) {
    language=next==='en'?'en':'zh';
    document.documentElement.lang=language==='en'?'en':'zh-CN';
    document.title=language==='en'?'CNX Calculator':'CNX 计算器';
    localize();
  }
  setLanguage(initialLanguage);
  return {setLanguage,localize};
}
