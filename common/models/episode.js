import imageLoader from 'common/utils/imageLoader';

module.exports = function (Episode) {
    Episode.observe('access', (ctx, next) => {
        if (!ctx.query.limit || ctx.query.limit > 20) {
            ctx.query.limit = 20;
        }
        next();
    });

    Episode.observe('loaded', (ctx, next) => {
        const episode = ctx.instance;

        (async () => {
            return await imageLoader.episodeCover(episode.uid);
        })().then((image) => {
            episode.image = image;
            next();
        }).catch((error) => {
            console.error(error.message);
            next();
        });
    });
};
