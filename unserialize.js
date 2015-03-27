(function() {
    /**
     * 每行\n分隔，第三行user每个字段\t分隔
     * id
     * timestamp
     * ip
     * id sex name avatar
     * text
     */
    function unserialize(msg) {
        var arr = msg.split('\n');
        var user = arr[3].split('\t');
        var avatar = user[3];
        var msgObj = {
            id: arr[0],
            user: {
                id: user[0],
                sex: user[1],
                name: user[2]
            },
            ip: arr[2],
            timestamp: arr[1],
            text: arr[4],
            tags: arr[5] ? arr[5].split('\t') : [],
            praise: 0
        };

        if (user[0] == 11) {
            if (/^\d+$/.test(avatar)) {
                avatar = 'http://p8.qhimg.com/d/inn/8768f276/tantan_anony_avatar/ava' + avatar + '.png';
            }
        } else if (user[0] > 0) {
            if (/^[a-z0-9]+$/.test(avatar)) {
                avatar = 'http://quc.qhimg.com/dm/180_180_100/t' + avatar + '.jpg';
            }
        }
        msgObj.user.avatar = avatar;

        if (arr[6]) {
            var types = arr[6].split('\t');
            msgObj.types = [parseInt(types[0], 10)];
        }

        return msgObj;
    }

    exports.unserialize = unserialize;
}).call(this);
