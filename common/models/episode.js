import { imageLoader, videoLoader } from 'common/utils/loaders';
import Promise from 'bluebird';

function cover(episode) {
    return imageLoader.episodeCover(episode.uid);
}

function linkPrev(Model, episode) {
    return Model.findOne({
        fields: {
            uid: true
        },
        where: {
            showId: episode.showId,
            publish: {
                lt: episode.publish
            }
        },
        order: 'publish DESC'
    }, { link: true });
}

function linkNext(Model, episode) {
    return Model.findOne({
        fields: {
            uid: true
        },
        where: {
            showId: episode.showId,
            publish: {
                gt: episode.publish
            }
        },
        order: 'publish ASC'
    }, { link: true });
}

function localFile(episode) {
    return videoLoader.episode(episode.uid);
}

function show(episode) {
    return episode.show.getAsync();
}

module.exports = function (Episode) {
    // Inject max limit
    Episode.observe('access', (ctx, next) => {
        if (!ctx.query.limit || ctx.query.limit > 20) {
            ctx.query.limit = 20;
        }
        if (!ctx.query.order) {
            ctx.query.order = 'publish DESC';
        }
        next();
    });

    // Inject cover and links (prev, next)
    Episode.observe('loaded', (ctx, next) => {
        const episode = ctx.instance;
        if (!episode) {
            return next();
        }

        const options = ctx.options || {};
        if (options.link) {
            return next();
        }

        Promise.all([
            cover(episode),
            linkPrev(Episode, episode),
            linkNext(Episode, episode),
            localFile(episode),
            show(episode)
        ]).then((results) => {
            // Episode cover
            episode.image = results[0];

            // Episode links
            episode.links = {};
            if (results[1]) {
                episode.links.prev = results[1].uid;
            }
            if (results[2]) {
                episode.links.next = results[2].uid;
            }

            // Media source
            const source = episode.source || {};
            source.local = {};
            if (results[3]) {
                source.local.url = results[3];
            }
            episode.source = source;

            // Inject show
            episode.__data.show = results[4];
            episode.showId = undefined;

            next();
        }).catch((error) => {
            console.error(error.message);
            next();
        });
    });

    Episode.disableRemoteMethod('find', true);
    Episode.remoteMethod('getOne', {
        http: { verb: 'get', path: '/:id' },
        accepts: [
            { arg: 'id', type: 'String' }
        ],
        returns: { type: 'Object', root: true }
    });

    Episode.getOne = (id, cb) => {
        Episode.findById(id).then((result) => {
            if (result === null) {
                const error = new Error('Episode not found');
                error.statusCode = 404;
                throw error;
            }

            cb(null, result);
        }).catch((error) => {
            cb(error);
        });
    };

    // New
    Episode.remoteMethod('new', {
        http: { verb: 'get' },
        accepts: [
            { arg: 'limit', type: 'Number', default: 10 },
            { arg: 'offset', type: 'Number', default: 0 }
        ],
        returns: { arg: 'data', type: 'Array' }
    });
    Episode.new = (limit = 10, offset = 0, cb) => {
        Episode.find({
            order: 'publish DESC',
            where: {
                publish: {
                    lt: new Date()
                }
            },
            limit,
            offset
        }).then((result) => {
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

    // Now and Recommended
    Episode.remoteMethod('now', {
        http: { verb: 'get' },
        accepts: [
            { arg: 'limit', type: 'Number', default: 10 }
        ],
        returns: { arg: 'data', type: 'Array' }
    });
    Episode.remoteMethod('recommended', {
        http: { verb: 'get' },
        accepts: [
            { arg: 'limit', type: 'Number', default: 10 }
        ],
        returns: { arg: 'data', type: 'Array' }
    });
    Episode.recommended = Episode.now = (limit = 10, cb) => {
        (async () => { // eslint-disable-line  arrow-parens
            const connector = Promise.promisifyAll(
                Episode.getDataSource().connector
            );
            const db = await connector.connectAsync();
            const collection = Promise.promisifyAll(
                db.collection('Episode')
            );
            const rawData = await collection.aggregateAsync([
                { $match: { publish: { $lt: new Date() } } },
                { $sample: { size: limit } }
            ]);

            const results = [];
            for (const item of rawData) {
                item.uid = item._id;

                const episode = new Episode(item);
                const context = {
                    Model: Episode,
                    instance: episode,
                    isNewInstance: false,
                    hookState: {},
                    options: {}
                };
                try {
                    await Episode.notifyObserversOf('loaded', context);
                } catch (error) {
                    console.error(error);
                }
                results.push(episode);
            }

            return results;
        })().then((result) => {
            cb(null, result);
        }).catch((error) => {
            cb(error);
        });
    };

    // Similar
    Episode.remoteMethod('similar', {
        http: { verb: 'get' },
        accepts: [
            { arg: 'limit', type: 'Number', default: 10 },
            { arg: 'offset', type: 'Number', default: 0 }
        ],
        returns: { arg: 'data', type: 'Array' },
        isStatic: false
    });
    Episode.prototype.similar = function(limit = 10, offset = 0, cb) {
        Episode.find({
            where: {
                showId: this.show.uid
            },
            limit: limit + 1,
            offset
        }).then((result) => {
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
        })
    }
};
