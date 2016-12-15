const services = {
    cdn: {
        url: 'https://cdn.hope.ua/',
        isOnline: true
    }
};

class Healthcheck {
    static isOnline(service) {
        if (Object.keys(services).indexOf(service) === -1) {
            return false;
        }

        return services[service].isOnline;
    }

    static setOffline(service) {
        if (Object.keys(services).indexOf(service) === -1) {
            return false;
        }

        services[service].isOnline = false;
        setTimeout(() => {
            services[service].isOnline = true;
        }, 10*60*1000);
    }
}

export default Healthcheck;
