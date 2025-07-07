// Simple in-memory store for development
// In production, this should use electron-store or similar
class SimpleStore {
  constructor() {
    this.data = {};
  }

  get(key) {
    return this.data[key];
  }

  set(key, value) {
    this.data[key] = value;
  }

  delete(key) {
    delete this.data[key];
  }

  clear() {
    this.data = {};
  }
}

const store = new SimpleStore();
module.exports = store;
