/* eslint-disable no-unused-vars */
/* eslint-disable no-empty-function */
module.exports = function (Category) {
    // Delete all
    Category.remoteMethod('deleteAll', {
        accessType: 'WRITE',
        returns: {
            arg: 'count',
            type: 'object',
            description: 'The number of instances deleted',
            root: true
        },
        http: {verb: 'del', path: '/'}
    });
};
