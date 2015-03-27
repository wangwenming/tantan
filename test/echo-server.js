var expect = require('chai').expect;
var server = require('../echo-server');
var SockJS = require('sockjs-client');
var client;

describe('server', function () {
    before(function (done) {
        var port = 9001;
        var prefix = '/mocha';
        // 初始化服务端
        server.start(port, {
            prefix: prefix
        });

        // 初始化客户端
        client = new SockJS('http://localhost:' + port + prefix);
        client.onopen = function() {
            console.log('open');
            done();
        };
        // onmessage会被覆盖
        client.onmessage = function(e) {
            console.log('message', e.data);
        };
        client.onclose = function() {
            console.log('close');
        };
    });


    describe('message', function () {
        it('should get echo', function (done) {
            var msg = 'Hello';
            client.onmessage = function(e) {
                expect(e.data).to.equal(msg);
                done();
            };
            client.send(msg);
        });

        it('should support control characters', function (done) {
            var msg = 'He\u0000llo';
            client.onmessage = function(e) {
                expect(e.data).to.equal(msg);
                expect(e.data.length).to.equal(6);
                done();
            };
            client.send(msg);
        });

        it('should support 汉字', function (done) {
            var msg = '汉字';
            client.onmessage = function(e) {
                expect(e.data).to.equal(msg);
                done();
            };
            client.send(msg);
        });
    });

    after(function () {
        client.close();
        server.close();
    });
});
