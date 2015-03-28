var server = require('./chat-server');

var port = process.argv[2];
var prefix = process.argv[3];
// 初始化服务端
server.start(port, {
    sock: {
        prefix: prefix
    }
});

// nohup node index.js 9099 /chat-daemon > index.js.out &