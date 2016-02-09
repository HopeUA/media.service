/* eslint-disable no-unused-vars */

import imageLoader from 'common/utils/imageLoader';
import Promise from 'bluebird';

function cover(show) {
    return imageLoader.showCover(show.uid);
}

function background(show) {
    return imageLoader.showBackground(show.uid);
}

module.exports = function (Show) {
    Show.observe('loaded', (ctx, next) => {
        const show = ctx.instance;
        if (!show) {
            return next();
        }

        Promise.all([
            cover(show),
            background(show)
        ]).then((results) => {
            show.images = {
                cover: results[0],
                background: results[1]
            };
            next();
        }).catch((error) => {
            console.error(error);
            next();
        });
    });

    // Popular
    Show.remoteMethod('popular', {
        http: { verb: 'get' },
        accepts: [
            {arg: 'limit', type: 'Number', default: 10},
            {arg: 'offset', type: 'Number', default: 0}
        ],
        returns: { type: 'Array', root: true }
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
