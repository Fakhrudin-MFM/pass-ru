const IMessageService = require('../../interfaces/IMessageService');
const SmsGateway = require('sms-gateway.js');

class SmsGatewayService extends IMessageService {

  constructor(options) {
    super();
    this.token = options.token;
    this.deviceId = options.deviceId;
    this.gateway = new SmsGateway(this.token);
  }

  _send(to, text) {
    const msg = {
      phone_number: to,
      message: text,
      device_id: this.deviceId
    };
    return this.gateway.messages.sendMessages([msg]);
  }

}

module.exports = SmsGatewayService;
