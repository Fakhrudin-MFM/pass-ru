const Service = require('modules/rest/lib/interfaces/Service');
const IonError = require('core/IonError');

/**
 * @param {{backendApi: BackendApi, log; Logger}} options
 * @constructor
 */
function ProfileRest(options) {

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
        .then(() => passports):
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

  };
}

ProfileRest.prototype = new Service();
module.exports = ProfileRest;

