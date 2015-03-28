/**
 * var echoServer = require('echo-server')
 * echoServer.listen(9000, {
 *     prefix: '/sock', // URI前缀，当一台服务器部署多个 SockJS 服务时非常有用
 *     heartbeat_delay: 25000,
 *     disconnect_delay: 5000
 * });
 */
(function() {
    var fs = require('fs');
    var http = require('http');
    var sockjs = require('sockjs');
    var log = require('./utils').log;
    var sockServer = sockjs.createServer();
    var httpServer = http.createServer();
    // 当前进程 pid
    var pid = process.pid;
    // 进程启动时间
    var uptime = Date.now();
    var usage = require('usage');
    var profiler = require('v8-profiler');

    // 连接数
    var totalConns = 0;
    // 订阅频道的连接数(正常情况下和totalConns基本一致)
    var totalObservers = 0;
    // 所以的 socket 对象
    var allSockets = {};

    // 连接Redis
    var RedisFactory = require('./RedisFactory');
    var PersistentRedisManager = RedisFactory.PersistentRedisManager;
    var SubRedisManager = RedisFactory.SubRedisManager;

    var redisManager;
    var subRedisManager;

    function broadcast(topicId, name, msg) {
        var sockets = allSockets[topicId];
        if (!Array.isArray(sockets)) {
            return;
        }

        for (var i = 0, len = sockets.length, socket; i < len; i++) {
            socket = sockets[i];
            try {
                socket.write(name + ' ' + msg);
            } catch (e) {}
        }
    }
    // 连接成功的事件
    sockServer.on('connection', function(socket) {
        // 和当前 socket 关联的 topicId, join 请求赋值
        var topicId = null;
        // 如果部署了反向代理，通常需要从 request header 获取真实 ip
        var ip = socket.headers['x-forwarded-for'] || socket.remoteAddress;
        // 如果需要登录，则需要读取Cookie, HTTP Only Cookie也可以读取
        var cookie = socket.headers.cookie;

        totalConns++;
        log('+ Connect, id=%s, ip=%s, totalConns=%d', socket.id, ip, totalConns);

        socket.on('close', function() {
            totalConns--;
            log('- Disconnect, id=%s, ip=%s, totalConns=%d, topicId=%s', socket.id, ip, totalConns, topicId || 'NULL');

            // 用户未加入任何Topic
            if (!topicId) {
                return;
            }

            // 从该话题删除这个广播用户
            totalObservers--;
            if (!allSockets[topicId]) {
                log('Error. Channel %s has no any socket', topicId);
            } else {
                var index = allSockets[topicId].indexOf(socket);
                if (index === -1) {
                    log('Error. Channel %s has no this socket', topicId);
                // 正常释放
                } else {
                   allSockets[topicId].splice(index, 1);
                }
            }
        });

        socket.on('data', function(message) {
            // 约定的消息格式是: cmd cmdData
            var index = message.indexOf(' ');
            // 非法消息
            if (index === -1) {
                log('Error. Illegal message %s', message);
                return false;
            }

            var cmd = message.substr(0, index);
            var data = message.substr(index + 1);
            if (events[cmd]) {
                events[cmd](data);
            } else {
                log('Error. Unsupported command %s', cmd);
            }
        });

        var events = {
            join: function(data) {
                try {
                    var params = JSON.parse(data);
                    // topicId，非法参数则服务端主动断开连接
                    if (typeof params !== 'object' ||
                        params === null) {
                        log('Server Disconnect by illegal join, id=%s, ip=%s, data=', socket.id, ip, data);
                        socket.close();
                        return;
                    }

                    // 当前连接成功绑定到某个Topic
                    topicId = params.tid;

                    // 添加广播用户到某个话题
                    allSockets[topicId] = allSockets[topicId] || [];
                    if (!~allSockets[topicId].indexOf(socket)) {
                        allSockets[topicId].push(socket);
                        totalObservers++;
                        log('Accepted observer, topic=%s, totalObservers=', topicId, totalObservers);
                    }
                } catch (e) {
                    log('Error. Join error: %s, data: ', e.message, data);
                }
            },
            // 收到用户的消息
            post: function(data) {
                redisManager.publish('chan_' + topicId, data);
            },
            /**
             * 获取当前进程状态
             */
            stats: function() {
                usage.lookup(pid, {keepHistory: true}, function(err, result) {
                    var cpu = null;
                    var memory = null;
                    if (!err) {
                        cpu = Math.round(result.cpu * 1000) / 1000;
                        memory = result.memory;
                    }
                    var data ={
                        u: uptime,
                        cpu: cpu,
                        memory: memory,
                        c: totalConns,
                        o: totalObservers
                    };
                    socket.write('stats ' + JSON.stringify(data));
                });
            }
        };
    });

    // SockJS的日志太多，建议在线上环境只记录 Error
    function logError(severity, message) {
        // severity: debug|info|error
        if (severity === 'error') {
            log('[SockJS] %s', message);
        }
    }

    // 定时读取重启文件
    function initAutoReload(triggerFile) {
        var mtime = null;
        triggerFile = triggerFile || (__dirname + '/CHANGELOG');
        setInterval(function() {
            fs.lstat(triggerFile, function(err, stats) {
                if (err !== null) {
                    log('AUTO_RELOAD ERROR:', err);
                    return;
                }

                if (mtime === null) {
                    mtime = stats.mtime.getTime();
                    log('AUTO_RELOAD INIT:', stats.mtime);
                    return;
                }

                if (stats.mtime.getTime() > mtime) {
                    log('AUTO_RELOAD DO_RELOAD:', stats.mtime);
                    process.exit(0);
                }
            });
        }, 30000);
    }

    exports.start = function(port, options) {
        // 没有 log option，则使用默认的(只记录Error)
        options = options || {};
        options.sock = options.sock || {};
        options.sock.log = options.sock.log || logError;

        redisManager = new PersistentRedisManager('master', {
            host: '127.0.0.1',
            port: 6379,
            pingInterval: 25000
        });
        subRedisManager = new SubRedisManager('sub', {
            host: '127.0.0.1',
            port: 6379
        });
        subRedisManager.sub(function(topicId, msg) {
            broadcast(topicId, 'newMsg', msg);
        });

        sockServer.installHandlers(httpServer, options.sock);
        httpServer.listen(port, '0.0.0.0');
        // autoReload = false 不自动重启
        if (options.autoReload !== false) {
            initAutoReload(options.autoReload);
        // 不让程序退出
        } else {
            setInterval(function() {}, 86400000);
        }
        log('Server started on port %s', port);
        // profiler.startProfiling();
        // setTimeout(function() {
        //     // cpuProfile是一个对象，启动程序时加 --prof --prof_lazy --log 参数会自己生成 v8.log
        //     var cpuProfile = profiler.stopProfiling();
        // }, 30000);
    };
    exports.close = function(callback) {
        httpServer.close(callback);
    };
}).call(this);
