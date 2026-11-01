import {createCGGeometryPanel} from "./cg-geometry-panel.js";
import {createCG3DPanel} from "./cg-3d-panel.js";
import {createCGPicturePlotPanel} from "./cg-pictureplot-panel.js";
import "./cg-visual-panel.css";
export function createCGVisualPanel(options={}){
  const mode=options.mode||"geometry",factory={geometry:createCGGeometryPanel,graph3d:createCG3DPanel,pictureplot:createCGPicturePlotPanel}[mode];
  if(!factory)throw Error("Unknown visual application: "+mode);
  return factory(options);
}
