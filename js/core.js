(function (root, factory) {
  const data = typeof module === "object" && module.exports
    ? require("./data.js")
    : root.RocketSimData;
  const utils = typeof module === "object" && module.exports
    ? require("./core/utils.js")
    : root.__CoreUtils;
  const Env = typeof module === "object" && module.exports
    ? require("./core/environment.js")
    : root.__RocketEnv;
  const Flow = typeof module === "object" && module.exports
    ? require("./core/engine-flow.js")
    : root.__RocketFlow;
  const Mat = typeof module === "object" && module.exports
    ? require("./core/materials.js")
    : root.__RocketMat;
  const TankGeom = typeof module === "object" && module.exports
    ? require("./core/tank-geometry.js")
    : root.__RocketTankGeom;
  const Eng = typeof module === "object" && module.exports
    ? require("./core/engine-design.js")
    : root.__RocketEng;
  const Cfg = typeof module === "object" && module.exports
    ? require("./core/config.js")
    : root.__RocketCfg;
  const api = factory(data, utils, Env, Flow, Mat, TankGeom, Eng, Cfg, root);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.RocketSimCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (Data, Utils, Env, Flow, Mat, TankGeom, Eng, Cfg, root) {
  "use strict";

  const G0 = Utils.G0;
  const clamp = Utils.clamp;
  const round = Utils.round;
  const deepClone = Utils.deepClone;
  const deepMerge = Utils.deepMerge;
  const makeIssue = Utils.makeIssue;
  const processFamily = Utils.processFamily;

  const atmosphere = Env.atmosphere;
  const celestialBody = Env.celestialBody;
  const atmosphereForBody = Env.atmosphereForBody;
  const environmentState = Env.environmentState;

  const areaRatioFromMach = Flow.areaRatioFromMach;
  const exitMachForAreaRatio = Flow.exitMachForAreaRatio;
  const nozzleCoefficient = Flow.nozzleCoefficient;
  const effectiveIsp = Flow.effectiveIsp;

  const materialTemperatureFactor = Mat.materialTemperatureFactor;
  const materialModulusPa = Mat.materialModulusPa;
  const materialThermalExpansionPpmK = Mat.materialThermalExpansionPpmK;
  const validateMaterialProcess = Mat.validateMaterialProcess;
  const compatibleTankProcess = Mat.compatibleTankProcess;
  const validateCompatibility = Mat.validateCompatibility;
  const contactPropellantProfile = Mat.contactPropellantProfile;

  const computeTankBuckling = TankGeom.computeTankBuckling;
  const splitPropellant = TankGeom.splitPropellant;
  const tankGeometry = TankGeom.tankGeometry;
  const resolveTankDiameter = TankGeom.resolveTankDiameter;
  const massFromUsableVolume = TankGeom.massFromUsableVolume;

  const computePumpSide = Eng.computePumpSide;
  const computeNozzleAndChamber = Eng.computeNozzleAndChamber;
  const computeClusterLayout = Eng.computeClusterLayout;

  const getPropellant = Cfg.getPropellant;
  const getBattery = Cfg.getBattery;

  // ===== Load Pattern B module factories (dependency injection) =====
  var __RocketBoosters = typeof module === "object" && module.exports
    ? require("./core/boosters.js")
    : root.__RocketBoosters;
  var __RocketSizing = typeof module === "object" && module.exports
    ? require("./core/sizing.js")
    : root.__RocketSizing;
  var __RocketSerials = typeof module === "object" && module.exports
    ? require("./core/serial-stages.js")
    : root.__RocketSerials;
  var __RocketFlight = typeof module === "object" && module.exports
    ? require("./core/flight-core.js")
    : root.__RocketFlight;
  var __RocketFlightParallel = typeof module === "object" && module.exports
    ? require("./core/flight-parallel.js")
    : root.__RocketFlightParallel;
  var __RocketFlightSerial = typeof module === "object" && module.exports
    ? require("./core/flight-serial.js")
    : root.__RocketFlightSerial;
  var __RocketStaticFire = typeof module === "object" && module.exports
    ? require("./core/static-fire.js")
    : root.__RocketStaticFire;
  var __RocketEnergy = typeof module === "object" && module.exports
    ? require("./core/energy.js")
    : root.__RocketEnergy;

  // Deps object provides core.js internals + Pattern A modules to Pattern B factories
  var Deps = {
    Data: Data,
    Utils: Utils,
    Env: Env,
    Cfg: Cfg,
    G0: G0,
    effectiveIsp: effectiveIsp,
    massFromUsableVolume: massFromUsableVolume,
    normalizeConfig: normalizeConfig,
    computeSubsystems: computeSubsystems
  };

  // Phase 1: boosters (has local getPropellant, no cross-module deps needed at load time)
  var __boosters = __RocketBoosters(Deps);
  Deps.aggregateCostBreakdown = __boosters.aggregateCostBreakdown;
  Deps.attachParallelBoosters = __boosters.attachParallelBoosters;

  // Phase 2: sizing + serial (circular deps resolved via dynamic Deps access)
  var __sizing = __RocketSizing(Deps);
  var __serial = __RocketSerials(Deps);
  Deps.estimateAtPropellantMass = __sizing.estimateAtPropellantMass;
  Deps.liftoffState = __sizing.liftoffState;
  Deps.buildSerialStageStack = __serial.buildSerialStageStack;
  Deps.attachSerialStages = __serial.attachSerialStages;

  // Phase 3: flight modules (need cross-module refs from earlier phases)
  var __flightParallel = __RocketFlightParallel(Deps);
  Deps.runParallelVerticalFlight = __flightParallel.runParallelVerticalFlight;

  var __flight = __RocketFlight(Deps);
  Deps.runVerticalFlight = __flight.runVerticalFlight;

  var __flightSerial = __RocketFlightSerial(Deps);

  // Phase 4: remaining modules (no cross-module deps)
  var __staticFire = __RocketStaticFire(Deps);
  var __energy = __RocketEnergy(Deps);

  // Create aliases so existing code (and the return statement) continues to work
  var aggregateCostBreakdown = __boosters.aggregateCostBreakdown;
  var attachParallelBoosters = __boosters.attachParallelBoosters;
  var estimateAtPropellantMass = __sizing.estimateAtPropellantMass;
  var solveSizing = __sizing.solveSizing;
  var liftoffState = __sizing.liftoffState;
  var serialStagePropellant = __serial.serialStagePropellant;
  var separationSystemForStage = __serial.separationSystemForStage;
  var configForSerialStage = __serial.configForSerialStage;
  var estimateSerialStage = __serial.estimateSerialStage;
  var buildSerialStageStack = __serial.buildSerialStageStack;
  var attachSerialStages = __serial.attachSerialStages;
  var runVerticalFlight = __flight.runVerticalFlight;
  var runSerialVerticalFlight = __flightSerial.runSerialVerticalFlight;
  var runStaticFire = __staticFire.runStaticFire;
  var calculateEnergyStatistics = __energy.calculateEnergyStatistics;

  function normalizeSerialStage(stageInput, index) {
    const stageNumber = index + 2;
    const fallback = Data.createDefaultSerialStage ? Data.createDefaultSerialStage(stageNumber) : deepClone(Data.defaultConfig.stages[Math.min(index, Data.defaultConfig.stages.length - 1)]);
    const stage = deepMerge(fallback, stageInput || {});
    stage.id = `stage-${stageNumber}`;
    stage.name = String(stage.name || `第${stageNumber}级`).slice(0, 30);
    stage.enabled = stage.enabled !== false;
    if (!["mass", "delta-v", "thrust-time"].includes(stage.sizingMode)) stage.sizingMode = "mass";
    stage.propellantMassKg = clamp(Number(stage.propellantMassKg), 1, 10000000);
    stage.targetDeltaV = clamp(Number(stage.targetDeltaV), 50, 15000);
    stage.targetThrustKn = clamp(Number(stage.targetThrustKn), 0.1, 100000);
    stage.burnTimeS = clamp(Number(stage.burnTimeS), 0.5, 7200);
    stage.structuralFactor = clamp(Number(stage.structuralFactor), 0.01, 0.4);
    stage.avionicsKg = clamp(Number(stage.avionicsKg), 0, 100000);
    if (stage.propellantKey !== "custom" && !Data.propellants[stage.propellantKey]) stage.propellantKey = fallback.propellantKey;
    stage.customPropellant = deepMerge(Data.defaultConfig.customPropellant, stage.customPropellant || {});

    stage.tanks = deepMerge(fallback.tanks, stage.tanks || {});
    stage.tanks.pressureMpa = clamp(Number(stage.tanks.pressureMpa), 0.02, 50);
    stage.tanks.ullagePct = clamp(Number(stage.tanks.ullagePct), 0.5, 25);
    stage.tanks.residualPct = clamp(Number(stage.tanks.residualPct), 0, 20);
    if (!["single", "dual", "load-sharing", "copv", "stiffened", "sandwich", "balloon"].includes(stage.tanks.structureMode)) stage.tanks.structureMode = "single";
    if (!["separate", "common-bulkhead"].includes(stage.tanks.geometryMode)) stage.tanks.geometryMode = "separate";
    if (!["auto", "locked"].includes(stage.tanks.diameterMode)) stage.tanks.diameterMode = "locked";
    stage.tanks.diameterM = clamp(Number(stage.tanks.diameterM), 0.2, 20);
    stage.tanks.targetAspect = clamp(Number(stage.tanks.targetAspect), 2, 14);
    stage.tanks.insulationKgM2 = clamp(Number(stage.tanks.insulationKgM2), 0, 20);
    if (!["helium", "autogenous"].includes(stage.tanks.pressurization)) stage.tanks.pressurization = "helium";
    ["materialKey", "fuelLinerMaterialKey", "oxidizerLinerMaterialKey", "structuralMaterialKey"].forEach(function (key) {
      if (!Data.materials[stage.tanks[key]]) stage.tanks[key] = fallback.tanks[key];
    });
    if (!Data.processes[stage.tanks.processKey]) stage.tanks.processKey = fallback.tanks.processKey;
    const stagePropellant = stage.propellantKey === "custom" ? stage.customPropellant : Data.propellants[stage.propellantKey];
    if (stagePropellant && stagePropellant.mono) stage.tanks.geometryMode = "separate";

    stage.engine = deepMerge(fallback.engine, stage.engine || {});
    if (!Data.cycles[stage.engine.cycleKey]) stage.engine.cycleKey = fallback.engine.cycleKey;
    if (!Data.cooling[stage.engine.coolingKey]) stage.engine.coolingKey = fallback.engine.coolingKey;
    if (!["independent", "shared-powerpack", "ideal-multi-chamber"].includes(stage.engine.clusterArchitecture)) stage.engine.clusterArchitecture = "independent";
    stage.engine.engineCount = Math.round(clamp(Number(stage.engine.engineCount), 1, 40));
    stage.engine.chamberPressureMpa = clamp(Number(stage.engine.chamberPressureMpa), 0.1, 40);
    stage.engine.expansionRatio = clamp(Number(stage.engine.expansionRatio), 3, 220);
    stage.engine.autoExpansion = stage.engine.autoExpansion === true;
    stage.engine.throttlePct = clamp(Number(stage.engine.throttlePct), 30, 110);
    stage.engine.pumpEfficiencyPct = clamp(Number(stage.engine.pumpEfficiencyPct), 35, 90);
    stage.engine.lineDropPct = clamp(Number(stage.engine.lineDropPct), 1, 30);
    stage.engine.injectorDropPct = clamp(Number(stage.engine.injectorDropPct), 5, 45);
    stage.engine.mixtureRatioOverride = clamp(Number(stage.engine.mixtureRatioOverride), 0, 30);
    ["pumpMaterialKey", "chamberMaterialKey", "nozzleMaterialKey"].forEach(function (key) {
      if (!Data.materials[stage.engine[key]]) stage.engine[key] = fallback.engine[key];
    });
    if (!Data.processes[stage.engine.pumpProcessKey]) stage.engine.pumpProcessKey = fallback.engine.pumpProcessKey;
    if (!Data.processes[stage.engine.hotProcessKey]) stage.engine.hotProcessKey = fallback.engine.hotProcessKey;

    stage.airframe = deepMerge(fallback.airframe, stage.airframe || {});
    if (!Data.materials[stage.airframe.materialKey]) stage.airframe.materialKey = fallback.airframe.materialKey;
    if (!Data.processes[stage.airframe.processKey]) stage.airframe.processKey = fallback.airframe.processKey;
    stage.separation = deepMerge(fallback.separation, stage.separation || {});
    if (!Data.stageSeparationModes[stage.separation.mode]) stage.separation.mode = "cold";
    stage.separation.ignitionDelayS = clamp(Number(stage.separation.ignitionDelayS), 0, 30);
    stage.separation.reliabilityPct = clamp(Number(stage.separation.reliabilityPct), 80, 99.999);
    return stage;
  }

  function normalizeConfig(input) {
    const hasExplicitStages = Boolean(input && typeof input === "object" && Object.prototype.hasOwnProperty.call(input, "stages"));
    const config = deepMerge(Data.defaultConfig, input || {});
    const selectedPropellant = config.propellantKey === "custom" ? config.customPropellant : (Data.propellants[config.propellantKey] || Data.propellants[Data.defaultConfig.propellantKey]);
    const inputCost = input && input.cost && typeof input.cost === "object" ? input.cost : {};
    config.schemaVersion = Data.schemaVersion;
    config.autoName = config.autoName === true;
    config.engine.engineCount = Math.round(clamp(Number(config.engine.engineCount), 1, 9));
    config.engine.chamberPressureMpa = clamp(Number(config.engine.chamberPressureMpa), 0.1, 40);
    config.engine.expansionRatio = clamp(Number(config.engine.expansionRatio), 3, 220);
    config.engine.autoExpansion = config.engine.autoExpansion === true;
    config.engine.pumpEfficiencyPct = clamp(Number(config.engine.pumpEfficiencyPct), 35, 90);
    config.engine.lineDropPct = clamp(Number(config.engine.lineDropPct), 1, 30);
    config.engine.injectorDropPct = clamp(Number(config.engine.injectorDropPct), 5, 45);
    config.engine.mixtureRatioOverride = clamp(Number(config.engine.mixtureRatioOverride), 0, 30);
    if (!["independent", "shared-powerpack", "ideal-multi-chamber"].includes(config.engine.clusterArchitecture)) config.engine.clusterArchitecture = "independent";
    config.engine.perEngineFixedMassKg = clamp(Number(config.engine.perEngineFixedMassKg), 0, 2000);
    config.engine.perEngineFixedCostCny = clamp(Number(config.engine.perEngineFixedCostCny), 0, 100000000);
    config.engine.nozzleClearancePct = clamp(Number(config.engine.nozzleClearancePct), 2, 60);
    config.engine.singleUnitReliabilityPct = clamp(Number(config.engine.singleUnitReliabilityPct), 80, 99.999);
    config.engine.sharedPowerpackReliabilityPct = clamp(Number(config.engine.sharedPowerpackReliabilityPct), 80, 99.999);
    config.engine.allowOneEngineOut = config.engine.allowOneEngineOut !== false;
    config.engine.throttlePct = clamp(Number(config.engine.throttlePct), 30, 110);
    if (config.vehicle.liftoffTargetMode !== "acceleration") config.vehicle.liftoffTargetMode = "twr";
    config.vehicle.targetTwr = clamp(Number(config.vehicle.targetTwr), 0.2, 6);
    config.vehicle.targetLiftoffAccelMs2 = clamp(Number(config.vehicle.targetLiftoffAccelMs2), 0, 50);
    config.vehicle.countdownSeconds = Math.round(clamp(Number(config.vehicle.countdownSeconds), 10, 13));
    config.vehicle.engineStartupS = clamp(Number(config.vehicle.engineStartupS), 0.5, 10);
    config.vehicle.countdownEnabled = config.vehicle.countdownEnabled !== false;
    config.vehicle.immersiveLaunch = config.vehicle.immersiveLaunch !== false;
    config.vehicle.pauseAfterBurnout = config.vehicle.pauseAfterBurnout === true;
    config.vehicle.includePayloadInDryBreakdown = config.vehicle.includePayloadInDryBreakdown === true;
    if (config.vehicle.launchMode !== "field") config.vehicle.launchMode = "pad";
    config.boosters.enabled = config.boosters.enabled === true;
    config.boosters.count = Math.round(clamp(Number(config.boosters.count), 1, 8));
    if (!["core-ratio", "fixed"].includes(config.boosters.sizingMode)) config.boosters.sizingMode = "core-ratio";
    config.boosters.propellantMassRatioPct = clamp(Number(config.boosters.propellantMassRatioPct), 1, 300);
    config.boosters.propellantMassKg = clamp(Number(config.boosters.propellantMassKg), 1, 5000000);
    if (!["copy-core", "custom"].includes(config.boosters.propellantMode)) config.boosters.propellantMode = "copy-core";
    if (!Data.propellants[config.boosters.propellantKey]) config.boosters.propellantKey = "lox-rp1";
    if (!["copy-core", "custom"].includes(config.boosters.diameterMode)) config.boosters.diameterMode = "copy-core";
    config.boosters.diameterM = clamp(Number(config.boosters.diameterM), 0.2, 20);
    if (!["copy-core", "custom"].includes(config.boosters.engineMode)) config.boosters.engineMode = "copy-core";
    if (!Data.cycles[config.boosters.cycleKey]) config.boosters.cycleKey = "gas-generator";
    config.boosters.engineCount = Math.round(clamp(Number(config.boosters.engineCount), 1, 9));
    config.boosters.targetThrustKn = clamp(Number(config.boosters.targetThrustKn), 0.1, 100000);
    config.boosters.chamberPressureMpa = clamp(Number(config.boosters.chamberPressureMpa), 0.1, 40);
    config.boosters.expansionRatio = clamp(Number(config.boosters.expansionRatio), 3, 220);
    config.boosters.attachmentMassPct = clamp(Number(config.boosters.attachmentMassPct), 0.2, 20);
    config.boosters.separationDelayS = clamp(Number(config.boosters.separationDelayS), 0, 20);
    config.boosters.separationReliabilityPct = clamp(Number(config.boosters.separationReliabilityPct), 80, 99.999);
    config.boosters.dragFactor = clamp(Number(config.boosters.dragFactor), 1, 2.5);
    config.boosters.includeInDeltaVSizing = config.boosters.includeInDeltaVSizing !== false;
    config.stages = (hasExplicitStages && Array.isArray(config.stages) ? config.stages : [])
      .slice(0, 7)
      .map(normalizeSerialStage);
    config.tanks.ullagePct = clamp(Number(config.tanks.ullagePct), 0.5, 25);
    config.tanks.residualPct = clamp(Number(config.tanks.residualPct), 0, 20);
    if (!["single", "dual", "load-sharing", "copv", "stiffened", "sandwich", "balloon"].includes(config.tanks.structureMode)) config.tanks.structureMode = "single";
    if (!["separate", "common-bulkhead"].includes(config.tanks.geometryMode)) config.tanks.geometryMode = "separate";
    if (selectedPropellant && selectedPropellant.mono && config.tanks.geometryMode === "common-bulkhead") config.tanks.geometryMode = "separate";
    if (!["single-sheet", "vacuum", "honeycomb"].includes(config.tanks.commonBulkheadType)) config.tanks.commonBulkheadType = "honeycomb";
    if (!["self-supporting", "pressure-stabilized"].includes(config.tanks.commonBulkheadPressureMode)) config.tanks.commonBulkheadPressureMode = "self-supporting";
    config.tanks.commonBulkheadControlledDeltaKpa = clamp(Number(config.tanks.commonBulkheadControlledDeltaKpa), 5, 2000);
    config.tanks.commonBulkheadProofFactor = clamp(Number(config.tanks.commonBulkheadProofFactor), 1, 2);
    config.tanks.commonBulkheadHeightRatio = clamp(Number(config.tanks.commonBulkheadHeightRatio), 0.18, 0.85);
    config.tanks.commonBulkheadCoreThicknessMm = clamp(Number(config.tanks.commonBulkheadCoreThicknessMm), 5, 250);
    if (!Data.materials[config.tanks.commonBulkheadFuelMaterialKey]) config.tanks.commonBulkheadFuelMaterialKey = "al-2219";
    if (!Data.materials[config.tanks.commonBulkheadOxidizerMaterialKey]) config.tanks.commonBulkheadOxidizerMaterialKey = "al-2219";
    if (!["bonded", "slip", "prestressed"].includes(config.tanks.interfaceMode)) config.tanks.interfaceMode = "bonded";
    config.tanks.interfaceEfficiencyPct = clamp(Number(config.tanks.interfaceEfficiencyPct), 5, 100);
    config.tanks.interfaceShearStrengthMpa = clamp(Number(config.tanks.interfaceShearStrengthMpa), 0.5, 250);
    config.tanks.linerPrestressMpa = clamp(Number(config.tanks.linerPrestressMpa), 0, 500);
    config.tanks.bucklingKnockdownPct = clamp(Number(config.tanks.bucklingKnockdownPct), 10, 100);
    config.tanks.ovalityPct = clamp(Number(config.tanks.ovalityPct), 0, 5);
    config.tanks.designCycles = Math.round(clamp(Number(config.tanks.designCycles), 1, 10000));
    config.tanks.balloonMinGaugeMm = clamp(Number(config.tanks.balloonMinGaugeMm), 0.05, 2);
    config.tanks.balloonGroundSupport = config.tanks.balloonGroundSupport !== false;
    if (!Data.materials[config.tanks.materialKey]) config.tanks.materialKey = "al-2219";
    if (!Data.materials[config.tanks.fuelLinerMaterialKey]) config.tanks.fuelLinerMaterialKey = "ss-304l";
    if (!Data.materials[config.tanks.oxidizerLinerMaterialKey]) config.tanks.oxidizerLinerMaterialKey = "ss-304l";
    if (!Data.materials[config.tanks.structuralMaterialKey]) config.tanks.structuralMaterialKey = "al-2219";
    if (!Data.batteries[config.engine.batteryKey]) config.engine.batteryKey = "secondary-li-ion";
    config.engine.batteryReservePct = clamp(Number(config.engine.batteryReservePct), 0, 100);
    config.engine.batteryEfficiencyPct = clamp(Number(config.engine.batteryEfficiencyPct), 50, 99);
    config.engine.customBatteryEnergyDensityWhKg = clamp(Number(config.engine.customBatteryEnergyDensityWhKg), 20, 2000);
    config.engine.customBatteryPowerDensityWKg = clamp(Number(config.engine.customBatteryPowerDensityWKg), 50, 20000);
    config.engine.customBatteryPackOverheadPct = clamp(Number(config.engine.customBatteryPackOverheadPct), 0, 100);
    config.engine.customBatteryCostCnyKg = clamp(Number(config.engine.customBatteryCostCnyKg), 0, 100000);
    config.customPropellant.specificEnergyMjKg = clamp(Number(config.customPropellant.specificEnergyMjKg), 0.01, 500);
    if (!Data.celestialBodies[config.test.bodyKey]) config.test.bodyKey = "earth";
    if (config.test.environment !== "vacuum") config.test.environment = "sea";
    config.test.previewAtmosphere = config.test.previewAtmosphere === true;
    if (config.test.energyCutoffMode !== "post-burn") config.test.energyCutoffMode = "apogee";
    config.test.energyCoastPercent = clamp(Number(config.test.energyCoastPercent), 0, 200);
    config.cost.fuelPriceCnyKg = clamp(
      Object.prototype.hasOwnProperty.call(inputCost, "fuelPriceCnyKg") ? Number(inputCost.fuelPriceCnyKg) : Number(selectedPropellant.fuelPriceCnyKg),
      0,
      100000
    );
    config.cost.oxidizerPriceCnyKg = clamp(
      Object.prototype.hasOwnProperty.call(inputCost, "oxidizerPriceCnyKg") ? Number(inputCost.oxidizerPriceCnyKg) : Number(selectedPropellant.oxidizerPriceCnyKg),
      0,
      100000
    );
    return config;
  }

  // getPropellant, getBattery moved to config.js



  // material* functions moved to materials.js

  // computeTankBuckling, splitPropellant moved to tank-geometry.js

  // splitPropellant, tankGeometry, resolveTankDiameter moved to tank-geometry.js

  function computeTank(options) {
    const { label, loadedMassKg, density, temperatureK, pressurePa, diameterM, material, process, propellant, config, estimatedWetMassKg, axialShare } = options;
    const issues = [];
    const structureMode = options.structureMode || config.tanks.structureMode || "single";
    const fluidVolumeM3 = loadedMassKg / Math.max(1, density);
    const totalVolumeM3 = fluidVolumeM3 / (1 - config.tanks.ullagePct / 100);
    const geometry = tankGeometry(totalVolumeM3, diameterM);
    const tempFactor = materialTemperatureFactor(material, temperatureK);
    const allowablePa = material.yield * 1e6 * tempFactor * 0.80 * process.strengthFactor;
    const weldEfficiency = process.weldEfficiency;
    const effectiveAllowable = Math.max(1e5, allowablePa * weldEfficiency);
    const pressureThickness = pressurePa * geometry.radiusM / effectiveAllowable;
    const longitudinalThickness = pressurePa * geometry.radiusM / (2 * effectiveAllowable);
    const designAccel = Math.max(2, config.vehicle.maxAccelG) * G0;
    const axialForce = estimatedWetMassKg * designAccel * axialShare;
    const axialThickness = axialForce / Math.max(1, 2 * Math.PI * geometry.radiusM * effectiveAllowable);
    const minGaugeM = structureMode === "balloon" ? Math.min(material.minGauge, config.tanks.balloonMinGaugeMm) / 1000 : material.minGauge / 1000;
    const cylinderThicknessM = Math.max(minGaugeM, pressureThickness, longitudinalThickness, axialThickness);
    const domeThicknessM = Math.max(minGaugeM, pressurePa * geometry.radiusM / (2 * effectiveAllowable));
    let shellMassKg = material.density * (geometry.cylinderAreaM2 * cylinderThicknessM + geometry.domeAreaM2 * domeThicknessM);
    const linerFactor = material.tags.indexOf("liner-required") >= 0 ? 1.16 : 1;
    shellMassKg *= 1.12 * linerFactor;
    let reinforcementMassKg = 0;
    let stiffeningFactor = 1;
    if (structureMode === "stiffened") {
      reinforcementMassKg = shellMassKg * 0.16;
      stiffeningFactor = 2.25;
    } else if (structureMode === "sandwich") {
      reinforcementMassKg = geometry.surfaceAreaM2 * 1.8;
      shellMassKg *= 0.88;
      stiffeningFactor = 3.0;
    } else if (structureMode === "balloon") {
      shellMassKg *= 1.04;
      stiffeningFactor = 0.72;
    }
    const cryogenic = temperatureK < 170;
    const insulationMassKg = cryogenic ? geometry.surfaceAreaM2 * config.tanks.insulationKgM2 : geometry.surfaceAreaM2 * 0.12;
    const totalMassKg = shellMassKg + reinforcementMassKg + insulationMassKg;
    const utilization = Math.max(pressureThickness, longitudinalThickness, axialThickness) / Math.max(cylinderThicknessM, 1e-9) * 0.8;
    const buckling = computeTankBuckling({ geometry, thicknessM: cylinderThicknessM, material, temperatureK, pressurePa, axialForceN: axialForce, config, stiffeningFactor });
    const minimumStabilityPressurePa = structureMode === "balloon"
      ? axialForce / Math.max(1, Math.PI * geometry.radiusM * geometry.radiusM) * (1.25 + config.tanks.ovalityPct / 5)
      : 0;
    const groundSupportMassKg = structureMode === "balloon" && config.tanks.balloonGroundSupport ? Math.max(25, geometry.surfaceAreaM2 * 0.65) : 0;
    const nominalCycleLimit = structureMode === "balloon" ? 120 : material.tags.indexOf("composite") >= 0 ? 1800 : 6000;
    const fatigueUtilization = Math.sqrt(config.tanks.designCycles / nominalCycleLimit) * Math.max(0.15, utilization);

    validateMaterialProcess(material, process, `${label}储箱`, issues);
    validateCompatibility(material, propellant, temperatureK, `${label}储箱`, issues);
    if (geometry.shallowDome) {
      issues.push(makeIssue("warning", `${label}储箱`, "锁定直径使封头过于扁平，当前仅保持体积守恒。", "减小直径或改用自动直径。"));
    }
    if (cylinderThicknessM / geometry.radiusM > 0.10) {
      issues.push(makeIssue("error", `${label}储箱`, "壁厚/半径超过 0.10，薄壁压力容器公式不再适用。", "降低压力、增大材料强度或改用厚壁分析。"));
    }
    if (tempFactor === 0) {
      issues.push(makeIssue("error", `${label}储箱`, "材料温区不覆盖当前推进剂温度，壁厚结果无效。", "更换低温/高温相容材料。"));
    }
    if (buckling.utilization > 1) {
      issues.push(makeIssue("error", `${label}储箱屈曲`, `折减后轴向屈曲利用率 ${round(buckling.utilization * 100, 0)}%，高于允许值。`, "增加壁厚/加筋、提高内压稳定作用、降低轴向载荷或改善几何缺陷控制。"));
    } else if (buckling.utilization > 0.8) {
      issues.push(makeIssue("warning", `${label}储箱屈曲`, `折减后轴向屈曲利用率 ${round(buckling.utilization * 100, 0)}%。`, "提高屈曲折减裕度并验证焊缝错边、椭圆度、边界与载荷导入。"));
    }
    if (structureMode === "balloon") {
      if (pressurePa < minimumStabilityPressurePa) {
        issues.push(makeIssue("error", `${label}气球储箱`, `当前箱压 ${round(pressurePa / 1000, 1)} kPa 低于维形最低压力 ${round(minimumStabilityPressurePa / 1000, 1)} kPa，壳体将失稳。`, "提高维形压力、降低轴向载荷，或启用能承受完整载荷的地面张紧/运输支架。"));
      }
      issues.push(makeIssue("info", `${label}气球储箱`, `必须在运输、加注、飞行和排空阶段维持压力或机械张紧；地面工装参考质量 ${round(groundSupportMassKg, 1)} kg（不计入飞行质量）。`, "把最低压力联锁、持续供气、检漏、凹痕检查和异常失压程序纳入运行方案。"));
    }
    if (fatigueUtilization > 1) {
      issues.push(makeIssue("warning", `${label}储箱疲劳`, `输入的 ${config.tanks.designCycles} 次压力循环超过该教学结构路线的简化循环包络。`, "降低循环数或使用材料、焊缝、内衬与界面的实测 S-N/裂纹扩展数据。"));
    }

    return {
      label,
      structureMode,
      loadedMassKg,
      fluidVolumeM3,
      totalVolumeM3,
      temperatureK,
      pressurePa,
      geometry,
      materialKey: options.materialKey,
      materialName: material.name,
      processKey: options.processKey,
      processName: process.name,
      tempFactor,
      allowableMpa: allowablePa / 1e6,
      cylinderThicknessM,
      domeThicknessM,
      shellMassKg,
      reinforcementMassKg,
      insulationMassKg,
      totalMassKg,
      utilization,
      membraneUtilization: utilization,
      buckling,
      fatigueUtilization,
      minimumStabilityPressurePa,
      groundSupportMassKg,
      issues
    };
  }

  // contactPropellantProfile moved to materials.js

  function computeTankLayer(options) {
    const { label, layerLabel, geometry, temperatureK, pressurePa, axialForceN, loadFraction, material, process, propellant, contactRole, applyFluidTemperature } = options;
    const issues = [];
    const tempFactor = applyFluidTemperature ? materialTemperatureFactor(material, temperatureK) : 1;
    const allowablePa = material.yield * 1e6 * tempFactor * 0.80 * process.strengthFactor;
    const effectiveAllowable = Math.max(1e5, allowablePa * process.weldEfficiency);
    const layerPressurePa = pressurePa * loadFraction;
    const pressureThickness = layerPressurePa * geometry.radiusM / effectiveAllowable;
    const longitudinalThickness = layerPressurePa * geometry.radiusM / (2 * effectiveAllowable);
    const axialThickness = axialForceN * loadFraction / Math.max(1, 2 * Math.PI * geometry.radiusM * effectiveAllowable);
    const minGaugeM = material.minGauge / 1000;
    const cylinderThicknessM = Math.max(minGaugeM, pressureThickness, longitudinalThickness, axialThickness);
    const domeThicknessM = Math.max(minGaugeM, layerPressurePa * geometry.radiusM / (2 * effectiveAllowable));
    const manufacturingFactor = contactRole === "structural" ? 1.12 : 1.08;
    const massKg = material.density * (geometry.cylinderAreaM2 * cylinderThicknessM + geometry.domeAreaM2 * domeThicknessM) * manufacturingFactor;
    const utilization = Math.max(pressureThickness, longitudinalThickness, axialThickness) / Math.max(cylinderThicknessM, 1e-9) * 0.8;

    validateMaterialProcess(material, process, `${label}储箱${layerLabel}`, issues);
    if (contactRole !== "structural") {
      validateCompatibility(material, contactPropellantProfile(propellant, contactRole), temperatureK, `${label}储箱${layerLabel}`, issues);
      if (material.tags.indexOf("liner-required") >= 0) {
        issues.push(makeIssue("error", `${label}储箱${layerLabel}`, `${material.name} 本身需要内衬，不能直接作为接液内壁。`, "改用可直接接触该工质的致密内衬材料。"));
      }
      if (tempFactor === 0) {
        issues.push(makeIssue("error", `${label}储箱${layerLabel}`, "内壁材料温区不覆盖当前推进剂温度，内衬厚度结果无效。", "更换覆盖该工质温度的内壁材料。"));
      }
    }

    return {
      role: contactRole,
      label: layerLabel,
      loadFraction,
      materialKey: options.materialKey,
      materialName: material.name,
      processName: process.name,
      applyFluidTemperature,
      tempFactor,
      allowableMpa: allowablePa / 1e6,
      pressureThicknessM: pressureThickness,
      longitudinalThicknessM: longitudinalThickness,
      axialThicknessM: axialThickness,
      cylinderThicknessM,
      domeThicknessM,
      massKg,
      utilization,
      issues
    };
  }

  function computeDualLayerTank(options) {
    const { label, loadedMassKg, density, temperatureK, pressurePa, diameterM, linerMaterial, structuralMaterial, linerProcess, structuralProcess, propellant, config, estimatedWetMassKg, axialShare, contactRole } = options;
    const issues = [];
    const structureMode = options.structureMode || config.tanks.structureMode || "load-sharing";
    const legacyFixedSplit = structureMode === "dual";
    const interfaceMode = legacyFixedSplit ? "legacy-fixed" : config.tanks.interfaceMode;
    const fluidVolumeM3 = loadedMassKg / Math.max(1, density);
    const totalVolumeM3 = fluidVolumeM3 / (1 - config.tanks.ullagePct / 100);
    const geometry = tankGeometry(totalVolumeM3, diameterM);
    const designAccel = Math.max(2, config.vehicle.maxAccelG) * G0;
    const axialForceN = estimatedWetMassKg * designAccel * axialShare;
    const thermalCoupling = legacyFixedSplit ? 0 : interfaceMode === "slip" ? 0.25 : config.tanks.interfaceEfficiencyPct / 100;
    const structuralTemperatureK = 293 + (temperatureK - 293) * thermalCoupling;
    let linerFraction = legacyFixedSplit ? 0.05 : 0.18;
    let linerLayer;
    let structuralLayer;
    for (let iteration = 0; iteration < (legacyFixedSplit ? 1 : 24); iteration += 1) {
      linerLayer = computeTankLayer({
        label, layerLabel: legacyFixedSplit ? "内壁" : "内衬/接液壁", geometry, temperatureK, pressurePa, axialForceN,
        loadFraction: linerFraction, material: linerMaterial, materialKey: options.linerMaterialKey,
        process: linerProcess, processKey: options.linerProcessKey, propellant, contactRole, applyFluidTemperature: true
      });
      structuralLayer = computeTankLayer({
        label, layerLabel: structureMode === "copv" ? "复合缠绕承力层" : "外承力层", geometry,
        temperatureK: structuralTemperatureK, pressurePa, axialForceN, loadFraction: 1 - linerFraction,
        material: structuralMaterial, materialKey: options.structuralMaterialKey,
        process: structuralProcess, processKey: options.structuralProcessKey, propellant,
        contactRole: "structural", applyFluidTemperature: !legacyFixedSplit
      });
      if (legacyFixedSplit) break;
      const linerRigidity = materialModulusPa(linerMaterial, temperatureK) * linerLayer.cylinderThicknessM;
      const structuralRigidity = materialModulusPa(structuralMaterial, structuralTemperatureK) * structuralLayer.cylinderThicknessM;
      let targetFraction = linerRigidity / Math.max(1, linerRigidity + structuralRigidity);
      if (structureMode === "copv") targetFraction *= 0.38;
      if (interfaceMode === "slip") targetFraction = clamp(0.035 + targetFraction * 0.28, 0.03, 0.30);
      if (interfaceMode === "prestressed") {
        const nominalHoopStressMpa = pressurePa * geometry.radiusM / Math.max(1e-7, (linerLayer.cylinderThicknessM + structuralLayer.cylinderThicknessM)) / 1e6;
        targetFraction = clamp(targetFraction - config.tanks.linerPrestressMpa / Math.max(1, nominalHoopStressMpa) * 0.10, 0.02, 0.75);
      }
      const nextFraction = clamp(linerFraction * 0.45 + targetFraction * 0.55, 0.02, structureMode === "copv" ? 0.35 : 0.65);
      if (Math.abs(nextFraction - linerFraction) < 0.0002) {
        linerFraction = nextFraction;
        break;
      }
      linerFraction = nextFraction;
    }
    if (!legacyFixedSplit) {
      linerLayer = computeTankLayer({
        label, layerLabel: legacyFixedSplit ? "内壁" : "内衬/接液壁", geometry, temperatureK, pressurePa, axialForceN,
        loadFraction: linerFraction, material: linerMaterial, materialKey: options.linerMaterialKey,
        process: linerProcess, processKey: options.linerProcessKey, propellant, contactRole, applyFluidTemperature: true
      });
      structuralLayer = computeTankLayer({
        label, layerLabel: structureMode === "copv" ? "复合缠绕承力层" : "外承力层", geometry,
        temperatureK: structuralTemperatureK, pressurePa, axialForceN, loadFraction: 1 - linerFraction,
        material: structuralMaterial, materialKey: options.structuralMaterialKey,
        process: structuralProcess, processKey: options.structuralProcessKey, propellant,
        contactRole: "structural", applyFluidTemperature: true
      });
    }
    issues.push.apply(issues, linerLayer.issues);
    issues.push.apply(issues, structuralLayer.issues);
    const interfaceConstraint = legacyFixedSplit ? 0 : (interfaceMode === "slip" ? 0.12 : config.tanks.interfaceEfficiencyPct / 100);
    const alphaDifference = (materialThermalExpansionPpmK(structuralMaterial) - materialThermalExpansionPpmK(linerMaterial)) * 1e-6;
    const effectiveModulusPa = 1 / (1 / materialModulusPa(linerMaterial, temperatureK) + 1 / materialModulusPa(structuralMaterial, structuralTemperatureK));
    const thermalMismatchStressMpa = Math.abs(alphaDifference * (temperatureK - 293) * effectiveModulusPa * interfaceConstraint) / 1e6;
    const prestressMpa = interfaceMode === "prestressed" ? config.tanks.linerPrestressMpa : 0;
    const linerThermalUtilization = Math.max(0, thermalMismatchStressMpa - prestressMpa) / Math.max(0.1, linerLayer.allowableMpa);
    const structuralThermalUtilization = (thermalMismatchStressMpa + prestressMpa * linerLayer.cylinderThicknessM / Math.max(1e-7, structuralLayer.cylinderThicknessM)) / Math.max(0.1, structuralLayer.allowableMpa);
    linerLayer.combinedUtilization = linerLayer.utilization + linerThermalUtilization;
    structuralLayer.combinedUtilization = structuralLayer.utilization + structuralThermalUtilization;
    const interfaceShearMpa = thermalMismatchStressMpa * Math.min(0.18, (linerLayer.cylinderThicknessM + structuralLayer.cylinderThicknessM) / Math.max(1e-6, geometry.radiusM) * 25);
    const interfaceUtilization = interfaceShearMpa / Math.max(0.1, config.tanks.interfaceShearStrengthMpa);
    const wrinklingCriticalMpa = 0.60 * materialModulusPa(linerMaterial, temperatureK) * linerLayer.cylinderThicknessM / Math.max(1e-6, geometry.radiusM) / 1e6 * config.tanks.bucklingKnockdownPct / 100;
    const linerWrinklingUtilization = (prestressMpa + thermalMismatchStressMpa * (interfaceMode === "slip" ? 0.25 : 1)) / Math.max(0.1, wrinklingCriticalMpa);
    const buckling = computeTankBuckling({
      geometry, thicknessM: structuralLayer.cylinderThicknessM, material: structuralMaterial,
      temperatureK: structuralTemperatureK, pressurePa, axialForceN: axialForceN * (1 - linerFraction), config,
      stiffeningFactor: structureMode === "copv" ? 1.45 : 1
    });
    const fatigueUtilization = Math.sqrt(config.tanks.designCycles / (structureMode === "copv" ? 1800 : 4500)) * Math.max(linerLayer.combinedUtilization, structuralLayer.combinedUtilization) * 0.35;
    const cryogenic = temperatureK < 170;
    const insulationMassKg = cryogenic ? geometry.surfaceAreaM2 * config.tanks.insulationKgM2 : geometry.surfaceAreaM2 * 0.12;
    const interfaceMassKg = legacyFixedSplit ? 0 : geometry.surfaceAreaM2 * (interfaceMode === "slip" ? 0.18 : 0.32);
    const shellMassKg = linerLayer.massKg + structuralLayer.massKg + interfaceMassKg;
    const cylinderThicknessM = linerLayer.cylinderThicknessM + structuralLayer.cylinderThicknessM;
    const domeThicknessM = linerLayer.domeThicknessM + structuralLayer.domeThicknessM;
    if (geometry.shallowDome) issues.push(makeIssue("warning", `${label}储箱`, "锁定直径使封头过于扁平，当前仅保持体积守恒。", "减小直径或改用自动直径。"));
    if (cylinderThicknessM / geometry.radiusM > 0.10) issues.push(makeIssue("error", `${label}储箱`, "分层总壁厚/半径超过 0.10，薄壁压力容器公式不再适用。", "降低压力、增大材料强度或改用厚壁分层分析。"));
    if (!legacyFixedSplit && Math.max(linerLayer.combinedUtilization, structuralLayer.combinedUtilization) > 1) issues.push(makeIssue("error", `${label}储箱载荷共享`, `压力、热失配和预应力叠加后的最大利用率为 ${round(Math.max(linerLayer.combinedUtilization, structuralLayer.combinedUtilization) * 100, 0)}%。`, "调整层厚、界面模式、预应力或热膨胀更匹配的材料组合。"));
    if (interfaceUtilization > 1) issues.push(makeIssue("error", `${label}层间界面`, `简化界面剪切利用率 ${round(interfaceUtilization * 100, 0)}%，存在脱粘/剥离风险。`, "提高界面强度、降低约束、设置滑移层或减小热膨胀失配。"));
    if (linerWrinklingUtilization > 1) issues.push(makeIssue("error", `${label}内衬皱曲`, `卸压/低压工况内衬皱曲利用率 ${round(linerWrinklingUtilization * 100, 0)}%。`, "增加内衬厚度、降低预应力、改善贴合支撑或限制卸压速率。"));
    if (buckling.utilization > 1) issues.push(makeIssue("error", `${label}外层屈曲`, `折减后外承力层屈曲利用率 ${round(buckling.utilization * 100, 0)}%。`, "增加外层厚度/加筋、改善缺陷控制或降低轴向载荷。"));
    if (structureMode === "copv" && structuralMaterial.tags.indexOf("composite") < 0) issues.push(makeIssue("error", `${label} COPV`, "COPV 模式要求外承力层为复合材料。", "选择碳纤维/环氧缠绕层或其他经认证的复合承力材料。"));
    return {
      label, structureMode, interfaceMode, loadedMassKg, fluidVolumeM3, totalVolumeM3, temperatureK, pressurePa, geometry,
      materialKey: options.structuralMaterialKey, materialName: `${linerMaterial.name} 内衬 + ${structuralMaterial.name} 外层`,
      processName: `${linerProcess.name} / ${structuralProcess.name}`, tempFactor: linerLayer.tempFactor,
      allowableMpa: structuralLayer.allowableMpa, cylinderThicknessM, domeThicknessM, shellMassKg, interfaceMassKg,
      insulationMassKg, totalMassKg: shellMassKg + insulationMassKg,
      utilization: Math.max(linerLayer.combinedUtilization || linerLayer.utilization, structuralLayer.combinedUtilization || structuralLayer.utilization, buckling.utilization, interfaceUtilization, linerWrinklingUtilization),
      membraneUtilization: Math.max(linerLayer.utilization, structuralLayer.utilization), buckling, fatigueUtilization,
      linerLayer, structuralLayer,
      loadSharing: {
        method: legacyFixedSplit ? "legacy-fixed" : "Et-stiffness",
        linerFraction, structuralFraction: 1 - linerFraction, thermalMismatchStressMpa, prestressMpa,
        interfaceShearMpa, interfaceUtilization, linerWrinklingUtilization,
        linerCtePpmK: materialThermalExpansionPpmK(linerMaterial), structuralCtePpmK: materialThermalExpansionPpmK(structuralMaterial),
        structuralTemperatureK, interfaceEfficiencyPct: interfaceConstraint * 100
      },
      issues
    };
  }

  function adjacentDomeBreakdown(tank) {
    const geometry = tank.geometry;
    const weightedCylinder = geometry.cylinderAreaM2 * Math.max(1e-7, tank.cylinderThicknessM);
    const weightedDomes = geometry.domeAreaM2 * Math.max(1e-7, tank.domeThicknessM);
    const shellDomeFraction = weightedDomes / Math.max(1e-9, weightedCylinder + weightedDomes);
    const areaDomeFraction = geometry.domeAreaM2 / Math.max(1e-9, geometry.surfaceAreaM2);
    const shellMassKg = tank.shellMassKg * shellDomeFraction / 2;
    const reinforcementMassKg = (tank.reinforcementMassKg || 0) * areaDomeFraction / 2;
    const insulationMassKg = (tank.insulationMassKg || 0) * areaDomeFraction / 2;
    return {
      shellMassKg,
      reinforcementMassKg,
      insulationMassKg,
      totalMassKg: shellMassKg + reinforcementMassKg + insulationMassKg
    };
  }

  function computeCommonBulkhead(options) {
    const {
      config, fuelTank, oxidizerTank, propellant, process,
      fuelFaceMaterial, oxidizerFaceMaterial, fuelFaceProcess, oxidizerFaceProcess,
      fuelTemperatureK, oxidizerTemperatureK
    } = options;
    if (!oxidizerTank || config.tanks.geometryMode !== "common-bulkhead") return null;

    const issues = [];
    const type = config.tanks.commonBulkheadType;
    const pressureMode = config.tanks.commonBulkheadPressureMode;
    const isDoubleWall = type !== "single-sheet";
    const radiusM = Math.min(fuelTank.geometry.radiusM, oxidizerTank.geometry.radiusM);
    const heightRatio = config.tanks.commonBulkheadHeightRatio;
    const domeRiseM = radiusM * heightRatio;
    const curvatureRadiusM = (radiusM * radiusM + domeRiseM * domeRiseM) / Math.max(1e-8, 2 * domeRiseM);
    const projectedAreaM2 = Math.PI * radiusM * radiusM;
    const curvedAreaM2 = 2 * Math.PI * curvatureRadiusM * domeRiseM;
    const perimeterM = 2 * Math.PI * radiusM;
    const coreThicknessM = isDoubleWall ? config.tanks.commonBulkheadCoreThicknessMm / 1000 : 0;
    const proofFactor = config.tanks.commonBulkheadProofFactor;
    const nominalDifferentialPressurePa = Math.abs(fuelTank.pressurePa - oxidizerTank.pressurePa);
    const fullLossDifferentialPressurePa = Math.max(fuelTank.pressurePa, oxidizerTank.pressurePa);
    const controlledDifferentialPressurePa = Math.min(fullLossDifferentialPressurePa, config.tanks.commonBulkheadControlledDeltaKpa * 1000);
    const sizingDifferentialPressurePa = pressureMode === "pressure-stabilized" ? controlledDifferentialPressurePa : fullLossDifferentialPressurePa;
    const designDifferentialPressurePa = sizingDifferentialPressurePa * proofFactor;
    const imperfectionFactor = 1 / (1 + 30 * config.tanks.ovalityPct / 100);
    const capGeometryFactor = clamp(heightRatio * 1.7, 0.28, 1);
    const bucklingFactor = Math.max(0.03, config.tanks.bucklingKnockdownPct / 100 * imperfectionFactor * capGeometryFactor);

    function poisson(material) {
      return material.tags.indexOf("composite") >= 0 ? 0.28 : material.tags.indexOf("polymer") >= 0 ? 0.38 : 0.33;
    }

    function faceAllowable(material, faceProcess, temperatureK) {
      const tempFactor = materialTemperatureFactor(material, temperatureK);
      return {
        tempFactor,
        modulusPa: materialModulusPa(material, temperatureK),
        allowablePa: Math.max(1e5, material.yield * 1e6 * Math.max(0.10, tempFactor) * 0.80 * faceProcess.strengthFactor * faceProcess.weldEfficiency)
      };
    }

    function externalBucklingCapacityPa(material, temperatureK, thicknessM) {
      const modulusPa = materialModulusPa(material, temperatureK);
      const nu = poisson(material);
      return 2 * modulusPa / Math.sqrt(3 * (1 - nu * nu)) * Math.pow(thicknessM / curvatureRadiusM, 2) * bucklingFactor;
    }

    function sizeIndependentFace(material, faceProcess, temperatureK, membranePressurePa, bucklingPressurePa, label) {
      const properties = faceAllowable(material, faceProcess, temperatureK);
      const membraneThicknessM = membranePressurePa * curvatureRadiusM / Math.max(1, 2 * properties.allowablePa);
      const nu = poisson(material);
      const bucklingThicknessM = curvatureRadiusM * Math.sqrt(
        bucklingPressurePa * Math.sqrt(3 * (1 - nu * nu)) / Math.max(1, 2 * properties.modulusPa * bucklingFactor)
      );
      const thicknessM = Math.max(material.minGauge / 1000, membraneThicknessM, bucklingThicknessM);
      const membraneCapacityPa = 2 * properties.allowablePa * thicknessM / curvatureRadiusM;
      const bucklingCapacityPa = externalBucklingCapacityPa(material, temperatureK, thicknessM);
      return {
        label,
        materialName: material.name,
        processName: faceProcess.name,
        temperatureK,
        tempFactor: properties.tempFactor,
        allowableMpa: properties.allowablePa / 1e6,
        modulusGpa: properties.modulusPa / 1e9,
        membraneDesignPressurePa: membranePressurePa,
        bucklingDesignPressurePa: bucklingPressurePa,
        membraneThicknessM,
        bucklingThicknessM,
        thicknessM,
        membraneCapacityPa,
        bucklingCapacityPa,
        governingMode: thicknessM === material.minGauge / 1000 ? "最小工艺厚度" : bucklingThicknessM >= membraneThicknessM ? "反向压差屈曲" : "膜应力",
        massKg: curvedAreaM2 * thicknessM * material.density * 1.08
      };
    }

    let fuelFace;
    let oxidizerFace = null;
    let collapseCapacityPa;
    let burstCapacityPa;
    let designBurstPressurePa = designDifferentialPressurePa;
    let designCollapsePressurePa = designDifferentialPressurePa;
    let coreCrushUtilization = 0;
    let faceWrinklingUtilization = 0;

    if (type === "vacuum") {
      const collapseOnFuelSide = fuelTank.pressurePa <= oxidizerTank.pressurePa;
      const fuelDesignPressurePa = fuelTank.pressurePa * proofFactor;
      const oxidizerDesignPressurePa = oxidizerTank.pressurePa * proofFactor;
      fuelFace = sizeIndependentFace(fuelFaceMaterial, fuelFaceProcess, fuelTemperatureK, collapseOnFuelSide ? 0 : fuelDesignPressurePa, collapseOnFuelSide ? fuelDesignPressurePa : 0, "燃料侧独立壳");
      oxidizerFace = sizeIndependentFace(oxidizerFaceMaterial, oxidizerFaceProcess, oxidizerTemperatureK, collapseOnFuelSide ? oxidizerDesignPressurePa : 0, collapseOnFuelSide ? 0 : oxidizerDesignPressurePa, "氧化剂侧独立壳");
      designCollapsePressurePa = collapseOnFuelSide ? fuelDesignPressurePa : oxidizerDesignPressurePa;
      designBurstPressurePa = collapseOnFuelSide ? oxidizerDesignPressurePa : fuelDesignPressurePa;
      collapseCapacityPa = collapseOnFuelSide ? fuelFace.bucklingCapacityPa : oxidizerFace.bucklingCapacityPa;
      burstCapacityPa = collapseOnFuelSide ? oxidizerFace.membraneCapacityPa : fuelFace.membraneCapacityPa;
    } else if (type === "honeycomb") {
      const fuelProperties = faceAllowable(fuelFaceMaterial, fuelFaceProcess, fuelTemperatureK);
      const oxidizerProperties = faceAllowable(oxidizerFaceMaterial, oxidizerFaceProcess, oxidizerTemperatureK);
      const fuelLoadShare = fuelProperties.modulusPa / Math.max(1, fuelProperties.modulusPa + oxidizerProperties.modulusPa);
      const oxLoadShare = 1 - fuelLoadShare;
      let fuelThicknessM = Math.max(fuelFaceMaterial.minGauge / 1000, designDifferentialPressurePa * fuelLoadShare * curvatureRadiusM / Math.max(1, 2 * fuelProperties.allowablePa));
      let oxidizerThicknessM = Math.max(oxidizerFaceMaterial.minGauge / 1000, designDifferentialPressurePa * oxLoadShare * curvatureRadiusM / Math.max(1, 2 * oxidizerProperties.allowablePa));
      let sandwichBucklingCapacityPa = 0;
      for (let iteration = 0; iteration < 16; iteration += 1) {
        const separationM = coreThicknessM + (fuelThicknessM + oxidizerThicknessM) / 2;
        const fuelZ = separationM * oxidizerThicknessM / Math.max(1e-9, fuelThicknessM + oxidizerThicknessM);
        const oxZ = separationM * fuelThicknessM / Math.max(1e-9, fuelThicknessM + oxidizerThicknessM);
        const bendingRigidity = fuelProperties.modulusPa * (fuelThicknessM ** 3 / 12 + fuelThicknessM * fuelZ * fuelZ)
          + oxidizerProperties.modulusPa * (oxidizerThicknessM ** 3 / 12 + oxidizerThicknessM * oxZ * oxZ);
        const equivalentModulusPa = Math.min(fuelProperties.modulusPa, oxidizerProperties.modulusPa);
        const equivalentThicknessM = Math.pow(Math.max(1e-18, 12 * bendingRigidity / equivalentModulusPa), 1 / 3);
        const rawCapacityPa = 2 * equivalentModulusPa / Math.sqrt(3 * (1 - 0.33 * 0.33)) * Math.pow(equivalentThicknessM / curvatureRadiusM, 2) * bucklingFactor;
        // The bonded core may provide substantial stability beyond either face
        // alone, but cap the teaching credit so it never becomes an unlimited
        // equivalent-thickness shortcut.
        const faceOnlyLimitPa = 20 * Math.max(
          externalBucklingCapacityPa(fuelFaceMaterial, fuelTemperatureK, fuelThicknessM),
          externalBucklingCapacityPa(oxidizerFaceMaterial, oxidizerTemperatureK, oxidizerThicknessM)
        );
        sandwichBucklingCapacityPa = Math.min(rawCapacityPa, faceOnlyLimitPa, 1.6e6);
        if (sandwichBucklingCapacityPa >= designDifferentialPressurePa * 1.001) break;
        const scale = clamp(Math.sqrt(designDifferentialPressurePa / Math.max(1, sandwichBucklingCapacityPa)), 1.02, 1.7);
        fuelThicknessM *= scale;
        oxidizerThicknessM *= scale;
      }
      fuelFace = {
        label: "燃料侧面板", materialName: fuelFaceMaterial.name, processName: fuelFaceProcess.name,
        temperatureK: fuelTemperatureK, tempFactor: fuelProperties.tempFactor, allowableMpa: fuelProperties.allowablePa / 1e6,
        modulusGpa: fuelProperties.modulusPa / 1e9, membraneThicknessM: designDifferentialPressurePa * fuelLoadShare * curvatureRadiusM / Math.max(1, 2 * fuelProperties.allowablePa),
        bucklingThicknessM: 0, thicknessM: fuelThicknessM, membraneCapacityPa: 2 * fuelProperties.allowablePa * fuelThicknessM / curvatureRadiusM,
        bucklingCapacityPa: sandwichBucklingCapacityPa, governingMode: fuelThicknessM <= fuelFaceMaterial.minGauge / 1000 * 1.001 ? "最小工艺厚度" : "夹芯整体稳定",
        massKg: curvedAreaM2 * fuelThicknessM * fuelFaceMaterial.density * 1.08
      };
      oxidizerFace = {
        label: "氧化剂侧面板", materialName: oxidizerFaceMaterial.name, processName: oxidizerFaceProcess.name,
        temperatureK: oxidizerTemperatureK, tempFactor: oxidizerProperties.tempFactor, allowableMpa: oxidizerProperties.allowablePa / 1e6,
        modulusGpa: oxidizerProperties.modulusPa / 1e9, membraneThicknessM: designDifferentialPressurePa * oxLoadShare * curvatureRadiusM / Math.max(1, 2 * oxidizerProperties.allowablePa),
        bucklingThicknessM: 0, thicknessM: oxidizerThicknessM, membraneCapacityPa: 2 * oxidizerProperties.allowablePa * oxidizerThicknessM / curvatureRadiusM,
        bucklingCapacityPa: sandwichBucklingCapacityPa, governingMode: oxidizerThicknessM <= oxidizerFaceMaterial.minGauge / 1000 * 1.001 ? "最小工艺厚度" : "夹芯整体稳定",
        massKg: curvedAreaM2 * oxidizerThicknessM * oxidizerFaceMaterial.density * 1.08
      };
      collapseCapacityPa = sandwichBucklingCapacityPa;
      burstCapacityPa = 2 * (fuelProperties.allowablePa * fuelThicknessM + oxidizerProperties.allowablePa * oxidizerThicknessM) / curvatureRadiusM;
      coreCrushUtilization = designDifferentialPressurePa / 1.6e6;
      const faceCompressionPa = designDifferentialPressurePa * curvatureRadiusM / Math.max(1e-8, 2 * (fuelThicknessM + oxidizerThicknessM));
      const wrinklingCriticalPa = 0.50 * Math.pow(Math.min(fuelProperties.modulusPa, oxidizerProperties.modulusPa) * 280e6 * 85e6, 1 / 3);
      faceWrinklingUtilization = faceCompressionPa / Math.max(1e5, wrinklingCriticalPa);
    } else {
      fuelFace = sizeIndependentFace(
        fuelFaceMaterial,
        fuelFaceProcess,
        Math.min(fuelTemperatureK, oxidizerTemperatureK),
        designDifferentialPressurePa,
        designDifferentialPressurePa,
        "单层压差膜"
      );
      collapseCapacityPa = fuelFace.bucklingCapacityPa;
      burstCapacityPa = fuelFace.membraneCapacityPa;
    }

    const temperatureDifferenceK = Math.abs(fuelTemperatureK - oxidizerTemperatureK);
    const faceThicknessM = Math.max(fuelFace.thicknessM, oxidizerFace ? oxidizerFace.thicknessM : 0);
    const faceCount = isDoubleWall ? 2 : 1;
    let coreMassKg = 0;
    let adhesiveAndBarrierMassKg = 0;
    let heatFluxWm2;
    if (type === "honeycomb") {
      coreMassKg = curvedAreaM2 * coreThicknessM * 48;
      adhesiveAndBarrierMassKg = curvedAreaM2 * 1.10;
      heatFluxWm2 = 0.045 * temperatureDifferenceK / Math.max(0.005, coreThicknessM);
    } else if (type === "vacuum") {
      coreMassKg = curvedAreaM2 * (0.35 + 6 * coreThicknessM);
      adhesiveAndBarrierMassKg = curvedAreaM2 * 0.28;
      heatFluxWm2 = 0.12 * temperatureDifferenceK * Math.pow(0.025 / Math.max(0.005, coreThicknessM), 0.35);
    } else {
      adhesiveAndBarrierMassKg = curvedAreaM2 * 0.12;
      heatFluxWm2 = Math.min(50000, fuelFaceMaterial.conductivity * temperatureDifferenceK / Math.max(1e-5, fuelFace.thicknessM));
    }

    const ringMaterial = oxidizerFaceMaterial || fuelFaceMaterial;
    const ringProcess = oxidizerFaceProcess || fuelFaceProcess;
    const ringTemperatureK = Math.min(fuelTemperatureK, oxidizerTemperatureK);
    const ringAllowablePa = faceAllowable(ringMaterial, ringProcess, ringTemperatureK).allowablePa;
    const ringSectionAreaM2 = Math.max(60e-6, designDifferentialPressurePa * radiusM / Math.max(1, ringAllowablePa) * 0.08);
    const jointRingMassKg = perimeterM * ringSectionAreaM2 * ringMaterial.density * (isDoubleWall ? 1.35 : 1.10);
    const monitoringAndSealMassKg = Math.max(2, curvedAreaM2 * (type === "vacuum" ? 0.20 : type === "honeycomb" ? 0.15 : 0.08));
    const connectionAndMonitoringMassKg = jointRingMassKg + monitoringAndSealMassKg;
    const bulkheadShellMassKg = fuelFace.massKg + (oxidizerFace ? oxidizerFace.massKg : 0);
    const insulationMassKg = coreMassKg + adhesiveAndBarrierMassKg;
    const addedMassKg = bulkheadShellMassKg + insulationMassKg + connectionAndMonitoringMassKg;

    const removedFuelDome = adjacentDomeBreakdown(fuelTank);
    const removedOxidizerDome = adjacentDomeBreakdown(oxidizerTank);
    const removedFuelDomeMassKg = removedFuelDome.totalMassKg;
    const removedOxidizerDomeMassKg = removedOxidizerDome.totalMassKg;
    const removedDomeMassKg = removedFuelDomeMassKg + removedOxidizerDomeMassKg;
    const netMassDeltaKg = addedMassKg - removedDomeMassKg;
    const assemblyDepthM = domeRiseM + coreThicknessM;
    const lengthSavingM = Math.max(0, fuelTank.geometry.domeDepthM + oxidizerTank.geometry.domeDepthM + fuelTank.geometry.diameterM * 0.18 - assemblyDepthM);

    const ringHeatLeakW = perimeterM * temperatureDifferenceK * (type === "single-sheet" ? 4.0 : type === "vacuum" ? 0.18 : 0.35);
    const totalHeatLeakW = heatFluxWm2 * curvedAreaM2 + ringHeatLeakW;
    const coldSideTemperatureK = Math.min(fuelTemperatureK, oxidizerTemperatureK);
    const coldSideLatentHeatKjKg = coldSideTemperatureK < 35 ? 446 : coldSideTemperatureK < 100 ? 213 : coldSideTemperatureK < 145 ? 510 : 250;
    const equivalentBoiloffKgH = totalHeatLeakW * 3.6 / coldSideLatentHeatKjKg;
    const fuelThermalStrain = materialThermalExpansionPpmK(fuelFaceMaterial) * 1e-6 * (fuelTemperatureK - 293);
    const oxidizerThermalStrain = materialThermalExpansionPpmK(oxidizerFaceMaterial) * 1e-6 * (oxidizerTemperatureK - 293);
    const thermalMismatchStrain = Math.abs(fuelThermalStrain - oxidizerThermalStrain);
    const bondShearMpa = type === "honeycomb" ? 85e6 * thermalMismatchStrain * 0.35 / 1e6 : 0;
    const bondShearAllowableMpa = 1.2;
    const bondUtilization = bondShearMpa / bondShearAllowableMpa;
    const singleSheetThermalStressMpa = type === "single-sheet"
      ? materialModulusPa(fuelFaceMaterial, Math.min(fuelTemperatureK, oxidizerTemperatureK)) * materialThermalExpansionPpmK(fuelFaceMaterial) * 1e-6 * temperatureDifferenceK * 0.15 / 1e6
      : 0;

    const designBurstUtilization = designBurstPressurePa / Math.max(1, burstCapacityPa);
    const designCollapseUtilization = designCollapsePressurePa / Math.max(1, collapseCapacityPa);
    const emergencyBurstUtilization = fullLossDifferentialPressurePa / Math.max(1, burstCapacityPa);
    const emergencyCollapseUtilization = fullLossDifferentialPressurePa / Math.max(1, collapseCapacityPa);
    const governingUtilization = Math.max(designBurstUtilization, designCollapseUtilization, coreCrushUtilization, faceWrinklingUtilization, bondUtilization, singleSheetThermalStressMpa / Math.max(0.1, fuelFace.allowableMpa));
    const reverseDifferentialBuckling = {
      utilization: pressureMode === "pressure-stabilized" && type !== "vacuum" ? emergencyCollapseUtilization : designCollapseUtilization,
      criticalPressurePa: collapseCapacityPa,
      designPressurePa: designCollapsePressurePa,
      emergencyPressurePa: fullLossDifferentialPressurePa,
      knockdownFactor: bucklingFactor
    };

    validateMaterialProcess(fuelFaceMaterial, fuelFaceProcess, "共底燃料侧面板", issues);
    validateCompatibility(fuelFaceMaterial, contactPropellantProfile(propellant, "fuel"), fuelTemperatureK, "共底燃料侧面板", issues);
    if (isDoubleWall) {
      validateMaterialProcess(oxidizerFaceMaterial, oxidizerFaceProcess, "共底氧化剂侧面板", issues);
      validateCompatibility(oxidizerFaceMaterial, contactPropellantProfile(propellant, "oxidizer"), oxidizerTemperatureK, "共底氧化剂侧面板", issues);
    } else {
      validateCompatibility(fuelFaceMaterial, contactPropellantProfile(propellant, "oxidizer"), oxidizerTemperatureK, "共底单层膜氧化剂侧", issues);
    }
    if (fuelFace.tempFactor === 0 || (oxidizerFace && oxidizerFace.tempFactor === 0)) {
      issues.push(makeIssue("error", "共底材料温区", "至少一侧面板材料的工作温区不覆盖相邻推进剂温度，厚度与强度结果无效。", "更换覆盖两侧工质温区的共底面板材料。"));
    }
    if (type === "single-sheet" && temperatureDifferenceK > 40) {
      issues.push(makeIssue("error", "共底热隔离", `单层压差膜两侧温差 ${round(temperatureDifferenceK, 0)} K，稳态导热与热应力不可接受。`, "改用双层真空或粘接蜂窝夹芯共底。"));
    } else if (type === "single-sheet" && temperatureDifferenceK > 20) {
      issues.push(makeIssue("warning", "共底热隔离", `单层压差膜两侧温差 ${round(temperatureDifferenceK, 0)} K，需专项瞬态热分析。`, "增加热隔离或改用双层共底。"));
    }
    if (pressureMode === "pressure-stabilized" && type !== "vacuum") {
      const emergencyUtilization = Math.max(emergencyBurstUtilization, emergencyCollapseUtilization);
      issues.push(makeIssue(emergencyUtilization > 1 ? "warning" : "info", "共底压力稳定", `共底按联锁压差 ${round(controlledDifferentialPressurePa / 1000, 1)} kPa 定尺寸；任一侧完全失压时利用率为 ${round(emergencyUtilization * 100, 0)}%。`, "必须设置双箱压差联锁、受控加注/排放、快速关断和异常泄压程序。"));
    }
    if (Math.max(designBurstUtilization, designCollapseUtilization) > 1.01) {
      issues.push(makeIssue("error", "共底双向压差", `证明压差工况的最大膜应力/屈曲利用率 ${round(Math.max(designBurstUtilization, designCollapseUtilization) * 100, 0)}%。`, "增加面板或芯层厚度、提高拱高、降低设计压差或更换材料。"));
    } else if (Math.max(designBurstUtilization, designCollapseUtilization) > 0.8) {
      issues.push(makeIssue("warning", "共底双向压差", `证明压差工况的最大利用率 ${round(Math.max(designBurstUtilization, designCollapseUtilization) * 100, 0)}%。`, "保留制造缺陷、边界条件和载荷导入的额外裕度。"));
    }
    if (type === "honeycomb" && Math.max(coreCrushUtilization, faceWrinklingUtilization, bondUtilization) > 1) {
      issues.push(makeIssue("error", "共底夹芯/粘接", `芯层压溃、面板起皱或热失配粘接利用率达到 ${round(Math.max(coreCrushUtilization, faceWrinklingUtilization, bondUtilization) * 100, 0)}%。`, "增厚芯层/面板、降低热约束，或采用经低温验证的芯层和胶接数据。"));
    }
    if (type === "vacuum") {
      if (pressureMode === "pressure-stabilized") issues.push(makeIssue("info", "共底真空间隙", "真空双壳的每张面板仍分别承受相邻箱压，压差联锁不会用于减薄面板。", "若要依靠双箱压差获得减重，请选择单层压差膜或粘接蜂窝夹芯路线。"));
      issues.push(makeIssue("info", "共底真空间隙", "两张面板分别按各自箱压对真空间隙定尺寸；真空丧失会显著增加热漏，但不应直接形成跨工质混合路径。", "配置真空监测、排气路径、低温多层绝热和泄漏检测。"));
    }
    if (lengthSavingM <= 0) {
      issues.push(makeIssue("warning", "共底几何", "当前拱高与芯层厚度没有产生正的级段长度收益。", "降低共底拱高/芯层厚度，或恢复独立储箱。"));
    }
    issues.push(makeIssue("info", "共底工况", "自承式按任一侧失压的双向爆破/塌陷包络估算；夹芯结构另外检查芯层压溃、面板起皱、热失配粘接和热漏。", "详细设计仍需非线性壳体有限元、瞬态传热、焊接/粘接缺陷、泄漏路径和全尺寸验证试验。"));

    return {
      enabled: true,
      type,
      typeName: type === "single-sheet" ? "单层压差膜共底" : type === "vacuum" ? "双层独立壳真空共底" : "双面板粘接蜂窝共底",
      pressureMode,
      pressureModeName: type === "vacuum" ? "双壳独立承压 · 各自全箱压" : pressureMode === "self-supporting" ? "自承式 · 单侧失压包络" : "压力稳定式 · 压差联锁",
      materialName: isDoubleWall ? `${fuelFaceMaterial.name} / ${oxidizerFaceMaterial.name}` : fuelFaceMaterial.name,
      processName: process.name,
      faceThicknessM,
      faceCount,
      faces: { fuel: fuelFace, oxidizer: oxidizerFace },
      geometry: { radiusM, domeRiseM, heightRatio, curvatureRadiusM, projectedAreaM2, curvedAreaM2, coreThicknessM, assemblyDepthM },
      pressureEnvelope: {
        nominalDifferentialPressurePa,
        controlledDifferentialPressurePa,
        sizingDifferentialPressurePa: type === "vacuum" ? fullLossDifferentialPressurePa : sizingDifferentialPressurePa,
        designDifferentialPressurePa: type === "vacuum" ? Math.max(designBurstPressurePa, designCollapsePressurePa) : designDifferentialPressurePa,
        designBurstPressurePa,
        designCollapsePressurePa,
        fullLossDifferentialPressurePa,
        proofFactor,
        burstCapacityPa,
        collapseCapacityPa,
        designBurstUtilization,
        designCollapseUtilization,
        emergencyBurstUtilization,
        emergencyCollapseUtilization
      },
      stability: { governingUtilization, coreCrushUtilization, faceWrinklingUtilization, bondUtilization, bucklingFactor },
      thermal: {
        temperatureDifferenceK,
        heatFluxWm2,
        ringHeatLeakW,
        totalHeatLeakW,
        equivalentBoiloffKgH,
        thermalMismatchStrain,
        bondShearMpa,
        singleSheetThermalStressMpa
      },
      coreMassKg,
      adhesiveAndBarrierMassKg,
      insulationMassKg,
      jointRingMassKg,
      monitoringAndSealMassKg,
      connectionAndMonitoringMassKg,
      bulkheadShellMassKg,
      removedFuelDomeMassKg,
      removedOxidizerDomeMassKg,
      removedDomeMassKg,
      removedDomeBreakdown: { fuel: removedFuelDome, oxidizer: removedOxidizerDome },
      addedMassKg,
      netMassDeltaKg,
      massAccounting: { newFacesKg: bulkheadShellMassKg, thermalCoreAndBarrierKg: insulationMassKg, ringsSealsAndMonitoringKg: connectionAndMonitoringMassKg, removedAdjacentDomesKg: removedDomeMassKg, netChangeKg: netMassDeltaKg },
      lengthSavingM,
      temperatureDifferenceK,
      differentialPressurePa: fullLossDifferentialPressurePa,
      designDifferentialPressurePa: type === "vacuum" ? Math.max(designBurstPressurePa, designCollapsePressurePa) : designDifferentialPressurePa,
      reverseDifferentialBuckling,
      costFactor: type === "single-sheet" ? 1.35 : type === "vacuum" ? 2.15 : 2.55,
      issues
    };
  }

  function computePressurization(config, totalTankVolumeM3, fluidVolumeM3, loadedPropellantKg) {
    const ullageM3 = Math.max(0.001, totalTankVolumeM3 - fluidVolumeM3);
    const pressurePa = config.tanks.pressureMpa * 1e6;
    if (config.tanks.pressurization === "autogenous") {
      const gasMassKg = loadedPropellantKg * 0.0035;
      return {
        type: "自生增压",
        ullageM3,
        gasMassKg,
        bottleMassKg: Math.max(2, loadedPropellantKg * 0.0012),
        linesMassKg: Math.max(2.5, loadedPropellantKg * 0.0007),
        totalMassKg: gasMassKg + Math.max(2, loadedPropellantKg * 0.0019),
        note: "按汽化工质、换热器和控制阀的经验质量估算。"
      };
    }
    const heliumR = 2077;
    const collapseFactor = config.engine.cycleKey === "pressure-fed" ? 1.9 : 1.55;
    const gasMassKg = pressurePa * ullageM3 / (heliumR * 293) * collapseFactor;
    const bottleMassKg = Math.max(4, gasMassKg * 5.2);
    const linesMassKg = Math.max(2.5, gasMassKg * 0.9);
    return {
      type: "氦气增压",
      ullageM3,
      gasMassKg,
      bottleMassKg,
      linesMassKg,
      totalMassKg: gasMassKg + bottleMassKg + linesMassKg,
      note: "按理想气体、热塌缩修正及 30 MPa 级气瓶质量分数估算。"
    };
  }

  // computePumpSide, computeNozzleAndChamber, computeClusterLayout moved to engine-design.js

  function computeSubsystems(config, propellant, usablePropellantKg, imposedThrustN, wetMassGuessKg) {
    const issues = [];
    const cycle = Data.cycles[config.engine.cycleKey] || Data.cycles["gas-generator"];
    const coolingMode = Data.cooling[config.engine.coolingKey] || Data.cooling.regenerative;
    const tankMaterial = Data.materials[config.tanks.materialKey] || Data.materials["al-2219"];
    const layeredTanks = ["dual", "load-sharing", "copv"].includes(config.tanks.structureMode);
    const fuelLinerMaterial = Data.materials[config.tanks.fuelLinerMaterialKey] || Data.materials["ss-304l"];
    const oxidizerLinerMaterial = Data.materials[config.tanks.oxidizerLinerMaterialKey] || Data.materials["ss-304l"];
    const tankStructuralMaterial = Data.materials[config.tanks.structuralMaterialKey] || Data.materials["al-2219"];
    const commonBulkheadFuelMaterial = Data.materials[config.tanks.commonBulkheadFuelMaterialKey] || Data.materials["al-2219"];
    const commonBulkheadOxidizerMaterial = Data.materials[config.tanks.commonBulkheadOxidizerMaterialKey] || Data.materials["al-2219"];
    const tankProcess = Data.processes[config.tanks.processKey] || Data.processes["sheet-weld"];
    const fuelLinerProcess = compatibleTankProcess(fuelLinerMaterial, tankProcess);
    const oxidizerLinerProcess = compatibleTankProcess(oxidizerLinerMaterial, tankProcess);
    const tankStructuralProcess = compatibleTankProcess(tankStructuralMaterial, tankProcess);
    const pumpMaterial = Data.materials[config.engine.pumpMaterialKey] || Data.materials["inconel-718"];
    const pumpProcess = Data.processes[config.engine.pumpProcessKey] || Data.processes.machined;
    const chamberMaterial = Data.materials[config.engine.chamberMaterialKey] || Data.materials["grcop-42"];
    const nozzleMaterial = Data.materials[config.engine.nozzleMaterialKey] || Data.materials["inconel-718"];
    const hotProcess = Data.processes[config.engine.hotProcessKey] || Data.processes.additive;
    const airframeMaterial = Data.materials[config.airframe.materialKey] || Data.materials["al-7075"];
    const airframeProcess = Data.processes[config.airframe.processKey] || Data.processes["sheet-weld"];
    const split = splitPropellant(propellant, usablePropellantKg, config.tanks.residualPct, Number(config.engine.mixtureRatioOverride));
    const fuelFluidVolume = split.loadedFuelKg / propellant.fuelDensity;
    const oxFluidVolume = split.loadedOxidizerKg > 0 ? split.loadedOxidizerKg / propellant.oxidizerDensity : 0;
    const fuelTankVolume = fuelFluidVolume / (1 - config.tanks.ullagePct / 100);
    const oxTankVolume = oxFluidVolume > 0 ? oxFluidVolume / (1 - config.tanks.ullagePct / 100) : 0;
    const diameterM = resolveTankDiameter(config, fuelTankVolume, oxTankVolume);
    const environment = environmentState(config, config.vehicle.launchAltitudeM);
    const ambientPressurePa = environment.pressurePa;
    const launchGravityMs2 = environment.body.gravityMs2 * Math.pow(environment.body.radiusM / (environment.body.radiusM + config.vehicle.launchAltitudeM), 2);
    if (environment.body.conceptual) {
      issues.push(makeIssue("info", "环境场景", `${environment.body.name}是概念比较预设，不代表已验证的气候或地球化结果。`, "仅用其 500 kPa 表面压力、假定温度和大气密度进行方案比较。"));
    }
    const ispS = effectiveIsp(propellant, cycle, ambientPressurePa);
    const totalThrustN = Math.max(100, imposedThrustN);
    const totalMassFlowKgS = totalThrustN / (ispS * G0);
    const fuelMdot = propellant.mono ? totalMassFlowKgS : totalMassFlowKgS / (1 + split.mixtureRatio);
    const oxMdot = propellant.mono ? 0 : totalMassFlowKgS - fuelMdot;
    const nozzle = computeNozzleAndChamber(config, propellant, totalThrustN, ambientPressurePa, chamberMaterial, nozzleMaterial, cycle, coolingMode);
    issues.push.apply(issues, nozzle.issues);
    const architectureKey = config.engine.clusterArchitecture;
    const architecture = architectureKey === "independent"
      ? { key: architectureKey, name: "独立发动机", pumpMode: "independent", note: "每台发动机拥有独立泵、控制器、阀门、点火器、万向节与验收试车。" }
      : architectureKey === "shared-powerpack"
        ? { key: architectureKey, name: "共用动力包", pumpMode: "shared", note: "共用主动力包，但每个燃烧室/喷口仍有分流管路、局部阀门、控制与安装代价。" }
        : { key: architectureKey, name: "理想模式—单泵多燃烧室多喷口", pumpMode: "shared", note: "保留单泵共享带来的理想质量与成本优势；仍执行喷口排布、扩径与基本分流检查。" };
    const clusterLayout = computeClusterLayout(config.engine.engineCount, nozzle.exitDiameterM, diameterM, config.engine.nozzleClearancePct);
    const clusterLineDropPct = config.engine.engineCount <= 1 ? 0
      : architectureKey === "independent" ? 0.8 * Math.pow(config.engine.engineCount - 1, 0.85)
        : architectureKey === "shared-powerpack" ? 1.2 * Math.pow(config.engine.engineCount - 1, 0.85)
          : 0.45 * Math.pow(config.engine.engineCount - 1, 0.75);
    const effectiveLineDropPct = config.engine.lineDropPct + clusterLineDropPct;
    if (clusterLayout.requiresExpansion) {
      const severity = clusterLayout.diameterExpansionRatio > 1.35 ? "error" : "warning";
      issues.push(makeIssue(severity, "发动机集群包络", `${config.engine.engineCount} 个喷口含净间隙与万向摆动需要 ${round(clusterLayout.requiredDiameterM, 2)} m 基座，超过 ${round(diameterM, 2)} m 箭体直径；需扩径至 ${round(clusterLayout.baseDiameterM, 2)} m。`, "增大箭体直径、减小喷口直径/膨胀比、减少发动机数量或采用更紧凑的排布。"));
    }

    const estimatedWetMass = Math.max(wetMassGuessKg, split.loadedTotalKg + config.vehicle.payloadKg + 100);
    const fuelTankOptions = {
      label: propellant.mono ? "推进剂" : "燃料",
      loadedMassKg: split.loadedFuelKg,
      density: propellant.fuelDensity,
      temperatureK: propellant.fuelTemperatureK,
      pressurePa: config.tanks.pressureMpa * 1e6,
      diameterM,
      material: tankMaterial,
      process: tankProcess,
      propellant,
      config,
      estimatedWetMassKg: estimatedWetMass,
      axialShare: propellant.mono ? 0.72 : 0.45,
      materialKey: config.tanks.materialKey,
      structureMode: config.tanks.structureMode
    };
    const fuelTank = layeredTanks ? computeDualLayerTank(Object.assign({}, fuelTankOptions, {
      structureMode: config.tanks.structureMode,
      linerMaterial: fuelLinerMaterial,
      linerMaterialKey: config.tanks.fuelLinerMaterialKey,
      linerProcess: fuelLinerProcess,
      linerProcessKey: Object.keys(Data.processes).find(function (key) { return Data.processes[key] === fuelLinerProcess; }),
      structuralMaterial: tankStructuralMaterial,
      structuralMaterialKey: config.tanks.structuralMaterialKey,
      structuralProcess: tankStructuralProcess,
      structuralProcessKey: Object.keys(Data.processes).find(function (key) { return Data.processes[key] === tankStructuralProcess; }),
      contactRole: "fuel"
    })) : computeTank(fuelTankOptions);
    issues.push.apply(issues, fuelTank.issues);
    const oxidizerTankOptions = {
      label: "氧化剂",
      loadedMassKg: split.loadedOxidizerKg,
      density: propellant.oxidizerDensity,
      temperatureK: propellant.oxidizerTemperatureK,
      pressurePa: config.tanks.pressureMpa * 1e6,
      diameterM,
      material: tankMaterial,
      process: tankProcess,
      propellant,
      config,
      estimatedWetMassKg: estimatedWetMass,
      axialShare: 0.65,
      materialKey: config.tanks.materialKey,
      structureMode: config.tanks.structureMode
    };
    const oxidizerTank = split.loadedOxidizerKg > 0
      ? (layeredTanks ? computeDualLayerTank(Object.assign({}, oxidizerTankOptions, {
        structureMode: config.tanks.structureMode,
        linerMaterial: oxidizerLinerMaterial,
        linerMaterialKey: config.tanks.oxidizerLinerMaterialKey,
        linerProcess: oxidizerLinerProcess,
        linerProcessKey: Object.keys(Data.processes).find(function (key) { return Data.processes[key] === oxidizerLinerProcess; }),
        structuralMaterial: tankStructuralMaterial,
        structuralMaterialKey: config.tanks.structuralMaterialKey,
        structuralProcess: tankStructuralProcess,
        structuralProcessKey: Object.keys(Data.processes).find(function (key) { return Data.processes[key] === tankStructuralProcess; }),
        contactRole: "oxidizer"
      })) : computeTank(oxidizerTankOptions))
      : null;
    if (oxidizerTank) issues.push.apply(issues, oxidizerTank.issues);

    validateMaterialProcess(pumpMaterial, pumpProcess, "涡轮泵", issues);
    validateMaterialProcess(chamberMaterial, hotProcess, "燃烧室", issues);
    validateMaterialProcess(nozzleMaterial, hotProcess, "喷管", issues);
    validateMaterialProcess(airframeMaterial, airframeProcess, "箭体", issues);

    const feedTargetPressurePa = config.engine.chamberPressureMpa * 1e6 * (1 + config.engine.injectorDropPct / 100 + effectiveLineDropPct / 100);
    const pumpDeltaPa = Math.max(0, feedTargetPressurePa - config.tanks.pressureMpa * 1e6);
    let fuelPump;
    let oxidizerPump;
    if (config.engine.cycleKey === "pressure-fed") {
      fuelPump = computePumpSide("燃料", 0, propellant.fuelDensity, propellant.fuelTemperatureK, propellant.fuelVaporPressureKpa, 0, config, pumpMaterial, propellant);
      oxidizerPump = computePumpSide("氧化剂", 0, propellant.oxidizerDensity || 1, propellant.oxidizerTemperatureK, propellant.oxidizerVaporPressureKpa, 0, config, pumpMaterial, propellant);
      if (config.tanks.pressureMpa * 1e6 < feedTargetPressurePa) {
        issues.push(makeIssue("error", "挤压供给", `箱压 ${round(config.tanks.pressureMpa, 2)} MPa 低于所需供给压力 ${round(feedTargetPressurePa / 1e6, 2)} MPa。`, "提高箱压、降低室压或改用泵送循环。"));
      }
    } else {
      const pumpUnitCount = architecture.pumpMode === "independent" ? config.engine.engineCount : 1;
      const fuelPumpUnit = computePumpSide("燃料", fuelMdot / pumpUnitCount, propellant.fuelDensity, propellant.fuelTemperatureK, propellant.fuelVaporPressureKpa, pumpDeltaPa, config, pumpMaterial, propellant);
      const oxidizerPumpUnit = computePumpSide("氧化剂", oxMdot / pumpUnitCount, propellant.oxidizerDensity || 1, propellant.oxidizerTemperatureK, propellant.oxidizerVaporPressureKpa, pumpDeltaPa, config, pumpMaterial, propellant);
      const aggregatePump = function (pump) {
        return Object.assign({}, pump, {
          unitCount: pumpUnitCount,
          perUnitMassKg: pump.massKg,
          perUnitShaftPowerKw: pump.shaftPowerKw,
          mdotKgS: pump.mdotKgS * pumpUnitCount,
          volumeFlowM3S: pump.volumeFlowM3S * pumpUnitCount,
          hydraulicPowerKw: pump.hydraulicPowerKw * pumpUnitCount,
          shaftPowerKw: pump.shaftPowerKw * pumpUnitCount,
          massKg: pump.massKg * pumpUnitCount
        });
      };
      fuelPump = aggregatePump(fuelPumpUnit);
      oxidizerPump = aggregatePump(oxidizerPumpUnit);
      issues.push.apply(issues, fuelPump.issues);
      issues.push.apply(issues, oxidizerPump.issues);
    }
    if (config.engine.cycleKey === "pressure-fed") {
      fuelPump.unitCount = 0;
      oxidizerPump.unitCount = 0;
      fuelPump.perUnitMassKg = 0;
      oxidizerPump.perUnitMassKg = 0;
    }
    const totalShaftPowerKw = fuelPump.shaftPowerKw + oxidizerPump.shaftPowerKw;
    if (config.engine.cycleKey === "expander") {
      const availablePowerKw = fuelMdot * (propellant.flags.indexOf("hydrogen") >= 0 ? 620 : 250);
      if (totalShaftPowerKw > availablePowerKw) {
        issues.push(makeIssue("error", "膨胀循环", `所需轴功 ${round(totalShaftPowerKw, 0)} kW 超过简化冷却吸热可提供的 ${round(availablePowerKw, 0)} kW。`, "降低室压/推力，增大受热面积或改用其他循环。"));
      }
    }

    const barePumpMassKg = fuelPump.massKg + oxidizerPump.massKg;
    const pumpMechanicalMassKg = barePumpMassKg * cycle.massFactor;
    const selectedBattery = getBattery(config);
    let electricMassKg = 0;
    let batterySystem = {
      enabled: false,
      key: selectedBattery.key,
      name: selectedBattery.name,
      type: selectedBattery.type,
      chemistry: selectedBattery.chemistry,
      rechargeable: selectedBattery.rechargeable,
      energyDensityWhKg: selectedBattery.energyDensityWhKg,
      powerDensityWKg: selectedBattery.powerDensityWKg,
      packOverheadPct: selectedBattery.packOverheadPct,
      requiredOutputPowerKw: 0,
      requiredStoredEnergyKwh: 0,
      energyLimitedCellMassKg: 0,
      powerLimitedCellMassKg: 0,
      cellMassKg: 0,
      packMassKg: 0,
      motorControllerMassKg: 0,
      totalElectricalMassKg: 0,
      sizingBasis: "未启用",
      effectiveDischargeRateC: 0,
      costCny: 0,
      note: selectedBattery.note
    };
    if (config.engine.cycleKey === "electric-pump") {
      const duration = usablePropellantKg / Math.max(0.001, totalMassFlowKgS);
      const driveEfficiency = config.engine.batteryEfficiencyPct / 100;
      const requiredOutputPowerKw = totalShaftPowerKw / Math.max(0.5, driveEfficiency);
      const deliveredEnergyKwh = requiredOutputPowerKw * duration / 3600;
      const requiredStoredEnergyKwh = deliveredEnergyKwh * (1 + config.engine.batteryReservePct / 100);
      const energyLimitedCellMassKg = requiredStoredEnergyKwh * 1000 / selectedBattery.energyDensityWhKg;
      const powerLimitedCellMassKg = requiredOutputPowerKw * 1000 / selectedBattery.powerDensityWKg;
      const cellMassKg = Math.max(energyLimitedCellMassKg, powerLimitedCellMassKg);
      const packMassKg = cellMassKg * (1 + selectedBattery.packOverheadPct / 100);
      const motorControllerMassKg = requiredOutputPowerKw / 12;
      electricMassKg = packMassKg + motorControllerMassKg;
      const sizingBasis = powerLimitedCellMassKg > energyLimitedCellMassKg ? "输出功率" : "总能量";
      const effectiveDischargeRateC = requiredStoredEnergyKwh > 1e-9 ? requiredOutputPowerKw / requiredStoredEnergyKwh : 0;
      const batteryCostCny = (packMassKg * selectedBattery.costCnyKg + motorControllerMassKg * 1600) * config.cost.priceScale;
      batterySystem = {
        enabled: true,
        key: selectedBattery.key,
        name: selectedBattery.name,
        type: selectedBattery.type,
        chemistry: selectedBattery.chemistry,
        rechargeable: selectedBattery.rechargeable,
        energyDensityWhKg: selectedBattery.energyDensityWhKg,
        powerDensityWKg: selectedBattery.powerDensityWKg,
        packOverheadPct: selectedBattery.packOverheadPct,
        reservePct: config.engine.batteryReservePct,
        driveEfficiency,
        durationS: duration,
        requiredOutputPowerKw,
        deliveredEnergyKwh,
        requiredStoredEnergyKwh,
        energyLimitedCellMassKg,
        powerLimitedCellMassKg,
        cellMassKg,
        packMassKg,
        motorControllerMassKg,
        totalElectricalMassKg: electricMassKg,
        sizingBasis,
        effectiveDischargeRateC,
        costCny: batteryCostCny,
        note: selectedBattery.note
      };
    }
    const machineryMassKg = pumpMechanicalMassKg + electricMassKg;
    const chamberNozzleMassKg = config.engine.engineCount * (nozzle.chamberMassEachKg + nozzle.nozzleMassEachKg + nozzle.injectorMassEachKg);
    const repeatedUnitFactor = architectureKey === "independent" ? config.engine.engineCount
      : architectureKey === "shared-powerpack" ? 1 + 0.68 * (config.engine.engineCount - 1)
        : 1 + 0.14 * (config.engine.engineCount - 1);
    const repeatedAccessoryMassKg = config.engine.perEngineFixedMassKg * repeatedUnitFactor;
    const commonControlsMassKg = Math.max(8, 0.045 * chamberNozzleMassKg + 0.0025 * totalThrustN / 1000);
    const cycleHardwareKg = commonControlsMassKg * (config.engine.cycleKey === "pressure-fed" ? 0.65 : cycle.massFactor) + repeatedAccessoryMassKg;
    const engineMassKg = chamberNozzleMassKg + machineryMassKg + cycleHardwareKg;

    const totalTankVolume = fuelTank.totalVolumeM3 + (oxidizerTank ? oxidizerTank.totalVolumeM3 : 0);
    const totalFluidVolume = fuelTank.fluidVolumeM3 + (oxidizerTank ? oxidizerTank.fluidVolumeM3 : 0);
    const pressurization = computePressurization(config, totalTankVolume, totalFluidVolume, split.loadedTotalKg);
    const commonBulkheadProcess = config.tanks.commonBulkheadType === "honeycomb"
      ? Data.processes["common-bulkhead-honeycomb"]
      : Data.processes["spin-weld"];
    const commonBulkheadFuelProcess = compatibleTankProcess(commonBulkheadFuelMaterial, commonBulkheadProcess);
    const commonBulkheadOxidizerProcess = compatibleTankProcess(commonBulkheadOxidizerMaterial, commonBulkheadProcess);
    const commonBulkhead = computeCommonBulkhead({
      config, fuelTank, oxidizerTank, propellant, process: commonBulkheadProcess,
      fuelFaceMaterial: commonBulkheadFuelMaterial, oxidizerFaceMaterial: commonBulkheadOxidizerMaterial,
      fuelFaceProcess: commonBulkheadFuelProcess, oxidizerFaceProcess: commonBulkheadOxidizerProcess,
      fuelTemperatureK: propellant.fuelTemperatureK, oxidizerTemperatureK: propellant.oxidizerTemperatureK
    });
    if (commonBulkhead) issues.push.apply(issues, commonBulkhead.issues);
    const tankMassKg = fuelTank.totalMassKg + (oxidizerTank ? oxidizerTank.totalMassKg : 0) + (commonBulkhead ? commonBulkhead.netMassDeltaKg : 0);
    const distributionSeverity = architectureKey === "independent" ? 1.0 : architectureKey === "shared-powerpack" ? 1.25 : 0.45;
    const clusterManifoldMassKg = config.engine.engineCount <= 1 ? 0 : distributionSeverity * (config.engine.engineCount - 1) * (3.5 + 1.1 * Math.pow(Math.max(0.01, totalMassFlowKgS), 0.55));
    const plumbingMassKg = Math.max(10, split.loadedTotalKg * 0.008 + totalMassFlowKgS * 1.8) + clusterManifoldMassKg;
    const clusterThrustFrameMassKg = config.engine.engineCount <= 1 ? 0 : (architectureKey === "ideal-multi-chamber" ? 0.48 : 1) * (config.engine.engineCount * 2.8 + totalThrustN / 1000 * 0.011 * Math.pow(config.engine.engineCount - 1, 0.72));
    const vibrationPenaltyMassKg = config.engine.engineCount <= 1 ? 0 : (engineMassKg + totalThrustN / 1000 * 0.02) * (architectureKey === "ideal-multi-chamber" ? 0.004 : architectureKey === "shared-powerpack" ? 0.018 : 0.014) * Math.pow(config.engine.engineCount - 1, 0.78);
    const mountMassKg = Math.max(8, engineMassKg * 0.09 + totalThrustN / 1000 * 0.018) + clusterThrustFrameMassKg + vibrationPenaltyMassKg;
    const fairingLengthM = Math.max(0.8, diameterM * 1.4);
    const baselineTankStackLengthM = fuelTank.geometry.totalLengthM + (oxidizerTank ? oxidizerTank.geometry.totalLengthM + diameterM * 0.18 : 0);
    const tankStackLengthM = baselineTankStackLengthM - (commonBulkhead ? commonBulkhead.lengthSavingM : 0);
    const baseSkirtLengthM = clusterLayout.requiresExpansion ? Math.max(0.2, (clusterLayout.baseDiameterM - diameterM) * 1.15) : 0;
    // Keep secondary shortening benefits out of the solved mass model. They are
    // estimated below as a clearly labelled reference-only common-bulkhead trade.
    const externalAreaM2 = Math.PI * diameterM * (baselineTankStackLengthM + fairingLengthM + nozzle.engineLengthM * 0.45) + Math.PI * (diameterM + clusterLayout.baseDiameterM) / 2 * baseSkirtLengthM;
    const airframeMinShellKg = externalAreaM2 * Math.max(airframeMaterial.minGauge / 1000, 0.00065) * airframeMaterial.density * 0.72;
    const empiricalStructureKg = (split.loadedTotalKg + engineMassKg + config.vehicle.payloadKg) * config.vehicle.structuralFactor;
    const airframeMassKg = Math.max(airframeMinShellKg, empiricalStructureKg) * (2 - airframeProcess.strengthFactor);
    if (commonBulkhead) {
      const externalAreaSavingM2 = Math.PI * diameterM * commonBulkhead.lengthSavingM;
      const referenceSkinThicknessM = Math.max(airframeMaterial.minGauge / 1000, 0.00065);
      const airframeSkinReferenceSavingKg = externalAreaSavingM2 * referenceSkinThicknessM * airframeMaterial.density * 0.72 * Math.max(0.2, 2 - airframeProcess.strengthFactor);
      const surfaceSystemsReferenceSavingKg = externalAreaSavingM2 * 0.35;
      const routingSupportReferenceSavingKg = commonBulkhead.lengthSavingM * (1.4 + 0.55 * diameterM + 0.25 * config.engine.engineCount);
      commonBulkhead.indirectAdvantages = {
        appliedToMass: false,
        baselineTankStackLengthM,
        shortenedTankStackLengthM: tankStackLengthM,
        lengthSavingM: commonBulkhead.lengthSavingM,
        externalAreaSavingM2,
        referenceSkinThicknessM,
        airframeSkinReferenceSavingKg,
        surfaceSystemsReferenceSavingKg,
        routingSupportReferenceSavingKg,
        totalReferenceSavingKg: airframeSkinReferenceSavingKg + surfaceSystemsReferenceSavingKg + routingSupportReferenceSavingKg,
        note: "缩短箭体带来的蒙皮、表面系统和布线支撑潜在节省仅供方案比较；未回写结构干重、起飞质量、Δv、飞行或成本。"
      };
    }
    const avionicsMassKg = Math.max(0, config.vehicle.avionicsKg);
    const vehicleDryMassKg = tankMassKg + engineMassKg + pressurization.totalMassKg + plumbingMassKg + mountMassKg + airframeMassKg + avionicsMassKg;
    const wetMassKg = vehicleDryMassKg + config.vehicle.payloadKg + split.loadedTotalKg;
    const burnoutMassKg = vehicleDryMassKg + config.vehicle.payloadKg + split.residualKg;
    const idealDeltaV = ispS * G0 * Math.log(wetMassKg / Math.max(1, burnoutMassKg));
    const twr = totalThrustN / (wetMassKg * launchGravityMs2);
    const liftoffNetAccelMs2 = totalThrustN / wetMassKg - launchGravityMs2;
    const burnTimeS = usablePropellantKg / Math.max(0.001, totalMassFlowKgS);
    const vehicleLengthM = fairingLengthM + tankStackLengthM + diameterM * 0.22 + nozzle.engineLengthM + baseSkirtLengthM;
    const singleUnitReliability = config.engine.singleUnitReliabilityPct / 100;
    const commonPowerpackReliability = architectureKey === "independent" ? 1 : config.engine.sharedPowerpackReliabilityPct / 100;
    const engineOutTwr = config.engine.engineCount > 1 ? totalThrustN * (config.engine.engineCount - 1) / config.engine.engineCount / (wetMassKg * launchGravityMs2) : 0;
    const oneEngineOutCapable = config.engine.allowOneEngineOut && config.engine.engineCount > 1 && engineOutTwr >= 1.05;
    const allUnitsSuccess = Math.pow(singleUnitReliability, config.engine.engineCount);
    const exactlyOneUnitFails = config.engine.engineCount * (1 - singleUnitReliability) * Math.pow(singleUnitReliability, config.engine.engineCount - 1);
    const localClusterReliability = oneEngineOutCapable ? allUnitsSuccess + exactlyOneUnitFails : allUnitsSuccess;
    const missionReliability = localClusterReliability * commonPowerpackReliability;
    const clusterReliability = {
      singleUnitReliabilityPct: singleUnitReliability * 100,
      commonPowerpackReliabilityPct: commonPowerpackReliability * 100,
      allUnitsSuccessPct: allUnitsSuccess * 100,
      localClusterReliabilityPct: localClusterReliability * 100,
      missionReliabilityPct: missionReliability * 100,
      allowOneEngineOut: config.engine.allowOneEngineOut,
      oneEngineOutCapable,
      engineOutTwr,
      expectedThrustAfterOneFailureN: config.engine.engineCount > 1 ? totalThrustN * (config.engine.engineCount - 1) / config.engine.engineCount : 0
    };

    const heatFluxMwM2 = 2.4 * Math.pow(config.engine.chamberPressureMpa / 10, 0.8) * Math.pow(Math.max(0.03, nozzle.throatDiameterM) / 0.15, -0.18);
    const coolingCapacityMw = config.engine.coolingKey === "regenerative"
      ? fuelMdot * (propellant.flags.indexOf("hydrogen") >= 0 ? 3.8 : 1.6)
      : config.engine.coolingKey === "ablative" ? chamberNozzleMassKg * 0.035 : nozzle.nozzleMassEachKg * config.engine.engineCount * 0.018;
    const heatDemandMw = heatFluxMwM2 * Math.PI * nozzle.throatDiameterM * Math.max(0.15, nozzle.chamberLengthM) * config.engine.engineCount;
    const coolingMargin = coolingCapacityMw / Math.max(0.001, heatDemandMw);
    if (coolingMargin < 1) {
      issues.push(makeIssue("error", "热管理", `冷却能力/估算热负荷比仅 ${round(coolingMargin, 2)}。`, "增加冷却流量、改变冷却方式、降低室压或换用高温材料。"));
    } else if (coolingMargin < 1.25) {
      issues.push(makeIssue("warning", "热管理", `冷却裕度仅 ${round((coolingMargin - 1) * 100, 0)}%。`, "为换热恶化和制造偏差保留更大余量。"));
    }
    if (!coolingMode.reusable && burnTimeS > 120) {
      issues.push(makeIssue("warning", "烧蚀冷却", `估算燃时 ${round(burnTimeS, 0)} s 较长，烧蚀质量模型不确定性高。`, "缩短试车/燃时或改用再生冷却。"));
    }
    if (twr <= 1) {
      issues.push(makeIssue("error", "起飞", `${environment.body.name}场景推重比仅 ${round(twr, 2)}，无法离架。`, "提高推力、减少质量或增加发动机数量。"));
    } else if (twr < 1.15) {
      issues.push(makeIssue("warning", "起飞", `起飞推重比 ${round(twr, 2)} 偏低，重力损失会较大。`, "提高目标推重比或减轻结构。"));
    }
    if (config.engine.allowOneEngineOut && config.engine.engineCount > 1 && !oneEngineOutCapable) {
      issues.push(makeIssue("warning", "发动机失效", `损失一台发动机后推重比为 ${round(engineOutTwr, 2)}，不足以保留 1.05 的继续上升裕度。`, "提高集群总推力、降低起飞质量，或把任务可靠性按任一发动机失效即任务失败计算。"));
    }
    if (missionReliability < 0.95) {
      issues.push(makeIssue("error", "推进任务可靠性", `简化任务成功率仅 ${round(missionReliability * 100, 3)}%。`, "提高单台/共用动力包可靠性、减少发动机数量，或提供具备推重比裕度的发动机失效继续能力。"));
    } else if (missionReliability < 0.995) {
      issues.push(makeIssue("warning", "推进任务可靠性", `简化任务成功率为 ${round(missionReliability * 100, 3)}%。`, "检查重复部件失效率、共因故障和一台失效后的推力裕度。"));
    }
    if (propellant.flags.indexOf("toxic") >= 0 || propellant.flags.indexOf("fluorine") >= 0 || propellant.flags.indexOf("hypergolic") >= 0) {
      issues.push(makeIssue("warning", "推进剂安全", `${propellant.name} 具有${propellant.toxicity}毒性、${propellant.corrosivity}腐蚀性或自燃/强反应性。`, "仅作教学比较，不据此进行采购、储运或试验。"));
    }

    const rawPrice = function (configured, material) { return Math.max(0, Number(configured) || material.price); };
    const componentCost = function (label, massKg, material, process, priceOverride, extraFactor, category) {
      const unit = rawPrice(priceOverride, material);
      const factor = extraFactor == null ? 1 : Math.max(0, extraFactor);
      const multiplier = material.scarcity * process.waste * process.difficulty * factor;
      const cost = massKg * unit * multiplier * config.cost.priceScale;
      return { label, category, massKg, material: material.name, process: process.name, unitPrice: unit, multiplier, costCny: cost, advantage: process.advantage };
    };
    const tankCostBom = layeredTanks ? [
      componentCost("储箱外承力层、界面与绝热", fuelTank.structuralLayer.massKg + fuelTank.insulationMassKg + (fuelTank.interfaceMassKg || 0) + (oxidizerTank ? oxidizerTank.structuralLayer.massKg + oxidizerTank.insulationMassKg + (oxidizerTank.interfaceMassKg || 0) : 0), tankStructuralMaterial, tankStructuralProcess, tankStructuralMaterial.price, 1, "tanks"),
      componentCost(`${propellant.mono ? "推进剂" : "燃料"}箱内衬`, fuelTank.linerLayer.massKg, fuelLinerMaterial, fuelLinerProcess, fuelLinerMaterial.price, 1, "tanks")
    ] : [
      componentCost("燃料与氧化剂储箱", fuelTank.totalMassKg + (oxidizerTank ? oxidizerTank.totalMassKg : 0), tankMaterial, tankProcess, config.cost.tankPriceCnyKg, config.tanks.structureMode === "balloon" ? 1.8 : config.tanks.structureMode === "stiffened" ? 1.35 : config.tanks.structureMode === "sandwich" ? 1.55 : 1, "tanks")
    ];
    if (layeredTanks && oxidizerTank) {
      tankCostBom.push(componentCost("氧化剂箱内衬", oxidizerTank.linerLayer.massKg, oxidizerLinerMaterial, oxidizerLinerProcess, oxidizerLinerMaterial.price, 1, "tanks"));
    }
    if (commonBulkhead) {
      const pricedMass = function (massKg, material, pricedProcess, factor) {
        return massKg * material.price * material.scarcity * pricedProcess.waste * pricedProcess.difficulty * factor * config.cost.priceScale;
      };
      const fuelFaceBaseCost = pricedMass(commonBulkhead.faces.fuel.massKg, commonBulkheadFuelMaterial, commonBulkheadFuelProcess, commonBulkhead.costFactor);
      const oxidizerFaceBaseCost = commonBulkhead.faces.oxidizer
        ? pricedMass(commonBulkhead.faces.oxidizer.massKg, commonBulkheadOxidizerMaterial, commonBulkheadOxidizerProcess, commonBulkhead.costFactor)
        : 0;
      const coreAndBarrierUnitPrice = commonBulkhead.type === "honeycomb" ? 980 : commonBulkhead.type === "vacuum" ? 1350 : commonBulkheadFuelMaterial.price;
      const coreAndBarrierBaseCost = commonBulkhead.insulationMassKg * coreAndBarrierUnitPrice * (commonBulkhead.type === "single-sheet" ? 1.4 : commonBulkheadProcess.difficulty) * config.cost.priceScale;
      const commonBulkheadRingMaterial = commonBulkhead.faces.oxidizer ? commonBulkheadOxidizerMaterial : commonBulkheadFuelMaterial;
      const ringAndSealBaseCost = commonBulkhead.connectionAndMonitoringMassKg * commonBulkheadRingMaterial.price * commonBulkheadRingMaterial.scarcity * 2.2 * config.cost.priceScale;
      const ndeAndToolingBaseCost = commonBulkhead.geometry.curvedAreaM2 * (commonBulkhead.type === "honeycomb" ? 3800 : commonBulkhead.type === "vacuum" ? 2800 : 1200) * config.cost.priceScale;
      const commonBulkheadBaseCost = fuelFaceBaseCost + oxidizerFaceBaseCost + coreAndBarrierBaseCost + ringAndSealBaseCost + ndeAndToolingBaseCost;
      const removedDomeMaterial = layeredTanks ? tankStructuralMaterial : tankMaterial;
      const removedDomeProcess = layeredTanks ? tankStructuralProcess : tankProcess;
      const removedDomeCredit = commonBulkhead.removedDomeMassKg * removedDomeMaterial.price * removedDomeMaterial.scarcity * removedDomeProcess.waste * removedDomeProcess.difficulty * 0.65 * config.cost.priceScale;
      tankCostBom.push({
        label: `共底结构净影响 · ${commonBulkhead.typeName}`,
        category: "tanks",
        massKg: commonBulkhead.netMassDeltaKg,
        material: commonBulkhead.materialName,
        process: commonBulkheadProcess.name,
        unitPrice: commonBulkhead.addedMassKg > 0 ? commonBulkheadBaseCost / commonBulkhead.addedMassKg : 0,
        multiplier: commonBulkhead.costFactor,
        costCny: commonBulkheadBaseCost - removedDomeCredit,
        costRole: "common-bulkhead-net",
        pricingMassKg: commonBulkhead.addedMassKg,
        creditMassKg: commonBulkhead.removedDomeMassKg,
        grossAddedBaseCostCny: commonBulkheadBaseCost,
        removedDomeBaseCreditCny: removedDomeCredit,
        advantage: `BOM 质量只显示共底替代相邻封头后的净变化；新增共底毛质量 ${round(commonBulkhead.addedMassKg, 1)} kg 仅作为新增制造计价基准，取消封头 ${round(commonBulkhead.removedDomeMassKg, 1)} kg 作为避免成本基准。`
      });
      commonBulkhead.costing = {
        creditRatePct: 65,
        breakdownBaseCny: {
          fuelFace: fuelFaceBaseCost,
          oxidizerFace: oxidizerFaceBaseCost,
          coreAndBarrier: coreAndBarrierBaseCost,
          ringsSealsAndMonitoring: ringAndSealBaseCost,
          ndeAndTooling: ndeAndToolingBaseCost
        },
        grossAddedBaseCostCny: commonBulkheadBaseCost,
        removedDomeBaseCreditCny: removedDomeCredit,
        netBaseCostImpactCny: commonBulkheadBaseCost - removedDomeCredit
      };
    }
    if (config.tanks.structureMode === "balloon") {
      const supportMass = fuelTank.groundSupportMassKg + (oxidizerTank ? oxidizerTank.groundSupportMassKg : 0);
      tankCostBom.push({ label: "气球储箱地面张紧、维形供气与专用工装", category: "tanks", massKg: 0, material: "地面保障系统", process: "专用工装、检漏与压力联锁", unitPrice: 1800, multiplier: 1, costCny: supportMass * 1800 * config.cost.priceScale, advantage: `参考工装质量 ${round(supportMass, 1)} kg，不计入飞行质量。` });
    }
    const repeatedUnitCostFactor = architectureKey === "independent" ? config.engine.engineCount
      : architectureKey === "shared-powerpack" ? 1 + 0.72 * (config.engine.engineCount - 1)
        : 1 + 0.12 * (config.engine.engineCount - 1);
    const clusterIntegrationMassKg = clusterManifoldMassKg + clusterThrustFrameMassKg + vibrationPenaltyMassKg;
    const manufacturingBom = tankCostBom.concat([
      componentCost("箭体与整流罩", airframeMassKg, airframeMaterial, airframeProcess, config.cost.airframePriceCnyKg, 1, "airframe"),
      componentCost("泵、阀与循环机械", pumpMechanicalMassKg + Math.max(0, cycleHardwareKg - repeatedAccessoryMassKg) + Math.max(0, plumbingMassKg - clusterManifoldMassKg), pumpMaterial, pumpProcess, config.cost.pumpPriceCnyKg, cycle.costFactor, "pumps"),
      componentCost("燃烧室与喷管", chamberNozzleMassKg, chamberMaterial, hotProcess, config.cost.hotPriceCnyKg, cycle.costFactor, "hot-section"),
      {
        label: "发动机重复附件与验收试车",
        category: "pumps",
        massKg: repeatedAccessoryMassKg,
        material: "控制器、阀门、点火器、万向节与安装件",
        process: architecture.name,
        unitPrice: repeatedAccessoryMassKg > 0 ? config.engine.perEngineFixedCostCny * repeatedUnitCostFactor / repeatedAccessoryMassKg : 0,
        multiplier: config.cost.priceScale,
        costCny: config.engine.perEngineFixedCostCny * repeatedUnitCostFactor * config.cost.priceScale,
        advantage: `按 ${round(repeatedUnitCostFactor, 2)} 个等效重复单元计入制造、验收与单机试车。`
      },
      componentCost("集群推力架、分流管路与振动修正", clusterIntegrationMassKg, pumpMaterial, pumpProcess, config.cost.pumpPriceCnyKg, 1.35 * distributionSeverity, "pumps")
    ]);
    if (batterySystem.enabled) {
      manufacturingBom.push({
        label: "电池、电机与控制器",
        category: "other",
        massKg: batterySystem.totalElectricalMassKg,
        material: `${batterySystem.chemistry}＋电气系统`,
        process: "电池包与驱动集成",
        unitPrice: selectedBattery.costCnyKg,
        multiplier: 1,
        costCny: batterySystem.costCny,
        advantage: `${batterySystem.sizingBasis}控制质量；电池包另计，不套用 0.10× 热机械发动机成本修正。`
      });
    }
    const baseMountMassKg = Math.max(0, mountMassKg - clusterThrustFrameMassKg - vibrationPenaltyMassKg);
    manufacturingBom.push({ label: "增压、安装与航电", category: "other", massKg: pressurization.totalMassKg + baseMountMassKg + avionicsMassKg, material: "混合部件", process: "系统集成", unitPrice: 260, multiplier: 1, costCny: (pressurization.totalMassKg + baseMountMassKg + avionicsMassKg) * 260 * config.cost.priceScale, advantage: "包含控制、测试和装配复杂度的简化修正。" });
    const manufacturingSubtotalCostCny = manufacturingBom.reduce(function (sum, row) { return sum + row.costCny; }, 0);
    const clusterAssemblyFactor = 1 + (architectureKey === "ideal-multi-chamber" ? 0.008 : architectureKey === "shared-powerpack" ? 0.045 : 0.035) * Math.pow(Math.max(0, config.engine.engineCount - 1), 1.1);
    const manufacturingAdjustment = config.cost.assemblyFactor * coolingMode.costFactor * clusterAssemblyFactor;
    manufacturingBom.forEach(function (row) {
      row.baseCostCny = row.costCny;
      row.costCny *= manufacturingAdjustment;
      row.multiplier *= config.cost.priceScale * manufacturingAdjustment;
    });
    if (commonBulkhead && commonBulkhead.costing) {
      commonBulkhead.costing.breakdownCny = Object.keys(commonBulkhead.costing.breakdownBaseCny).reduce(function (output, key) {
        output[key] = commonBulkhead.costing.breakdownBaseCny[key] * manufacturingAdjustment;
        return output;
      }, {});
      commonBulkhead.costing.grossAddedCostCny = commonBulkhead.costing.grossAddedBaseCostCny * manufacturingAdjustment;
      commonBulkhead.costing.removedDomeCreditCny = commonBulkhead.costing.removedDomeBaseCreditCny * manufacturingAdjustment;
      commonBulkhead.costing.netCostImpactCny = commonBulkhead.costing.netBaseCostImpactCny * manufacturingAdjustment;
    }
    const propellantCostRow = function (label, name, massKg, unitPrice) {
      const costCny = massKg * unitPrice * config.cost.priceScale;
      return {
        label,
        category: "propellant",
        massKg,
        material: name,
        process: "采购、净化、储运与加注参考",
        unitPrice,
        multiplier: config.cost.priceScale,
        baseCostCny: costCny,
        costCny,
        advantage: "按装载质量（含残余）和可编辑人民币参考单价概算；不代表实时报价。"
      };
    };
    const propellantBom = [
      propellantCostRow(propellant.mono ? `推进剂 · ${propellant.fuelName}` : `燃料 · ${propellant.fuelName}`, propellant.fuelName, split.loadedFuelKg, config.cost.fuelPriceCnyKg)
    ];
    if (!propellant.mono && split.loadedOxidizerKg > 0) {
      propellantBom.push(propellantCostRow(`氧化剂 · ${propellant.oxidizerName}`, propellant.oxidizerName, split.loadedOxidizerKg, config.cost.oxidizerPriceCnyKg));
    }
    const propellantCostCny = propellantBom.reduce(function (sum, row) { return sum + row.costCny; }, 0);
    const manufacturingCostCny = manufacturingBom.reduce(function (sum, row) { return sum + row.costCny; }, 0);
    const bom = propellantBom.concat(manufacturingBom);
    const subtotalCost = manufacturingSubtotalCostCny + propellantCostCny;
    const totalCostCny = manufacturingCostCny + propellantCostCny;
    const finishedMass = manufacturingBom.reduce(function (sum, row) { return sum + row.massKg; }, 0);
    const referenceCost = Math.max(1, finishedMass * Data.materials["ss-304l"].price * 1.0 * Data.processes["sheet-weld"].waste * Data.processes["sheet-weld"].difficulty);
    const costIndex = manufacturingCostCny / referenceCost;
    const breakdownLabels = { propellant: "推进剂", tanks: "储罐", airframe: "箭体", pumps: "泵/阀", "hot-section": "燃烧室/喷管", other: "增压/航电等" };
    const breakdown = ["propellant", "tanks", "airframe", "pumps", "hot-section", "other"].map(function (category) {
      const costCny = bom.reduce(function (sum, row) { return sum + (row.category === category ? row.costCny : 0); }, 0);
      return { category, label: breakdownLabels[category], costCny, sharePct: totalCostCny > 0 ? costCny / totalCostCny * 100 : 0 };
    });
    const massBreakdown = [
      { category: "propellant", label: "推进剂", massKg: split.loadedTotalKg },
      { category: "payload", label: "载荷", massKg: config.vehicle.payloadKg },
      { category: "tanks", label: "储箱", massKg: tankMassKg },
      { category: "airframe", label: "箭体", massKg: airframeMassKg },
      { category: "propulsion", label: "发动机/管路", massKg: engineMassKg + plumbingMassKg + mountMassKg },
      { category: "support", label: "增压/航电", massKg: pressurization.totalMassKg + avionicsMassKg }
    ].map(function (entry) {
      return Object.assign({}, entry, { sharePct: wetMassKg > 0 ? entry.massKg / wetMassKg * 100 : 0 });
    });
    const liftoffBreakdown = [
      { category: "propellant", label: "推进剂", massKg: split.loadedTotalKg },
      { category: "dry", label: "结构干重", massKg: vehicleDryMassKg },
      { category: "payload", label: "载荷", massKg: config.vehicle.payloadKg }
    ].map(function (entry) {
      return Object.assign({}, entry, { sharePct: wetMassKg > 0 ? entry.massKg / wetMassKg * 100 : 0 });
    });
    const dryBreakdownIncludesPayload = config.vehicle.includePayloadInDryBreakdown;
    const dryBreakdownBaseKg = vehicleDryMassKg + (dryBreakdownIncludesPayload ? config.vehicle.payloadKg : 0);
    const dryBreakdown = [
      { category: "tanks", label: "储箱", massKg: tankMassKg, included: true },
      { category: "propulsion", label: "发动机/管路", massKg: engineMassKg + plumbingMassKg + mountMassKg, included: true },
      { category: "airframe", label: "箭体", massKg: airframeMassKg, included: true },
      { category: "support", label: "增压/航电", massKg: pressurization.totalMassKg + avionicsMassKg, included: true },
      { category: "payload", label: "载荷", massKg: config.vehicle.payloadKg, included: dryBreakdownIncludesPayload }
    ].map(function (entry) {
      return Object.assign({}, entry, {
        sharePct: entry.included && dryBreakdownBaseKg > 0 ? entry.massKg / dryBreakdownBaseKg * 100 : null
      });
    });
    const dryMassRatio = vehicleDryMassKg > 0 ? wetMassKg / vehicleDryMassKg : 0;
    const dryMassFraction = wetMassKg > 0 ? vehicleDryMassKg / wetMassKg : 0;

    const formulas = [
      { id: "body-gravity", title: "天体重力随高度变化", formula: "g(h) = gsurface · [R / (R + h)]²", inputs: `${environment.body.name}：gsurface=${round(environment.body.gravityMs2, 3)} m/s²，R=${round(environment.body.radiusM / 1000, 1)} km，h=${round(config.vehicle.launchAltitudeM / 1000, 2)} km`, result: launchGravityMs2, unit: "m/s²", source: "NASA/JPL 天体事实页与平方反比重力", assumption: "天体视为球对称，不计自转、地形和第三体引力。" },
      { id: "rocket-equation", title: "理想速度增量", formula: "Δv = Isp · g₀ · ln(m₀ / m₁)", inputs: `Isp=${round(ispS, 1)} s，m₀=${round(wetMassKg, 0)} kg，m₁=${round(burnoutMassKg, 0)} kg`, result: idealDeltaV, unit: "m/s", source: "NASA Glenn 理想火箭方程", assumption: "定常有效比冲；结果未扣除重力和阻力损失。" },
      { id: "thrust-flow", title: "推力与质量流量", formula: "ṁ = F / (Isp · g₀)", inputs: `F=${round(totalThrustN / 1000, 1)} kN，Isp=${round(ispS, 1)} s`, result: totalMassFlowKgS, unit: "kg/s", source: "NASA Glenn 推力/比冲关系", assumption: "使用环境修正后的有效比冲。" },
      { id: "tank-hoop", title: layeredTanks ? "分层储箱总壁厚与载荷共享" : "储箱环向壁厚", formula: layeredTanks ? (config.tanks.structureMode === "dual" ? "t总 = t内(0.05·载荷) + t外(0.95·载荷)" : "fi = Ei(T)·ti / Σ[Ej(T)·tj]；t总 = t内 + t外") : "t = p · r / (σallow · ηweld)", inputs: layeredTanks ? `p=${round(config.tanks.pressureMpa, 3)} MPa，D=${round(diameterM, 3)} m，内衬=${fuelTank.linerLayer.materialName}，外层=${fuelTank.structuralLayer.materialName}，内衬分担=${round(fuelTank.loadSharing.linerFraction * 100, 1)}%` : `p=${round(config.tanks.pressureMpa, 3)} MPa，D=${round(diameterM, 3)} m，σallow=${round(fuelTank.allowableMpa, 1)} MPa`, result: fuelTank.cylinderThicknessM * 1000, unit: "mm", source: "薄壁压力容器与共同应变刚度分配的教学估算", assumption: layeredTanks ? (config.tanks.structureMode === "dual" ? "旧版兼容预设固定 5:95，仅用于与历史方案对比。" : `按 ${fuelTank.interfaceMode} 界面迭代刚度分配，并叠加热膨胀失配、预应力、层间剪切和卸压皱曲。`) : "叠加纵向/轴向与最小工艺厚度取控制值；另行进行折减屈曲校核。" },
      { id: "tank-buckling", title: "储箱轴向屈曲折减", formula: "σcr = kimperfection · 0.605·E·t/r · kstiff + σpressure-stabilization", inputs: `轴向应力=${round(fuelTank.buckling.axialStressMpa, 2)} MPa，理想临界=${round(fuelTank.buckling.idealCriticalMpa, 2)} MPa，折减=${round(config.tanks.bucklingKnockdownPct, 0)}%，椭圆度=${round(config.tanks.ovalityPct, 2)}%`, result: fuelTank.buckling.utilization * 100, unit: "% 利用率", source: "NASA SP-8007 薄壁圆筒屈曲思想的教学级折减模型", assumption: "把几何缺陷、边界和内压稳定作用简化为折减系数；不替代非线性屈曲有限元与试验。" },
      { id: "pump-power", title: "泵轴功率", formula: "Pshaft = Σ[(Qunit · Δp) / ηpump]", inputs: `架构=${architecture.name}，泵组数=${fuelPump.unitCount || 0}，Q总=${round(fuelPump.volumeFlowM3S + oxidizerPump.volumeFlowM3S, 4)} m³/s，Δp=${round(pumpDeltaPa / 1e6, 2)} MPa`, result: totalShaftPowerKw, unit: "kW", source: "不可压缩流体液压功率", assumption: `基础管路压降 ${round(config.engine.lineDropPct, 2)}% Pc，集群分流附加 ${round(clusterLineDropPct, 2)}% Pc；泵效率为用户输入。` },
      { id: "nozzle-throat", title: "喷管喉部面积", formula: "At = F / (Cf · Pc)", inputs: `每台推力=${round(totalThrustN / config.engine.engineCount / 1000, 1)} kN，Cf=${round(nozzle.thrustCoefficient, 3)}，Pc=${round(config.engine.chamberPressureMpa, 2)} MPa`, result: nozzle.throatAreaM2, unit: "m²/台", source: "NASA Glenn 喷管与推力方程", assumption: "理想气体、等熵膨胀并用有效比冲修正真实损失。" },
      { id: "manufacturing-cost", title: "总成本概算", formula: "C总 = C制造 · 装配/冷却/集群修正 + C重复附件试车 + Σ(m推进剂 · 参考单价)", inputs: `制造=${round(manufacturingCostCny, 0)} 元，推进剂=${round(propellantCostCny, 0)} 元，集群装配=${round(clusterAssemblyFactor, 3)}×`, result: totalCostCny, unit: "元", source: "教学型相对成本模型", assumption: "推进剂按装载质量计入；重复附件含单机验收试车，但不含研发、设施、任务认证、税费和市场波动。" }
    ];
    formulas.splice(1, 0, {
      id: "liftoff-target",
      title: "起飞目标推力",
      formula: config.vehicle.liftoffTargetMode === "acceleration" ? "F = m · [g当地 + a净目标]" : "F = m · g当地 · (T/W)目标",
      inputs: config.vehicle.liftoffTargetMode === "acceleration"
        ? `m=${round(wetMassKg, 0)} kg，g当地=${round(launchGravityMs2, 3)} m/s²，a净目标=${round(config.vehicle.targetLiftoffAccelMs2, 2)} m/s²`
        : `m=${round(wetMassKg, 0)} kg，g当地=${round(launchGravityMs2, 3)} m/s²，目标 T/W=${round(config.vehicle.targetTwr, 2)}`,
      result: totalThrustN,
      unit: "N",
      source: "牛顿第二定律与局部重力",
      assumption: "仅用于非固定推力反算；忽略离架瞬间阻力与发射架反力。"
    });
    formulas.splice(2, 0, {
      id: "dry-mass-ratio",
      title: "干质比",
      formula: "R干 = m湿 / m干",
      inputs: `湿质量=${round(wetMassKg, 1)} kg，结构干重=${round(vehicleDryMassKg, 1)} kg`,
      result: dryMassRatio,
      unit: "无量纲",
      source: "火箭质量比的教学定义",
      assumption: "此处干重为飞行器结构干重，不含推进剂与载荷；任务末质量比 m₀/mf 另由理想火箭方程中的燃尽质量定义。"
    });
    formulas.splice(2, 0,
      {
        id: "cluster-envelope",
        title: "发动机集群排布包络",
        formula: "Dbase = 2 · max(喷口中心半径 + De/2 + 万向余量)",
        inputs: `N=${config.engine.engineCount}，De=${round(nozzle.exitDiameterM, 3)} m，净间隙=${round(config.engine.nozzleClearancePct, 1)}%，箭体直径=${round(diameterM, 2)} m`,
        result: clusterLayout.requiredDiameterM,
        unit: "m",
        source: "教学型二维喷口中心排布与圆包络",
        assumption: "1–9 台采用预设对称排布，并预留 8% 喷口直径的万向摆动包络。"
      },
      {
        id: "cluster-reliability",
        title: "推进任务可靠性",
        formula: oneEngineOutCapable ? "R = Rcommon · [pᴺ + N(1-p)pᴺ⁻¹]" : "R = Rcommon · pᴺ",
        inputs: `p=${round(singleUnitReliability * 100, 3)}%，N=${config.engine.engineCount}，Rcommon=${round(commonPowerpackReliability * 100, 3)}%，失效后 T/W=${round(engineOutTwr, 2)}`,
        result: missionReliability * 100,
        unit: "%",
        source: "独立同分布单元的二项可靠性教学模型",
        assumption: oneEngineOutCapable ? "允许且具备一台失效后的推力裕度；未计两台同时失效和随时间变化的失效率。" : "任一局部发动机失效即判任务推进失败；共用动力包作为共因串联系统。"
      }
    );
    if (commonBulkhead) {
      formulas.splice(4, 0,
        {
          id: "common-bulkhead",
          title: "共底质量与长度收益",
          formula: "Δm = (m两侧面板 + m芯层/热障 + mY环/密封/监测) − (m燃料侧取消封头 + m氧化剂侧取消封头)",
          inputs: `面板=${round(commonBulkhead.bulkheadShellMassKg, 1)} kg，芯层/热障=${round(commonBulkhead.insulationMassKg, 1)} kg，环件/密封/监测=${round(commonBulkhead.connectionAndMonitoringMassKg, 1)} kg，取消封头=${round(commonBulkhead.removedDomeMassKg, 1)} kg`,
          result: commonBulkhead.netMassDeltaKg,
          unit: "kg 净变化",
          source: "NASA S-II / Ares I 共底制造资料的部件级教学概算",
          assumption: "被取消封头按实际厚度加权分摊壳体、加筋和绝热质量；新增共底不再用固定面密度或任意 1.18 面积系数。"
        },
        {
          id: "common-bulkhead-pressure",
          title: "共底曲率、双向压差与屈曲",
          formula: "R=(a²+h²)/(2h)；t膜=pR/(2σallow)；pcr=2E/[√(3(1−ν²))]·(t/R)²·K缺陷",
          inputs: `模式=${commonBulkhead.pressureModeName}，a=${round(commonBulkhead.geometry.radiusM, 3)} m，h=${round(commonBulkhead.geometry.domeRiseM, 3)} m，证明压差=${round(commonBulkhead.pressureEnvelope.designDifferentialPressurePa / 1000, 1)} kPa，K=${round(commonBulkhead.stability.bucklingFactor, 3)}`,
          result: Math.max(commonBulkhead.pressureEnvelope.designBurstUtilization, commonBulkhead.pressureEnvelope.designCollapseUtilization) * 100,
          unit: "% 控制利用率",
          source: "NASA SP-8088 共底双向爆破/塌陷要求与球壳经典屈曲教学式",
          assumption: commonBulkhead.type === "honeycomb" ? "蜂窝夹芯以两面板弯曲刚度求等效稳定性，并限制芯层压溃、面板起皱及可计入的夹芯增益。" : commonBulkhead.type === "vacuum" ? "两张独立壳分别按各自箱压对真空间隙定尺寸，不把真空间隙视为承力芯层。" : "单层膜同时检查压差正向膜应力和反向外压屈曲。"
        },
        {
          id: "common-bulkhead-thermal",
          title: "共底热漏与冷侧等效蒸发",
          formula: "Q = q''·A + Q环桥；ṁ等效 = 3600Q / hfg",
          inputs: `温差=${round(commonBulkhead.temperatureDifferenceK, 1)} K，面积=${round(commonBulkhead.geometry.curvedAreaM2, 3)} m²，面热流=${round(commonBulkhead.thermal.heatFluxWm2, 2)} W/m²，环桥=${round(commonBulkhead.thermal.ringHeatLeakW, 1)} W`,
          result: commonBulkhead.thermal.equivalentBoiloffKgH,
          unit: "kg/h 等效冷侧蒸发",
          source: "NASA S-II 共底传热分析与稳态一维热阻教学模型",
          assumption: "只用于方案比较；未模拟加注瞬态、液位、自然对流、相变界面、真空退化和主动制冷。"
        },
        {
          id: "common-bulkhead-cost",
          title: "共底新增制造与封头抵扣",
          formula: "ΔC共底 = C新增共底 − 0.65 · C被取消封头",
          inputs: `新增制造=${round(commonBulkhead.costing.grossAddedCostCny, 0)} 元，封头抵扣=${round(commonBulkhead.costing.removedDomeCreditCny, 0)} 元，抵扣率=${round(commonBulkhead.costing.creditRatePct, 0)}%`,
          result: commonBulkhead.costing.netCostImpactCny,
          unit: "元 净影响",
          source: "教学型制造成本与避免成本模型",
          assumption: "新增项分开计入两侧面板、芯层/热障、环件/密封、工装和无损检测；取消封头只按原制造成本的 65% 计可实现抵扣，剩余部分代表不可避免的工装、质量保证和集成成本。"
        },
        {
          id: "common-bulkhead-reference-benefits",
          title: "共底缩短箭体的参考潜力",
          formula: "m参考 = A减少·t参考·ρ·k工艺 + 0.35·A减少 + L减少·(1.4 + 0.55D + 0.25N)",
          inputs: `缩短=${round(commonBulkhead.indirectAdvantages.lengthSavingM, 3)} m，面积减少=${round(commonBulkhead.indirectAdvantages.externalAreaSavingM2, 3)} m²，参考蒙皮厚度=${round(commonBulkhead.indirectAdvantages.referenceSkinThicknessM * 1000, 3)} mm`,
          result: commonBulkhead.indirectAdvantages.totalReferenceSavingKg,
          unit: "kg 参考潜力",
          source: "Rocket SIM 教学型箭体缩短二级收益估算",
          assumption: "只汇总蒙皮、表面系统和布线/支撑的潜在节省；不回写结构干重、起飞质量、Δv、飞行或成本。"
        }
      );
    }
    if (config.tanks.structureMode === "balloon") {
      formulas.splice(4, 0, {
        id: "balloon-stability",
        title: "气球储箱最低维形压力",
        formula: "pmin ≈ Faxial /(πr²) · kimperfection · 1.25",
        inputs: `当前箱压=${round(config.tanks.pressureMpa * 1000, 1)} kPa，最低维形=${round(fuelTank.minimumStabilityPressurePa / 1000, 1)} kPa，椭圆度=${round(config.tanks.ovalityPct, 2)}%`,
        result: fuelTank.minimumStabilityPressurePa / 1000,
        unit: "kPa",
        source: "Atlas/Centaur 压力稳定薄壳概念的教学状态模型",
        assumption: "把轴向载荷与几何缺陷压缩为最低压力联锁；弯矩、凹痕和载荷导入只通过保守修正近似。"
      });
    }
    if (batterySystem.enabled) {
      formulas.splice(formulas.length - 1, 0, {
        id: "electric-battery",
        title: "电泵电池包质量",
        formula: "mcell = max(Ereq / e密度, Preq / p密度)，mpack = mcell · (1 + 封装余量)",
        inputs: `Preq=${round(batterySystem.requiredOutputPowerKw, 0)} kW，Ereq=${round(batterySystem.requiredStoredEnergyKwh, 2)} kWh，比能=${round(batterySystem.energyDensityWhKg, 0)} Wh/kg，比功率=${round(batterySystem.powerDensityWKg, 0)} W/kg`,
        result: batterySystem.packMassKg,
        unit: "kg",
        source: "教学型电池比能量/比功率包络模型",
        assumption: `含 ${round(batterySystem.reservePct, 0)}% 能量余量与 ${round(batterySystem.packOverheadPct, 0)}% 封装余量；电机/控制器质量另计。`
      });
    }

    return {
      propellant,
      environment: {
        bodyKey: config.test.bodyKey,
        bodyName: environment.body.name,
        atmosphere: environment.body.atmosphere,
        forcedVacuum: environment.forcedVacuum,
        surfaceGravityMs2: environment.body.gravityMs2,
        launchGravityMs2,
        surfacePressurePa: environment.body.surfacePressurePa,
        launchPressurePa: ambientPressurePa
      },
      split,
      tanks: {
        structureMode: config.tanks.structureMode,
        geometryMode: config.tanks.geometryMode,
        linerLoadFraction: layeredTanks ? fuelTank.loadSharing.linerFraction : null,
        structuralLoadFraction: layeredTanks ? fuelTank.loadSharing.structuralFraction : null,
        diameterM,
        fuel: fuelTank,
        oxidizer: oxidizerTank,
        commonBulkhead,
        totalMassKg: tankMassKg
      },
      pressurization,
      pumps: { fuel: fuelPump, oxidizer: oxidizerPump, totalShaftPowerKw, pumpMechanicalMassKg, machineryMassKg, electricMassKg, battery: batterySystem, pumpUnitCount: fuelPump.unitCount || 0, baseLineDropPct: config.engine.lineDropPct, clusterLineDropPct, effectiveLineDropPct },
      engine: {
        cycle,
        cluster: Object.assign({}, clusterLayout, {
          architecture,
          pumpUnitCount: fuelPump.unitCount || 0,
          effectiveLineDropPct,
          clusterLineDropPct,
          repeatedUnitFactor,
          repeatedAccessoryMassKg,
          clusterManifoldMassKg,
          clusterThrustFrameMassKg,
          vibrationPenaltyMassKg,
          clusterIntegrationMassKg,
          reliability: clusterReliability
        }),
        cooling: coolingMode,
        nozzle,
        totalThrustN,
        totalMassFlowKgS,
        fuelMdotKgS: fuelMdot,
        oxidizerMdotKgS: oxMdot,
        chamberNozzleMassKg,
        cycleHardwareKg,
        engineMassKg,
        heatFluxMwM2,
        heatDemandMw,
        coolingCapacityMw,
        coolingMargin
      },
      masses: {
        usablePropellantKg,
        loadedPropellantKg: split.loadedTotalKg,
        residualPropellantKg: split.residualKg,
        tankMassKg,
        engineMassKg,
        pressurizationMassKg: pressurization.totalMassKg,
        plumbingMassKg,
        mountMassKg,
        repeatedAccessoryMassKg,
        clusterIntegrationMassKg,
        airframeMassKg,
        avionicsMassKg,
        payloadKg: config.vehicle.payloadKg,
        vehicleDryMassKg,
        burnoutMassKg,
        wetMassKg,
        breakdown: massBreakdown,
        liftoffBreakdown,
        dryBreakdown,
        dryBreakdownBaseKg,
        dryBreakdownIncludesPayload,
        dryMassRatio,
        dryMassFraction,
        dryMassFractionPct: dryMassFraction * 100,
        payloadRatioPct: wetMassKg > 0 ? config.vehicle.payloadKg / wetMassKg * 100 : 0
      },
      geometry: {
        diameterM,
        baseDiameterM: clusterLayout.baseDiameterM,
        requiredBaseDiameterM: clusterLayout.requiredDiameterM,
        baseSkirtLengthM,
        tankStackLengthM,
        fairingLengthM,
        vehicleLengthM,
        frontalAreaM2: Math.PI * clusterLayout.baseDiameterM * clusterLayout.baseDiameterM / 4,
        engineLengthM: nozzle.engineLengthM
      },
      performance: {
        ambientPressurePa,
        ispS,
        idealDeltaV,
        twr,
        liftoffNetAccelMs2,
        burnTimeS,
        totalThrustN,
        totalMassFlowKgS
      },
      cost: { bom, breakdown, subtotalCostCny: subtotalCost, manufacturingSubtotalCostCny, manufacturingCostCny, propellantCostCny, totalCostCny, costIndex, engineCostFactor: cycle.costFactor, clusterAssemblyFactor },
      issues,
      formulas
    };
  }



  // massFromUsableVolume moved to tank-geometry.js



































  function generateDesignName(inputConfig, design) {
    const config = normalizeConfig(inputConfig || (design && design.config));
    const propellant = design && design.propellant ? design.propellant : getPropellant(config);
    const diameterM = design && design.tanks ? design.tanks.diameterM : config.tanks.diameterM;
    const propellantLabels = {
      steam: "蒸汽",
      "lox-co": "一氧化碳液氧",
      "lox-methane": "甲烷液氧",
      "lox-rp1": "煤油液氧",
      "lox-lh2": "氢氧",
      "lf2-lh2": "氢氟",
      hydrazine: "联氨",
      "nto-mmh": "MMH四氧化二氮",
      "nto-udmh": "偏二甲肼四氧化二氮"
    };
    const cycleLabels = {
      "pressure-fed": "挤压供给",
      "gas-generator": "燃气循环",
      "electric-pump": "电泵",
      expander: "膨胀循环",
      staged: "分级燃烧",
      "full-flow": "全流量分级燃烧"
    };
    const roundedDiameter = round(Math.max(0.1, Number(diameterM) || 0.1), Number(diameterM) >= 3 ? 1 : 2);
    const diameterText = Number.isInteger(roundedDiameter) ? roundedDiameter.toFixed(0) : String(roundedDiameter);
    const propellantText = propellantLabels[config.propellantKey]
      || String(propellant.shortName || propellant.name || "自定义推进剂").replace(/[\s/‑-]+/g, "");
    const cycleText = cycleLabels[config.engine.cycleKey] || (Data.cycles[config.engine.cycleKey] ? Data.cycles[config.engine.cycleKey].name : "发动机");
    const boosterText = config.boosters.enabled ? `-${config.boosters.count}助推并联` : "";
    const enabledUpperStages = Array.isArray(config.stages) ? config.stages.filter(function (stage) { return stage.enabled; }).length : 0;
    const stageText = enabledUpperStages ? `-${enabledUpperStages + 1}级` : "";
    return `${diameterText}米级-${propellantText}-${cycleText}${boosterText}${stageText}火箭`;
  }

  function calculateDesign(input) {
    const design = solveSizing(input);
    if (design.config.autoName) design.config.name = generateDesignName(design.config, design);
    const poweredFlightDesign = design.serial && design.serial.enabled ? design.serial.base : design;
    design.flight = design.serial && design.serial.enabled
      ? runSerialVerticalFlight(design.config, design)
      : runVerticalFlight(design.config, poweredFlightDesign);
    design.energy = calculateEnergyStatistics(design.config, design.serial && design.serial.enabled ? design : poweredFlightDesign, design.flight);
    design.staticFire = runStaticFire(design.config, poweredFlightDesign);
    design.formulas.push({
      id: "flight-energy",
      title: "飞行器能量统计",
      formula: "E总 = m推进剂,剩余 · e化学 + m · μ · [1/r发射 - 1/r] + ½mv²",
      inputs: `推进剂比能=${round(design.energy.statistics.propellantSpecificEnergyMjKg, 2)} MJ/kg，天体=${design.energy.bodyName}`,
      result: design.energy.peakKinetic ? design.energy.peakKinetic.kineticEnergyJ / 1e6 : 0,
      unit: "MJ（峰值动能）",
      source: "机械能定义与教学型推进剂代表比能",
      assumption: design.energy.assumption
    });
    return design;
  }

  function serializeConfig(config) {
    const normalized = normalizeConfig(config);
    return JSON.stringify({ schemaVersion: Data.schemaVersion, exportedAt: new Date().toISOString(), config: normalized }, null, 2);
  }

  function deserializeConfig(text) {
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (error) {
      throw new Error("JSON 格式无效。" + (error && error.message ? ` ${error.message}` : ""));
    }
    if (!parsed || parsed.schemaVersion !== Data.schemaVersion || !parsed.config) {
      throw new Error(`方案版本不兼容：需要 schemaVersion ${Data.schemaVersion}。`);
    }
    return normalizeConfig(parsed.config);
  }

  return {
    G0,
    normalizeConfig,
    getPropellant,
    materialTemperatureFactor,
    materialModulusPa,
    materialThermalExpansionPpmK,
    atmosphere,
    celestialBody,
    atmosphereForBody,
    environmentState,
    nozzleCoefficient,
    effectiveIsp,
    splitPropellant,
    tankGeometry,
    computeTankBuckling,
    massFromUsableVolume,
    computeClusterLayout,
    normalizeSerialStage,
    separationSystemForStage,
    buildSerialStageStack,
    liftoffState,
    solveSizing,
    calculateDesign,
    runVerticalFlight,
    runSerialVerticalFlight,
    runStaticFire,
    calculateEnergyStatistics,
    generateDesignName,
    serializeConfig,
    deserializeConfig,
    round
  };
});
