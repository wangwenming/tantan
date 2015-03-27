var expect = require('chai').expect;
var unserialize = require('../unserialize').unserialize;

var anonyData = {
    id: '55152fca86de8b6a158b4576',
    user: {
        id: '11',
        sex: '',
        name: '榜眼·红绫',
        avatar: 'http://p8.qhimg.com/d/inn/8768f276/tantan_anony_avatar/ava49.png'
    },
    ip: '219.151.*.*',
    timestamp: '1427451850',
    text: 'Hello',
    tags: [],
    praise: 0,
    types: [0]
};
var annoyMsg = '55152fca86de8b6a158b4576\n1427451850\n219.151.*.*\n11\t\t榜眼·红绫\t49\nHello\n\n0';
var rawAnnoyMsg = JSON.stringify(anonyData);

var loginData = {
    id: '551531c3a159034b518b457b',
    user: {
        id: '154074742',
        sex: '男',
        name: '榜眼·红绫',
        avatar: 'http://quc.qhimg.com/dm/180_180_100/t01cc234ea43e30a00f.jpg'
    },
    ip: '219.151.*.*',
    timestamp: '1427451850',
    text: 'Hello',
    tags: [],
    praise: 0,
    types: [0]
};
var loginMsg = '551531c3a159034b518b457b\n1427451850\n219.151.*.*\n154074742\t男\t榜眼·红绫\t01cc234ea43e30a00f\nHello\n\n0';
var rawLoginMsg = JSON.stringify(loginData);

describe('unserialize', function () {
    it('unserialize annoyMsg', function() {
        var unserializedData = unserialize(annoyMsg);
        var len = Buffer.byteLength(annoyMsg, 'utf8');
        var rawLen = Buffer.byteLength(rawAnnoyMsg, 'utf8');
        var ratio = Math.round(len / rawLen * 1000) / 10;
        console.log('匿名压缩比： %d%, %dB ==> %dB', ratio, rawLen, len);

        expect(JSON.stringify(unserializedData)).to.equal(rawAnnoyMsg);
    });

    it('unserialize loginMsg', function() {
        var unserializedData = unserialize(loginMsg);
        var len = Buffer.byteLength(loginMsg, 'utf8');
        var rawLen = Buffer.byteLength(rawLoginMsg, 'utf8');
        var ratio = Math.round(len / rawLen * 1000) / 10;
        console.log('登录压缩比： %d%, %dB ==> %dB', ratio, rawLen, len);

        expect(JSON.stringify(unserializedData)).to.equal(rawLoginMsg);
    });
});
