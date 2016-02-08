/* eslint-disable no-unused-vars */

module.exports = function (Show) {
    // Popular
    Show.remoteMethod('popular', {
        http: { verb: 'get' },
        accepts: [
            {arg: 'limit', type: 'Number', default: 10},
            {arg: 'offset', type: 'Number', default: 0}
        ],
        returns: { arg: 'data', type: 'Array' }
    });
    Show.popular = (limit = 10, offset = 0, cb) => {
        Show.find({
            limit,
            offset
        }).then((result) => {
            cb(null, result);
        }).catch((error) => {
            cb(error);
        });
    };

    // Sort Episode results by date
    Show.afterRemote('prototype.__get__episodes', (ctx, results, next) => {
        results.sort((a, b) => {
            if (a.publish < b.publish) {
                return 1;
            }
            if (a.publish > b.publish) {
                return -1;
            }
            return 0;
        });

        next();
    });
};
