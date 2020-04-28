const url = require('url');
const request = require('core/util/request');

class BackendApi {

  constructor(options) {
    this.url = options.url;
    this.auth = {
      login: options.clientLogin,
      password: options.clientPassword,
      type: options.clientType || 'local'
    };
  }

  _getToken() {
    const reqParams = {
      method: 'GET',
      url: url.resolve(this.url, '/rest/token'),
      headers: {
        'auth-user': this.auth.login,
        'auth-pwd': this.auth.password,
        'auth-user-type': this.auth.type
      }
    };
    return request(reqParams);
  }

  register(login, password) {
    const reqParams = {
      method: 'POST',
      url: url.resolve(this.url, '/rest/main/register'),
      form: {
        name: login,
        pwd: password
      }
    };
    return _getToken()
      .then(token => {
        reqParams.headers = {Authorization: `Bearer ${token}`};
        return request(reqParams);
      })
      .then(() => true);
  }

  authenticate(login, password) {
    const reqParams = {
      method: 'POST',
      url: url.resolve(this.url, '/rest/main/authenticate'),
      form: {
        user: login,
        pwd: password
      }
    };
    return _getToken()
      .then(token => {
        reqParams.headers = {Authorization: `Bearer ${token}`};
        return request(reqParams);
      })
  }

  profile(token) {
    const reqParams = {
      method: 'GET',
      url: url.resolve(this.url, '/rest/main/profile'),
      headers: {
        Authorization: `Bearer ${token}`
      }
    };
    return request(reqParams);
  }

  check(token, query) {
    const reqParams = {
      method: 'POST',
      url: url.resolve(this.url, '/rest/main/check'),
      headers: {
        Authorization: `Bearer ${token}`
      },
      form: query
    };
    return request(reqParams).then(() => true);
  }

  apply(token, data) {
    const reqParams = {
      method: 'POST',
      url: url.resolve(this.url, '/rest/main/apply'),
      headers: {
        Authorization: `Bearer ${token}`
      },
      form: data
    };
    return request(reqParams).then(() => true);
  }

  passports(token) {
    const reqParams = {
      method: 'GET',
      url: url.resolve(this.url, '/rest/main/passports'),
      headers: {
        Authorization: `Bearer ${token}`
      }
    };
    return request(reqParams);
  }
}

module.exports = BackendApi;
