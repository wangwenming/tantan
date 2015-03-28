(function() {
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

    exports.log = log;
}).call(this);
