var miio = require('miio');
var Accessory, Service, Characteristic, UUIDGen;
var devices = [];

module.exports = function(homebridge) {
	Accessory = homebridge.platformAccessory;
	Service = homebridge.hap.Service;
	Characteristic = homebridge.hap.Characteristic;
	UUIDGen = homebridge.hap.uuid;

	homebridge.registerAccessory('homebridge-mi-air-purifier', 'MiAirPurifier', MiAirPurifier);
}

function MiAirPurifier(log, config) {
	this.log = log;
	this.modes = [
		[0, 'idle'], [40, 'silent'], [60, 'auto'], [80, 'low'], [100, 'medium']
	];

	// Air purifier is not available in Homekit yet, use as fan for now
	this.fanService = new Service.Fan('Air Purifier');

	// Register another service as air quality sensor
	this.airQualitySensorService = new Service.AirQualitySensor('Air Quality');

	this.serviceInfo = new Service.AccessoryInformation();

	this.fanService
		.getCharacteristic(Characteristic.On)
		.on('get', this.getOn.bind(this))
		.on('set', this.setOn.bind(this));

	this.fanService
		.getCharacteristic(Characteristic.RotationSpeed)
		.on('get', this.getRotationSpeed.bind(this))
		.on('set', this.setRotationSpeed.bind(this));

	this.airQualitySensorService
		.getCharacteristic(Characteristic.AirQuality)
		.on('get', this.getAirQuality.bind(this));

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

				accessory.serviceInfo
					.setCharacteristic(Characteristic.Manufacturer, 'Xiao Mi')
					.setCharacteristic(Characteristic.Model, device.model)
					.setCharacteristic(Characteristic.SerialNumber, device.id);

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

	getOn: function(callback) {
		callback(null, this.device.power);
	},

	setOn: function(powerOn, callback) {
		if(!this.device){
			callback(new Error('No air purifier is discovered.'));
			return;
		}

		var accessory = this;

		this.device.setPower(powerOn)
			.then(function(state){
				accessory.getRotationSpeed(accessory);
				callback(null, state);
			});

		callback();
	},

	getRotationSpeed: function(callback) {
		for(var item of this.modes){
			if(this.device.mode == item[1]){
				callback(null, item[0]);
			}
		}
	},

	setRotationSpeed: function(speed, callback) {
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
		var airQuality = Characteristic.AirQuality.UNKNOWN;

		if(this.device.aqi > 200)
			airQuality = Characteristic.AirQuality.POOR;

		else if(this.device.aqi > 150)
			airQuality = Characteristic.AirQuality.INFERIOR;

		else if(this.device.aqi > 100)
			airQuality = Characteristic.AirQuality.FAIR;

		else if(this.device.aqi > 50)
			airQuality = Characteristic.AirQuality.GOOD;

		else
			airQuality = Characteristic.AirQuality.EXCELLENT;

		callback(null, airQuality);
	},

	identify: function(callback) {
		callback();
	},

	getServices: function() {
		return [this.serviceInfo, this.fanService, this.airQualitySensorService];
	}
};
