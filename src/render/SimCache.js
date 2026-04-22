
const cache = new Map();

export function saveSimCache(key,data){

  cache.set(key,data);

}

export function loadSimCache(key){

  return cache.get(key);

}
