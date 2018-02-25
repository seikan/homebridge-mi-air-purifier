var miio = require('miio');
var Service, Characteristic;
var devices = [];

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
	this.nameAirQuality = config.nameAirQuality || 'Air Quality';
	this.nameTemperature = config.nameTemperature || 'Temperature';
	this.nameHumidity = config.nameHumidity || 'Humidity';

	this.services = [];

	if(!this.ip)
		throw new Error('Your must provide IP address of the Air Purifier.');

	if(!this.token)
		throw new Error('Your must provide token of the Air Purifier.');


	// Register the service
	this.service = new Service.AirPurifier(this.name);

	this.service
		.getCharacteristic(Characteristic.Active)
		.on('get', this.getActive.bind(this))
		.on('set', this.setActive.bind(this));

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

	// Service information
	this.serviceInfo = new Service.AccessoryInformation();

	this.serviceInfo
		.setCharacteristic(Characteristic.Manufacturer, 'Xiaomi')
		.setCharacteristic(Characteristic.Model, 'Air Purifier')
		.setCharacteristic(Characteristic.SerialNumber, '0799-E5C0-57A641308C0D');

	this.services.push(this.service);
	this.services.push(this.serviceInfo);

	if(this.showAirQuality){
		this.airQualitySensorService = new Service.AirQualitySensor(this.nameAirQuality);

		this.airQualitySensorService
			.getCharacteristic(Characteristic.AirQuality)
			.on('get', this.getAirQuality.bind(this));

		this.airQualitySensorService
			.getCharacteristic(Characteristic.PM2_5Density)
			.on('get', this.getPM25.bind(this));

		//this.airQualitySensorService
		//	.setCharacteristic(Characteristic.AirParticulateSize, '2.5um');
		//
		this.services.push(this.airQualitySensorService);
	}

	if(this.showTemperature){
		this.temperatureSensorService = new Service.TemperatureSensor(this.nameTemperature);

		this.temperatureSensorService
			.getCharacteristic(Characteristic.CurrentTemperature)
			.on('get', this.getCurrentTemperature.bind(this));

		this.services.push(this.temperatureSensorService);
	}

	if(this.showHumidity){
		this.humiditySensorService = new Service.HumiditySensor(this.nameHumidity);

		this.humiditySensorService
			.getCharacteristic(Characteristic.CurrentRelativeHumidity)
			.on('get', this.getCurrentRelativeHumidity.bind(this));

		this.services.push(this.humiditySensorService);
	}

	this.discover();
}

MiAirPurifier.prototype = {
	discover: function(){

		miio.device({ address: this.ip, token: this.token })
		.then(device => {
				this.device = device;
		})
		.catch(err => {
			console.log('ERROR: ', err);
		});
	},

	getActive: function(callback) {
		this.device.call('get_prop', ['mode'])
			.then(result => {
				callback(null, (result[0] === 'idle') ? Characteristic.Active.INACTIVE: Characteristic.Active.ACTIVE);
            }).catch(err => {
				callback(err);
			});
	},

	setActive: function(state, callback) {
		this.device.call('set_power', [(state) ? 'on' : 'off'])
			.then(result => {
				(result[0] === 'ok') ? callback() : callback(new Error(result[0]));
			})
			.catch(err => {
				callback(err);
			});
	},

	getCurrentAirPurifierState: function(callback) {
		this.device.call('get_prop', ['mode'])
			.then(result => {
				callback(null, (result[0] === 'idle') ? Characteristic.CurrentAirPurifierState.INACTIVE : Characteristic.CurrentAirPurifierState.PURIFYING_AIR);
			}).catch(err => {
				callback(err);
			});
	},

	getTargetAirPurifierState: function(callback) {
		this.device.call('get_prop', ['mode'])
			.then(result => {
				callback(null, (result[0] === 'favorite') ? Characteristic.TargetAirPurifierState.MANUAL : Characteristic.TargetAirPurifierState.AUTO);
			}).catch(err => {
				callback(err);
			});
	},

	setTargetAirPurifierState: function(state, callback) {
		this.device.call('set_mode', [(state) ? 'auto' : 'favorite'])
			.then(result => {
				(result[0] === 'ok') ? callback() : callback(new Error(result[0]));
            })
			.catch(err => {
				callback(err);
			});
	},

	getLockPhysicalControls: function(callback) {
		this.device.call('get_prop', ['child_lock'])
			.then(result => {
				callback(null, result[0] === 'on' ? Characteristic.LockPhysicalControls.CONTROL_LOCK_ENABLED : Characteristic.LockPhysicalControls.CONTROL_LOCK_DISABLED);
			})
			.catch(err => {
				callback(err);
			});
	},

	setLockPhysicalControls: function(state, callback) {
		this.device.call('set_child_lock', [(state) ? 'on' : 'off'])
			.then(result => {
				(result[0] === 'ok') ? callback() : callback(new Error(result[0]));
			}).catch(err => {
				callback(err);
			});
	},

	getCurrentRelativeHumidity: function(callback) {
		this.device.call('get_prop', ['humidity'])
			.then(result => {
				callback(null, result[0]);
            }).catch(err => {
				callback(err);
			});
	},

	getRotationSpeed: function(callback) {
		this.device.call('get_prop', ['favorite_level'])
			.then(result => {
				callback(null, Math.ceil( result[0] * 6.25 ));
			}).catch(err => {
				callback(err);
			});
	},

	setRotationSpeed: function(speed, callback) {
		this.device.call('get_prop', ['mode'])
			.then(result => {
				if(result[0] != 'favorite'){
					this.device.call('set_mode', ['favorite'])
					return;
				}
			})
		this.device.call('set_level_favorite',[Math.ceil( speed / 6.25 )])
			.then(result => {
				callback(null, result[0]);
			}).catch(err => {
				callback(err);
			});
	},

	getAirQuality: function(callback) {
		var levels = [
			[200, Characteristic.AirQuality.POOR],
			[150, Characteristic.AirQuality.INFERIOR],
			[100, Characteristic.AirQuality.FAIR],
			[50, Characteristic.AirQuality.GOOD],
			[0, Characteristic.AirQuality.EXCELLENT],
		];

		this.device.call('get_prop', ['aqi'])
			.then(result => {
				for(var item of levels){
					if(result[0] >= item[0]){
						callback(null, item[1]);
						return;
					}
				}
            }).catch(err => {
				callback(err);
			});
	},

	getPM25: function(callback) {
		this.device.call('get_prop', ['aqi'])
			.then(result => {
				callback(null, result[0]);
			})
			.catch(err => {
				callback(err);
			});
	},

	getCurrentTemperature: function(callback) {
		this.device.call('get_prop', ['temp_dec'])
			.then(result => {
				callback(null, result[0] / 10.0);
			})
			.catch(err => {
				callback(err);
			});
	},

	identify: function(callback) {
		callback();
	},

	getServices: function() {
		return this.services;
	}
};
