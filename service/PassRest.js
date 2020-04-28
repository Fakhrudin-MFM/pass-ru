const Service = require('modules/rest/lib/interfaces/Service');
const IonError = require('core/IonError');

function generateSecretCode() {
  const min = 1000;
  const max = 9999;
  return min + Math.floor((max - min) * Math.random());
}

/**
 * @param {{backendApi: BackendApi, log; Logger, sms: IMessageService}} options
 * @constructor
 */
function AuthRest(options) {

  function authenticate(login, password) {
    let token;
    return options.backendApi.authenticate(login, password)
      .then((authToken) => {
        token = authToken;
        return options.backendApi.profile(authToken);
      })
      .then((profile) => {
        return {token, profile};
      });
  }

  this._route = function(router) {

    this.addHandler(router, '/', 'GET', (req) => {
      const {profile} = req.session;
      if (!profile) {
        return Promise.reject(new IonError(401, 'Unauthorized'));
      }
      return Promise.resolve({data: {profile}});
    });

    this.addHandler(router, '/', 'POST', (req) => {
      const {authToken} = req.session;
      if (!authToken) {
        return Promise.reject(new IonError(401, 'Unauthorized'));
      }
      const {data} = req.body;
      if (!data) {
        return Promise.reject(new IonError(400, 'Wrong request'));
      }
      return options.backendApi.check(data)
        .then(() => options.backendApi.apply(authToken, data))
        .then(() => {
          req.session.profile = Object.assign(req.session.profile, data);
          return {data: {profile: req.session.profile}};
        })
        .catch((err) => {
          options.log.error(err);
          throw new IonError(400, err.message);
        });
    });

    function fetchPassports(token, cacheKey) {
      options.backendApi.passports(token)
        .then((passports) => {
          return options.cache.set(cacheKey, passports);
        })
        .then(() => passports);
    }

    this.addHandler(router, '/passports', 'GET', (req) => {
      const {authToken} = req.session;
      if (!authToken) {
        return Promise.reject(new IonError(401, 'Unauthorized'));
      }
      const cacheKey = `passports_${req.session.id}`;
      return options.cache.get(cacheKey)
        .then((cachedPassports) => {
          if (cachedPassports) {
            return cachedPassports;
          }
          return fetchPassports(authToken, cacheKey);
        })
        .then((passports) => ({data: {passports}}))
        .catch((err) => {
          options.log.error(err);
          throw new IonError(401, err.message);
        });
    });

    this.addHandler(router, '/login', 'POST', (req) => {
      const {login, password} = req.body;
      if (!login || !password) {
        return Promise.reject(new IonError(400, 'Wrong request'));
      }
      return authenticate(login, password)
        .then(({token, profile}) => {
          req.session.authToken = token;
          req.session.profile = profile;
          return true;
        })
        .catch((err) => {
          options.log.error(err);
          throw new IonError(401, err.message);
        });
    });

    this.addHandler(router, '/register-verify', 'POST', (req) => {
      const {phone} = req.body;
      if (!phone) {
        return Promise.reject(new IonError(400, 'Wrong request'));
      }
      const code = generateSecretCode();
      req.session.registrationCode = code;
      console.log(code);
      return options.sms.send(phone, `Code: ${code}`)
        .then(() => true)
        .catch((err) => {
          options.log.error(err);
          throw new IonError(500, err.message);
        });
    });

    this.addHandler(router, '/register', 'POST', (req) => {
      const {registrationCode} = req.session;
      const {code, login, password} = req.body;
      if (!registrationCode || !code || !login | !password) {
        return Promise.reject(new IonError(400, 'Wrong request'));
      }
      if (String(registrationCode) !== String(code)) {
        return Promise.reject(new IonError(403, 'Forbidden'));
      }
      return options.backendApi.register(login, password)
        .then(() => authenticate(login, password))
        .then(({token, profile}) => {
          req.session.authToken = token;
          req.session.profile = profile;
          return true;
        })
        .catch((err) => {
          options.log.error(err);
          throw new IonError(500, err.message);
        });
    });

  };
}

AuthRest.prototype = new Service();
module.exports = AuthRest;
