(function() {
    var redis = require('redis');
    var util = require('util');
    var log = require('./utils').log;

    function RedisManager(name, options) {
        this.name = name;
        this.options = options;
        this.client = redis.createClient(options.port, options.host);
        // EventEmitter.setMaxListeners 设置为0表示无限制。
        // http://nodejs.org/api/events.html#events_emitter_setmaxlisteners_n
        this.client.setMaxListeners(0);

        var self = this;
        this.client.on('connect',function(err) {
            log('RedisInfo:%s(%s:%d) connect', name, options.host, options.port);
            self.onConnect();
        });

        this.client.on('reconnecting', function(err) {
            log('RedisInfo:%s(%s:%d) reconnecting', name, options.host, options.port);
        });

        this.client.on('error', function(err) {
            log('RedisError:%s(%s:%d) msg: %o', name, options.host, options.port, err);
        });

        this.client.auth(options.pwd, function(err, res) {});
        this.client.select(options.db, function(err, res) {});
    }
    RedisManager.prototype.onConnect = function() {};
    RedisManager.prototype.onError = function() {};
    RedisManager.prototype.publish = function(channel, data) {
        this.client.publish(channel, data);
    };

    function PersistentRedisManager(name, options) {
        RedisManager.call(this, name, options);
        this.pingTimerId = null;
    }
    util.inherits(PersistentRedisManager, RedisManager);
    PersistentRedisManager.prototype.onConnect = function() {
        var client = this.client;
        // 发送 PING 命令，模仿持久连接
        clearInterval(this.pingTimerId);
        this.pingTimerId = setInterval(function() {
            client.ping(function(err, res) {});
        }, this.options.pingInterval);
    };
    PersistentRedisManager.prototype.onError = function() {
        clearInterval(this.pingTimerId);
    };

    function SubRedisManager(name, options) {
        RedisManager.call(this, name, options);
    }
    util.inherits(SubRedisManager, RedisManager);
    // Redis Sub
    SubRedisManager.prototype.sub = function(callback) {
        this.client.psubscribe('chan_*');
        this.client.on('pmessage', function(pat, ch, msg) {
            var topicId = ch.substr(5);
            callback(topicId, msg);
        });
    };

    exports.RedisManager = RedisManager;
    exports.PersistentRedisManager = PersistentRedisManager;
    exports.SubRedisManager = SubRedisManager;
}).call(this);
