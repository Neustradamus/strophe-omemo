/*eslint semi: "never", "esversion":6  */

let codec = require('./codec.js')
let sym_cipher = require('./gcm.js')

//let symCipher = require('./EAX.js')
//let symCipher = require('./xChaCha20.js')

let omemo = {
    init: function (conn) {
        omemo.connection = conn;

        Strophe.addNamespace('OMEMO',
            'eu.siacs.conversations.axolotl')
        Strophe.addNamespace('OMEMO_BUNDLES',
            'eu.siacs.conversations.axolotl.bundles')
        Strophe.addNamespace('OMEMO_DEVICELIST',
            'eu.siacs.conversations.axolotl.devicelist')

        omemo.publish = omemo.connection.pep.publish
    },
    setup: function (jid, id) {
        let identifier = jid + '.' + id
        omemo._jid = jid
        omemo._id = parseInt(id)
        omemo._identifier = omemo._jid + '.' + omemo._id // gotta make localStorage entries more unique due to test collisions.
        try {
            if (libsignal) {
            }
        } catch (e) {
            throw new Error('Libsignal-Protocol not found')
        }
        try {
            if (SignalProtocolStore) {
                omemo.connection._signal_store = new SignalProtocolStore(jid, id)
            }
        } catch (e) {
            throw new Error('SignalProtocolStore not found')
        }
        Promise.all([omemo.arm()]).then(e => {
            console.log('armed')
        //ondevice
        omemo.connection.addHandler(
            omemo.on_headline,
            null,
            'message',
            'headline')
        //onbundle
        omemo.connection.addHandler(
            omemo.on_headline,
            null,
            'iq',
            null,
            'fetch1')
        //onmessage
        omemo.connection.addHandler(
            omemo.on_message,
            null,
            'message',
            null,
            "send1")
    })
    },
    on_success: function () {
        omemo.publish_bundle()
        omemo.publish_device()
        return false
    },
    arm: function () {
        let kh = libsignal.KeyHelper
        let registrationId
        if (omemo._id != null) {
            registrationId = omemo._id
        } else {
            throw new Error("device id is null")
        }
        Promise.all([
            kh.generateIdentityKeyPair(),
            omemo.gen_prekeys(100)
        ]).then(function (result) {
            let identity = result[0];
            omemo.connection._signal_store.put('registrationId', registrationId)
            omemo.connection._signal_store.put('identityKey', result[0])
            omemo.connection._signal_store.getIdentityKeyPair().then((ikey) =>
            kh.generateSignedPreKey(ikey, 1)).then((skey) => {
                let key = {
                    pubKey: skey.keyPair.pubKey,
                    privKey: skey.keyPair.privKey,
                    keyId: skey.keyId,
                    signature: skey.signature
                }
                omemo.connection._signal_store.storeSignedPreKey(1, key)
        })
            omemo._address = new libsignal.SignalProtocolAddress(omemo._jid, omemo.connection._signal_store.get('registrationId'));
        }).then(o => {
            omemo.connection._signal_store.setLocalStore(omemo._jid, omemo._id)
    })
    },
    on_bundle: function (stanza) {
        //debug compares the public_bundle's public keys with our own. does not initiate
        let sk, sk_id, signature, ik, from_id, from,
            _key, pkey, pkey_id, record, res,
            c_key, public_bundle
        let ctr = 0
        let pkeys = []

        $(stanza).find('items').each(function () {
            from_id = parseInt($(this).attr('node').split(':')[1])
        })
        from = $(stanza).attr('from')
        $(stanza).find('signedPreKeyPublic').each(function () {
            sk_id = parseInt($(this).attr('signedPreKeyId'))
            sk = codec.Base64ToBuffer($(this).text())
        })
        $(stanza).find('signedPreKeySignature').each(function () {
            signature = codec.Base64ToBuffer($(this).text())
        })
        $(stanza).find('preKeyPub').each(function () {
            pkey = codec.Base64ToBuffer($(this).text())
            pkey_id = parseInt($(this).attr('keyId')) //nasty little feature without proper error reporting on libsig's part
            _key = {id: pkey_id, key: pkey}
            ctr = ctr + 1
            pkeys.push(_key)
        })
        $(stanza).find('identityKey').each(function () {
            ik = codec.Base64ToBuffer($(this).text())
        })
        c_key = Math.floor(Math.random() * ctr - 1) // consider using a better source of randomness
        public_bundle = {
            registrationId: from_id,
            identityKey: ik,
            signedPreKey: {
                keyId: sk_id,
                signature: signature,
                publicKey: sk,
            },
            preKey: {
                keyId: pkeys[c_key].id,
                publicKey: pkeys[c_key].key,
            }
        }
        if (omemo.debug) {
            //self test
            console.log('self test')

            let id = omemo._signal_store['registrationId']
            let ik = omemo._signal_store.get('identityKey').pubKey
            let sk = omemo._signal_store.get('25519KeysignedKey1').pubKey
            let sig = omemo._signal_store.get('25519KeysignedKey1').signature

            let id1 = public_bundle.registrationId
            let ik1 = public_bundle.identityKey
            let sk1 = public_bundle.signedPreKey.publicKey
            let sig1= public_bundle.signedPreKey.signature

            let test1 = equal(sig, sig1)
            let test2 = equal(ik,ik1)
            let test3 = equal(sk,sk1)

            let result =  test1 && test2 && test3
            console.log(result)
            if (result) {
                console.log('alls good')
            } else {
                console.log('alls not good')
            }
            return
        }
        res = {jid: from, public_bundle: public_bundle}
        let address = new libsignal.SignalProtocolAddress(res.jid, res.public_bundle.registrationId)

        let their_identifier = address.toString()
        omemo.connection._signal_store.loadSession(their_identifier).then(e => {
            if (!e) {
            let myBuilder = new libsignal.SessionBuilder(omemo.connection._signal_store, address)
            let cipher = ''
            let session = myBuilder.processPreKey(public_bundle).then( function onsuccess(){
                console.log('session successfully established')
                record = JSON.parse(localStorage.getItem(res.jid))
                record[from_id] = true
                localStorage.setItem(res.jid, JSON.stringify(record))

                //check if ready
                let ids = localStorage.getItem(from)
                let ready = true
                for (let i in ids) {
                    ready = ready && ids[i]
                }
                if (ready) {
                    localStorage.setItem(from + 'sessionStatus', true)
                }
            })
            session.catch( function onerror(error){
                console.log('there was an error establishing the session')
                return Promise.reject()
            })
        } else {
            record = JSON.parse(localStorage.getItem(res.jid))
            record[from_id] = true
            localStorage.setItem(res.jid, JSON.stringify(record))
        }
    })
        return true
    },
    on_device: function (stanza) {
        if (omemo._id == undefined || stanza == null) {
            throw new Error("stanza null or id not set ")
        }
        let ids, id, appendand, from,
            were_in = false
        let me = omemo._jid
        let my_id = omemo._id

        from = $(stanza).attr('from')
        ids = JSON.parse(localStorage.getItem(from))
        if (ids == null) {
            ids = {}
        }
        if (from == me) {
            ids[my_id] = ''
            $(stanza).find('device').each(function () {
                var nid = $(this).attr('id')
                if (ids[nid] == undefined) {
                    ids[nid] = false
                }
                if (nid == my_id) {
                    were_in = true
                }
            })
            if (were_in) {
                return true
            }
            var res = $iq({type: 'set', from: omemo._jid, id: 'anounce1'})
                .c('pubsub', {xmlns: 'http://jabber.org/protocol/pubsub'})
                .c('publish', {node: Strophe.NS.OMEMO_DEVICELIST})
                .c('item')
                .c('list', {xmlns: Strophe.NS.OMEMO})

            for (var i in ids) {
                res.c('device', {id: i}).up()
            }
            omemo.connection.send(res)
            return true
        }
        $(stanza).find('device').each(function () {
            var tid = $(this).attr('id')
            ids[tid] = ids[tid] == true ? ids[tid] : false
        })
        localStorage.setItem(from, JSON.stringify(ids))
        omemo.process_ready(from) //double the work ?
        return true
    },

    on_headline: function (stanza) {
        if (omemo.is_device(stanza)) {
            omemo.on_device(stanza)
            return true
        }
        else if (omemo.is_bundle(stanza)) {
            omemo.on_bundle(stanza)
            return true
        }
        return true
    },
    fetch_bundles: function (to, debug) {
        if (debug) {
            omemo.debug = true
        }
        let ids = JSON.parse(localStorage.getItem(to))
        if (!ids) { throw new Error("no devices to fetch for " + to) }
        let ready = true
        for (let i in ids) {
            ready = ready && ids[i]
        }
        if (ready) {
            localStorage.setItem(to + 'sessionStatus', true) // should probably always join on the ids flag
            return true
        }

        for (let i in ids) {
            res = $iq({type: 'get', from: omemo._jid, to: to, id: 'fetch1'})
                .c('pubsub', {xmlns: 'http://jabber.org/protocol/pubsub'})
                .c('items', {node: Strophe.NS.OMEMO_BUNDLES + ':' + i})
            omemo.connection.send(res);
        }
    },
    refresh_bundle: function () {

    },
    publish_bundle: function () {
        let sk_id = 1

        let promises = [
            omemo.connection._signal_store.loadSignedPreKey(sk_id),
            omemo.connection._signal_store.getIdentityKeyPair(),
            omemo.connection._signal_store.loadSignedPreKeySignature(sk_id),
            omemo.connection._signal_store.getLocalRegistrationId()
        ]
        return Promise.all(promises).then(o => {
            let sk = o[0]
            let ikp = o[1]
            let signature = o[2]
            let rid = o[10]
            let signature64 = codec.BufferToBase64(signature)
            let sk64 = codec.BufferToBase64(sk.pubKey)
            let ik64 = codec.BufferToBase64(ikp.pubKey)
            let res = $iq({type: 'set', from: omemo._jid, id: 'anounce2'})
                .c('pubsub', {xmlns: 'http://jabber.org/protocol/pubsub'})
                .c('publish', {node: Strophe.NS.OMEMO_BUNDLES + ':' + omemo._id})
                .c('item')
                .c('bundle', {xmlns: Strophe.NS.OMEMO})
                .c('signedPreKeyPublic', {signedPreKeyId: sk_id}).t(sk64).up()
                .c('signedPreKeySignature').t(signature64).up()
                .c('identityKey').t(ik64).up()
                .c('prekeys')


            let keys = omemo.connection._signal_store.getPreKeyBundle(omemo)
            keys.forEach(function (key) {
            res = res.c('preKeyPub', {'keyId': key.keyId}).t(codec.BufferToBase64(key.pubKey)).up()
        })

        omemo.connection.send(res)
    })
    },
    publish_device: function () {
        var list = $build('list', {xmlns: Strophe.NS.OMEMO})
        list.c('device', {id: omemo._id})
        omemo.connection.pep.publish(Strophe.NS.OMEMO_DEVICELIST, [{
            data: list.tree()
        }], null)
    },
    gen_prekeys: function (range) {
        let kh = libsignal.KeyHelper
        let promises = []
        for (let i = 1; i < range + 1; i++) {
            promises.push(kh.generatePreKey(i).then((k) => {
                let key = {
                    pubKey: k.keyPair.pubKey,
                    privKey: k.keyPair.privKey,
                    keyId: k.keyId
                }
                omemo.connection._signal_store.storePreKey(i, key)
        }))
        }
        return Promise.all(promises)
    },
    gen_id: function () {
        let minDeviceId = 1
        let maxDeviceId = 2147483647
        let diff = (maxDeviceId - minDeviceId)
        let res = Math.floor(Math.random() * diff + minDeviceId)
        omemo._id = res
        return res
    },
    is_device: function (stanza) {
        return $(stanza).find('list').length != 0
    },
    is_bundle: function (stanza) {
        return $(stanza).find('bundle').length != 0
    },
    send: function (receiver_jid, data, offline) {
        //14 variables and two parameters. can be done with fewer?
        let key_str, tag , iv, payload, preKey, xml, ready, addr, ciph
        let msg_promises = []
        let gcm_promise = []
        let ids = []
        let rec_ids = []
        ///
        let allow_offline = true // || offline parameter, protocol tweak
        ///
        ready = localStorage.getItem(receiver_jid + 'sessionStatus')
        if (!ready) {
            omemo.fetch_bundles(receiver_jid)
            setTimeout(function()
                {
                    omemo.send(receiver_jid, data)
                }
                , 3000)
            return "establishing sessions"
        } else {
            xml = $msg({to: receiver_jid, from: omemo._jid, id: 'send1'})
            xml.c('encrypted', {xmlns: Strophe.NS.OMEMO })
            xml.c('header', {sid: omemo._id})
            gcm_promise.push(sym_cipher.encrypt(data))
            sym_cipher.encrypt(data).then(sym_out => {
                key_str = sym_out.LSPLD
                tag     = sym_out.BASE64.tag
                iv      = sym_out.BASE64.iv
                ids = JSON.parse(localStorage.getItem(receiver_jid))
                for (let i in ids) {
                rec_ids.push(i)
                addr = new libsignal.SignalProtocolAddress(receiver_jid, i)
                ciph = new libsignal.SessionCipher(omemo.connection._signal_store, addr)
                msg_promises.push(ciph.encrypt(key_str + tag))
            }
            Promise.all(msg_promises).then(payloads => {
                for (let i in payloads) {
                payload = btoa(JSON.stringify(payloads[i]))
                preKey = 3 == parseInt(payloads[i].type)
                if (i == msg_promises.length-1) {
                    xml.c('key', {prekey: preKey, rid: rec_ids[i] }).t(payload).up()
                    xml.c('iv').t(iv).up().up()

                } else {
                    xml.c('key', {prekey: preKey, rid: rec_ids[i] }).t(payload).up()
                }
            }
            xml.c('payload').t(sym_out.BASE64.cipherText).up().up()
            xml.c('store', {xmlns: 'urn:xmpp:hints'})
        })
        })
            omemo.connection.send(xml)
        }
    },
    //receive
    on_message: function (stanza) {
        let from_jid, rid, libsignal_payload, address, ciph
        let aes_data, sym_iv, sym_tag, sym_payload, sym_key

        from_jid = $(stanza).attr('from').split('/')[0]

        $(stanza).find('header').each(function () {
            from_id = $(this).attr('sid')
        })
        $(stanza).find('payload').each(function () {
            sym_payload = codec.Base64ToBuffer($(this).text())
        })
        sym_iv = codec.Base64ToBuffer($(stanza).find('iv').text())

        $(stanza).find('key').each(function (){
            rid = parseInt($(this).attr('rid'))
            if (rid == omemo._id) {
                libsignal_payload = JSON.parse(atob($(this).text()))
            }
        })
        address  = new libsignal.SignalProtocolAddress(from_jid, from_id)
        ciph = new libsignal.SessionCipher(omemo.connection._signal_store, address)
        if (libsignal_payload.type == 3) {
            ciph.decryptPreKeyWhisperMessage(libsignal_payload.body, 'binary').then(o => {
                o = codec.BufferToString(o)
                aes_data = sym_cipher.get_key_and_tag(o)
                sym_key = aes_data.key
                sym_tag = aes_data.tag
                sym_cipher.decrypt(sym_key, sym_payload ,sym_iv).then(f => {

                //    $(document).trigger('_handle_decrypted', [{data: {from: from_jid, plain_text: f}}])
                $(document).trigger('_handle_decrypted', [from_jid, f])
            record = JSON.parse(localStorage.getItem(from_jid))
            record[from_id] = true
            localStorage.setItem(from_jid, JSON.stringify(record))
            omemo.publish_bundle()
        })
        })
        } else  {
            ciph.decryptWhisperMessage(libsignal_payload.body, 'binary').then(o => {
                o = codec.BufferToString(o)
                aes_data = sym_cipher.get_key_and_tag(o)
                sym_key = aes_data.key
                sym_tag = aes_data.tag
                sym_cipher.decrypt(sym_key, sym_payload ,sym_iv).then(f => {

                $(document).trigger('_handle_decrypted', [from_jid, f])
        })
        })
        }
        return true
    },
    // future refinement: fetch bundles by checking the receiver_jid localStorage entry,
    // let fetch bundle fetch on an array of non true flags. if result of this function is [], then dont.
    // missing error handelling on unknown receiver_jid
    sessions_all_ready: function () {
        let ready = true
        ids = JSON.parse(localStorage.getItem(receiver_jid))
        for (let i in ids) {
            ready = ready && ids[i]
        }
        return ready
    },
    get_bundles_to_fetch: function () {
        let left = []
        let ready = true
        ids = JSON.parse(localStorage.getItem(receiver_jid))
        for (let i in ids) {
            if (ids[i] == false) {
               left.push(i)
            }
        }
        return left
    },
    process_ready: function (for_jid) {
      let ready = true
      let ids = JSON.parse(localStorage.getItem(receiver_jid))
                for (let i in ids) {
            ready = ready && ids[i]
        }
        localStorage.setItem(for_jid + 'sessionStatus', ready)
    },
};

Strophe.addConnectionPlugin('omemo', omemo)


function equal (buf1, buf2) {
    if (buf1.byteLength != buf2.byteLength) return false;
    var dv1 = new Int8Array(buf1);
    var dv2 = new Int8Array(buf2);
    for (var i = 0 ; i != buf1.byteLength ; i++)
    {
        if (dv1[i] != dv2[i]) return false;
    }
    return true;
}
