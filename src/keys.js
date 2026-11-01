// Backward-compatible exports for the original X layout.
export {scienceKeys, digitKeys} from './keyboard/cnx.js';
import {createModes} from './models/modes.js';
export const modes=createModes(['calc','complex','base','matrix','vector','stat','table','equation','inequality','ratio']);
