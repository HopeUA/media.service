module.exports = (app, next) => {
    init(app).then(() => {
        next();
    }).catch((error) => {
        console.error(`Users boot error: ${error.message}`);
    });
};

const roleRW = 'RW';

async function init(app) {
    const User = app.models.User;
    const Role = app.models.Role;
    const RoleMapping = app.models.RoleMapping;

    // Init Roles
    const role = await Role.findOne({ where: { name: roleRW } });
    if (role === null) {
        await Role.create({
            name: roleRW
        });
    }

    // Init Users
    const defaultUsers = require('server/users.json');
    for (let user of defaultUsers) {
        try {
            let appUser = await User.findOne({ where: { username: user.username } });
            if (appUser !== null) {
                continue;
            }

            appUser = await User.create(user);
            await User.login({
                email: user.email,
                password: user.password,
                ttl: 31556926
            });

            // Add roles
            await role.principals.create({
                principalType: RoleMapping.USER,
                principalId: appUser.id
            });
        } catch (error) {
            console.error(error.message);
        }
    }
}
