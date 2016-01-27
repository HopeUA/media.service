module.exports = function (Episode) {
    Episode.observe('access', (ctx, next) => {
        if (!ctx.query.limit || ctx.query.limit > 20) {
            ctx.query.limit = 20;
        }
        next();
    });
};
