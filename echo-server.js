/**
 * var echoServer = require('echo-server')
 * echoServer.listen(9000, {
 *     prefix: '/sock', // URI前缀，当一台服务器部署多个 SockJS 服务时非常有用
 *     heartbeat_delay: 25000,
 *     disconnect_delay: 5000
 * });
 */
(function() {
    var http = require('http');
    var sockjs = require('sockjs');
    var sockServer = sockjs.createServer();
    var httpServer = http.createServer();

    // 连接数
    var totalConns = 0;
    // 连接成功的事件
    sockServer.on('connection', function(socket) {
        // 如果部署了反向代理，通常需要从 request header 获取真实 ip
        var ip = socket.headers['x-forwarded-for'];

        totalConns++;
        log('%s connected', ip);

        socket.on('close', function() {
            totalConns--;
            log('%s disconnected', ip);
        });

        socket.on('data', function(message) {
            // echo server 啥也不做，只是返回收到的字符
            socket.write(message);
        });
    });

    /**
     * 因为日志都是写到日志文件，所以时间每条日志应该包含几个重要信息：
     * 1. 时间
     * 2. 用户ID
     * 这里只实现了自动包含时间
     */
    function log() {
        var strDate = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
        arguments[0] = '%s ' + arguments[0];
        [].splice.call(arguments, 1, 0, strDate);
        console.log.apply(console, arguments);
    }

    // SockJS的日志太多，建议在线上环境只记录 Error
    function logError(severity, message) {
        // severity: debug|info|error
        if (severity === 'error') {
            log('[SockJS] %s', message);
        }
    }

    exports.start = function(port, sockOptions) {
        // 没有 log option，则使用默认的(只记录Error)
        sockOptions = sockOptions || {};
        sockOptions.log = sockOptions.log || logError;

        sockServer.installHandlers(httpServer, sockOptions);
        httpServer.listen(port, '0.0.0.0');
        log('Server started on port %s', port);
    };
    exports.close = function(callback) {
        httpServer.close(callback);
    };
}).call(this);
