(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./utils.js"), require("./materials.js"));
  else root.__RocketTankGeom = factory(root.__CoreUtils, root.__RocketMat);
})(typeof globalThis !== "undefined" ? globalThis : this, function (Utils, Mat) {
  "use strict";

  const clamp = Utils.clamp;
  const materialModulusPa = Mat.materialModulusPa;
  const materialTemperatureFactor = Mat.materialTemperatureFactor;

  function computeTankBuckling(options) {
    const { geometry, thicknessM, material, temperatureK, pressurePa, axialForceN, config } = options;
    const stiffeningFactor = Math.max(0.5, Number(options.stiffeningFactor) || 1);
    const radiusM = Math.max(0.001, geometry.radiusM);
    const thickness = Math.max(1e-6, thicknessM);
    const modulusPa = materialModulusPa(material, temperatureK);
    const axialStressPa = axialForceN / Math.max(1, 2 * Math.PI * radiusM * thickness);
    const idealCriticalPa = 0.605 * modulusPa * thickness / radiusM;
    const knockdown = config.tanks.bucklingKnockdownPct / 100;
    const imperfectionFactor = 1 / (1 + 30 * config.tanks.ovalityPct / 100);
    const pressureStabilizationPa = Math.min(material.yield * 1e6 * 0.30, pressurePa * radiusM / (2 * thickness) * 0.12);
    const reducedCriticalPa = Math.min(material.yield * 1e6 * 0.8, idealCriticalPa * knockdown * imperfectionFactor * stiffeningFactor + pressureStabilizationPa);
    return {
      axialStressMpa: axialStressPa / 1e6,
      idealCriticalMpa: idealCriticalPa / 1e6,
      reducedCriticalMpa: reducedCriticalPa / 1e6,
      knockdownFactor: knockdown,
      imperfectionFactor,
      pressureStabilizationMpa: pressureStabilizationPa / 1e6,
      utilization: axialStressPa / Math.max(1e5, reducedCriticalPa),
      stiffeningFactor
    };
  }

  function splitPropellant(propellant, usableMassKg, residualPct, mixtureOverride) {
    const loadedMass = usableMassKg / Math.max(0.7, 1 - residualPct / 100);
    if (propellant.mono) {
      return {
        mixtureRatio: 0,
        usableFuelKg: usableMassKg,
        usableOxidizerKg: 0,
        loadedFuelKg: loadedMass,
        loadedOxidizerKg: 0,
        loadedTotalKg: loadedMass,
        residualKg: loadedMass - usableMassKg
      };
    }
    const of = mixtureOverride > 0 ? mixtureOverride : propellant.mixtureRatio;
    const usableFuelKg = usableMassKg / (1 + of);
    const usableOxidizerKg = usableMassKg - usableFuelKg;
    const loadedFuelKg = loadedMass / (1 + of);
    return {
      mixtureRatio: of,
      usableFuelKg,
      usableOxidizerKg,
      loadedFuelKg,
      loadedOxidizerKg: loadedMass - loadedFuelKg,
      loadedTotalKg: loadedMass,
      residualKg: loadedMass - usableMassKg
    };
  }

  function tankGeometry(volumeM3, diameterM) {
    const radius = diameterM / 2;
    const nominalDomeDepth = radius * 0.5;
    const nominalDomeVolume = (4 / 3) * Math.PI * radius * radius * nominalDomeDepth;
    let domeDepth = nominalDomeDepth;
    let cylinderLength = 0;
    let shallowDome = false;
    if (volumeM3 > nominalDomeVolume) {
      cylinderLength = (volumeM3 - nominalDomeVolume) / (Math.PI * radius * radius);
    } else {
      domeDepth = (3 * volumeM3) / (4 * Math.PI * radius * radius);
      shallowDome = true;
    }
    const cylinderArea = 2 * Math.PI * radius * cylinderLength;
    const domeArea = 4 * Math.PI * radius * Math.sqrt((radius * radius + domeDepth * domeDepth) / 2);
    return {
      volumeM3,
      radiusM: radius,
      diameterM,
      domeDepthM: domeDepth,
      cylinderLengthM: cylinderLength,
      totalLengthM: cylinderLength + 2 * domeDepth,
      cylinderAreaM2: cylinderArea,
      domeAreaM2: domeArea,
      surfaceAreaM2: cylinderArea + domeArea,
      shallowDome
    };
  }

  function resolveTankDiameter(config, fuelVolume, oxidizerVolume) {
    if (config.tanks.diameterMode === "locked") return clamp(Number(config.tanks.diameterM), 0.2, 20);
    const targetAspect = clamp(Number(config.tanks.targetAspect), 2, 14);
    let low = 0.2;
    let high = 12;
    for (let i = 0; i < 70; i += 1) {
      const d = (low + high) / 2;
      const fuel = tankGeometry(Math.max(fuelVolume, 0.0001), d);
      const ox = oxidizerVolume > 0 ? tankGeometry(oxidizerVolume, d) : { totalLengthM: 0 };
      const ratio = (fuel.totalLengthM + ox.totalLengthM + d * 0.22) / d;
      if (ratio > targetAspect) low = d;
      else high = d;
    }
    return clamp((low + high) / 2, 0.2, 12);
  }

  function massFromUsableVolume(config, propellant, volumeM3) {
    if (propellant.mono) return volumeM3 * propellant.fuelDensity;
    const of = config.engine.mixtureRatioOverride > 0 ? config.engine.mixtureRatioOverride : propellant.mixtureRatio;
    const specificVolume = (1 / (1 + of)) / propellant.fuelDensity + (of / (1 + of)) / propellant.oxidizerDensity;
    return volumeM3 / specificVolume;
  }

  return {
    computeTankBuckling,
    splitPropellant,
    tankGeometry,
    resolveTankDiameter,
    massFromUsableVolume
  };
});
