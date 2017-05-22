var miio = require('miio');
var Accessory, Service, Characteristic;
var devices = [];

module.exports = function(homebridge) {
	Accessory = homebridge.platformAccessory;
	Service = homebridge.hap.Service;
	Characteristic = homebridge.hap.Characteristic;

	homebridge.registerAccessory('homebridge-mi-air-purifier', 'MiAirPurifier', MiAirPurifier);
}

function MiAirPurifier(log, config) {
	this.log = log;
	this.name = config.name || 'Air Purifier';
	this.showAirQuality = config.showAirQuality || false;
	this.showTemperature = config.showTemperature || false;
	this.showHumidity = config.showTemperature || false;

	this.services = [];

	// Modes supported
	this.modes = [
		[0, 'idle'], [60, 'auto'], [80, 'silent'], [100, 'favorite']
	];

	// Air purifier is not available in Homekit yet, register as Fan
	this.fanService = new Service.Fan(this.name);

	this.fanService
		.getCharacteristic(Characteristic.On)
		.on('get', this.getPowerState.bind(this))
		.on('set', this.setPowerState.bind(this));

	this.fanService
		.getCharacteristic(Characteristic.RotationSpeed)
		.on('get', this.getRotationSpeed.bind(this))
		.on('set', this.setRotationSpeed.bind(this));

	this.services.push(this.fanService);

	this.serviceInfo = new Service.AccessoryInformation();

	this.serviceInfo
		.setCharacteristic(Characteristic.Manufacturer, 'Xiaomi')
		.setCharacteristic(Characteristic.Model, 'Air Purifier');
	
	this.services.push(this.serviceInfo);

	if(this.showAirQuality){
		this.airQualitySensorService = new Service.AirQualitySensor('Air Quality Sensor');

		this.airQualitySensorService
			.getCharacteristic(Characteristic.AirQuality)
			.on('get', this.getAirQuality.bind(this));

		this.services.push(this.airQualitySensorService);
	}

	if(this.showTemperature){
		this.temperatureSensorService = new Service.TemperatureSensor('Temperature');

		this.temperatureSensorService
			.getCharacteristic(Characteristic.CurrentTemperature)
			.on('get', this.getCurrentTemperature.bind(this));

		this.services.push(this.temperatureSensorService);
	}

	if(this.showHumidity){
		this.humiditySensorService = new Service.HumiditySensor('Humidity');

		this.humiditySensorService
			.getCharacteristic(Characteristic.CurrentRelativeHumidity)
			.on('get', this.getCurrentRelativeHumidity.bind(this));

		this.services.push(this.humiditySensorService);
	}

	this.discover();
}

MiAirPurifier.prototype = {
	discover: function(){
		var accessory = this;
		var log = this.log;

		log.debug('Discovering Mi air purifier devices...');

		// Discover device in the network
		var browser = miio.browse();
		
		browser.on('available', function(reg){
			// Skip device without token
			if(!reg.token)
				return;

			miio.device(reg).then(function(device){
				if(device.type != 'air-purifier')
					return;

				devices[reg.id] = device;
				accessory.device = device;

				log.debug('Discovered "%s" (ID: %s) on %s:%s.', reg.hostname, device.id, device.address, device.port);
			});
		});

		browser.on('unavailable', function(reg){
			// Skip device without token
			if(!reg.token)
				return;

			var device = devices[reg.id];
			
			if(!device)
				return;

			device.destroy();
			delete devices[reg.id];
		});
	},

	getPowerState: function(callback) {
		if(!this.device){
			callback(null, false);
			return;
		}

		callback(null, this.device.power);
	},

	setPowerState: function(state, callback) {
		if(!this.device){
			callback(new Error('No air purifier is discovered.'));
			return;
		}

		this.device.setPower(state);
		callback();
	},

	getCurrentRelativeHumidity: function(callback) {
		if(!this.device){
			callback(null, 0);
			return;
		}

		callback(null, this.device.humidity);
	},

	getRotationSpeed: function(callback) {
		if(!this.device){
			callback(null, 0);
			return;
		}

		for(var item of this.modes){
			if(this.device.mode == item[1]){
				callback(null, item[0]);
				return;
			}
		}
	},

	setRotationSpeed: function(speed, callback) {
		if(!this.device){
			callback(new Error('No air purifier is discovered.'));
			return;
		}

		for(var item of this.modes){
			if(speed <= item[0]){
				this.log.debug('Set mode: ' + item[1]);
				this.device.setMode(item[1]);
				break;
			}
		}

		callback();
	},

	getAirQuality: function(callback) {
		if(!this.device){
			callback(null, Characteristic.AirQuality.UNKNOWN);
			return;
		}

		var levels = [
			[200, Characteristic.AirQuality.POOR],
			[150, Characteristic.AirQuality.INFERIOR],
			[100, Characteristic.AirQuality.FAIR],
			[50, Characteristic.AirQuality.GOOD],
			[0, Characteristic.AirQuality.EXCELLENT],
		];

		var quality = Characteristic.AirQuality.UNKNOWN;

		for(var item of levels){
			if(this.device.aqi > item[0]){
				quality = item[1];
				break;
			}
		}

		callback(null, quality);
	},

	getCurrentTemperature: function(callback) {
		if(!this.device){
			callback(null, 0);
			return;
		}

		callback(null, this.device.temperature);
	},

	identify: function(callback) {
		callback();
	},

	getServices: function() {
		return this.services;
	}
};
