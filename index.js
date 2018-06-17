const miio = require('miio');
let Service, Characteristic;
let devices = [];

module.exports = function(homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;

    homebridge.registerAccessory('homebridge-mi-air-purifier', 'MiAirPurifier', MiAirPurifier);
}

function MiAirPurifier(log, config) {
    this.log = log;
    this.ip = config.ip;
    this.token = config.token;
    this.name = config.name || 'Air Purifier';
    this.showAirQuality = config.showAirQuality || false;
    this.showTemperature = config.showTemperature || false;
    this.showHumidity = config.showHumidity || false;
    this.showLED = config.showLED || false;
    this.showBuzzer = config.showBuzzer || false;

    this.nameAirQuality = config.nameAirQuality || 'Air Quality';
    this.nameTemperature = config.nameTemperature || 'Temperature';
    this.nameHumidity = config.nameHumidity || 'Humidity';

    this.device = null;
    this.mode = null;
    this.temperature = null;
    this.humidity = null;
    this.aqi = null;

    this.levels = [
        [200, Characteristic.AirQuality.POOR],
        [150, Characteristic.AirQuality.INFERIOR],
        [100, Characteristic.AirQuality.FAIR],
        [50, Characteristic.AirQuality.GOOD],
        [0, Characteristic.AirQuality.EXCELLENT],
    ];

    this.services = [];

    if (!this.ip) {
        throw new Error('Your must provide IP address of the Air Purifier.');
    }

    if (!this.token) {
        throw new Error('Your must provide token of the Air Purifier.');
    }

    this.service = new Service.AirPurifier(this.name);

    this.service
        .getCharacteristic(Characteristic.Active)
        .on('get', this.getActiveState.bind(this))
        .on('set', this.setActiveState.bind(this));

    this.service
        .getCharacteristic(Characteristic.CurrentAirPurifierState)
        .on('get', this.getCurrentAirPurifierState.bind(this));

    this.service
        .getCharacteristic(Characteristic.TargetAirPurifierState)
        .on('get', this.getTargetAirPurifierState.bind(this))
        .on('set', this.setTargetAirPurifierState.bind(this));

    this.service
        .getCharacteristic(Characteristic.LockPhysicalControls)
        .on('get', this.getLockPhysicalControls.bind(this))
        .on('set', this.setLockPhysicalControls.bind(this));

    this.service
        .getCharacteristic(Characteristic.RotationSpeed)
        .on('get', this.getRotationSpeed.bind(this))
        .on('set', this.setRotationSpeed.bind(this));

    this.serviceInfo = new Service.AccessoryInformation();

    this.serviceInfo
        .setCharacteristic(Characteristic.Manufacturer, 'Xiaomi')
        .setCharacteristic(Characteristic.Model, 'Air Purifier');

    this.services.push(this.service);
    this.services.push(this.serviceInfo);

    if (this.showAirQuality) {
        this.airQualitySensorService = new Service.AirQualitySensor(this.nameAirQuality);

        this.airQualitySensorService
            .getCharacteristic(Characteristic.AirQuality)
            .on('get', this.getAirQuality.bind(this));

        this.airQualitySensorService
            .getCharacteristic(Characteristic.PM2_5Density)
            .on('get', this.getPM25.bind(this));

        this.services.push(this.airQualitySensorService);
    }

    if (this.showTemperature) {
        this.temperatureSensorService = new Service.TemperatureSensor(this.nameTemperature);

        this.temperatureSensorService
            .getCharacteristic(Characteristic.CurrentTemperature)
            .on('get', this.getTemperature.bind(this));

        this.services.push(this.temperatureSensorService);
    }

    if (this.showHumidity) {
        this.humiditySensorService = new Service.HumiditySensor(this.nameHumidity);

        this.humiditySensorService
            .getCharacteristic(Characteristic.CurrentRelativeHumidity)
            .on('get', this.getHumidity.bind(this));

        this.services.push(this.humiditySensorService);
    }

    if (this.showLED) {
        this.lightBulbService = new Service.Lightbulb(this.name + ' LED');

        this.lightBulbService
            .getCharacteristic(Characteristic.On)
            .on('get', this.getLED.bind(this))
            .on('set', this.setLED.bind(this));

        this.services.push(this.lightBulbService);
    }

    if (this.showBuzzer) {
        this.switchService = new Service.Switch(this.name + ' Buzzer');

        this.switchService
            .getCharacteristic(Characteristic.On)
            .on('get', this.getBuzzer.bind(this))
            .on('set', this.setBuzzer.bind(this));

        this.services.push(this.switchService);
    }

    this.discover();
}

MiAirPurifier.prototype = {
    discover: function() {
        var log = this.log;
        var that = this;

        miio.device({
                address: this.ip,
                token: this.token
            })
            .then(device => {
                if (device.matches('type:air-purifier')) {
                    that.device = device;
                    console.log('Discovered Mi Air Purifier (%s) at %s', device.miioModel, this.ip);

                    log.debug('Model       : ' + device.miioModel);
                    log.debug('Power       : ' + device.property('power'));
                    log.debug('Mode        : ' + device.property('mode'));
                    log.debug('Temperature : ' + device.property('temperature'));
                    log.debug('Humidity    : ' + device.property('humidity'));
                    log.debug('Air Quality : ' + device.property('aqi'));
                    log.debug('LED         : ' + device.property('led'));

                    // Listen to mode change event
                    device.on('modeChanged', mode => {
                        that.updateActiveState(mode);
                        that.updateTargetAirPurifierState(mode);
                        that.updateCurrentAirPurifierState(mode);
                    });

                    // Listen to air quality change event
                    if (that.showAirQuality) {
                        device.on('pm2.5Changed', value => that.updateAirQuality(value));
                    }

                    // Listen to temperature change event
                    if (that.showTemperature) {
                        device.on('temperatureChanged', value => that.updateTemperature(parseFloat(value)));
                    }

                    // Listen to humidity change event
                    if (that.showHumidity) {
                        device.on('relativeHumidityChanged', value => that.updateHumidity(value));
                    }
                } else {
                    console.log('Device discovered at %s is not Mi Air Purifier', this.ip);
                }
            })
            .catch(err => {
                console.log('Failed to discover Mi Air Purifier at %s', this.ip);
                console.log('Will retry after 30 seconds');
                setTimeout(function() {
                    that.discover();
                }, 30000);
            });
    },

    getActiveState: function(callback) {
        if (!this.device) {
            callback(new Error('No Air Purifier is discovered.'));
            return;
        }

        const state = (this.mode != 'idle') ? Characteristic.Active.ACTIVE : Characteristic.Active.INACTIVE;

        this.log.debug('getActiveState: Mode -> %s', this.mode);
        this.log.debug('getActiveState: State -> %s', state);
        callback(null, state);
    },

    setActiveState: function(state, callback) {
        if (!this.device) {
            callback(new Error('No Air Purifier is discovered.'));
            return;
        }

        this.log.debug('setActiveState: %s', state);

        this.device.setPower(state)
            .then(state => callback(null))
            .catch(err => callback(err));
    },

    updateActiveState: function(mode) {
        const state = (mode != 'idle') ? Characteristic.Active.ACTIVE : Characteristic.Active.INACTIVE;
        this.mode = mode;

        this.log.debug('updateActiveState: Mode -> %s', mode);
        this.log.debug('updateActiveState: State -> %s', state);

        this.service.getCharacteristic(Characteristic.Active).updateValue(state);
    },

    getCurrentAirPurifierState: function(callback) {
        if (!this.device) {
            callback(new Error('No Air Purifier is discovered.'));
            return;
        }

        const state = (this.mode == 'idle') ? Characteristic.CurrentAirPurifierState.INACTIVE : Characteristic.CurrentAirPurifierState.PURIFYING_AIR;
        this.log.debug('getCurrentAirPurifierState: Mode -> %s', this.mode);
        this.log.debug('getCurrentAirPurifierState: State -> %s', state);
        callback(null, state);
    },

    updateCurrentAirPurifierState: function(mode) {
        const state = (mode == 'idle') ? Characteristic.CurrentAirPurifierState.INACTIVE : Characteristic.CurrentAirPurifierState.PURIFYING_AIR;
        this.mode = mode;

        this.log.debug('updateCurrentAirPurifierState: Mode ->  %s', mode);
        this.log.debug('updateCurrentAirPurifierState: State ->  %s', state);
        this.service.getCharacteristic(Characteristic.CurrentAirPurifierState).updateValue(state);
    },

    getTargetAirPurifierState: function(callback) {
        if (!this.device) {
            callback(new Error('No Air Purifier is discovered.'));
            return;
        }

        const state = (this.mode != 'favorite') ? Characteristic.TargetAirPurifierState.AUTO : Characteristic.TargetAirPurifierState.MANUAL;
        this.log.debug('getTargetAirPurifierState: Mode -> %s', this.mode);
        this.log.debug('getTargetAirPurifierState: State -> %s', state);
        callback(null, state);
    },

    setTargetAirPurifierState: function(state, callback) {
        if (!this.device) {
            callback(new Error('No Air Purifier is discovered.'));
            return;
        }

        const mode = (state) ? 'auto' : 'favorite';
        this.mode = mode;

        this.log.debug('setTargetAirPurifierState: %s', mode);

        this.device.setMode(mode)
            .then(mode => callback(null))
            .catch(err => callback(err));
    },

    updateTargetAirPurifierState: function(mode) {
        const state = (mode != 'favorite') ? Characteristic.TargetAirPurifierState.AUTO : Characteristic.TargetAirPurifierState.MANUAL;
        this.mode = mode;

        this.log.debug('updateTargetAirPurifierState: Mode -> %s', mode);
        this.log.debug('updateTargetAirPurifierState: State -> %s', state);

        this.service.getCharacteristic(Characteristic.TargetAirPurifierState).updateValue(state);
    },

    getLockPhysicalControls: async function(callback) {
        if (!this.device) {
            callback(new Error('No Air Purifier is discovered.'));
            return;
        }

        await this.device.call('get_prop', ['child_lock'])
            .then(result => {
                const state = (result[0] === 'on') ? Characteristic.LockPhysicalControls.CONTROL_LOCK_ENABLED : Characteristic.LockPhysicalControls.CONTROL_LOCK_DISABLED;
                this.log.debug('getLockPhysicalControls: %s', state);
                callback(null, state);
            })
            .catch(err => callback(err));
    },

    setLockPhysicalControls: async function(state, callback) {
        if (!this.device) {
            callback(new Error('No Air Purifier is discovered.'));
            return;
        }

        this.log.debug('setLockPhysicalControls: %s', state);

        await this.device.call('set_child_lock', [(state) ? 'on' : 'off'])
            .then(result => {
                (result[0] === 'ok') ? callback(): callback(new Error(result[0]));
            })
            .catch(err => callback(err));
    },

    getRotationSpeed: function(callback) {
        if (!this.device) {
            callback(new Error('No Air Purifier is discovered.'));
            return;
        }

        this.device.favoriteLevel()
            .then(level => {
                const speed = Math.ceil(level * 6.25);
                this.log.debug('getRotationSpeed: %s', speed);
                callback(null, speed);
            })
            .catch(err => callback(err));
    },

    setRotationSpeed: function(speed, callback) {
        if (!this.device) {
            callback(new Error('No Air Purifier is discovered.'));
            return;
        }

        // Overwirte to manual mode
        if (this.mode != 'favorite') {
            this.device.setMode('favorite')
                .then()
                .catch(err => callback(err));
        }

        // Set favorite level
        const level = Math.ceil(speed / 6.25);

        this.log.debug('setRotationSpeed: %s', level);

        this.device.setFavoriteLevel(level)
            .then(mode => callback(null))
            .catch(err => callback(err));
    },

    getAirQuality: function(callback) {
        if (!this.device) {
            callback(new Error('No Air Purifier is discovered.'));
            return;
        }

        this.log.debug('getAirQuality: %s', this.aqi);

        for (var item of this.levels) {
            if (this.aqi >= item[0]) {
                callback(null, item[1]);
                return;
            }
        }
    },

    updateAirQuality: function(value) {
        if (!this.showAirQuality) {
            return;
        }

        this.aqi = value;
        this.log.debug('updateAirQuality: %s', value);

        for (var item of this.levels) {
            if (value >= item[0]) {
                this.airQualitySensorService.getCharacteristic(Characteristic.AirQuality).updateValue(item[1]);
                return;
            }
        }
    },

    getPM25: function(callback) {
        if (!this.device) {
            callback(new Error('No Air Purifier is discovered.'));
            return;
        }

        this.log.debug('getPM25: %s', this.aqi);

        callback(null, this.aqi);
    },

    getTemperature: function(callback) {
        if (!this.device) {
            callback(new Error('No Air Purifier is discovered.'));
            return;
        }

        this.log.debug('getTemperature: %s', this.temperature);

        callback(null, this.temperature);
    },

    updateTemperature: function(value) {
        if (!this.showTemperature) {
            return;
        }

        this.temperature = value;
        this.log.debug('updateTemperature: %s', value);

        this.temperatureSensorService.getCharacteristic(Characteristic.CurrentTemperature).updateValue(value);
    },

    getHumidity: function(callback) {
        if (!this.device) {
            callback(new Error('No Air Purifier is discovered.'));
            return;
        }

        this.log.debug('getHumidity: %s', this.humidity);

        callback(null, this.humidity);
    },

    updateHumidity: function(value) {
        if (!this.showHumidity) {
            return;
        }

        this.humidity = value;
        this.log.debug('updateHumidity: %s', value);

        this.humiditySensorService.getCharacteristic(Characteristic.CurrentRelativeHumidity).updateValue(value);
    },

    getLED: async function(callback) {
        if (!this.device) {
            callback(new Error('No Air Purifier is discovered.'));
            return;
        }

        const state = await this.device.led();
        this.log.debug('getLED: %s', state);
        callback(null, state);
    },

    setLED: async function(state, callback) {
        if (!this.device) {
            callback(new Error('No Air Purifier is discovered.'));
            return;
        }

        this.log.debug('setLED: %s', state);

        await this.device.led(state)
            .then(state => callback(null))
            .catch(err => callback(err));
    },

    getBuzzer: async function(callback) {
        if (!this.device) {
            callback(new Error('No Air Purifier is discovered.'));
            return;
        }

        const state = await this.device.buzzer();
        this.log.debug('getBuzzer: %s', state);
        callback(null, state);
    },

    setBuzzer: async function(state, callback) {
        if (!this.device) {
            callback(new Error('No Air Purifier is discovered.'));
            return;
        }

        this.log.debug('setBuzzer: %s', state);

        await this.device.buzzer(state)
            .then(state => callback(null))
            .catch(err => callback(err));
    },

    identify: function(callback) {
        callback();
    },

    getServices: function() {
        return this.services;
    }
};
