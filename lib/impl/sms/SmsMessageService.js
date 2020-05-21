const IMessageService = require('../../interfaces/IMessageService');

class SmsMessageService extends IMessageService {

  _send(to, code) {
    //TODO:
    console.log(code);
    return Promise.resolve(true);
  }

}

module.exports = SmsMessageService;
