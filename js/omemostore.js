'use strict';
// todo have this pickle into localStorage directly.

//Klaus code
//put: function(key, value) {
//        if (key === undefined || value === undefined || key === null || value === null)
//            throw new Error("Tried to store undefined/null");
//
//        var stringified = JSON.stringify(value, function(key, value) {
//            if (value instanceof ArrayBuffer) {
//                return arrayBufferToArray(value)
//            }
//
//            return value;
//        });
//
//        // this.store[key] = value;
//        localStorage.setItem(this.prefix + ':' + key, stringified);
//    },
//    get: function(key, defaultValue) {
//        if (key === null || key === undefined)
//            throw new Error("Tried to get value for undefined/null key");
//        if (this.prefix + ':' + key in localStorage) {
//            // return this.store[key];
//            return JSON.parse(localStorage.getItem(this.prefix + ':' + key), function(key, value) {
//                if (/Key$/.test(key)) {
//                    return ArrayToArrayBuffer(value);
//                }
//
//                return value;
//            });
//        } else {
//            return defaultValue;
//        }
//    },
//
//function arrayBufferToArray(buffer) { return Array.apply([], new Uint8Array(buffer)); }
//
//function ArrayToArrayBuffer(array) { return new Uint8Array(array).buffer }
function OmemoStore () {
	this.Sessions 	= {}
}

function PublicOmemoStore () {
	//the following definitions serve as an interface
	this.rids = [] //all devices belonging to a jid
	this.rid = 0
	this.jid = null
	this.signedPreKey = {
		//slightly different than LibsignalStore with the signature included in the tupel.
		publicKey: null,
		keyId: null,
		signature: null,
	},
	this.identityKey = null,
	this.getPublicBundle = function () {
		let prk = this.selectRandomPreKey()
		this.removePreKey(prk.keyId)
//		console.log("using preKey " + prk.keyId)
		return {
			registrationId: this.rid,
			identityKey: this.identityKey,
			signedPreKey: this.signedPreKey,
			preKey: {
				publicKey: prk.pubKey,
				keyId: prk.keyId
			}
		}
	},
	this.selectRandomPreKey =  function() {
		//track key # here
		let range = 100
		let id = 1
		let key = undefined
		while (key == undefined) {
			id = Math.floor(Math.random() * range) + 1
			key = this.getPreKey(id)
		}
		return key
	},
	this.putPreKey = function (keyId, value) {
		this.put("preKeyPub" + keyId, value);
	},
	this.getPreKey = function(keyId) {
		let res = this.get("preKeyPub" + keyId);
		if (res !== undefined) {
			return { pubKey: res , keyId: keyId	}
		}
		// should never happen. should still be handeled.
		return undefined
	},
	this.removePreKey = function(keyId) {
		if (keyId === null || keyId === undefined)
		throw new Error("Tried to remove value for undefined/null key");
		delete this[this.jid + ":" + this.rid + ":" + "preKeyPub" + keyId];
	},
	this.putCipher = function (cipher) {
		this.put("cipher", cipher);
	},
	this.getCipher = function() {
		let res = this.get("cipher");
		if (res !== undefined) {
			return res
		}
		// should never happen. should still be handeled.
		return undefined
	},
	this.removeCipher= function() {
		if (keyId === null || keyId === undefined)
		throw new Error("Tried to remove value for undefined/null key");
		delete this[this.jid + ":" + this.rid + ":" + "cipher"];
	},
	this.put = function(keyId, value) {
		if (keyId === undefined || value === undefined || keyId === null || value === null)
		throw new Error("Tried to store undefined/null");
		this[this.jid + ":" + this.rid + ":" + keyId] = value;
	},
	this.get = function(keyId, defaultValue = undefined) {
		keyId = this.jid + ":" + this.rid + ":" + keyId
		if (keyId === null || keyId === undefined)
		throw new Error("Tried to get value for undefined/null key");
		if (keyId in this) {
			return this[keyId];
		} else {
			return defaultValue;
		}
	},
	this.remove = function(keyId) {
		if (keyId === null || keyId === undefined)
		throw new Error("Tried to remove value for undefined/null key");
		delete this[this.jid + ":" + this.rid + ":" + keyId];
	}
}

// OmemoStore per jid with ids => flag?
OmemoStore.prototype = {
	add: function (jid, cipher, flag) {
		Promise.resolve(cipher.getRemoteRegistrationId().then(id => {
			if (this.Sessions[jid] === undefined) {
				this.Sessions[jid] = {}
			}
			let record =  {
				cipher: cipher,
				preKeyFlag: flag,
			}

			this.Sessions[jid][id] = record
		})
	)},

	getSessions: function (jid) {
		return this.Sessions[jid]
	},
	dropSessions: function (jid) {
		this.Sessions[jid] = []
	},
	encryptPayloadsForSession: function (jid, keyCipherText, tag , ctxt) {
		let promises = []
		let	codec = ctxt._codec

		for (let k in this.Sessions[jid]) {
			//let cipher = this.Sessions[jid][k].getCipher()
			//let address =  this.Sessions[jid][k]["address"]
      let address = new libsignal.SignalProtocolAddress(jid, k);
			let cipher = new ctxt._libsignal.SessionCipher(ctxt._store, address)
			promises.push(cipher.encrypt(keyCipherText + tag))
		}
		return Promise.all(promises).then(res => {
			//the counter should work. promises are resolved in order
			//of iteration, res will contain results in order too.
		let ctr = 0
		//return res
		for (let k in this.Sessions[jid]) {
					let strd = JSON.stringify(res[ctr])
					this.Sessions[jid][k].payload = ctxt._codec.StringToBase64(strd)
					this.Sessions[jid][k].original = strd
				assert(res[0].body === res[0].body, "binary body eq binary body")
				assert(codec.StringToBase64(res[0].body) === this.Sessions[jid][k].payload, "b64 body equals payload")
				//let o = {
				//	//original: res[ctr],
				//	body: res[ctr].body,
				//	shouldEqual	: codec.Base64ToString(this.Sessions[jid][k].payload),
				//	payload: this.Sessions[jid][k].payload,
				//}
				ctr = ctr + 1
		}
			return Promise.resolve(this.Sessions[jid])
		})
	},
	getRecord: function(jid, rid) {
		// {cipher, bundle}
		let isEqual = function (o) {
			return o.bundle.rid == rid
		}
		return Promise.resolve(this.Sessions[jid].filter(isEqual))
	},
	getPayload: function (jid, index) {
		// base64 payload
		// future serves constructEncryptedStanza
		return Promise.resolve(this.Sessions[jid][index].payload)
	},
	hasSession: function (jid) {
		let records = this.getSessions(jid)
		if (records == undefined) { return false }
		else { return true }
	},
	hasSessionForRid: function (jid, rid) {
		try {
			if (this.getSessions(jid) !== undefined) {
				let cipher  = this.getCipher(jid, rid)
				if (cipher !== undefined) {
					return cipher
				}
			}
		} catch(e) {
			return undefined
		}
		return undefined
	},
	getDeviceIdList: function (jid) {
		try {
			let res = []
			for (let i in this.Sessions[jid]) {
				res.push(i)
			}
			return res
		} catch (e) {
			return []
		}
	},
	hasBundle: function(jid, rid) {
		//should check identityKey and signedKey,
		//devices are initiated with an empty bundle
		return this.getBundle(jid, rid).IdentityKey != undefined
	},
	hasCipher: function(jid, rid) {
		return this.getCipher(jid, rid) != undefined
	},
	getBundle: function (jid, rid) {
		try {
			return this.Sessions[jid][rid].bundle
		} catch(e) {
			return undefined
		}
	},

	putBundle: function (jid, rid, bundle) {
		try {
			if (this.Sessions[jid] === undefined) {
				this.Sessions[jid] = {}
			}
			this.Sessions[jid][rid].bundle = bundle
			return true
		} catch(e) {
			return false
		}
	},
	getCipher: function (jid, rid) {
		try {
			return this.Sessions[jid][rid].getCipher()
		} catch(e) {
			return undefined
		}
	},
	putCipher: function (jid, sid, cipher, preKeyFlag = true) {
		try {
			if (this.Sessions[jid] === undefined) {
				this.Sessions[jid] = {}
			}
			if (this.Sessions[jid][sid] === undefined) {
				this.Sessions[jid][sid] = new PublicOmemoStore()
			}
			this.Sessions[jid][sid]["jid"] = jid
			this.Sessions[jid][sid]["rid"] = sid
			this.Sessions[jid][sid].putCipher(cipher)
			this.Sessions[jid][sid].put('preKeyFlag',preKeyFlag)
			//could later modify putCipher to take preKeyFlag rather than hardcoding
			return true
		} catch(e) {
			return false
		}
	}
}
