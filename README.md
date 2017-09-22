# homebridge-mi-air-purifier

This is Xiaomi Mi Air Purifier plugin for [Homebridge](https://github.com/nfarina/homebridge). This plugin will add the air purifier and **Air Quality Sensor** to your Home app. This version is working with iOS 11 to add the device as air purifier in Home app.

![mi-air-purifier](https://cloud.githubusercontent.com/assets/73107/26249685/1d0ae78c-3cda-11e7-8b64-71e8d4323a3e.jpg)

### Features

* Switch on / off.

* Switch auto / manual mode.

* Turn parental mode on / off.

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

2. Make sure your Homebridge server is same network with your air purifier, then run following command to discover the token.

   ```
   miio --discover --sync
   ```

    

3. You may need to wait few minutes until you get the response similar to below:

   ```
   Device ID: 49466088
   Model info: Unknown
   Address: 192.168.1.8
   Token: 6f7a65786550386c700a6b526666744d via auto-token
   Support: Unknown
   ```

   ​

4. Record down the `Address` and `Token` values as we need it in our configuration file later.

5. If you are getting `??????????????` for your token value, please reset your device and connect your Homebridge server directly to the access point advertised by the device.

6. Then run the command again.

   ```
   miio --discover --sync
   ```

   ​

7. Add following accessory to the `config.json`.

   ```
     "accessories": [
       {
         "accessory": "MiAirPurifier",
         "name": "Air Purifier",
         "ip": "ADDRESS_OF_THE_AIR_PURIFIER",
         "token": "TOKEN_FROM_STEP_3".
         "showTemperature": true,
         "showHumidity": true,
         "showAirQuality": true
       }
     ]
   ```

   ​**Notes:** Set value for `showTemperature`, `showHumidity`, `showAirQuality` to **true** or **false** to show or hide these sensors in Home app.

   ​

8. Restart Homebridge, and your Mi air purifier will be added to Home app.



### License

See the [LICENSE](https://github.com/seikan/homebridge-mi-air-purifier/blob/master/LICENSE.md) file for license rights and limitations (MIT).



