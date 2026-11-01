import {sanitizeCGGeometryState} from "./cg-geometry-state.js";
import {sanitizeCG3DState} from "./cg-3d-state.js";
import {sanitizeCGPicturePlotState} from "./cg-pictureplot-state.js";
export function sanitizeCGVisualState(source={},mode="geometry"){
  const sanitize={geometry:sanitizeCGGeometryState,graph3d:sanitizeCG3DState,pictureplot:sanitizeCGPicturePlotState}[mode];
  if(!sanitize)throw Error("Unknown visual application: "+mode);
  return sanitize(source);
}
