class BackendApi {

  constructor(options) {
    this.url = options.url;
  }

  register(login, password) {
    return Promise.resolve(true);
  }

  authenticate(login, password) {
    const token = '123';
    return Promise.resolve(token);
  }

  profile(token) {
    return Promise.resolve({});
  }

  check(query) {
    return Promise.resolve(true);
  }

  apply(token, data) {
    return Promise.resolve(true);
  }

  passports(token) {
    return Promise.resolve([]);
  }
}

module.exports = BackendApi;
