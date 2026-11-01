import {STORAGE_KEY} from './store.js';

// Keep the legacy browser copy as a rollback aid. Desktop state is also written
// atomically by the main process so images/list files aren't limited to WebStorage.
export function createDesktopStorage(local,bridge){
  if(!bridge?.loadState||!bridge?.saveState)return local;
  let loaded=false,cached=null;
  return {getItem(key){
    if(key!==STORAGE_KEY)return local.getItem(key);
    if(!loaded){const result=bridge.loadState();if(!result?.ok)throw Error(result?.error||'Cannot read desktop state');cached=result.value??null;loaded=true;}
    return cached??local.getItem(key);
  },setItem(key,value){
    if(key!==STORAGE_KEY){local.setItem(key,value);return;}
    const result=bridge.saveState(value);if(!result?.ok)throw Error(result?.error||'Cannot write desktop state');cached=value;loaded=true;
    try{local.setItem(key,value);}catch{/* The desktop file has already been saved. */}
  }};
}
