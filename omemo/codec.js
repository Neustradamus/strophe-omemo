"use strict";

var Base64 = require('./base64.js')

var codec = {};

codec = {
  BufferToBase64: function (buffer) {
    let binary = ''
    let bytes = new Uint8Array(buffer)
    let len = bytes.byteLength
    for (var i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  },
  Base64ToBuffer: function (base64) {
    var binary_string =  window.atob(base64);
    var len = binary_string.length
    var bytes = new Uint8Array( len )
    for (var i = 0; i < len; i++) {
      bytes[i] = binary_string.charCodeAt(i)
    }
    return bytes.buffer
  },
  Base64ToUint8: function(base64string) {
    return new Uint8Array(this.Base64ToBuffer(base64string))
  },
  StringToUint8: function (string) {
    let enc = new TextEncoder("utf-8")
    return enc.encode(string)
  },
  Uint8ToString: function (buffer) {
    return String.fromCharCode.apply(null, buffer)
  },
  BufferToString: function (buffer) {
    let dec = new TextDecoder()
    return dec.decode(buffer)
  },
  StringToBuffer: function (string) {
    return Buffer.from(string, 'utf8')
  },
  type: function (obj) {
    return Object.prototype.toString.call(obj).slice(8, -1);
  },
  StringToBase64: function (string) {
    return btoa(string)
  },
  Base64ToString: function (base64string) {
    return atob(base64string)
  },
  enforceBase64ForSending: function (omemoEncrypted) {
    //omemoEnrypted = OMMSG
    //bodyEncrypted = libsig enc.body
    return {
      cipherText: this.BufferToBase64(omemoEncrypted.cipherText),
      iv: this.BufferToBase64(omemoEncrypted.iv),
      tag: this.BufferToBase64(omemoEncrypted.tag)
    }
  },
  eqBuffers: function (buf1, buf2)
  {
      if (buf1.byteLength != buf2.byteLength) return false;
      var dv1 = new Int8Array(buf1);
      var dv2 = new Int8Array(buf2);
      for (var i = 0 ; i != buf1.byteLength ; i++)
      {
          if (dv1[i] != dv2[i]) return false;
      }
      return true;
  }
}

module.exports = codec
