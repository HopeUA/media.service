/* eslint-disable no-unused-vars */

import { imageLoader } from 'common/utils/loaders';
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
            { arg: 'limit', type: 'Number', default: 10 },
            { arg: 'offset', type: 'Number', default: 0 }
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

    Show.disableRemoteMethod('__get__episodes', false);
    Show.remoteMethod('getEpisodes', {
        http: { verb: 'get', path: '/episodes'},
        accepts: [
            { arg: 'search', type: 'String', default: '', http: { source: 'query' } },
            { arg: 'limit', type: 'Number', default: 10, http: { source: 'query' } },
            { arg: 'offset', type: 'Number', default: 0, http: { source: 'query' } }
        ],
        returns: { arg: 'data', type: 'Array' },
        isStatic: false
    });

    Show.prototype.getEpisodes = function(search = '', limit = 10, offset = 0, cb) {
        const show = this;
        const Episode = Show.app.models.Episode;

        const query = {
            order: 'publish DESC',
            where: {
                showId: show.uid,
                publish: {
                    lt: new Date()
                }
            },
            limit,
            offset
        };

        // Text search
        const searchString = search.replace(/[^a-zA-Zа-яА-Яіїє0-9'"\-_ ]/g, '');
        // No data for special characters
        if (searchString.length === 0 && search.length > 0) {
            return cb(null, []);
        }
        if (searchString.length > 0) {
            query.where.or = [
                {
                    uid: {
                        regexp: new RegExp(searchString, 'i')
                    }
                },
                {
                    title: {
                        regexp: new RegExp(searchString, 'i')
                    }
                },
                {
                    description: {
                        regexp: new RegExp(searchString, 'i')
                    }
                },
                {
                    author: {
                        regexp: new RegExp(searchString, 'i')
                    }
                },
                {
                    tags: {
                        regexp: new RegExp(searchString, 'i')
                    }
                }
            ];
        }

        Episode.find(query).then((result) => {
            if (!result || result.length === 0) {
                const error = new Error('Episodes not found');
                error.statusCode = 404;
                throw error;
            }

            // Sort by publish DESC
            result.sort((a, b) => {
                if (a.publish < b.publish) {
                    return 1;
                }
                if (a.publish > b.publish) {
                    return -1;
                }
                return 0;
            });

            cb(null, result);
        }).catch((error) => {
            cb(error);
        });
    };
};
