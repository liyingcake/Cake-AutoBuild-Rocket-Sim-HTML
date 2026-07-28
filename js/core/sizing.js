(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory;
  else root.__RocketSizing = factory;
})(typeof globalThis !== "undefined" ? globalThis : this, function (Deps) {
  "use strict";

  const Data = Deps.Data;
  const { clamp, round, deepClone, makeIssue } = Deps.Utils;
  const Env = Deps.Env;
  const { getPropellant } = Deps.Cfg;
  const { normalizeConfig, computeSubsystems, effectiveIsp, G0, massFromUsableVolume } = Deps;

  // ---------------------------------------------------------------------------
  // targetThrustForWetMass — pure
  // ---------------------------------------------------------------------------

  function targetThrustForWetMass(config, wetMassKg, launchGravityMs2) {
    if (config.vehicle.liftoffTargetMode === "acceleration") {
      return wetMassKg * (launchGravityMs2 + config.vehicle.targetLiftoffAccelMs2);
    }
    return wetMassKg * launchGravityMs2 * config.vehicle.targetTwr;
  }

  // ---------------------------------------------------------------------------
  // estimateAtPropellantMass — mass iteration
  //   celestialBody  → Deps.Env.celestialBody
  //   targetThrustForWetMass  → local
  //   computeSubsystems  → Deps.computeSubsystems
  //   deepClone  → Deps.Utils.deepClone
  // ---------------------------------------------------------------------------

  function estimateAtPropellantMass(config, propellant, usablePropellantKg, fixedThrustN) {
    const body = Deps.Env.celestialBody(config);
    const launchGravity = body.gravityMs2 * Math.pow(body.radiusM / (body.radiusM + config.vehicle.launchAltitudeM), 2);
    let wetMassGuess = usablePropellantKg * 1.22 + config.vehicle.payloadKg + 250;
    let thrustN = fixedThrustN || targetThrustForWetMass(config, wetMassGuess, launchGravity);
    let result = null;
    for (let i = 0; i < 12; i += 1) {
      result = computeSubsystems(config, propellant, usablePropellantKg, thrustN, wetMassGuess);
      wetMassGuess = 0.55 * wetMassGuess + 0.45 * result.masses.wetMassKg;
      if (!fixedThrustN) thrustN = targetThrustForWetMass(config, result.masses.wetMassKg, launchGravity);
    }
    result = computeSubsystems(config, propellant, usablePropellantKg, thrustN, result.masses.wetMassKg);
    if (!fixedThrustN) {
      thrustN = targetThrustForWetMass(config, result.masses.wetMassKg, launchGravity);
      result = computeSubsystems(config, propellant, usablePropellantKg, thrustN, result.masses.wetMassKg);
    }
    result.config = deepClone(config);
    return result;
  }

  // ---------------------------------------------------------------------------
  // solveSizing — sizing solver
  //   normalizeConfig  → Deps.normalizeConfig
  //   buildSerialStageStack  → Deps.buildSerialStageStack
  //   deepClone  → Deps.Utils.deepClone
  //   getPropellant  → Deps.Cfg.getPropellant
  //   Data  → Deps.Data
  //   estimateAtPropellantMass  → local
  //   attachParallelBoosters  → Deps.attachParallelBoosters
  //   environmentState  → Deps.Env.environmentState
  //   effectiveIsp  → Deps.effectiveIsp
  //   clamp  → Deps.Utils.clamp
  //   round  → Deps.Utils.round
  //   makeIssue  → Deps.Utils.makeIssue
  //   celestialBody  → Deps.Env.celestialBody
  //   G0  → Deps.G0
  //   massFromUsableVolume  → Deps.massFromUsableVolume
  //   attachSerialStages  → Deps.attachSerialStages
  // ---------------------------------------------------------------------------

  function solveSizing(input) {
    const config = normalizeConfig(input);
    const serialStack = Deps.buildSerialStageStack(config);
    const coreConfig = deepClone(config);
    coreConfig.stages = [];
    coreConfig.vehicle.payloadKg = serialStack.stackWetMassKg;
    const propellant = getPropellant(coreConfig);
    const cycle = Data.cycles[coreConfig.engine.cycleKey] || Data.cycles["gas-generator"];
    let usablePropellantKg;
    let fixedThrustN = null;
    let result;
    const solverIssues = [];
    const estimateMission = function (usableMassKg, imposedThrustN) {
      const coreEstimate = estimateAtPropellantMass(coreConfig, propellant, usableMassKg, imposedThrustN);
      return Deps.attachParallelBoosters(coreConfig, coreEstimate);
    };

    if (config.sizingMode === "thrust-time") {
      fixedThrustN = Math.max(100, config.sizing.targetThrustKn * 1000);
      const ambient = Deps.Env.environmentState(coreConfig, coreConfig.vehicle.launchAltitudeM).pressurePa;
      const isp = effectiveIsp(propellant, cycle, ambient);
      usablePropellantKg = fixedThrustN / (isp * G0) * Math.max(0.5, config.sizing.burnTimeS);
      result = estimateMission(usablePropellantKg, fixedThrustN);
    } else if (config.sizingMode === "delta-v") {
      const target = clamp(Number(config.sizing.targetDeltaV), 50, 15000);
      let low = 1;
      let high = Math.max(100, coreConfig.vehicle.payloadKg * 2);
      let highResult = estimateMission(high, null);
      const sizingDeltaV = function (candidate) {
        return coreConfig.boosters.enabled && !coreConfig.boosters.includeInDeltaVSizing
          ? candidate.performance.coreOnlyIdealDeltaV
          : candidate.performance.idealDeltaV;
      };
      while (sizingDeltaV(highResult) < target && high < 2e7) {
        high *= 2;
        highResult = estimateMission(high, null);
      }
      if (sizingDeltaV(highResult) < target) {
        solverIssues.push(makeIssue("error", "Δv 反算", `在搜索上限内无法达到 ${round(target, 0)} m/s。`, "降低目标 Δv、载荷或结构系数，或选择更高比冲推进剂。"));
        usablePropellantKg = high;
        result = highResult;
      } else {
        for (let i = 0; i < 52; i += 1) {
          const mid = (low + high) / 2;
          const midResult = estimateMission(mid, null);
          if (sizingDeltaV(midResult) < target) low = mid;
          else high = mid;
        }
        usablePropellantKg = (low + high) / 2;
        result = estimateMission(usablePropellantKg, null);
      }
    } else {
      usablePropellantKg = coreConfig.sizing.massInputKind === "volume"
        ? massFromUsableVolume(coreConfig, propellant, Math.max(0.01, coreConfig.sizing.propellantVolumeM3))
        : Math.max(1, Number(coreConfig.sizing.propellantMassKg));
      result = estimateMission(usablePropellantKg, null);
    }

    result = Deps.attachSerialStages(config, result, serialStack);
    result.config = config;
    result.schemaVersion = Data.schemaVersion;
    result.sizing = {
      mode: config.sizingMode,
      liftoffTargetMode: config.vehicle.liftoffTargetMode,
      solvedUsablePropellantKg: usablePropellantKg,
      targetDeltaV: config.sizing.targetDeltaV,
      targetThrustN: fixedThrustN,
      converged: solverIssues.length === 0,
      serialStageCount: serialStack.enabled.length
    };
    result.issues = solverIssues.concat(result.issues);
    return result;
  }

  // ---------------------------------------------------------------------------
  // liftoffState
  //   normalizeConfig  → Deps.normalizeConfig
  //   environmentState  → Deps.Env.environmentState
  // ---------------------------------------------------------------------------

  function liftoffState(inputConfig, design) {
    const config = normalizeConfig(inputConfig || (design && design.config));
    const launchVehicle = design && design.serial && design.serial.enabled ? design.serial.base : design;
    if (!launchVehicle || !launchVehicle.masses || !launchVehicle.performance) {
      return { thrustN: 0, massKg: 0, gravityMs2: 0, twr: 0, netAccelMs2: 0, parallel: false };
    }
    const environment = Deps.Env.environmentState(config, config.vehicle.launchAltitudeM);
    const localGravityMs2 = environment.body.gravityMs2 * Math.pow(
      environment.body.radiusM / (environment.body.radiusM + Math.max(0, config.vehicle.launchAltitudeM)),
      2
    );
    const parallel = launchVehicle.parallel && launchVehicle.parallel.enabled ? launchVehicle.parallel : null;
    const thrustN = parallel
      ? parallel.core.performance.totalThrustN + parallel.booster.performance.totalThrustN * parallel.count
      : launchVehicle.performance.totalThrustN;
    const massKg = launchVehicle.masses.wetMassKg;
    const twr = thrustN / Math.max(1, massKg * localGravityMs2);
    return {
      thrustN,
      massKg,
      gravityMs2: localGravityMs2,
      twr,
      netAccelMs2: thrustN / Math.max(1, massKg) - localGravityMs2,
      parallel: Boolean(parallel),
      coreThrustN: parallel ? parallel.core.performance.totalThrustN : thrustN,
      boosterThrustN: parallel ? parallel.booster.performance.totalThrustN * parallel.count : 0
    };
  }

  return { targetThrustForWetMass, estimateAtPropellantMass, solveSizing, liftoffState };
});
