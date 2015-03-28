(function() {
    var socket = {
        client: null,
        opened: false,

        reconnecting: false,
        reconnectTimeout: 0,
        reconnectMultiplier: 1,
        reconnectRetryCount: 0,

        RECONNECT_RANDOM_BASE: Math.floor(Math.random() * 3000),
        RECONNECT_INITIAL_TIMEOUT: 3000,
        RECONNECT_MULTIPLIER: 2,
        RECONNECT_RESET_MULTIPLIER: 6,
        RECONNECT_MAX_RETRY: 30,

        init: function(options) {
            if (options) {
                this.options = options;
            }

            this.client = new SockJS(this.options.url);

            // 每个事件的 this 指向 client 对象
            this.client.onclose = this.onclose;
            this.client.onopen = this.onopen;
            this.client.onmessage = this.onmessage;
        },
        close: function() {
            if (this.client) {
                this.client.close();
            }
        },
        onopen: function() {
            socket.opened = true;
            socket.reconnecting = false;
            this.send('join ' + JSON.stringify({
                tid: socket.options.topicId
            }));
        },
        onclose: function() {
            socket.opened = false;

            this.onopen = null;
            this.onclose = null;
            this.onmessage = null;

            socket.client = null;

            socket.reconnectTry();
        },
        onmessage: function(e) {
            // 约定的消息格式是: cmd cmdData
            var message = e.data;
            var index = message.indexOf(' ');
            // 非法消息
            if (index === -1) {
                console.log('Error. Illegal message %s', message);
                return false;
            }

            var cmd = message.substr(0, index);
            var data = message.substr(index + 1);
            if (socket.events[cmd]) {
                socket.events[cmd](data);
            } else {
                console.log('Error. Unsupported command %s', cmd);
            }
        },
        post: function(text) {
            if (!this.client) {
                return;
            }
            this.client.send('post ' + text);
        },
        events: {
            newMsg: function(data) {
                console.log(data);
            }
        },
        reconnectTry: function() {
            var self = this;

            // 重连失败
            if (this.reconnectRetryCount >= this.RECONNECT_MAX_RETRY) {
                this.reconnecting = false;
                return;
            }

            // First attempt to reconnect.
            if (!this.reconnecting) {
                this.reconnecting = true;
                this.reconnectTimeout = this.RECONNECT_INITIAL_TIMEOUT;
                this.reconnectMultiplier = 1;
                this.reconnectRetryCount = 0;

                setTimeout(function() {
                    self.init();
                }, this.RECONNECT_RANDOM_BASE);
            } else {
                this.reconnectTimeout *= this.RECONNECT_MULTIPLIER;
                this.reconnectMultiplier++;
                if (this.reconnectMultiplier >= this.RECONNECT_RESET_MULTIPLIER) {
                    this.reconnectTimeout = this.RECONNECT_INITIAL_TIMEOUT;
                    this.reconnectMultiplier = 1;
                }

                setTimeout(function() {
                    self.init();
                }, this.reconnectTimeout);
            }

            this.reconnectRetryCount++;
        }
    };

    window.socket = socket;
})();
