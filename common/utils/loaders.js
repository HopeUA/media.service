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
        let url = `https://cdn.hope.ua/media/shows/${uid.substring(0, 4)}/episodes/${uid.substring(4)}/${uid}-cover.jpg`;

        if (!await isResourceExists(url)) {
            return await imageLoader.showCover(uid.substring(0, 4));
        }

        return url;
    }

    static async showCover(uid) {
        let url = `https://cdn.hope.ua/media/shows/${uid}/${uid}-cover.jpg`;

        if (!await isResourceExists(url)) {
            url = 'https://cdn.hope.ua/media/defaults/show-cover.jpg';
        }

        return url;
    }

    static async showBackground(uid) {
        let url = `https://cdn.hope.ua/media/shows/${uid}/${uid}-background.jpg`;

        if (!await isResourceExists(url)) {
            url = 'https://cdn.hope.ua/media/defaults/show-background.jpg';
        }

        return url;
    }
}

export class videoLoader {
    static async episode(uid) {
        const url = `https://cdn.hope.ua/media/shows/${uid.substring(0, 4)}/episodes/${uid.substring(4)}/${uid}-hopeua.mov`;
        if (!await isResourceExists(url)) {
            return null;
        }

        return url;
    }
}
