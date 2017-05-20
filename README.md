# homebridge-mi-air-purifier

This is Xiaomi Mi Air Purifier plugin for [Homebridge](https://github.com/nfarina/homebridge). 

![mi-air-purifier](https://cloud.githubusercontent.com/assets/73107/26249685/1d0ae78c-3cda-11e7-8b64-71e8d4323a3e.jpg)

### Features

* Switch on/off.
* Control modes: `idle`, `silent`, `low`, `medium`.
* Get air quality.



### Installation

1. Install required packages.

   ```
   npm install -g homebridge-mi-air-purifier miio
   ```

   ​

2. Add your Accessory to the `config.json`.

   ```
     "accessories": [
       {
         "accessory": "MiAirPurifier",
         "name": "Air Purifier"
       }
     ]
   ```

   ​

3. Restart Homebridge, and your Mi air purifier will be discovered automatically.



### License

See the [LICENSE](https://github.com/seikan/homebridge-mi-air-purifier/blob/master/LICENSE.md) file for license rights and limitations (MIT).



