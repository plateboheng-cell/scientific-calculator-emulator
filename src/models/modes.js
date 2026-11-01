// [localized source label, desktop shortcut, original symbol, engine mode]
export const modeDefinitions = {
  graph: ['图形', 'Y='],
  calc: ['计算', '▤'], complex: ['复数', 'a+bi'], base: ['基数', '01'],
  matrix: ['矩阵', '[A]'], vector: ['向量', '→'], stat: ['统计', 'σ'],
  table: ['表格', 'x f(x)'], equation: ['方程/函数', 'x='],
  inequality: ['不等式', 'x>'], ratio: ['比例', 'A:B'],
  distribution:['分布','∩'],spreadsheet:['数据表格','A1'],
  eactivity:['eActivity','eAct'],dynamic:['动态绘图','DYNA'],recursion:['递归','RECUR'],conic:['圆锥曲线','CONIC'],program:['程序','PRGM'],financial:['财务','TVM'],geometry:['几何','GEO'],pictureplot:['图片描点','PLOT'],graph3d:['三维图形','3D'],memory:['存储管理','MEM'],system:['系统','SYS'],link:['数据传输','LINK'],econ:['数据采集','E-CON'],
};

export function createModes(order) {
  return order.map((id, index) => [modeDefinitions[id][0], '1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ'[index], modeDefinitions[id][1], id]);
}
