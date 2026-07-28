(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory;
  else root.__RocketEnergy = factory;
})(typeof globalThis !== "undefined" ? globalThis : this, function (Deps) {
  "use strict";

  const Env = Deps.Env;
  const Utils = Deps.Utils;
  const Cfg = Deps.Cfg;

  const clamp = Utils.clamp;
  const round = Utils.round;
  const celestialBody = Env.celestialBody;
  const getPropellant = Cfg.getPropellant;

  function calculateEnergyStatistics(inputConfig, design, flight) {
    const config = inputConfig || design.config;
    const propellant = design.propellant || getPropellant(config);
    const body = celestialBody(config);
    const trajectory = flight && Array.isArray(flight.points) ? flight.points : [];
    const serialStages = design.serial && design.serial.enabled
      ? [(design.serial.base.parallel && design.serial.base.parallel.enabled ? design.serial.base.parallel.core : design.serial.base)].concat(design.serial.stages)
      : null;
    const serialSpecificChemicalEnergyJkg = serialStages
      ? serialStages.map(function (stage) { return Math.max(10000, Number(stage.propellant.specificEnergyMjKg) * 1e6 || 1e6); })
      : null;
    const coreSpecificChemicalEnergyJkg = Math.max(10000, Number(propellant.specificEnergyMjKg) * 1e6 || 1e6);
    const parallelDesign = design.serial && design.serial.enabled ? design.serial.base : design;
    const boosterSpecificChemicalEnergyJkg = parallelDesign.parallel && parallelDesign.parallel.enabled
      ? Math.max(10000, Number(parallelDesign.parallel.propellant.specificEnergyMjKg) * 1e6 || 1e6)
      : coreSpecificChemicalEnergyJkg;
    const initialChemicalEnergyJ = serialStages
      ? serialStages.reduce(function (sum, stage, index) {
        return sum + stage.masses.usablePropellantKg * serialSpecificChemicalEnergyJkg[index];
      }, 0) + (parallelDesign.parallel && parallelDesign.parallel.enabled
        ? parallelDesign.parallel.booster.masses.usablePropellantKg * parallelDesign.parallel.count * boosterSpecificChemicalEnergyJkg
        : 0)
      : design.parallel && design.parallel.enabled
        ? design.parallel.core.masses.usablePropellantKg * coreSpecificChemicalEnergyJkg
          + design.parallel.booster.masses.usablePropellantKg * design.parallel.count * boosterSpecificChemicalEnergyJkg
        : design.masses.usablePropellantKg * coreSpecificChemicalEnergyJkg;
    const specificChemicalEnergyJkg = initialChemicalEnergyJ / Math.max(1, design.masses.usablePropellantKg);
    const chemicalEnergyForPoint = function (point) {
      if (serialStages && Array.isArray(point.stagePropellantRemainingKg)) {
        const stageEnergyJ = point.stagePropellantRemainingKg.reduce(function (sum, remainingKg, index) {
          return sum + Math.max(0, remainingKg) * (serialSpecificChemicalEnergyJkg[index] || coreSpecificChemicalEnergyJkg);
        }, 0);
        const boosterEnergyJ = Number.isFinite(point.boosterPropellantRemainingKg)
          ? Math.max(0, point.boosterPropellantRemainingKg) * boosterSpecificChemicalEnergyJkg
          : 0;
        return stageEnergyJ + boosterEnergyJ;
      }
      if (design.parallel && design.parallel.enabled && Number.isFinite(point.corePropellantRemainingKg) && Number.isFinite(point.boosterPropellantRemainingKg)) {
        return Math.max(0, point.corePropellantRemainingKg) * coreSpecificChemicalEnergyJkg
          + Math.max(0, point.boosterPropellantRemainingKg) * boosterSpecificChemicalEnergyJkg;
      }
      return Math.max(0, point.propellantRemainingKg) * specificChemicalEnergyJkg;
    };
    const gravitationalParameter = body.gravityMs2 * body.radiusM * body.radiusM;
    const launchRadiusM = body.radiusM + Math.max(0, config.vehicle.launchAltitudeM);
    const allPoints = trajectory.map(function (point) {
      const radiusM = body.radiusM + Math.max(0, point.altitudeM);
      const specificPotentialJkg = Math.max(0, gravitationalParameter * (1 / launchRadiusM - 1 / radiusM));
      const chemicalEnergyJ = chemicalEnergyForPoint(point);
      const potentialEnergyJ = Math.max(0, point.massKg) * specificPotentialJkg;
      const kineticEnergyJ = 0.5 * Math.max(0, point.massKg) * point.velocityMs * point.velocityMs;
      return {
        timeS: point.timeS,
        altitudeM: point.altitudeM,
        velocityMs: point.velocityMs,
        massKg: point.massKg,
        propellantRemainingKg: point.propellantRemainingKg,
        corePropellantRemainingKg: point.corePropellantRemainingKg,
        boosterPropellantRemainingKg: point.boosterPropellantRemainingKg,
        totalEnergyJ: chemicalEnergyJ + potentialEnergyJ + kineticEnergyJ,
        chemicalEnergyJ,
        potentialEnergyJ,
        kineticEnergyJ,
        specificPotentialJkg,
        specificKineticJkg: 0.5 * point.velocityMs * point.velocityMs
      };
    });
    const cutoffMode = config.test.energyCutoffMode;
    const coastPercent = config.test.energyCoastPercent;
    const burnoutTimeS = flight && flight.burnoutSnapshot ? flight.burnoutSnapshot.timeS : null;
    const coastDurationS = cutoffMode === "post-burn" && burnoutTimeS != null
      ? Math.max(0, Number(flight.burnTimeS) || 0) * coastPercent / 100
      : 0;
    const requestedCutoffTimeS = cutoffMode === "post-burn" && burnoutTimeS != null
      ? burnoutTimeS + coastDurationS
      : (allPoints.length ? allPoints[allPoints.length - 1].timeS : 0);
    let points = allPoints;
    if (cutoffMode === "post-burn" && allPoints.length && burnoutTimeS != null) {
      points = allPoints.filter(function (point) { return point.timeS <= requestedCutoffTimeS + 1e-9; });
      const before = points.length ? points[points.length - 1] : allPoints[0];
      const after = allPoints.find(function (point) { return point.timeS > requestedCutoffTimeS; });
      if (after && before.timeS < requestedCutoffTimeS - 1e-9) {
        const ratio = clamp((requestedCutoffTimeS - before.timeS) / Math.max(1e-9, after.timeS - before.timeS), 0, 1);
        const interpolated = {};
        Object.keys(before).forEach(function (key) {
          interpolated[key] = typeof before[key] === "number" && typeof after[key] === "number"
            ? before[key] + (after[key] - before[key]) * ratio
            : before[key];
        });
        interpolated.timeS = requestedCutoffTimeS;
        const interpolatedRadiusM = body.radiusM + Math.max(0, interpolated.altitudeM);
        interpolated.specificPotentialJkg = Math.max(0, gravitationalParameter * (1 / launchRadiusM - 1 / interpolatedRadiusM));
        interpolated.specificKineticJkg = 0.5 * interpolated.velocityMs * interpolated.velocityMs;
        interpolated.chemicalEnergyJ = chemicalEnergyForPoint(interpolated);
        interpolated.potentialEnergyJ = Math.max(0, interpolated.massKg) * interpolated.specificPotentialJkg;
        interpolated.kineticEnergyJ = Math.max(0, interpolated.massKg) * interpolated.specificKineticJkg;
        interpolated.totalEnergyJ = interpolated.chemicalEnergyJ + interpolated.potentialEnergyJ + interpolated.kineticEnergyJ;
        points.push(interpolated);
      }
      if (!points.length) points = [allPoints[0]];
    }
    const peakKinetic = points.reduce(function (best, point) {
      return !best || point.kineticEnergyJ > best.kineticEnergyJ ? point : best;
    }, null);
    const peakPotential = points.reduce(function (best, point) {
      return !best || point.potentialEnergyJ > best.potentialEnergyJ ? point : best;
    }, null);
    const chemicalConsumedAtPeakJ = peakKinetic ? Math.max(0, initialChemicalEnergyJ - peakKinetic.chemicalEnergyJ) : 0;
    const peakMechanicalEnergyJ = peakKinetic ? peakKinetic.kineticEnergyJ + peakKinetic.potentialEnergyJ : 0;
    return {
      status: points.length ? "complete" : "no-data",
      bodyKey: config.test.bodyKey,
      bodyName: body.name,
      specificChemicalEnergyJkg,
      initialChemicalEnergyJ,
      initialTotalEnergyJ: initialChemicalEnergyJ,
      points,
      fullPointCount: allPoints.length,
      peakKinetic,
      peakPotential,
      endPoint: points.length ? points[points.length - 1] : null,
      cutoff: {
        mode: cutoffMode,
        coastPercent,
        coastDurationS,
        burnoutTimeS,
        requestedTimeS: requestedCutoffTimeS,
        actualTimeS: points.length ? points[points.length - 1].timeS : 0,
        reached: points.length ? points[points.length - 1].timeS >= requestedCutoffTimeS - 1e-6 : false,
        label: cutoffMode === "post-burn"
          ? `燃尽后追加 ${round(coastPercent, 1)}% 燃时的滑行`
          : "积分至速度归零 / 滑行顶点"
      },
      statistics: {
        propellantSpecificEnergyMjKg: specificChemicalEnergyJkg / 1e6,
        initialEnergyPerWetMassMjKg: initialChemicalEnergyJ / Math.max(1, design.masses.wetMassKg) / 1e6,
        peakKineticSpecificEnergyMjKg: peakKinetic ? peakKinetic.specificKineticJkg / 1e6 : 0,
        peakPotentialSpecificEnergyMjKg: peakPotential ? peakPotential.specificPotentialJkg / 1e6 : 0,
        peakMechanicalSpecificEnergyMjKg: peakKinetic ? peakMechanicalEnergyJ / Math.max(1, peakKinetic.massKg) / 1e6 : 0,
        mechanicalConversionPctAtPeak: chemicalConsumedAtPeakJ > 0 ? peakMechanicalEnergyJ / chemicalConsumedAtPeakJ * 100 : 0
      },
      assumption: "化学/内能按剩余可用推进剂质量乘代表性混合物比能；势能以发射高度为零势能面并采用平方反比重力；飞行器剩余总能量为当前剩余化学能、重力势能和动能之和。已排出尾气携带的能量、发动机热损失与阻力耗散已离开当前飞行器系统，因此这条总能量曲线不要求守恒。"
    };
  }

  return { calculateEnergyStatistics };
});
