// Simple injectable transport abstraction so we can mock HTTP in tests.
// Real implementation can be provided by the runtime (e.g. using fetch/axios).

/**
 * @typedef {Object} ThreadsTransport
 * @property {(method: string, url: string, options?: { headers?: Record<string,string>, body?: any }) => Promise<any>} request
 */

export class DefaultTransport {
  constructor(httpImpl) {
    this.httpImpl = httpImpl;
  }

  async request(method, url, options = {}) {
    if (!this.httpImpl) {
      throw new Error('No HTTP implementation provided for DefaultTransport');
    }
    return this.httpImpl(method, url, options);
  }
}
