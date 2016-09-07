import Fetch from 'node-fetch';
import App from 'server/server';

async function isResourceExists(url) {
    let exists = null;
    try {
        exists = await App.cache.getAsync(url);
    } catch (error) {
        console.error(error.message);
    }

    if (exists === null) {
        const response = await Fetch(url, {
            method: 'HEAD'
        });
        exists = response.status === 200;

        App.cache.setAsync(url, exists);
    }

    return exists;
}

export class imageLoader {
    static async episodeCover(uid) {
        const url = `https://cdn.hope.ua/media/shows/${uid.substring(0, 4)}/episodes/${uid.substring(4)}/${uid}-cover.jpg`;
        const exists = await isResourceExists(url);

        if (!exists) {
            return await imageLoader.showCover(uid.substring(0, 4));
        }

        return url;
    }

    static async showCover(uid) {
        let url = `https://cdn.hope.ua/media/shows/${uid}/${uid}-cover.jpg`;
        const exists = await isResourceExists(url);

        if (!exists) {
            url = 'https://cdn.hope.ua/media/defaults/show-cover.jpg';
        }

        return url;
    }

    static async showBackground(uid) {
        let url = `https://cdn.hope.ua/media/shows/${uid}/${uid}-background.jpg`;
        const exists = await isResourceExists(url);

        if (!exists) {
            url = 'https://cdn.hope.ua/media/defaults/show-background.jpg';
        }

        return url;
    }
}

export class videoLoader {
    static async episode(uid) {
        const url = `https://cdn.hope.ua/media/shows/${uid.substring(0, 4)}/episodes/${uid.substring(4)}/${uid}-hopeua.mov`;
        const exists = await isResourceExists(url);

        if (exists) {
            return url;
        }

        const tempUrl = `https://cdn.hope.ua/media/shows/${uid.substring(0, 4)}/episodes/${uid.substring(4)}/${uid}-stream.mov`;
        const tempExists = await isResourceExists(tempUrl);

        if (!tempExists) {
            return null;
        }

        return tempUrl;
    }

    static async trailer(type, uid) {
        const url = `https://cdn.hope.ua/media/shows/${uid.substring(0, 4)}/episodes/${uid.substring(4)}/${uid}-trailer-${type}.mov`;
        const exists = await isResourceExists(url);

        if (!exists) {
            return null;
        }

        return url;
    }
}
