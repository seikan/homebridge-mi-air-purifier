# homebridge-mi-air-purifier

This is Xiaomi Mi Air Purifier plugin for [Homebridge](https://github.com/nfarina/homebridge). Since Apple Homekit is not supporting air purifier device yet, this plugin will add the air purifier as **Fan** and **Air Quality Sensor** to your Home app.

![mi-air-purifier](https://cloud.githubusercontent.com/assets/73107/26249685/1d0ae78c-3cda-11e7-8b64-71e8d4323a3e.jpg)

### Features

* Switch on / off.

* Control modes:

  - `Idle / Off`: Lift fan speed to 0% from Home app.

  - `Auto`: Lift fan speed between 1 - 60%.

  - `Silent`: Lift fan speed between 61 - 80%.

  - `Favorite / High`: Lift fan speed great than 80%.

    **Notes:** Alternatively, you can ask Siri to change the fan speed within the range to adjust the air purifier mode. Example:

    ```
    Hey Siri, change the air purifier speed to 100.
    ```

    ​

* Display temperature.

* Display humidity.

* Display air quality.

  ​

  ​



### Installation

1. Install required packages.

   ```
   npm install -g homebridge-mi-air-purifier miio
   ```

   ​

2. Add following accessory to the `config.json`.

   ```
     "accessories": [
       {
         "accessory": "MiAirPurifier",
         "name": "Air Purifier",
         "showTemperature": true,
         "showHumidity": true,
         "showAirQuality": true
       }
     ]
   ```

   ​**Notes:** Set value for `showTemperature`, `showHumidity`, `showAirQuality` to **true** or **false** to show or hide these sensors in Home app.

   ​

3. Restart Homebridge, and your Mi air purifier will be discovered automatically.



### License

See the [LICENSE](https://github.com/seikan/homebridge-mi-air-purifier/blob/master/LICENSE.md) file for license rights and limitations (MIT).



