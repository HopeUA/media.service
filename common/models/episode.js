import imageLoader from 'common/utils/imageLoader';
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

function inject(episode) {

}

module.exports = function (Episode) {
    // Inject max limit
    Episode.observe('access', (ctx, next) => {
        if (!ctx.query.limit || ctx.query.limit > 20) {
            ctx.query.limit = 20;
        }
        next();
    });

    // Inject cover and links (prev, next)
    Episode.observe('loaded', (ctx, next) => {
        const episode = ctx.instance;
        const options = ctx.options || {};

        if (options.link) {
            return next();
        }

        Promise.all([
            cover(episode),
            linkPrev(Episode, episode),
            linkNext(Episode, episode)
        ]).then((results) => {
            episode.image = results[0];
            episode.links = {
                prev: results[1].uid,
                next: results[2].uid
            };
            next();
        }).catch((error) => {
            console.error(error.message);
            next();
        });
    });

    // New
    Episode.remoteMethod('new', {
        http: { verb: 'get' },
        accepts: [
            {arg: 'limit', type: 'Number', default: 10},
            {arg: 'offset', type: 'Number', default: 0}
        ],
        returns: { arg: 'data', type: 'Array' }
    });
    Episode.new = (limit = 10, offset = 0, cb) => {
        Episode.find({
            order: 'publish DESC',
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

    // Now
    Episode.remoteMethod('now', {
        http: { verb: 'get' },
        accepts: [
            {arg: 'limit', type: 'Number', default: 10}
        ],
        returns: { arg: 'data', type: 'Array' }
    });
    Episode.now = (limit = 10, cb) => {
        (async () => {
            const connector = Promise.promisifyAll(
                Episode.getDataSource().connector
            );
            const db = await connector.connectAsync();
            const collection = Promise.promisifyAll(
                db.collection('Episode')
            );
            const rawData = await collection.aggregateAsync([
                { $sample: { size: limit }}
            ]);

            let results = [];
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
};
