/**
 * Signal Protocol In-Memory Store
 * Implements all required storage interfaces for libsignal-protocol
 * Persists to localStorage for session persistence across browser restarts
 */

const STORAGE_KEY = 'phantom_signal_store';

function arrayBufferToBase64(buffer) {
  if (buffer instanceof ArrayBuffer) {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)));
  }
  if (buffer?.buffer instanceof ArrayBuffer) {
    return btoa(String.fromCharCode(...new Uint8Array(buffer.buffer)));
  }
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export default class SignalProtocolStore {
  constructor() {
    this._store = {};
    this._load();
  }

  _save() {
    try {
      const serializable = {};
      for (const [key, value] of Object.entries(this._store)) {
        if (value instanceof ArrayBuffer) {
          serializable[key] = { __type: 'ab', data: arrayBufferToBase64(value) };
        } else if (value?.privKey && value?.pubKey) {
          serializable[key] = {
            __type: 'keypair',
            pubKey: arrayBufferToBase64(value.pubKey),
            privKey: arrayBufferToBase64(value.privKey),
          };
        } else if (typeof value === 'object' && value !== null && value.keyId !== undefined) {
          // Signed pre-key or pre-key record
          const obj = { ...value, __type: 'keyrecord' };
          if (value.keyPair) {
            obj.keyPair = {
              pubKey: arrayBufferToBase64(value.keyPair.pubKey),
              privKey: arrayBufferToBase64(value.keyPair.privKey),
            };
          }
          if (value.signature) {
            obj.signature = arrayBufferToBase64(value.signature);
          }
          serializable[key] = obj;
        } else {
          serializable[key] = value;
        }
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
    } catch (e) {
      console.warn('[Signal Store] Failed to persist:', e.message);
    }
  }

  _load() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return;
      const parsed = JSON.parse(data);
      for (const [key, value] of Object.entries(parsed)) {
        if (value?.__type === 'ab') {
          this._store[key] = base64ToArrayBuffer(value.data);
        } else if (value?.__type === 'keypair') {
          this._store[key] = {
            pubKey: base64ToArrayBuffer(value.pubKey),
            privKey: base64ToArrayBuffer(value.privKey),
          };
        } else if (value?.__type === 'keyrecord') {
          const obj = { ...value };
          delete obj.__type;
          if (value.keyPair) {
            obj.keyPair = {
              pubKey: base64ToArrayBuffer(value.keyPair.pubKey),
              privKey: base64ToArrayBuffer(value.keyPair.privKey),
            };
          }
          if (value.signature && typeof value.signature === 'string') {
            obj.signature = base64ToArrayBuffer(value.signature);
          }
          this._store[key] = obj;
        } else {
          this._store[key] = value;
        }
      }
    } catch (e) {
      console.warn('[Signal Store] Failed to load:', e.message);
    }
  }

  // Direction constants
  Direction = { SENDING: 1, RECEIVING: 2 };

  // IdentityKeyStore interface
  getIdentityKeyPair() {
    return Promise.resolve(this._store['identityKey']);
  }

  getLocalRegistrationId() {
    return Promise.resolve(this._store['registrationId']);
  }

  put(key, value) {
    this._store[key] = value;
    this._save();
  }

  get(key, defaultValue) {
    if (key in this._store) return this._store[key];
    return defaultValue;
  }

  remove(key) {
    delete this._store[key];
    this._save();
  }

  isTrustedIdentity(identifier, identityKey, _direction) {
    if (!identifier) return Promise.reject(new Error('Invalid identifier'));
    const trusted = this._store['identityKey' + identifier];
    if (!trusted) return Promise.resolve(true); // Trust on first use (TOFU)
    return Promise.resolve(
      arrayBufferToBase64(identityKey) === arrayBufferToBase64(trusted)
    );
  }

  loadIdentityKey(identifier) {
    if (!identifier) return Promise.reject(new Error('Invalid identifier'));
    return Promise.resolve(this._store['identityKey' + identifier]);
  }

  saveIdentity(identifier, identityKey) {
    if (!identifier) return Promise.reject(new Error('Invalid identifier'));
    const existing = this._store['identityKey' + identifier];
    this._store['identityKey' + identifier] = identityKey;
    this._save();
    // Return true if the identity key was replaced (key changed)
    if (existing && arrayBufferToBase64(existing) !== arrayBufferToBase64(identityKey)) {
      return Promise.resolve(true);
    }
    return Promise.resolve(false);
  }

  // PreKeyStore interface
  loadPreKey(keyId) {
    const res = this._store['25519KeypreKey' + keyId];
    if (res) {
      return Promise.resolve({
        pubKey: res.keyPair.pubKey,
        privKey: res.keyPair.privKey,
      });
    }
    return Promise.resolve(undefined);
  }

  storePreKey(keyId, keyPair) {
    this._store['25519KeypreKey' + keyId] = { keyPair };
    this._save();
    return Promise.resolve();
  }

  removePreKey(keyId) {
    delete this._store['25519KeypreKey' + keyId];
    this._save();
    return Promise.resolve();
  }

  // SignedPreKeyStore interface
  loadSignedPreKey(keyId) {
    const res = this._store['25519KeysignedKey' + keyId];
    if (res) {
      return Promise.resolve({
        pubKey: res.keyPair.pubKey,
        privKey: res.keyPair.privKey,
      });
    }
    return Promise.resolve(undefined);
  }

  storeSignedPreKey(keyId, keyPair) {
    this._store['25519KeysignedKey' + keyId] = { keyPair };
    this._save();
    return Promise.resolve();
  }

  removeSignedPreKey(keyId) {
    delete this._store['25519KeysignedKey' + keyId];
    this._save();
    return Promise.resolve();
  }

  // SessionStore interface
  loadSession(identifier) {
    return Promise.resolve(this._store['session' + identifier]);
  }

  storeSession(identifier, record) {
    this._store['session' + identifier] = record;
    this._save();
    return Promise.resolve();
  }

  removeSession(identifier) {
    delete this._store['session' + identifier];
    this._save();
    return Promise.resolve();
  }

  removeAllSessions(identifier) {
    for (const key of Object.keys(this._store)) {
      if (key.startsWith('session' + identifier)) {
        delete this._store[key];
      }
    }
    this._save();
    return Promise.resolve();
  }

  // Helper: get count of remaining pre-keys
  getPreKeyCount() {
    let count = 0;
    for (const key of Object.keys(this._store)) {
      if (key.startsWith('25519KeypreKey')) count++;
    }
    return count;
  }

  // Helper: check if session exists
  hasSession(identifier) {
    return !!this._store['session' + identifier + '.1'];
  }

  // Helper: clear everything
  clearAll() {
    this._store = {};
    localStorage.removeItem(STORAGE_KEY);
  }
}
