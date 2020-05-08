const paModuleName = require('modules/pa/module-name');
const IonError = require('core/IonError');

function generateSecretCode() {
  const min = 1000;
  const max = 9999;
  return min + Math.floor((max - min) * Math.random());
}

/**
 * @param {{}} options
 * @param {{}} options.module
 * @constructor
 */
function PassDispatcher(options) {
  function onError(err, res) {
    options.log && options.log.error(err);
    if (typeof err.code === 'number' && err.code >= 400 && err.code < 500)
      return res.status(err.code).send(err.message);

    res.status(500).send('Internal server error');
  }

  function fetchPassports(token, cacheKey) {
    let result;
    options.backendApi.passports(token)
      .then((passports) => {
        result = passports;
        return options.cache.set(cacheKey, passports);
      })
      .then(() => result);
  }

  function authenticate(login, password) {
    let token;
    return options.backendApi.authenticate(login, password)
      .then((authToken) => {
        token = authToken;
        return options.backendApi.profile(authToken);
      })
      .then((profile) => {
        return {
          token, profile
        };
      });
  }

  this.init = () => {
    options.module.get(`/${paModuleName}/pass/index`, (req, res) => {
      const {authToken, profile} = req.session;
      if (!authToken)
        return res.redirect(`/${paModuleName}/pass/login`);

      const cacheKey = `passports_${req.session.id}`;
      return options.cache.get(cacheKey)
        .then((cachedPassports) => {
          if (cachedPassports)
            return cachedPassports;

          return fetchPassports(authToken, cacheKey);
        })
        .then(passports => res.render('passports', {passports, profile}))
        .catch(err => onError(err, res));
    });

    options.module.get(`/${paModuleName}/pass/login`, (req, res) => {
      const {profile} = req.session;
      return res.render('login', {profile});
    });

    options.module.post(`/${paModuleName}/pass/login`, (req, res) => {
      const {
        login, password
      } = req.body;
      if (!login || !password)
        return onError(new IonError(400, 'Wrong request'), res);

      authenticate(login, password)
        .then(({
          token, profile
        }) => {
          req.session.authToken = token;
          req.session.profile = profile;
          return res.redirect(`/${paModuleName}/pass/index`);
        })
        .catch(err => onError(err, res));
    });

    options.module.get(`/${paModuleName}/pass/register`, (req, res) => {
      const {profile} = req.session;
      return res.render('register', {profile});
    });

    options.module.get(`/${paModuleName}/pass/profile`, (req, res) => {
      const {profile} = req.session;
      if (!profile)
        return res.redirect(`/${paModuleName}/pass/login`);

      res.render('profile', {profile});
    });

    options.module.post(`/${paModuleName}/pass/profile`, (req, res) => {
      const {authToken} = req.session;
      if (!authToken)
        return res.redirect(`/${paModuleName}/pass/login`);

      if (!req.body.fio)
        return onError(new IonError(400, 'Wrong request'), res);

      return options.backendApi.check(req.body)
        .then(() => options.backendApi.apply(authToken, req.body))
        .then(() => {
          const profile = Object.assign(req.session.profile || {}, {properties: req.body});
          req.session.profile = profile;
          res.render('profile', {profile});
        })
        .catch(err => onError(err, res));
    });

    options.module.post(`/${paModuleName}/pass/register-verify`, (req, res) => {
      const {phone} = req.body;
      if (!phone)
        return onError(new IonError(400, 'Wrong request'), res);

      const code = generateSecretCode();
      req.session.registrationCode = code;
      options.sms.send(phone, `Code: ${code}`)
        .then(() => res.send(true))
        .catch(err => onError(err, res));
    });

    options.module.post(`/${paModuleName}/pass/register`, (req, res) => {
      const {registrationCode} = req.session;
      const {
        code, login, password
      } = req.body;
      if (!registrationCode || !code || !login | !password)
        return onError(new IonError(400, 'Wrong request'), res);

      if (String(registrationCode) !== String(code))
        return onError(new IonError(403, 'Forbidden'), res);

      options.backendApi.register(login, password)
        .then(() => authenticate(login, password))
        .then(({
          token, profile
        }) => {
          req.session.authToken = token;
          req.session.profile = profile;
          res.send(true);
        })
        .catch(err => onError(err, res));
    });

    return Promise.resolve();
  };
}

module.exports = PassDispatcher;
