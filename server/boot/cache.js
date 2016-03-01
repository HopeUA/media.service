import Cacheman from 'cacheman-mongo';
import Promise from 'bluebird';

module.exports = function (server, next) {
    server.datasources.mongo.connector.connect((error, db) => {
        if (error) {
            throw error;
        }

        server.cache = Promise.promisifyAll(new Cacheman(db, { collection: 'Cache' }));
        next();
    });
};
