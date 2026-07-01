// IndexedDB helper — stores chart images separately from trade metadata.
// localStorage holds text data only; images live here (no size limit issues).

const DB_NAME  = 'profx_db';
const IMG_STORE = 'images';

let _db = null;
const getDB = () => {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IMG_STORE);
    req.onsuccess  = () => { _db = req.result; resolve(_db); };
    req.onerror    = () => reject(req.error);
  });
};

export const imgSave = async (key, val) => {
  if (!val) return;
  const db = await getDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(IMG_STORE, 'readwrite');
    tx.objectStore(IMG_STORE).put(val, key);
    tx.oncomplete = res;
    tx.onerror    = () => rej(tx.error);
  });
};

export const imgLoad = async (key) => {
  const db = await getDB();
  return new Promise((res, rej) => {
    const tx  = db.transaction(IMG_STORE, 'readonly');
    const req = tx.objectStore(IMG_STORE).get(key);
    req.onsuccess = () => res(req.result ?? null);
    req.onerror   = () => rej(req.error);
  });
};

export const imgDelete = async (...keys) => {
  const db = await getDB();
  const tx = db.transaction(IMG_STORE, 'readwrite');
  const store = tx.objectStore(IMG_STORE);
  keys.forEach(k => store.delete(k));
};

export const imgLoadTrade = async (id) => {
  const [weekly, daily, h4, entry, result, before, after] = await Promise.all([
    imgLoad(`${id}_weekly`),
    imgLoad(`${id}_daily`),
    imgLoad(`${id}_4h`),
    imgLoad(`${id}_entry`),
    imgLoad(`${id}_result`),
    imgLoad(`${id}_before`),
    imgLoad(`${id}_after`),
  ]);
  return { weekly, daily, '4h': h4, entry, result, before, after };
};

export const imgDeleteTrade = (id) =>
  imgDelete(`${id}_weekly`, `${id}_daily`, `${id}_4h`, `${id}_entry`, `${id}_result`, `${id}_before`, `${id}_after`);
