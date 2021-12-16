function randomString(length) {
    var chars = 'abcdefghijklmnopqrstuvwxyz'
    var result = '';
    for (var i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
    return result;
}

exports.randomString = randomString
