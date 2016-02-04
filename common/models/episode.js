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


module.exports = function (Episode) {
    Episode.observe('access', (ctx, next) => {
        if (!ctx.query.limit || ctx.query.limit > 20) {
            ctx.query.limit = 20;
        }
        next();
    });

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
};
