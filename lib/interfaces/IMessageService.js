class IMessageService {

  send(to, message) {
    return this._send(to, message);
  }

}

module.exports = IMessageService;
