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

    this.nameAirQuality = config.nameAirQuality || 'Air Quality';
    this.nameTemperature = config.nameTemperature || 'Temperature';
    this.nameHumidity = config.nameHumidity || 'Humidity';

    this.device = null;
    this.mode = null;
    this.temperature = null;
    this.humidity = null;
    this.aqi = null;
    this.led = null;

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
        .setCharacteristic(Characteristic.Model, 'Air Purifier')
        .setCharacteristic(Characteristic.SerialNumber, 'Undefined');

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
                    log.debug('Discovered Mi Air Purifier at %s', this.ip);

                    log.debug('Model       : ' + device.miioModel);
                    log.debug('Power       : ' + device.property('power'));
                    log.debug('Mode        : ' + device.property('mode'));
                    log.debug('Temperature : ' + device.property('temperature'));
                    log.debug('Humidity    : ' + device.property('humidity'));
                    log.debug('Air Quality : ' + device.property('aqi'));
                    log.debug('LED         : ' + device.property('led'));

                    device.state()
                        .then(state => {
                            state = JSON.parse(JSON.stringify(state));

                            if (state.error !== undefined) {
                                console.log(state.error);
                                return;
                            }

                            // Initial states
                            that.updateActiveState(state.mode);
                            that.updateCurrentAirPurifierState(state.mode);
                            that.updateTargetAirPurifierState(state.mode);
                            that.updateTemperature(state.temperature.value);
                            that.updateHumidity(state.relativeHumidity);
                            that.updateAirQuality(state['pm2.5']);
                            that.updateLED(state.led);

                            // State change events
                            device.on('stateChanged', data => {
                                state = JSON.parse(JSON.stringify(data));

                                if (state['key'] == 'mode') {
                                    that.updateActiveState(state['value']);
                                    that.updateCurrentAirPurifierState(state['value']);
                                    that.updateTargetAirPurifierState(state['value']);
                                }

                                if (state['key'] == 'temperature') {
                                    that.updateTemperature(state['value']['value']);
                                }

                                if (state['key'] == 'relativeHumidity') {
                                    that.updateHumidity(state['value']);
                                }

                                if (state['key'] == 'pm2.5') {
                                    that.updateAirQuality(state['value']);
                                }

                                if (state['key'] == 'led') {
                                    that.updateLED(state['value']);
                                }
                            });
                        })
                        .catch(err => console.log(err));

                } else {
                    log.debug('Device discovered at %s is not Mi Air Purifier', this.ip);
                }
            })
            .catch(err => {
                log.debug('Failed to discover Mi Air Purifier at %s', this.ip);
                log.debug('Will retry after 30 seconds');
                setTimeout(function() {
                    that.discover();
                }, 30000);
            });
    },

    getActiveState: function(callback) {
        callback(null, (this.mode === 'idle') ? Characteristic.Active.INACTIVE : Characteristic.Active.ACTIVE);
    },

    setActiveState: function(state, callback) {
        if (!this.device) {
            callback(new Error('No Air Purifier is discovered.'));
            return;
        }

        this.device.call('set_power', [(state) ? 'on' : 'off'])
            .catch(err => {
                callback(err);
            });

        callback();
    },

    updateActiveState: function(mode) {
        this.log.debug('Power State -> %s', mode);
        this.mode = mode;
        this.service.getCharacteristic(Characteristic.Active).updateValue((mode == 'idle') ? Characteristic.Active.INACTIVE : Characteristic.Active.ACTIVE);
    },

    getCurrentAirPurifierState: function(callback) {
        callback(null, (this.mode === 'idle') ? Characteristic.CurrentAirPurifierState.INACTIVE : Characteristic.CurrentAirPurifierState.PURIFYING_AIR);
    },

    updateCurrentAirPurifierState: function(mode) {
        this.log.debug('Current Stage -> %s', mode);
        this.mode = mode;
        this.service.getCharacteristic(Characteristic.CurrentAirPurifierState).updateValue((mode == 'idle') ? Characteristic.CurrentAirPurifierState.INACTIVE : Characteristic.CurrentAirPurifierState.PURIFYING_AIR);
    },

    getTargetAirPurifierState: function(callback) {
        callback(null, (this.mode === 'favorite') ? Characteristic.TargetAirPurifierState.MANUAL : Characteristic.TargetAirPurifierState.AUTO);
    },

    setTargetAirPurifierState: function(state, callback) {
        if (!this.device) {
            callback(new Error('No Air Purifier is discovered.'));
            return;
        }

        this.device.call('set_mode', [(state) ? 'auto' : 'favorite'])
            .then(result => {
                (result[0] === 'ok') ? callback(): callback(new Error(result[0]));
            })
            .catch(err => {
                callback(err);
            });
    },

    updateTargetAirPurifierState: function(mode) {
        this.log.debug('Target Stage -> %s', mode);
        this.mode = mode;

        if (mode == 'auto') {
            this.service.getCharacteristic(Characteristic.TargetAirPurifierState).updateValue(Characteristic.TargetAirPurifierState.AUTO);
        } else if (mode == 'favorite') {
            this.service.getCharacteristic(Characteristic.TargetAirPurifierState).updateValue(Characteristic.TargetAirPurifierState.MANUAL);
        }
    },

    getLockPhysicalControls: async function(callback) {
        if (!this.device) {
            callback(new Error('No Air Purifier is discovered.'));
            return;
        }

        await this.device.call('get_prop', ['child_lock'])
            .then(result => {
                callback(null, result[0] === 'on' ? Characteristic.LockPhysicalControls.CONTROL_LOCK_ENABLED : Characteristic.LockPhysicalControls.CONTROL_LOCK_DISABLED);
            })
            .catch(err => {
                callback(err);
            });
    },

    setLockPhysicalControls: async function(state, callback) {
        if (!this.device) {
            callback(new Error('No Air Purifier is discovered.'));
            return;
        }

        await this.device.call('set_child_lock', [(state) ? 'on' : 'off'])
            .then(result => {
                (result[0] === 'ok') ? callback(): callback(new Error(result[0]));
            }).catch(err => {
                callback(err);
            });
    },

    getRotationSpeed: async function(callback) {
        if (!this.device) {
            callback(new Error('No Air Purifier is discovered.'));
            return;
        }

        await this.device.call('get_prop', ['favorite_level'])
            .then(result => {
                callback(null, Math.ceil(result[0] * 6.25));
            }).catch(err => {
                callback(err);
            });
    },

    setRotationSpeed: async function(speed, callback) {
        if (!this.device) {
            callback(new Error('No Air Purifier is discovered.'));
            return;
        }

        await this.device.call('get_prop', ['mode'])
            .then(result => {
                if (result[0] != 'favorite') {
                    this.device.call('set_mode', ['favorite'])
                    return;
                }
            })
            .catch(err => {
                callback(err)
            });

        await this.device.call('set_level_favorite', [Math.ceil(speed / 6.25)])
            .then(result => {
                callback(null, result[0]);
            })
            .catch(err => {
                callback(err);
            });
    },

    getLED: function(callback) {
        callback(null, this.led);
    },

    setLED: async function(state, callback) {
        if (!this.device) {
            callback(new Error('No Air Purifier is discovered.'));
            return;
        }

        await this.device.call('set_led', [(state) ? 'on' : 'off'])
            .catch(err => {
                callback(err);
            });

        callback();
    },

    updateLED: function(state) {
        if (!this.showLED) {
            return;
        }

        this.log.debug('LED -> %s', state);
        this.led = state;
        this.lightBulbService.getCharacteristic(Characteristic.On).updateValue(state);
    },

    getAirQuality: function(callback) {
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

        this.log.debug('Air Quality -> %s', value);
        this.aqi = value;

        for (var item of this.levels) {
            if (value >= item[0]) {
                this.airQualitySensorService.getCharacteristic(Characteristic.AirQuality).updateValue(item[1]);
                return;
            }
        }
    },

    getPM25: function(callback) {
        callback(null, this.aqi);
    },

    getTemperature: function(callback) {
        callback(null, this.temperature);
    },

    updateTemperature: function(value) {
        if (!this.showTemperature) {
            return;
        }

        this.log.debug('Temperature -> %s', value);
        this.temperature = value;
        this.temperatureSensorService.getCharacteristic(Characteristic.CurrentTemperature).updateValue(value);
    },

    getHumidity: function(callback) {
        callback(null, this.humidity);
    },

    updateHumidity: function(value) {
        if (!this.showHumidity) {
            return;
        }

        this.log.debug('Humidity -> %s', value);
        this.humidity = value;
        this.humiditySensorService.getCharacteristic(Characteristic.CurrentRelativeHumidity).updateValue(value);
    },

    identify: function(callback) {
        callback();
    },

    getServices: function() {
        return this.services;
    }
};
