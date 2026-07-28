(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("../data.js"), require("./utils.js"));
  else root.__RocketCfg = factory(root.RocketSimData, root.__CoreUtils);
})(typeof globalThis !== "undefined" ? globalThis : this, function (Data, Utils) {
  "use strict";

  const deepClone = Utils.deepClone;

  function getPropellant(config) {
    const raw = config.propellantKey === "custom" ? config.customPropellant : Data.propellants[config.propellantKey];
    const prop = deepClone(raw || Data.propellants["lox-methane"]);
    prop.key = config.propellantKey;
    if (!prop.flags) prop.flags = [];
    return prop;
  }

  function getBattery(config) {
    const key = Data.batteries[config.engine.batteryKey] ? config.engine.batteryKey : "secondary-li-ion";
    const battery = deepClone(Data.batteries[key]);
    battery.key = key;
    if (key === "custom") {
      battery.energyDensityWhKg = config.engine.customBatteryEnergyDensityWhKg;
      battery.powerDensityWKg = config.engine.customBatteryPowerDensityWKg;
      battery.packOverheadPct = config.engine.customBatteryPackOverheadPct;
      battery.costCnyKg = config.engine.customBatteryCostCnyKg;
    }
    return battery;
  }

  return { getPropellant, getBattery };
});
