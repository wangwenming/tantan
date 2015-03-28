var expect = require('chai').expect;
var server = require('../chat-server');
var SockJS = require('sockjs-client');

function addClient(port, prefix, callback) {
    // 初始化客户端
    var client = new SockJS('http://localhost:' + port + prefix);
    client.onopen = function() {
        console.log('open');
        callback();
    };
    // onmessage会被覆盖
    client.onmessage = function(e) {
        console.log('message', e.data);
    };
    client.onclose = function() {
        console.log('close');
    };

    return client;
}
describe('server', function () {
    var client1;
    var client2;
    before(function (done) {
        var port = 9001;
        var prefix = '/chat';
        // 初始化服务端
        server.start(port, {
            sock: {
                prefix: prefix
            }
        });

        client1 = addClient(port, prefix, function() {
            client2 = addClient(port, prefix, done);
        });
    });

    describe('chat', function () {
        it('should receive message from another client', function (done) {
            var msg = 'Hello';
            client2.onmessage = function(e) {
                expect(e.data).to.equal('newMsg ' + msg);
                done();
            };
            client1.send('join {"tid":"Node.js"}');
            client2.send('join {"tid":"Node.js"}');
            client1.send('post ' + msg);
        });
    });

    after(function () {
        client1.close();
        client2.close();
        server.close();
    });
});
