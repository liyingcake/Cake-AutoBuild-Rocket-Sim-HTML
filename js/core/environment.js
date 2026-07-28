(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("../data.js"));
  else root.__RocketEnv = factory(root.RocketSimData);
})(typeof globalThis !== "undefined" ? globalThis : this, function (Data) {
  "use strict";

  function atmosphere(altitudeM) {
    const h = Math.max(0, altitudeM);
    let temperature;
    let pressure;
    if (h <= 11000) {
      temperature = 288.15 - 0.0065 * h;
      pressure = 101325 * Math.pow(temperature / 288.15, 5.25588);
    } else if (h <= 20000) {
      temperature = 216.65;
      pressure = 22632.1 * Math.exp(-(h - 11000) / 6341.6);
    } else if (h <= 32000) {
      temperature = 216.65 + 0.001 * (h - 20000);
      pressure = 5474.9 * Math.pow(216.65 / temperature, 34.1632);
    } else {
      temperature = 228.65;
      pressure = 868.0 * Math.exp(-(h - 32000) / 7000);
    }
    return { temperatureK: temperature, pressurePa: pressure, densityKgM3: pressure / (287.05 * temperature) };
  }

  function celestialBody(configOrKey) {
    const key = typeof configOrKey === "string"
      ? configOrKey
      : configOrKey && configOrKey.test ? configOrKey.test.bodyKey : "earth";
    return Data.celestialBodies[key] || Data.celestialBodies.earth;
  }

  function atmosphereForBody(bodyKey, altitudeM, forceVacuum) {
    const body = celestialBody(bodyKey);
    const h = Math.max(0, Number(altitudeM) || 0);
    if (forceVacuum || body.surfacePressurePa <= 0 || body.surfaceDensityKgM3 <= 0) {
      return { temperatureK: body.surfaceTemperatureK, pressurePa: 0, densityKgM3: 0 };
    }
    if (bodyKey === "earth") return atmosphere(h);
    const pressureFraction = Math.exp(-h / Math.max(1, body.scaleHeightM));
    const temperatureK = Math.max(body.minTemperatureK, body.surfaceTemperatureK + body.lapseRateKPerM * h);
    const pressurePa = body.surfacePressurePa * pressureFraction;
    const densityKgM3 = body.gasConstant > 0
      ? pressurePa / (body.gasConstant * temperatureK)
      : body.surfaceDensityKgM3 * pressureFraction;
    return { temperatureK, pressurePa, densityKgM3 };
  }

  function environmentState(config, altitudeM) {
    const body = celestialBody(config);
    const forcedVacuum = config && config.test && config.test.environment === "vacuum";
    return Object.assign({ bodyKey: config.test.bodyKey, body, forcedVacuum }, atmosphereForBody(config.test.bodyKey, altitudeM, forcedVacuum));
  }

  return { atmosphere, celestialBody, atmosphereForBody, environmentState };
});
