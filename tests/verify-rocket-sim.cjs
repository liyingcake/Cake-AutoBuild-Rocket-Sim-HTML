"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Data = require("../js/data.js");
const Core = require("../js/core.js");
const AudioModel = require("../js/audio-model.js");

const root = path.resolve(__dirname, "..");
let checks = 0;

function check(condition, message) {
  assert.ok(condition, message);
  checks += 1;
}

function near(actual, expected, tolerance, message) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: ${actual} vs ${expected}`);
  checks += 1;
}

function finiteDeep(value, label) {
  if (typeof value === "number") {
    check(Number.isFinite(value), `${label} contains a non-finite number`);
    return;
  }
  if (!value || typeof value !== "object") return;
  Object.keys(value).forEach((key) => {
    if (["config", "flight", "staticFire"].includes(key)) return;
    finiteDeep(value[key], `${label}.${key}`);
  });
}

check(Object.keys(Data.propellants).length === 9, "nine propellant presets are required");
check(Object.keys(Data.materials).length >= 25, "at least 25 representative materials are required");
check(Object.keys(Data.cycles).length === 6, "all six requested feed cycles are required");
check(Object.keys(Data.cooling).length === 3, "three cooling modes are required");
check(Object.keys(Data.processes).length >= 15, "tank manufacturing references should include welding, forming, stiffening, winding, sandwich, and common-bulkhead routes");
check(Object.keys(Data.celestialBodies).length === 9, "nine celestial environment presets are required");
check(Object.keys(Data.batteries).length >= 6, "electric-pump mode requires representative primary, secondary, lithium, and special batteries");
check(Object.keys(Data.flamePalettes).length === 10, "all propellants plus custom should have flame palettes");
check(Object.keys(Data.historicalRocketPresets).length >= 7, "the historical library should include at least seven launch vehicles");
check(["mercury-redstone", "saturn-v", "soyuz-fregat"].every((key) => Data.historicalRocketPresets[key]), "Redstone, Saturn V, and Soyuz should be available as historical presets");
Object.entries(Data.historicalRocketPresets).forEach(([key, preset]) => {
  const historical = Core.calculateDesign(Core.normalizeConfig(preset.config));
  check(Number.isFinite(historical.masses.wetMassKg) && historical.masses.wetMassKg > 0, `${key} should calculate a finite liftoff mass`);
  check(Number.isFinite(historical.performance.totalThrustN) && historical.performance.totalThrustN > 0, `${key} should calculate finite liftoff thrust`);
  check(Number.isFinite(historical.performance.idealDeltaV) && historical.performance.idealDeltaV > 0, `${key} should calculate finite ideal delta-v`);
  check(Math.abs(historical.masses.wetMassKg - preset.reference.liftoffMassKg) / preset.reference.liftoffMassKg < 0.15, `${key} teaching-model liftoff mass should remain within fifteen percent of the cited reference`);
  check(Math.abs(historical.performance.totalThrustN / 1000 - preset.reference.thrustKn) / preset.reference.thrustKn < 0.15, `${key} teaching-model thrust should remain within fifteen percent of the cited reference`);
  check(/^https:\/\//.test(preset.sourceUrl) && preset.sourceLabel, `${key} should retain a primary-source reference`);
});
check(Data.historicalRocketPresets["saturn-v"].config.engine.engineCount === 5 && Data.historicalRocketPresets["saturn-v"].config.stages.length === 2, "Saturn V should load five first-stage engines plus two upper-stage definitions");
check(Data.historicalRocketPresets["soyuz-fregat"].config.boosters.enabled && Data.historicalRocketPresets["soyuz-fregat"].config.boosters.count === 4, "Soyuz should load its four parallel side boosters");
check(Data.historicalRocketPresets["titan-ii-glv"].config.engine.engineCount === 2 && Data.historicalRocketPresets["titan-ii-glv"].config.stages.length === 1, "Titan II GLV should load a twin-engine first stage and one upper stage");
check(Object.keys(Data.modernRocketPresets).length >= 6, "the modern library should include representative heavy, medium, and small launch vehicles");
check(["starship-v3", "falcon-9-block-5", "falcon-heavy", "new-glenn", "electron", "long-march-5"].every((key) => Data.modernRocketPresets[key]), "Starship, Falcon, New Glenn, Electron, and Long March 5 should be available as modern presets");
Object.entries(Data.modernRocketPresets).forEach(([key, preset]) => {
  const modern = Core.calculateDesign(Core.normalizeConfig(preset.config));
  check(Number.isFinite(modern.masses.wetMassKg) && modern.masses.wetMassKg > 0, `${key} should calculate a finite liftoff mass`);
  check(Number.isFinite(modern.performance.totalThrustN) && modern.performance.totalThrustN > 0, `${key} should calculate finite combined liftoff thrust`);
  check(Math.abs(modern.masses.wetMassKg - preset.reference.liftoffMassKg) / preset.reference.liftoffMassKg < 0.15, `${key} teaching-model liftoff mass should remain within fifteen percent of its reference`);
  check(Math.abs(modern.performance.totalThrustN / 1000 - preset.reference.thrustKn) / preset.reference.thrustKn < 0.15, `${key} teaching-model thrust should remain within fifteen percent of its reference`);
  check(!modern.issues.some((issue) => issue.severity === "error"), `${key} should load as an immediately usable reference vehicle`);
  check(modern.flight.status !== "no-liftoff", `${key} combined vehicle should pass the liftoff gate`);
  check(/^https:\/\//.test(preset.sourceUrl) && preset.sourceLabel, `${key} should retain an official source reference`);
});
check(Data.modernRocketPresets["starship-v3"].config.engine.engineCount === 33 && Data.modernRocketPresets["starship-v3"].config.stages[0].engine.engineCount === 6, "Starship V3 should retain 33 Super Heavy engines and six ship engines");
check(Data.modernRocketPresets["falcon-heavy"].config.boosters.count === 2 && Data.modernRocketPresets["falcon-heavy"].config.boosters.engineCount === 9, "Falcon Heavy should load two nine-engine side cores around its nine-engine center core");
check(Data.rocketWisdom.length === 50, "topbar rotation should contain exactly fifty rocket-science memes and quotations");
check(new Set(Data.rocketWisdom.map((entry) => entry.id)).size === 50, "rocket wisdom entries should have unique ids");
check(Data.rocketWisdom.filter((entry) => entry.type === "quote").length >= 10, "rocket wisdom should include a substantial set of attributed quotations");
check(Data.rocketWisdom.filter((entry) => entry.type === "meme").length >= 30, "rocket wisdom should include a substantial set of original memes");
check(Data.rocketWisdom.every((entry) => entry.text && entry.attribution && ["quote", "meme"].includes(entry.type)), "every rocket wisdom entry should provide text, attribution, and a valid type");
check(Data.rocketWisdom.filter((entry) => entry.type === "quote").every((entry) => /^https:\/\/([^/]+\.)?nasa\.gov\//.test(entry.sourceUrl) || /^https:\/\/pwg\.gsfc\.nasa\.gov\//.test(entry.sourceUrl) || /^https:\/\/ecolloq\.gsfc\.nasa\.gov\//.test(entry.sourceUrl)), "attributed quotations should retain an official NASA source URL");
check(new Set(Object.values(Data.flamePalettes).map((palette) => palette.outer)).size >= 7, "flame palettes should be visually distinct");
Object.values(Data.propellants).forEach((propellant) => {
  check(Number.isFinite(propellant.fuelPriceCnyKg) && propellant.fuelPriceCnyKg >= 0, `${propellant.shortName} should provide a fuel/monopropellant reference price`);
  check(Number.isFinite(propellant.oxidizerPriceCnyKg) && propellant.oxidizerPriceCnyKg >= 0, `${propellant.shortName} should provide an oxidizer reference price`);
  check(Number.isFinite(propellant.specificEnergyMjKg) && propellant.specificEnergyMjKg > 0, `${propellant.shortName} should provide a positive representative specific energy`);
  if (!propellant.mono) check(propellant.oxidizerPriceCnyKg > 0, `${propellant.shortName} bipropellant should have a positive oxidizer reference price`);
});
near(Core.normalizeConfig({ customPropellant: { specificEnergyMjKg: 0 } }).customPropellant.specificEnergyMjKg, 0.01, 1e-12, "custom propellant specific energy should clamp to a positive floor");

near(Core.atmosphereForBody("earth", 0, false).pressurePa, 101325, 1e-6, "Earth surface pressure preset");
check(Core.atmosphereForBody("mars", 10000, false).pressurePa < Core.atmosphereForBody("mars", 0, false).pressurePa, "Mars pressure should decrease with altitude");
check(Core.atmosphereForBody("titan", 0, false).pressurePa > 101325, "Titan should have a denser surface pressure preset than Earth");
near(Core.atmosphereForBody("venus", 0, false).pressurePa, 9200000, 1e-6, "Venus should use the 9.2 MPa teaching surface preset");
near(Core.atmosphereForBody("venus-500kpa", 0, false).pressurePa, 500000, 1e-6, "partially terraformed Venus should use exactly 500 kPa");
check(Core.atmosphereForBody("venus", 10000, false).pressurePa < Core.atmosphereForBody("venus", 0, false).pressurePa, "Venus pressure should decrease with altitude");
check(Core.atmosphereForBody("moon", 0, false).pressurePa === 0, "Moon should behave as a vacuum flight environment");
check(Core.atmosphereForBody("earth", 0, true).pressurePa === 0, "forced vacuum should override Earth atmosphere");
check(Core.normalizeConfig({ test: { bodyKey: "unknown" } }).test.bodyKey === "earth", "invalid body presets should fall back to Earth");
check(Data.defaultConfig.vehicle.countdownEnabled, "launch countdown should be enabled by default");
check(Data.defaultConfig.vehicle.immersiveLaunch, "immersive launch mode should be enabled by default");
check(Data.defaultConfig.vehicle.pauseAfterBurnout === false, "burnout auto-pause should be disabled by default");
check(Data.defaultConfig.vehicle.includePayloadInDryBreakdown === false, "dry-mass allocation should exclude payload by default");
near(Data.defaultConfig.vehicle.structuralFactor, 0.055, 1e-12, "concept structural factor should use the recommended 0.055 baseline");
near(Data.defaultConfig.cost.priceScale, 1, 1e-12, "overall price correction should always default to one");
check(Data.defaultConfig.autoName === false, "automatic design naming should be opt-in");
check(Data.defaultConfig.boosters.enabled === false, "parallel boosters should remain opt-in for existing single-stage designs");
check(Data.defaultConfig.boosters.count === 2, "parallel booster defaults should start with a symmetric pair");
check(Array.isArray(Data.defaultConfig.stages) && Data.defaultConfig.stages.length === 2, "the new default vehicle should include second- and third-stage definitions");
check(Data.defaultConfig.stages.every((stage) => stage.enabled), "the default second and third stages should participate in the complete vehicle");
check(Object.keys(Data.stageSeparationModes).length === 4, "serial stages should expose cold, mechanical, small-solid, and hot separation modes");
check(Data.stageSeparationModes["ullage-solid"].fixedMotors.count === 4, "the small-solid separation preset should keep fixed ullage/retro motor parameters");
check(Core.normalizeConfig({ boosters: { count: 99 } }).boosters.count === 8, "parallel booster count should remain bounded");
check(Core.normalizeConfig({ boosters: { propellantMode: "unknown", diameterMode: "unknown", engineMode: "unknown" } }).boosters.propellantMode === "copy-core", "invalid booster inheritance modes should fall back to copying the core stage");
check(Data.defaultConfig.test.energyCutoffMode === "apogee", "energy statistics should default to the complete coast-to-zero trajectory");
check(Data.defaultConfig.test.energyCoastPercent === 10, "timed energy cutoff should default to ten percent of powered duration");
check(Core.normalizeConfig({ test: { energyCutoffMode: "unknown" } }).test.energyCutoffMode === "apogee", "unknown energy cutoff modes should fall back to apogee");
check(Core.normalizeConfig({ test: { energyCutoffMode: "post-burn", energyCoastPercent: 999 } }).test.energyCoastPercent === 200, "energy coast percentage should remain bounded");
check(Core.normalizeConfig({ vehicle: { pauseAfterBurnout: true } }).vehicle.pauseAfterBurnout === true, "burnout auto-pause preference should survive normalization");
check(Core.normalizeConfig({ vehicle: { includePayloadInDryBreakdown: true } }).vehicle.includePayloadInDryBreakdown === true, "payload inclusion in dry-mass allocation should survive normalization");
check(Data.defaultConfig.test.previewAtmosphere === false, "idle preview should default to blueprint black instead of atmospheric color");
check(Data.defaultConfig.tanks.structureMode === "single", "single-material tanks should remain the default structure mode");
check(Data.defaultConfig.tanks.geometryMode === "separate", "separate propellant tanks should remain the default arrangement");
check(Data.defaultConfig.engine.clusterArchitecture === "independent", "realistic independent-engine clusters should be the default");
check(Core.normalizeConfig({ engine: { clusterArchitecture: "unknown" } }).engine.clusterArchitecture === "independent", "unknown cluster architectures should fall back to independent engines");
check(Core.normalizeConfig({ engine: { perEngineFixedMassKg: -10, nozzleClearancePct: 999 } }).engine.perEngineFixedMassKg === 0, "per-engine fixed mass should have a nonnegative bound");
check(Core.normalizeConfig({ engine: { nozzleClearancePct: 999 } }).engine.nozzleClearancePct === 60, "nozzle clearance should remain bounded");
const editableEngineConfig = Core.normalizeConfig({
  engine: { engineCount: 7, expansionRatio: 93, chamberPressureMpa: 12.5 },
  boosters: { engineMode: "custom", engineCount: 4, expansionRatio: 37, chamberPressureMpa: 6.2 }
});
check(editableEngineConfig.engine.engineCount === 7 && editableEngineConfig.engine.expansionRatio === 93, "core engine count and manual nozzle expansion should survive normalization");
check(editableEngineConfig.boosters.engineCount === 4 && editableEngineConfig.boosters.expansionRatio === 37, "booster engine count and nozzle expansion should survive normalization");
check(Core.normalizeConfig({ tanks: { structureMode: "unknown" } }).tanks.structureMode === "single", "unknown tank structure modes should fall back to single material");
check(Core.normalizeConfig({ tanks: { geometryMode: "unknown" } }).tanks.geometryMode === "separate", "unknown tank arrangements should fall back to separate tanks");
check(Core.normalizeConfig({ tanks: { interfaceMode: "unknown" } }).tanks.interfaceMode === "bonded", "unknown layer interfaces should fall back to bonded strain compatibility");
check(Core.normalizeConfig({ propellantKey: "hydrazine", tanks: { geometryMode: "common-bulkhead" } }).tanks.geometryMode === "separate", "monopropellant designs should reject a two-fluid common bulkhead");
check(Core.normalizeConfig({ test: { previewAtmosphere: true } }).test.previewAtmosphere === true, "idle atmosphere preview preference should survive normalization");
check(Data.defaultConfig.vehicle.countdownSeconds >= 10 && Data.defaultConfig.vehicle.countdownSeconds <= 13, "default countdown must stay inside the T-10 to T-13 window");
check(Core.normalizeConfig({ vehicle: { countdownSeconds: 99 } }).vehicle.countdownSeconds === 13, "countdown should clamp at T-13");
check(Core.normalizeConfig({ vehicle: { countdownSeconds: 1 } }).vehicle.countdownSeconds === 10, "countdown should not start later than T-10");
check(Core.normalizeConfig({ vehicle: { launchMode: "unknown" } }).vehicle.launchMode === "pad", "unknown launch constraint should fall back to the launch pad");
check(Core.normalizeConfig({ vehicle: { liftoffTargetMode: "unknown" } }).vehicle.liftoffTargetMode === "twr", "unknown liftoff target mode should fall back to T/W");
check(Core.normalizeConfig({ vehicle: { liftoffTargetMode: "acceleration", targetLiftoffAccelMs2: 99 } }).vehicle.targetLiftoffAccelMs2 === 50, "target liftoff acceleration should be bounded");
check(Data.cycles["pressure-fed"].maxPcMpa === 6, "pressure-fed chamber pressure teaching limit should be 6 MPa");
check(Data.cycles["electric-pump"].costFactor === 0.1, "electric-pump engine manufacturing factor should be 0.10x");

const serialDefault = Core.calculateDesign(Data.defaultConfig);
check(serialDefault.serial.enabled && serialDefault.serial.count === 2 && serialDefault.serial.totalStageCount === 3, "default complete-vehicle sizing should calculate a core plus two upper stages");
check(serialDefault.serial.base.config && serialDefault.serial.base.config.engine, "serial core snapshot should retain its engine configuration for proportional rendering");
check(serialDefault.serial.stages.every((stage) => stage.config && stage.config.engine), "every upper-stage result should retain the configuration that produced it");
near(
  serialDefault.performance.idealDeltaV,
  serialDefault.serial.base.performance.idealDeltaV + serialDefault.serial.stages.reduce((sum, stage) => sum + stage.performance.idealDeltaV, 0),
  1e-6,
  "serial ideal delta-v should equal the sum of all independently discarded stages"
);
near(
  serialDefault.serial.base.masses.payloadKg,
  serialDefault.serial.stages[0].masses.wetMassKg + serialDefault.serial.stages[0].separation.totalMassKg,
  1e-6,
  "the core should carry the complete second-stage stack and its interface"
);
near(
  serialDefault.masses.loadedPropellantKg + serialDefault.masses.vehicleDryMassKg + serialDefault.masses.payloadKg,
  serialDefault.masses.wetMassKg,
  1e-6,
  "complete serial vehicle wet mass should conserve propellant, dry mass, and final payload"
);
check(serialDefault.serial.stages[0].separation.fixedMotors && serialDefault.serial.stages[0].separation.motorPropellantMassKg > 0, "the small-solid separation mode should add explicit fixed motor propellant and hardware mass");
check(serialDefault.cost.bom.some((row) => row.label.includes("第2级") && row.label.includes("分离")), "each serial interface should receive an explicit BOM row");
check(serialDefault.geometry.vehicleLengthM > serialDefault.serial.base.geometry.vehicleLengthM, "upper stages and interstages should increase complete vehicle length");
check(serialDefault.issues.every((issue) => issue.severity !== "error"), "the new default three-stage vehicle should start without a hard validation failure");
const parallelSerialConfig = JSON.parse(JSON.stringify(Data.defaultConfig));
parallelSerialConfig.boosters.enabled = true;
parallelSerialConfig.boosters.count = 4;
const parallelSerialDesign = Core.calculateDesign(parallelSerialConfig);
check(parallelSerialDesign.serial.enabled && parallelSerialDesign.serial.base.parallel.enabled, "parallel boosters and serial upper stages should coexist in one complete vehicle");
check(parallelSerialDesign.serial.base.config && parallelSerialDesign.serial.base.config.engine, "the combined parallel/serial core snapshot should retain renderable engine configuration");
const hotStageConfig = JSON.parse(JSON.stringify(Data.defaultConfig));
hotStageConfig.stages[0].separation.mode = "hot";
hotStageConfig.stages[1].enabled = false;
const hotStageDesign = Core.calculateDesign(hotStageConfig);
check(hotStageDesign.serial.stages[0].separation.ignitionOverlapS > 0, "hot staging should model upper-stage ignition overlap");
check(hotStageDesign.issues.some((issue) => issue.component.includes("热分离")), "hot staging should surface plume and transient-load warnings");
const addedStageConfig = JSON.parse(JSON.stringify(Data.defaultConfig));
addedStageConfig.stages.push(Data.createDefaultSerialStage(4));
const addedStageDesign = Core.calculateDesign(addedStageConfig);
check(addedStageDesign.serial.count === 3 && addedStageDesign.serial.totalStageCount === 4, "the calculation core should accept an added fourth stage beyond the two defaults");
const serialRoundTrip = Core.deserializeConfig(Core.serializeConfig(addedStageDesign.config));
check(serialRoundTrip.stages.length === 3 && serialRoundTrip.stages[2].id === "stage-4", "versioned JSON should preserve added serial stages");
check(Core.normalizeConfig({ name: "legacy single stage" }).stages.length === 0, "legacy configurations without a stages field should remain single-stage instead of silently gaining upper stages");

const referencePropellant = Data.propellants[Data.defaultConfig.propellantKey];
const referenceCycle = Data.cycles[Data.defaultConfig.engine.cycleKey];
const earthSeaIsp = Core.effectiveIsp(referencePropellant, referenceCycle, 101325);
const highAmbientIsp = Core.effectiveIsp(referencePropellant, referenceCycle, 146700);
check(highAmbientIsp < earthSeaIsp, "ambient pressure above 101 kPa must continue reducing effective Isp");
check(highAmbientIsp * Core.G0 < earthSeaIsp * Core.G0, "high-pressure effective exhaust velocity must be lower than Earth sea-level exhaust velocity");

near(AudioModel.listeningFade(0, true), 1, 1e-12, "listening protection should start at full level");
near(AudioModel.listeningFade(8, true), 1, 1e-12, "listening protection should wait eight engine seconds");
near(AudioModel.listeningFade(10, true), 0.7, 1e-12, "listening protection should fade linearly over four seconds");
near(AudioModel.listeningFade(12, true), 0.4, 1e-12, "listening protection should settle at forty percent");
near(AudioModel.listeningFade(30, false), 1, 1e-12, "disabled listening protection should not attenuate");
near(AudioModel.vacuumFactor(101325, true), 1, 1e-12, "sea-level sound field should remain full");
near(AudioModel.vacuumFactor(0, true), 0.1, 1e-12, "vacuum sound field should approach ten percent");
near(AudioModel.vacuumFactor(0, false), 1, 1e-12, "disabled vacuum simulation should not attenuate");
near(AudioModel.calculateSoundEnvelope({ engineElapsedS: 12, pressurePa: 0 }).effectiveFactor, 0.04, 1e-12, "automatic sound factors should compose multiplicatively");

const massDriven = Core.calculateDesign({ sizingMode: "mass" });
check(massDriven.sizing.mode === "mass", "mass-driven mode should be selected");
near(massDriven.masses.usablePropellantKg, Data.defaultConfig.sizing.propellantMassKg, 0.001, "mass-driven propellant source of truth");
near(
  massDriven.split.usableFuelKg + massDriven.split.usableOxidizerKg,
  massDriven.masses.usablePropellantKg,
  0.001,
  "fuel and oxidizer mass conservation"
);
check(massDriven.masses.loadedPropellantKg > massDriven.masses.usablePropellantKg, "residual propellant should increase loaded mass");
check(massDriven.tanks.fuel.totalVolumeM3 > massDriven.tanks.fuel.fluidVolumeM3, "ullage should increase tank volume");
check(massDriven.performance.idealDeltaV > 0, "mass-driven delta-v should be positive");

const parallelBoosted = Core.calculateDesign({ boosters: { enabled: true } });
check(parallelBoosted.parallel.enabled && parallelBoosted.parallel.count === 2, "parallel booster calculation should expose the configured booster set");
check(parallelBoosted.masses.wetMassKg > massDriven.masses.wetMassKg, "parallel boosters should add liftoff mass");
check(parallelBoosted.performance.totalThrustN > massDriven.performance.totalThrustN, "parallel boosters should add liftoff thrust");
check(parallelBoosted.cost.totalCostCny > massDriven.cost.totalCostCny, "parallel boosters should add manufacturing, propellant, integration, and test cost");
near(parallelBoosted.parallel.booster.geometry.diameterM, parallelBoosted.parallel.core.geometry.diameterM, 1e-9, "copy-core booster diameter should match the solved core diameter");
near(parallelBoosted.parallel.usablePropellantPerBoosterKg, parallelBoosted.parallel.core.masses.usablePropellantKg * Data.defaultConfig.boosters.propellantMassRatioPct / 100, 1e-6, "linked booster propellant should scale from core usable propellant");
check(parallelBoosted.parallel.separationMassKg > parallelBoosted.parallel.attachmentMassKg, "booster separation mass should include spent booster structures as well as jettisoned attachments");
check(parallelBoosted.performance.boosterDeltaVGain > 0, "default booster pair should provide a positive ideal delta-v gain");
check(parallelBoosted.flight.boosterSeparationSnapshot && parallelBoosted.flight.boosterSeparationSnapshot.droppedMassKg > 0, "parallel flight should execute a finite booster separation event");
check(parallelBoosted.flight.points.some((point) => point.boosterSeparatedThisStep), "parallel flight timeline should retain an exact separation sample");
check(parallelBoosted.flight.points.some((point) => point.boosterAttached === false && point.corePropellantRemainingKg > 0 && point.thrustN > 0), "core stage should continue powered flight after booster separation");
for (let i = 1; i < parallelBoosted.flight.points.length; i += 1) {
  check(parallelBoosted.flight.points[i].massKg <= parallelBoosted.flight.points[i - 1].massKg + 1e-8, "parallel flight mass must remain monotonic across burn and separation");
}
const soyuzCombinedLiftoff = Core.calculateDesign(Data.historicalRocketPresets["soyuz-fregat"].config);
check(soyuzCombinedLiftoff.parallel.core.performance.twr < 1 && soyuzCombinedLiftoff.performance.twr > 1, "Soyuz should preserve a sub-unity core-only T/W while its complete booster-assisted vehicle lifts off");
check(!soyuzCombinedLiftoff.issues.some((issue) => issue.component === "起飞" && issue.severity === "error"), "a valid combined core-plus-booster T/W must replace the inherited core-only liftoff error");
check(soyuzCombinedLiftoff.flight.status !== "no-liftoff", "combined T/W should also control the flight integrator liftoff gate");
const soyuzLiftoffState = Core.liftoffState(soyuzCombinedLiftoff.config, soyuzCombinedLiftoff);
near(soyuzLiftoffState.thrustN, soyuzCombinedLiftoff.parallel.core.performance.totalThrustN + soyuzCombinedLiftoff.parallel.booster.performance.totalThrustN * soyuzCombinedLiftoff.parallel.count, 1e-6, "serial liftoff state should sum core and all booster thrust");
check(soyuzLiftoffState.parallel && soyuzLiftoffState.twr > 1 && soyuzCombinedLiftoff.flight.initialTwr > 1, "serial-plus-parallel liftoff gate should expose the combined rated T/W");
check(soyuzCombinedLiftoff.flight.points.some((point) => point.coreThrustN > 0 && point.boosterThrustN > 0), "Soyuz flight timeline should ignite core and boosters together");
const underpoweredParallel = Core.calculateDesign({
  vehicle: { targetTwr: 0.2 },
  boosters: { enabled: true, count: 2, sizingMode: "fixed", propellantMassKg: 100000, engineMode: "custom", targetThrustKn: 1 }
});
check(underpoweredParallel.performance.twr <= 1 && underpoweredParallel.issues.some((issue) => issue.component === "起飞" && issue.severity === "error"), "an actually underpowered complete parallel vehicle must still produce a liftoff error");
const independentBooster = Core.calculateDesign({
  boosters: {
    enabled: true,
    propellantMode: "custom",
    propellantKey: "lox-rp1",
    diameterMode: "custom",
    diameterM: 1.1,
    engineMode: "custom",
    cycleKey: "pressure-fed",
    engineCount: 2,
    targetThrustKn: 260,
    chamberPressureMpa: 3,
    expansionRatio: 10,
    sizingMode: "fixed",
    propellantMassKg: 3000
  }
});
check(independentBooster.parallel.propellant.key === "lox-rp1", "boosters should support a propellant different from the core stage");
near(independentBooster.parallel.booster.geometry.diameterM, 1.1, 1e-9, "custom booster diameter should remain an independent hard constraint");
check(independentBooster.parallel.booster.engine.cycle.name === Data.cycles["pressure-fed"].name, "custom booster engine cycle should remain selected");
check(independentBooster.parallel.booster.config.engine.engineCount === 2, "custom per-booster engine count should remain selected");
near(independentBooster.parallel.booster.performance.totalThrustN, 260000, 1e-6, "custom booster thrust should be imposed per booster");
near(independentBooster.parallel.usablePropellantPerBoosterKg, 3000, 1e-9, "fixed booster propellant mass should remain independent of core sizing");
const boosterDeltaVSized = Core.calculateDesign({
  sizingMode: "delta-v",
  sizing: { targetDeltaV: 5000 },
  boosters: { enabled: true, includeInDeltaVSizing: true }
});
near(boosterDeltaVSized.performance.idealDeltaV, 5000, 0.2, "delta-v sizing should solve the complete parallel vehicle when requested");
check(Core.generateDesignName({ boosters: { enabled: true, count: 4 } }).includes("4助推并联"), "automatic names should distinguish parallel booster configurations");
const expectedParallelChemicalEnergy = parallelBoosted.parallel.core.masses.usablePropellantKg * parallelBoosted.parallel.core.propellant.specificEnergyMjKg * 1e6
  + parallelBoosted.parallel.booster.masses.usablePropellantKg * parallelBoosted.parallel.count * parallelBoosted.parallel.propellant.specificEnergyMjKg * 1e6;
near(parallelBoosted.energy.initialChemicalEnergyJ, expectedParallelChemicalEnergy, Math.max(1, expectedParallelChemicalEnergy * 1e-12), "mixed-propellant energy statistics should sum core and booster chemical energy independently");

for (let engineCount = 1; engineCount <= 9; engineCount += 1) {
  const layout = Core.computeClusterLayout(engineCount, 1, 2.5, 12);
  check(layout.positions.length === engineCount, `${engineCount}-engine cluster should expose one position per nozzle`);
  check(layout.requiredDiameterM >= 1.16, `${engineCount}-engine cluster envelope should include nozzle and gimbal allowance`);
}
check(Core.computeClusterLayout(9, 1, 2.5, 12).requiredDiameterM > Core.computeClusterLayout(1, 1, 2.5, 12).requiredDiameterM, "nine nozzles should need a larger packing envelope than one nozzle of the same size");
const starshipCluster = Core.computeClusterLayout(33, 1.0, 9.0, 12);
check(starshipCluster.engineCount === 33 && starshipCluster.positions.length === 33, "modern super-heavy clusters should retain all 33 engine positions");
check(starshipCluster.requiredDiameterM > Core.computeClusterLayout(9, 1.0, 9.0, 12).requiredDiameterM, "a 33-engine concentric cluster should require a wider envelope than a nine-engine cluster");

const independentFive = Core.calculateDesign({ engine: { engineCount: 5, clusterArchitecture: "independent" } });
const sharedFive = Core.calculateDesign({ engine: { engineCount: 5, clusterArchitecture: "shared-powerpack" } });
const idealFive = Core.calculateDesign({ engine: { engineCount: 5, clusterArchitecture: "ideal-multi-chamber" } });
check(independentFive.pumps.pumpUnitCount === 5, "independent architecture should size one pump set per engine");
check(sharedFive.pumps.pumpUnitCount === 1 && idealFive.pumps.pumpUnitCount === 1, "shared and ideal multi-chamber architectures should retain one shared pump set");
check(independentFive.pumps.pumpMechanicalMassKg > idealFive.pumps.pumpMechanicalMassKg, "duplicated independent pumps should be heavier than one shared pump set");
check(independentFive.masses.repeatedAccessoryMassKg > idealFive.masses.repeatedAccessoryMassKg, "ideal multi-chamber mode should retain reduced repeated accessory mass");
check(independentFive.cost.totalCostCny > idealFive.cost.totalCostCny, "realistic independent clusters should cost more than the preserved ideal mode");
check(independentFive.pumps.clusterLineDropPct > 0 && independentFive.pumps.effectiveLineDropPct > independentFive.pumps.baseLineDropPct, "multi-engine distribution should add line pressure loss");
check(independentFive.masses.clusterIntegrationMassKg > 0, "multi-engine clusters should include thrust-frame, manifold, and vibration mass");
check(independentFive.cost.bom.some((row) => row.label === "发动机重复附件与验收试车" && row.massKg > 0 && row.costCny > 0), "BOM should expose repeated engine accessories and acceptance-test cost");
check(independentFive.cost.bom.some((row) => row.label === "集群推力架、分流管路与振动修正" && row.massKg > 0), "BOM should expose cluster integration penalties");

const noEngineOut = Core.calculateDesign({ engine: { engineCount: 3, clusterArchitecture: "independent", singleUnitReliabilityPct: 99, allowOneEngineOut: false } });
near(noEngineOut.engine.cluster.reliability.missionReliabilityPct, Math.pow(0.99, 3) * 100, 1e-9, "cluster reliability without engine-out capability should be p to the N");
const engineOutFive = Core.calculateDesign({ engine: { engineCount: 5, clusterArchitecture: "independent", singleUnitReliabilityPct: 99, allowOneEngineOut: true } });
check(engineOutFive.engine.cluster.reliability.oneEngineOutCapable, "a sufficiently high-T/W five-engine cluster should allow one-engine-out continuation");
near(engineOutFive.engine.cluster.reliability.missionReliabilityPct, (Math.pow(0.99, 5) + 5 * 0.01 * Math.pow(0.99, 4)) * 100, 1e-9, "one-engine-out reliability should include exactly one local failure");
const sharedCommonCause = Core.calculateDesign({ engine: { engineCount: 5, clusterArchitecture: "shared-powerpack", singleUnitReliabilityPct: 99, sharedPowerpackReliabilityPct: 98, allowOneEngineOut: true } });
check(sharedCommonCause.engine.cluster.reliability.missionReliabilityPct < engineOutFive.engine.cluster.reliability.missionReliabilityPct, "shared powerpack common-cause reliability should reduce mission reliability");

const compactIdeal = Core.calculateDesign({ tanks: { diameterMode: "locked", diameterM: 0.5 }, engine: { engineCount: 9, clusterArchitecture: "ideal-multi-chamber" } });
check(compactIdeal.engine.cluster.requiresExpansion, "ideal single-pump multi-nozzle mode must still run the packing and body-expansion check");
near(compactIdeal.geometry.frontalAreaM2, Math.PI * compactIdeal.geometry.baseDiameterM ** 2 / 4, 1e-9, "cluster base expansion should control frontal area and drag");
check(compactIdeal.issues.some((issue) => issue.component === "发动机集群包络"), "cluster expansion should produce a visible validation issue");
near(massDriven.masses.breakdown.reduce((sum, entry) => sum + entry.massKg, 0), massDriven.masses.wetMassKg, 1e-7, "liftoff mass allocation should conserve total wet mass");
near(massDriven.masses.breakdown.reduce((sum, entry) => sum + entry.sharePct, 0), 100, 1e-9, "liftoff mass allocation shares should sum to one hundred percent");
check(massDriven.masses.breakdown.some((entry) => entry.category === "payload" && entry.massKg === massDriven.masses.payloadKg), "liftoff mass allocation should explicitly include payload");
near(massDriven.masses.liftoffBreakdown.reduce((sum, entry) => sum + entry.massKg, 0), massDriven.masses.wetMassKg, 1e-7, "compact liftoff allocation should conserve propellant, dry vehicle, and payload mass");
near(massDriven.masses.dryBreakdown.filter((entry) => entry.included).reduce((sum, entry) => sum + entry.massKg, 0), massDriven.masses.vehicleDryMassKg, 1e-7, "default dry allocation should contain vehicle dry subsystems but exclude propellant and payload");
near(massDriven.masses.dryBreakdown.filter((entry) => entry.included).reduce((sum, entry) => sum + entry.sharePct, 0), 100, 1e-9, "included dry-subsystem shares should sum to one hundred percent");
check(massDriven.masses.dryBreakdown.find((entry) => entry.category === "payload").included === false, "payload should be visibly excluded from the default dry allocation");
check(!massDriven.masses.dryBreakdown.some((entry) => entry.category === "propellant"), "dry allocation must never include propellant");
const payloadIncludedDry = Core.calculateDesign({ vehicle: { includePayloadInDryBreakdown: true } });
near(payloadIncludedDry.masses.dryBreakdownBaseKg, payloadIncludedDry.masses.vehicleDryMassKg + payloadIncludedDry.masses.payloadKg, 1e-7, "optional dry allocation should add payload to its denominator");
near(payloadIncludedDry.masses.dryBreakdown.reduce((sum, entry) => sum + entry.sharePct, 0), 100, 1e-9, "payload-inclusive dry shares should sum to one hundred percent");
near(massDriven.masses.dryMassRatio, massDriven.masses.wetMassKg / massDriven.masses.vehicleDryMassKg, 1e-12, "dry-mass ratio should be wet liftoff mass divided by structural dry mass");
near(massDriven.masses.dryMassFraction, massDriven.masses.vehicleDryMassKg / massDriven.masses.wetMassKg, 1e-12, "dry-mass fraction should retain the inverse dry-over-wet quantity under a distinct name");
check(massDriven.masses.dryMassRatio > 1 && massDriven.masses.dryMassFraction < 1, "mass ratio and mass fraction should not be presented as the same quantity");
check(massDriven.formulas.some((entry) => entry.id === "dry-mass-ratio" && entry.formula.includes("m湿 / m干")), "formula trace should state the wet-over-dry mass-ratio convention");
near(massDriven.masses.payloadRatioPct, massDriven.masses.payloadKg / massDriven.masses.wetMassKg * 100, 1e-10, "payload ratio should be payload divided by wet liftoff mass");

const accelerationDriven = Core.calculateDesign({
  vehicle: { liftoffTargetMode: "acceleration", targetLiftoffAccelMs2: 5 }
});
near(accelerationDriven.performance.liftoffNetAccelMs2, 5, 1e-6, "net-acceleration launch target should solve thrust against local gravity");
check(accelerationDriven.sizing.liftoffTargetMode === "acceleration", "sizing result should record the acceleration target mode");
check(accelerationDriven.formulas.some((entry) => entry.id === "liftoff-target" && entry.formula.includes("a净目标")), "formula trace should explain acceleration-driven liftoff thrust");
const moonAccelerationDriven = Core.calculateDesign({
  vehicle: { liftoffTargetMode: "acceleration", targetLiftoffAccelMs2: 5 },
  test: { bodyKey: "moon", environment: "sea" }
});
near(moonAccelerationDriven.performance.liftoffNetAccelMs2, 5, 1e-6, "net acceleration target should remain comparable on the Moon");
check(moonAccelerationDriven.performance.twr > accelerationDriven.performance.twr, "the same net acceleration should imply a larger local T/W on a low-gravity body");

const volumeDriven = Core.calculateDesign({
  sizingMode: "mass",
  sizing: { massInputKind: "volume", propellantVolumeM3: 10 }
});
const expectedVolumeMass = Core.massFromUsableVolume(volumeDriven.config, volumeDriven.propellant, 10);
near(volumeDriven.masses.usablePropellantKg, expectedVolumeMass, 0.01, "volume-driven propellant conversion");

const deltaDriven = Core.calculateDesign({
  sizingMode: "delta-v",
  sizing: { targetDeltaV: 3800 }
});
near(deltaDriven.performance.idealDeltaV, 3800, 0.5, "delta-v inverse solver convergence");
check(deltaDriven.sizing.converged, "delta-v inverse solver should report convergence");

const thrustTime = Core.calculateDesign({
  sizingMode: "thrust-time",
  sizing: { targetThrustKn: 250, burnTimeS: 90 }
});
near(thrustTime.performance.totalThrustN, 250000, 0.1, "thrust-time total thrust");
near(thrustTime.performance.burnTimeS, 90, 0.01, "thrust-time propellant burn duration");

const lowPressureTank = Core.calculateDesign({ tanks: { pressureMpa: 0.25 } });
const highPressureTank = Core.calculateDesign({ tanks: { pressureMpa: 1.2 } });
check(
  highPressureTank.tanks.fuel.cylinderThicknessM > lowPressureTank.tanks.fuel.cylinderThicknessM,
  "tank thickness should increase with pressure"
);

const weakTank = Core.calculateDesign({ tanks: { materialKey: "ss-304l", pressureMpa: 1.2 } });
const strongTank = Core.calculateDesign({ tanks: { materialKey: "inconel-718", pressureMpa: 1.2, processKey: "machined" } });
check(strongTank.tanks.fuel.cylinderThicknessM < weakTank.tanks.fuel.cylinderThicknessM, "stronger material should reduce controlling wall thickness");

const dualTank = Core.calculateDesign({
  tanks: {
    structureMode: "dual",
    fuelLinerMaterialKey: "ss-304l",
    oxidizerLinerMaterialKey: "al-2219",
    structuralMaterialKey: "inconel-718"
  }
});
check(dualTank.tanks.structureMode === "dual", "dual-layer tank mode should survive calculation");
near(dualTank.tanks.fuel.linerLayer.loadFraction, 0.05, 1e-12, "fuel liner should carry five percent of mechanical load");
near(dualTank.tanks.fuel.structuralLayer.loadFraction, 0.95, 1e-12, "outer structure should carry ninety-five percent of mechanical load");
check(dualTank.tanks.fuel.linerLayer.materialKey === "ss-304l", "fuel tank should use its selected liner material");
check(dualTank.tanks.oxidizer.linerLayer.materialKey === "al-2219", "oxidizer tank should independently use its selected liner material");
check(dualTank.tanks.fuel.structuralLayer.materialKey === "inconel-718" && dualTank.tanks.oxidizer.structuralLayer.materialKey === "inconel-718", "both tanks should use the selected common outer structural material");
near(dualTank.tanks.fuel.cylinderThicknessM, dualTank.tanks.fuel.linerLayer.cylinderThicknessM + dualTank.tanks.fuel.structuralLayer.cylinderThicknessM, 1e-12, "dual-layer total wall thickness should sum inner and outer layers");
near(dualTank.tanks.fuel.totalMassKg, dualTank.tanks.fuel.linerLayer.massKg + dualTank.tanks.fuel.structuralLayer.massKg + dualTank.tanks.fuel.insulationMassKg, 1e-8, "dual-layer tank mass should sum both layers and insulation");
check(dualTank.cost.bom.filter((row) => row.category === "tanks").length === 3, "bipropellant dual-layer BOM should separate outer structure and both liners");
check(dualTank.formulas.some((entry) => entry.id === "tank-hoop" && entry.formula.includes("0.05") && entry.formula.includes("0.95")), "formula trace should expose the fixed dual-layer load split");

const equalMaterialDualTank = Core.calculateDesign({
  tanks: { structureMode: "dual", pressureMpa: 2, fuelLinerMaterialKey: "ss-304l", oxidizerLinerMaterialKey: "ss-304l", structuralMaterialKey: "ss-304l", processKey: "sheet-weld" }
});
near(
  equalMaterialDualTank.tanks.fuel.linerLayer.pressureThicknessM / equalMaterialDualTank.tanks.fuel.structuralLayer.pressureThicknessM,
  0.05 / 0.95,
  1e-10,
  "equal-material layer pressure stresses should follow the five/ninety-five split"
);
const cryogenicOuterTank = Core.calculateDesign({
  propellantKey: "lox-lh2",
  tanks: { structureMode: "dual", fuelLinerMaterialKey: "ss-304l", oxidizerLinerMaterialKey: "ss-304l", structuralMaterialKey: "al-7075" }
});
check(cryogenicOuterTank.tanks.fuel.structuralLayer.tempFactor === 1 && !cryogenicOuterTank.tanks.fuel.structuralLayer.applyFluidTemperature, "outer structure should not receive cryogenic fluid-temperature derating");
check(!cryogenicOuterTank.issues.some((issue) => issue.component.includes("外承力层") && issue.message.includes("工作温区")), "outer structure should not participate in fluid-temperature compatibility checks");
const invalidCryogenicLiner = Core.calculateDesign({
  propellantKey: "lox-lh2",
  tanks: { structureMode: "dual", fuelLinerMaterialKey: "al-7075", oxidizerLinerMaterialKey: "ss-304l", structuralMaterialKey: "ss-304l" }
});
check(invalidCryogenicLiner.issues.some((issue) => issue.component === "燃料储箱内壁" && issue.severity === "error" && issue.message.includes("工作温区")), "fuel-contacting liner should still enforce cryogenic temperature compatibility");
const fluorineOuterTank = Core.calculateDesign({
  propellantKey: "lf2-lh2",
  tanks: { structureMode: "dual", fuelLinerMaterialKey: "ss-304l", oxidizerLinerMaterialKey: "ss-304l", structuralMaterialKey: "ti-64" }
});
check(!fluorineOuterTank.issues.some((issue) => issue.component.includes("外承力层") && issue.message.includes("液氟环境")), "non-contacting outer structure should not receive fluorine compatibility errors");
const weakOuterTank = Core.calculateDesign({ tanks: { structureMode: "dual", pressureMpa: 3, structuralMaterialKey: "ss-304l" } });
const strongOuterTank = Core.calculateDesign({ tanks: { structureMode: "dual", pressureMpa: 3, structuralMaterialKey: "inconel-718" } });
check(strongOuterTank.tanks.fuel.structuralLayer.cylinderThicknessM < weakOuterTank.tanks.fuel.structuralLayer.cylinderThicknessM, "stronger outer material should reduce the ninety-five-percent structural layer thickness");

const bondedSharedTank = Core.calculateDesign({ tanks: { structureMode: "load-sharing", interfaceMode: "bonded", structuralMaterialKey: "al-2219" } });
const slidingSharedTank = Core.calculateDesign({ tanks: { structureMode: "load-sharing", interfaceMode: "slip", structuralMaterialKey: "al-2219" } });
check(bondedSharedTank.tanks.fuel.loadSharing.method === "Et-stiffness", "new load-sharing tanks should use temperature-corrected E-times-thickness stiffness allocation");
near(bondedSharedTank.tanks.fuel.loadSharing.linerFraction + bondedSharedTank.tanks.fuel.loadSharing.structuralFraction, 1, 1e-12, "dynamic layer load fractions should conserve the full mechanical load");
check(Math.abs(bondedSharedTank.tanks.fuel.loadSharing.linerFraction - 0.05) > 0.05, "dynamic layer allocation should not silently retain the legacy five-percent liner share");
check(slidingSharedTank.tanks.fuel.loadSharing.linerFraction < bondedSharedTank.tanks.fuel.loadSharing.linerFraction, "a sliding interface should transfer less mechanical load through the liner than a bonded interface");
check(slidingSharedTank.tanks.fuel.loadSharing.thermalMismatchStressMpa < bondedSharedTank.tanks.fuel.loadSharing.thermalMismatchStressMpa, "interface slip should reduce constrained thermal-expansion mismatch stress");
check(Number.isFinite(bondedSharedTank.tanks.fuel.loadSharing.interfaceUtilization), "layered tanks should report finite interface shear utilization");
check(Number.isFinite(bondedSharedTank.tanks.fuel.loadSharing.linerWrinklingUtilization), "layered tanks should report liner unloading/wrinkling utilization");

const copvTank = Core.calculateDesign({ tanks: { structureMode: "copv", interfaceMode: "slip", structuralMaterialKey: "copv-carbon", processKey: "filament-wound" } });
check(copvTank.tanks.fuel.structuralLayer.materialKey === "copv-carbon", "COPV mode should preserve the selected composite overwrap");
check(copvTank.tanks.fuel.loadSharing.linerFraction < 0.35, "COPV load allocation should keep the overwrap as the primary pressure load path");
check(!copvTank.issues.some((issue) => issue.component.includes("COPV") && issue.severity === "error"), "a composite-overwrapped COPV selection should pass the material-family check");
const invalidCopvTank = Core.calculateDesign({ tanks: { structureMode: "copv", structuralMaterialKey: "al-2219" } });
check(invalidCopvTank.issues.some((issue) => issue.component.includes("COPV") && issue.severity === "error"), "COPV mode should reject a non-composite outer load layer");

const lowKnockdownTank = Core.calculateDesign({ tanks: { pressureMpa: 0.1, bucklingKnockdownPct: 20 } });
const highKnockdownTank = Core.calculateDesign({ tanks: { pressureMpa: 0.1, bucklingKnockdownPct: 80 } });
check(lowKnockdownTank.tanks.fuel.buckling.utilization > highKnockdownTank.tanks.fuel.buckling.utilization, "more severe shell knockdown should increase buckling utilization");
const plainBucklingTank = Core.calculateDesign({ tanks: { structureMode: "single", pressureMpa: 0.1 } });
const stiffenedBucklingTank = Core.calculateDesign({ tanks: { structureMode: "stiffened", pressureMpa: 0.1, processKey: "integral-grid" } });
check(stiffenedBucklingTank.tanks.fuel.buckling.utilization < plainBucklingTank.tanks.fuel.buckling.utilization, "integral stiffening should improve the teaching buckling margin");
check(stiffenedBucklingTank.tanks.fuel.reinforcementMassKg > 0, "stiffened tanks should pay an explicit reinforcement mass penalty");

const balloonTank = Core.calculateDesign({ tanks: { structureMode: "balloon", materialKey: "ss-304l", pressureMpa: 0.42 } });
check(balloonTank.tanks.fuel.minimumStabilityPressurePa > 0, "pressure-stabilized balloon tanks should calculate a minimum shape-holding pressure");
check(balloonTank.tanks.fuel.groundSupportMassKg > 0, "balloon tanks should expose non-flight ground handling support mass");
const collapsedBalloonTank = Core.calculateDesign({ tanks: { structureMode: "balloon", materialKey: "ss-304l", pressureMpa: 0.02 } });
check(collapsedBalloonTank.issues.some((issue) => issue.component.includes("气球储箱") && issue.severity === "error" && issue.message.includes("低于维形最低压力")), "balloon tanks below minimum pressure should fail as a shell-instability event");
check(balloonTank.cost.bom.some((row) => row.label.includes("气球储箱地面张紧") && row.massKg === 0 && row.costCny > 0), "balloon tanks should include ground tooling and pressure-maintenance cost without adding it to flight mass");

const separateTankLayout = Core.calculateDesign({ tanks: { geometryMode: "separate" } });
const commonBulkheadTank = Core.calculateDesign({ tanks: { geometryMode: "common-bulkhead", commonBulkheadType: "honeycomb" } });
check(commonBulkheadTank.tanks.commonBulkhead && commonBulkheadTank.tanks.commonBulkhead.enabled, "common-bulkhead arrangement should produce a dedicated bulkhead result");
check(commonBulkheadTank.geometry.tankStackLengthM < separateTankLayout.geometry.tankStackLengthM, "common bulkhead should shorten the tank stack");
near(commonBulkheadTank.masses.tankMassKg, commonBulkheadTank.tanks.fuel.totalMassKg + commonBulkheadTank.tanks.oxidizer.totalMassKg + commonBulkheadTank.tanks.commonBulkhead.netMassDeltaKg, 1e-8, "common-bulkhead net mass should replace the removed adjacent domes");
check(commonBulkheadTank.tanks.commonBulkhead.differentialPressurePa >= commonBulkheadTank.tanks.fuel.pressurePa, "common bulkhead should envelope either-side depressurization rather than only nominal equal pressure");
const redesignedBulkhead = commonBulkheadTank.tanks.commonBulkhead;
near(redesignedBulkhead.geometry.curvedAreaM2, Math.PI * (redesignedBulkhead.geometry.radiusM ** 2 + redesignedBulkhead.geometry.domeRiseM ** 2), 1e-8, "common-bulkhead area should come from spherical-cap geometry rather than a fixed projected-area multiplier");
near(redesignedBulkhead.addedMassKg, redesignedBulkhead.bulkheadShellMassKg + redesignedBulkhead.insulationMassKg + redesignedBulkhead.connectionAndMonitoringMassKg, 1e-8, "new common-bulkhead mass should be an explicit face, thermal-core, and joint-system sum");
near(redesignedBulkhead.removedDomeMassKg, redesignedBulkhead.removedFuelDomeMassKg + redesignedBulkhead.removedOxidizerDomeMassKg, 1e-8, "removed adjacent domes should be accounted for separately by propellant side");
check(redesignedBulkhead.removedDomeBreakdown.fuel.insulationMassKg > 0 && redesignedBulkhead.removedDomeBreakdown.oxidizer.insulationMassKg > 0, "removed-dome credit should include the insulation actually removed with each adjacent dome");
near(redesignedBulkhead.pressureEnvelope.designDifferentialPressurePa, redesignedBulkhead.pressureEnvelope.fullLossDifferentialPressurePa * redesignedBulkhead.pressureEnvelope.proofFactor, 1e-8, "self-supporting common bulkheads should size to proof-factored one-side pressure loss");
check(redesignedBulkhead.pressureEnvelope.designBurstUtilization <= 1.01 && redesignedBulkhead.pressureEnvelope.designCollapseUtilization <= 1.01, "sized common bulkhead should close both burst and reverse-collapse checks");
check(redesignedBulkhead.thermal.totalHeatLeakW > 0 && redesignedBulkhead.thermal.equivalentBoiloffKgH > 0, "common-bulkhead thermal model should report heat leak and an equivalent cold-side boiloff rate");

const stabilizedBulkheadTank = Core.calculateDesign({ propellantKey: "lox-lh2", tanks: { geometryMode: "common-bulkhead", commonBulkheadType: "honeycomb", commonBulkheadPressureMode: "pressure-stabilized", commonBulkheadControlledDeltaKpa: 60 } });
const selfSupportingBulkheadTank = Core.calculateDesign({ propellantKey: "lox-lh2", tanks: { geometryMode: "common-bulkhead", commonBulkheadType: "honeycomb", commonBulkheadPressureMode: "self-supporting", commonBulkheadControlledDeltaKpa: 60 } });
check(stabilizedBulkheadTank.tanks.commonBulkhead.addedMassKg < selfSupportingBulkheadTank.tanks.commonBulkhead.addedMassKg, "pressure-stabilized common bulkhead should trade lower sized mass for operational pressure-control dependence");
check(stabilizedBulkheadTank.tanks.commonBulkhead.pressureEnvelope.emergencyCollapseUtilization > 1, "pressure-stabilized common bulkhead should expose a one-side-loss emergency overstress when the reduced design cannot survive it");
check(stabilizedBulkheadTank.issues.some((issue) => issue.component.includes("共底压力稳定") && issue.message.includes("失压")), "pressure-stabilized route should issue an explicit differential-pressure interlock warning");

const thinCoreBulkhead = Core.calculateDesign({ propellantKey: "lox-lh2", tanks: { geometryMode: "common-bulkhead", commonBulkheadType: "honeycomb", commonBulkheadCoreThicknessMm: 10 } }).tanks.commonBulkhead;
const thickCoreBulkhead = Core.calculateDesign({ propellantKey: "lox-lh2", tanks: { geometryMode: "common-bulkhead", commonBulkheadType: "honeycomb", commonBulkheadCoreThicknessMm: 80 } }).tanks.commonBulkhead;
check(thickCoreBulkhead.thermal.heatFluxWm2 < thinCoreBulkhead.thermal.heatFluxWm2, "thicker honeycomb thermal core should reduce through-area heat flux");
check(thickCoreBulkhead.coreMassKg > thinCoreBulkhead.coreMassKg, "thicker honeycomb core should carry an explicit mass penalty");

const lowPressureBulkhead = Core.calculateDesign({ tanks: { geometryMode: "common-bulkhead", commonBulkheadType: "honeycomb", pressureMpa: 0.15 } }).tanks.commonBulkhead;
const highPressureBulkhead = Core.calculateDesign({ tanks: { geometryMode: "common-bulkhead", commonBulkheadType: "honeycomb", pressureMpa: 2.0 } }).tanks.commonBulkhead;
check(highPressureBulkhead.faces.fuel.thicknessM > lowPressureBulkhead.faces.fuel.thicknessM, "common-bulkhead face thickness should increase monotonically with tank pressure");

const shallowBulkhead = Core.calculateDesign({ tanks: { geometryMode: "common-bulkhead", commonBulkheadType: "honeycomb", commonBulkheadHeightRatio: 0.20 } }).tanks.commonBulkhead;
const deepBulkhead = Core.calculateDesign({ tanks: { geometryMode: "common-bulkhead", commonBulkheadType: "honeycomb", commonBulkheadHeightRatio: 0.70 } }).tanks.commonBulkhead;
check(deepBulkhead.geometry.curvatureRadiusM < shallowBulkhead.geometry.curvatureRadiusM, "deeper common-bulkhead caps should reduce spherical curvature radius within the supported range");

const vacuumBulkhead = Core.calculateDesign({ propellantKey: "lox-lh2", tanks: { geometryMode: "common-bulkhead", commonBulkheadType: "vacuum" } }).tanks.commonBulkhead;
check((vacuumBulkhead.faces.fuel.membraneDesignPressurePa === 0) !== (vacuumBulkhead.faces.oxidizer.membraneDesignPressurePa === 0), "nested vacuum common-bulkhead shells should assign collapse and burst control to opposite faces");
check(vacuumBulkhead.thermal.totalHeatLeakW < selfSupportingBulkheadTank.tanks.commonBulkhead.thermal.totalHeatLeakW, "vacuum-gap common bulkhead should provide lower teaching heat leak than bonded honeycomb at the default gap");
const singleSheetCryogenicBulkhead = Core.calculateDesign({ propellantKey: "lox-lh2", tanks: { geometryMode: "common-bulkhead", commonBulkheadType: "single-sheet" } });
check(singleSheetCryogenicBulkhead.issues.some((issue) => issue.component.includes("共底热隔离") && issue.severity === "error"), "single-sheet LH2/LOX common bulkhead should fail the thermal-isolation check");
const commonBulkheadNetRow = commonBulkheadTank.cost.bom.find((row) => row.costRole === "common-bulkhead-net");
check(commonBulkheadNetRow, "common-bulkhead BOM should use one signed net row instead of visually adding gross manufacturing mass back into the vehicle");
near(commonBulkheadNetRow.massKg, commonBulkheadTank.tanks.commonBulkhead.netMassDeltaKg, 1e-8, "common-bulkhead BOM mass should show only the physical net replacement impact");
near(commonBulkheadNetRow.pricingMassKg, commonBulkheadTank.tanks.commonBulkhead.addedMassKg, 1e-8, "gross common-bulkhead mass should remain available only as a manufacturing price basis");
near(commonBulkheadNetRow.creditMassKg, commonBulkheadTank.tanks.commonBulkhead.removedDomeMassKg, 1e-8, "removed dome mass should remain available only as an avoided-cost basis");
near(commonBulkheadNetRow.costCny, commonBulkheadTank.tanks.commonBulkhead.costing.netCostImpactCny, 1e-7, "common-bulkhead net BOM row should carry the signed manufacturing cost impact");
near(Object.values(commonBulkheadTank.tanks.commonBulkhead.costing.breakdownBaseCny).reduce((sum, value) => sum + value, 0), commonBulkheadTank.tanks.commonBulkhead.costing.grossAddedBaseCostCny, 1e-7, "common-bulkhead gross cost should decompose into faces, thermal core, rings/seals, and tooling/NDE");
near(commonBulkheadTank.cost.bom.filter((row) => row.category !== "propellant").reduce((sum, row) => sum + row.costCny, 0), commonBulkheadTank.cost.manufacturingCostCny, 1e-6, "signed common-bulkhead credit should flow through manufacturing cost totals");
check(commonBulkheadTank.tanks.commonBulkhead.indirectAdvantages && commonBulkheadTank.tanks.commonBulkhead.indirectAdvantages.appliedToMass === false, "shorter-body common-bulkhead advantages should be explicitly reference-only");
check(commonBulkheadTank.tanks.commonBulkhead.indirectAdvantages.totalReferenceSavingKg > 0 && commonBulkheadTank.tanks.commonBulkhead.indirectAdvantages.externalAreaSavingM2 > 0, "reference panel should quantify the potential shortened-body mass and area advantages");
near(commonBulkheadTank.masses.airframeMassKg, separateTankLayout.masses.airframeMassKg, 0.05, "reference-only shortened-body savings must not materially alter solved airframe mass");
check(commonBulkheadTank.formulas.some((entry) => entry.id === "common-bulkhead"), "formula trace should expose common-bulkhead mass and length accounting");
check(commonBulkheadTank.formulas.some((entry) => entry.id === "common-bulkhead-cost" && entry.formula.includes("0.65")), "formula trace should expose common-bulkhead gross manufacturing cost and avoided-dome credit");
check(commonBulkheadTank.formulas.some((entry) => entry.id === "common-bulkhead-pressure" && entry.formula.includes("pcr")), "formula trace should expose spherical-cap curvature, membrane sizing, and reverse-pressure buckling");
check(commonBulkheadTank.formulas.some((entry) => entry.id === "common-bulkhead-thermal" && entry.unit.includes("kg/h")), "formula trace should expose common-bulkhead heat leak and equivalent boiloff");
check(commonBulkheadTank.formulas.some((entry) => entry.id === "common-bulkhead-reference-benefits" && entry.assumption.includes("不回写")), "formula trace should identify shortened-body benefits as reference-only");

for (const structureMode of ["single", "dual", "load-sharing", "copv", "stiffened", "sandwich", "balloon"]) {
  const tanks = { structureMode };
  if (structureMode === "copv") Object.assign(tanks, { interfaceMode: "slip", structuralMaterialKey: "copv-carbon", processKey: "filament-wound" });
  const design = Core.calculateDesign({ tanks });
  check(Number.isFinite(design.masses.tankMassKg) && design.masses.tankMassKg > 0, `${structureMode} tank route should produce a finite positive flight mass`);
  check(Number.isFinite(design.tanks.fuel.buckling.utilization), `${structureMode} tank route should report finite buckling utilization`);
}

const lowPc = Core.calculateDesign({ engine: { chamberPressureMpa: 5 } });
const highPc = Core.calculateDesign({ engine: { chamberPressureMpa: 14 } });
check(highPc.pumps.totalShaftPowerKw > lowPc.pumps.totalShaftPowerKw, "pump power should increase with chamber pressure");

const electricPump = Core.calculateDesign({ engine: { cycleKey: "electric-pump" } });
check(electricPump.pumps.battery.enabled, "electric-pump cycle should enable the battery model");
check(electricPump.pumps.battery.requiredOutputPowerKw > electricPump.pumps.totalShaftPowerKw, "battery output should include drive losses above pump shaft power");
check(electricPump.pumps.battery.requiredStoredEnergyKwh > electricPump.pumps.battery.deliveredEnergyKwh, "battery reserve should increase stored energy above delivered energy");
check(electricPump.pumps.battery.packMassKg >= electricPump.pumps.battery.cellMassKg, "pack overhead should not reduce cell mass");
check(electricPump.pumps.battery.totalElectricalMassKg > electricPump.pumps.battery.packMassKg, "motor and controller mass should be added outside the battery pack");
check(electricPump.cost.engineCostFactor === 0.1, "electric-pump result should expose the 0.10x engine cost factor");
check(electricPump.cost.bom.some((row) => row.label === "电池、电机与控制器"), "electric-pump BOM should separate the electrical power system");
check(electricPump.formulas.some((entry) => entry.id === "electric-battery"), "electric-pump formula trace should expose battery sizing");
check(!massDriven.pumps.battery.enabled, "non-electric cycles should keep the battery model disabled");

const lowEnergyBattery = Core.calculateDesign({ engine: { cycleKey: "electric-pump", batteryKey: "custom", customBatteryEnergyDensityWhKg: 80, customBatteryPowerDensityWKg: 20000 } });
const highEnergyBattery = Core.calculateDesign({ engine: { cycleKey: "electric-pump", batteryKey: "custom", customBatteryEnergyDensityWhKg: 800, customBatteryPowerDensityWKg: 20000 } });
check(lowEnergyBattery.pumps.battery.packMassKg > highEnergyBattery.pumps.battery.packMassKg, "battery mass should decrease with higher energy density when energy-limited");
const lowPowerBattery = Core.calculateDesign({ engine: { cycleKey: "electric-pump", batteryKey: "custom", customBatteryEnergyDensityWhKg: 2000, customBatteryPowerDensityWKg: 200 } });
const highPowerBattery = Core.calculateDesign({ engine: { cycleKey: "electric-pump", batteryKey: "custom", customBatteryEnergyDensityWhKg: 2000, customBatteryPowerDensityWKg: 5000 } });
check(lowPowerBattery.pumps.battery.packMassKg > highPowerBattery.pumps.battery.packMassKg, "battery mass should decrease with higher power density when power-limited");

const sea = Core.calculateDesign({ test: { environment: "sea" } });
const vacuum = Core.calculateDesign({ test: { environment: "vacuum" } });
check(vacuum.performance.ispS > sea.performance.ispS, "vacuum effective Isp should exceed sea-level Isp");

const oneEngine = Core.calculateDesign({
  sizingMode: "thrust-time",
  sizing: { targetThrustKn: 600, burnTimeS: 80 },
  engine: { engineCount: 1 }
});
const fourEngines = Core.calculateDesign({
  sizingMode: "thrust-time",
  sizing: { targetThrustKn: 600, burnTimeS: 80 },
  engine: { engineCount: 4 }
});
near(oneEngine.performance.totalThrustN, fourEngines.performance.totalThrustN, 0.01, "cluster should preserve requested total thrust");
check(fourEngines.engine.nozzle.throatDiameterM < oneEngine.engine.nozzle.throatDiameterM, "each clustered engine should have a smaller throat");

check(massDriven.cost.totalCostCny > 0, "manufacturing cost should be positive");
check(massDriven.cost.costIndex > 0, "relative manufacturing cost index should be positive");
check(massDriven.cost.bom.length >= 5, "BOM should contain component groups");
const methaneFuelCost = massDriven.cost.bom.find((row) => row.label === "燃料 · 液态甲烷");
const methaneOxidizerCost = massDriven.cost.bom.find((row) => row.label === "氧化剂 · 液氧");
check(methaneFuelCost && methaneOxidizerCost, "bipropellant BOM should list the selected fuel and oxidizer separately");
near(methaneFuelCost.massKg, massDriven.split.loadedFuelKg, 1e-8, "fuel cost should use loaded fuel mass including residual");
near(methaneOxidizerCost.massKg, massDriven.split.loadedOxidizerKg, 1e-8, "oxidizer cost should use loaded oxidizer mass including residual");
near(massDriven.cost.propellantCostCny, methaneFuelCost.costCny + methaneOxidizerCost.costCny, 1e-8, "propellant subtotal should equal its two BOM rows");
near(massDriven.cost.totalCostCny, massDriven.cost.bom.reduce((sum, row) => sum + row.costCny, 0), 1e-8, "displayed BOM rows should sum to total cost");
near(massDriven.cost.breakdown.reduce((sum, row) => sum + row.sharePct, 0), 100, 1e-8, "top-card cost shares should sum to 100 percent");
const hydrazineCostDesign = Core.calculateDesign({ propellantKey: "hydrazine" });
check(hydrazineCostDesign.cost.bom.filter((row) => row.category === "propellant").length === 1, "monopropellant BOM should contain one propellant cost row");
check(hydrazineCostDesign.cost.bom[0].label === "推进剂 · 联氨", "monopropellant cost row should name the selected chemical");
const higherMethanePrice = Core.calculateDesign({ cost: { fuelPriceCnyKg: massDriven.config.cost.fuelPriceCnyKg + 10 } });
near(higherMethanePrice.cost.totalCostCny - massDriven.cost.totalCostCny, massDriven.split.loadedFuelKg * 10, 1e-6, "editable fuel price should change total cost by loaded mass times unit-price delta");

const noLift = Core.calculateDesign({
  sizingMode: "thrust-time",
  sizing: { targetThrustKn: 20, burnTimeS: 30, propellantMassKg: 18000 },
  vehicle: { payloadKg: 30000 }
});
check(noLift.performance.twr <= 1, "deliberately under-thrusted design should have T/W <= 1");
check(noLift.flight.status === "no-liftoff", "T/W <= 1 should block liftoff");

const forcedVacuum = Core.calculateDesign({ test: { bodyKey: "earth", environment: "vacuum" } });
check(forcedVacuum.environment.forcedVacuum, "vacuum mode should be recorded in the design environment");
check(forcedVacuum.flight.points.every((point) => point.pressurePa === 0 && point.qPa === 0), "vacuum flight must not reuse Earth atmosphere");
check(forcedVacuum.staticFire.points.every((point) => point.pressurePa === 0), "vacuum static fire must use zero ambient pressure");

const earthHeavy = Core.calculateDesign({ sizingMode: "thrust-time", sizing: { targetThrustKn: 150, burnTimeS: 30 }, vehicle: { payloadKg: 30000 }, test: { bodyKey: "earth", environment: "sea" } });
const moonHeavy = Core.calculateDesign({ sizingMode: "thrust-time", sizing: { targetThrustKn: 150, burnTimeS: 30 }, vehicle: { payloadKg: 30000 }, test: { bodyKey: "moon", environment: "sea" } });
check(earthHeavy.performance.twr < moonHeavy.performance.twr, "local gravity should materially change launch T/W");
check(moonHeavy.flight.points.every((point) => point.pressurePa === 0 && point.qPa === 0), "airless-body flight should have no atmosphere or dynamic pressure");

for (const bodyKey of Object.keys(Data.celestialBodies)) {
  const bodyDesign = Core.calculateDesign({ test: { bodyKey, environment: "sea" } });
  check(bodyDesign.environment.bodyKey === bodyKey, `${bodyKey} environment should survive normalization and calculation`);
  check(bodyDesign.flight.bodyKey === bodyKey, `${bodyKey} flight should use the selected body`);
  check(bodyDesign.flight.points.every((point) => Number.isFinite(point.pressurePa)), `${bodyKey} flight pressure must remain finite`);
}
const marsEnvironmentDesign = Core.calculateDesign({ test: { bodyKey: "mars", environment: "sea" } });
near(marsEnvironmentDesign.performance.ambientPressurePa, Data.celestialBodies.mars.surfacePressurePa, 1e-6, "Mars design point should use Mars surface pressure");
check(marsEnvironmentDesign.engine.nozzle.expansionRatio === 58, "thin Mars atmosphere should select the high-expansion teaching nozzle preset");
const venusEnvironmentDesign = Core.calculateDesign({ test: { bodyKey: "venus", environment: "sea" } });
check(venusEnvironmentDesign.engine.nozzle.expansionRatio === 3, "crushing Venus atmosphere should select the minimum teaching expansion ratio");
check(venusEnvironmentDesign.issues.some((issue) => issue.component === "燃烧室/环境"), "ambient pressure at or above chamber pressure should be a hard engine warning");
const terraformedVenusDesign = Core.calculateDesign({ test: { bodyKey: "venus-500kpa", environment: "sea" } });
check(terraformedVenusDesign.engine.nozzle.expansionRatio === 10, "500 kPa Venus should use a reduced expansion teaching nozzle");
check(terraformedVenusDesign.issues.some((issue) => issue.component === "环境场景" && issue.severity === "info"), "partially terraformed Venus should be labeled as a conceptual comparison");
const integrationLimitDesign = Core.calculateDesign({
  test: { bodyKey: "mars", environment: "sea" },
  vehicle: { launchAltitudeM: 1234 }
});
check(integrationLimitDesign.flight.status === "limit", "Mars comparison should reach the 3600-second teaching integration limit");
check(Number.isFinite(integrationLimitDesign.flight.finalAltitudeM) && integrationLimitDesign.flight.finalAltitudeM > 0, "integration-limit flight should expose its final 3600-second altitude");
[600, 1800].forEach((timeS) => {
  const milestone = integrationLimitDesign.flight.altitudeMilestones[timeS];
  check(milestone && milestone.timeS === timeS, `integration-limit flight should record the T+${timeS}s milestone`);
  check(Number.isFinite(milestone.altitudeM) && milestone.altitudeM > 1234, `T+${timeS}s milestone should expose finite altitude`);
  near(milestone.distanceFromLaunchM, milestone.altitudeM - 1234, 1e-8, `T+${timeS}s ascent distance should be relative to launch altitude`);
});

const flight = massDriven.flight;
check(flight.status === "complete", "default flight should complete to apogee");
check(flight.points.length > 20, "flight should provide a useful time series");
check(flight.launchMode === "pad", "default flight should use launch-pad hold-downs");
check(flight.liftoffTimeS != null && flight.liftoffTimeS > 0, "launch-pad flight should report a positive liftoff time");
check(flight.prelaunchConsumedPropellantKg > 0, "engine startup and hold-down should consume propellant before liftoff");
const heldPoweredPoints = flight.points.filter((point) => point.heldDown && point.massFlowKgS > 0);
check(heldPoweredPoints.length > 0, "launch-pad startup should include powered hold-down samples");
check(heldPoweredPoints.every((point) => point.altitudeM === massDriven.config.vehicle.launchAltitudeM && point.velocityMs === 0), "hold-downs must keep the vehicle fixed while the engine consumes propellant");
check(flight.points.some((point) => point.padReleased && point.thrustQualifiedS >= 1 - 1e-8), "pad release should require T/W above one continuously for one second");
for (let i = 1; i < flight.points.length; i += 1) {
  check(flight.points[i].massKg <= flight.points[i - 1].massKg + 1e-8, "flight mass must be monotonic non-increasing");
}
check(flight.points.some((point) => point.thrustN === 0), "flight should include coast after burnout");
check(flight.burnoutSnapshot && Number.isFinite(flight.burnoutSnapshot.timeS), "flight should expose an exact burnout snapshot");
check(Number.isFinite(flight.burnoutSnapshot.velocityMs) && flight.burnoutSnapshot.velocityMs > 0, "burnout snapshot should expose shutdown velocity");
check(Number.isFinite(flight.burnoutSnapshot.altitudeM) && flight.burnoutSnapshot.altitudeM > massDriven.config.vehicle.launchAltitudeM, "burnout snapshot should expose shutdown altitude");
check(flight.burnoutSnapshot.maxPoweredVelocityMs + 1e-8 >= flight.burnoutSnapshot.velocityMs, "powered-flight peak speed should include the shutdown instant");
check(flight.maxAltitudeM > 0 && flight.maxVelocityMs > 0, "flight should gain altitude and speed");
check(flight.maxNetAccelG > 0, "flight should report maximum signed/net acceleration magnitude");
check(flight.maxDragAccelG >= 0, "flight should report maximum drag acceleration magnitude");
check(flight.points.some((point) => point.netAccelG > 0), "powered flight should include forward net acceleration");
check(flight.points.some((point) => point.netAccelG < 0), "coast should include acceleration opposite the forward direction");
check(flight.points.every((point) => Number.isFinite(point.gravityAccelG) && point.gravityAccelG < 0), "every flight point should expose gravity acceleration opposite the rocket-forward direction");
check(flight.points.every((point) => Number.isFinite(point.dragAccelG)), "every flight point should expose finite signed drag acceleration");
check(flight.points.every((point) => typeof point.throttleState === "string" && point.throttleState.length > 0), "every flight point should expose a throttle-valve state");
check(flight.points.some((point) => point.throttleState === "推力爬升"), "startup timeline should expose a thrust-ramp throttle state");
check(flight.points.some((point) => point.throttleState === "关机"), "coast timeline should expose an engine-off throttle state");
const dragFlightPoint = flight.points.find((point) => point.velocityMs > 1 && point.qPa > 0);
check(dragFlightPoint && dragFlightPoint.dragAccelG < 0, "drag acceleration should oppose positive rocket-forward velocity");
const poweredFlightPoint = flight.points.find((point) => point.massFlowKgS > 0);
const coastFlightPoint = flight.points.find((point) => point.thrustN === 0);
check(poweredFlightPoint && poweredFlightPoint.exitPressurePa > 0, "powered flight should expose positive nozzle exit pressure");
check(poweredFlightPoint && poweredFlightPoint.exhaustVelocityMs > 0, "powered flight should expose effective exhaust velocity");
near(poweredFlightPoint.fuelMassFlowKgS + poweredFlightPoint.oxidizerMassFlowKgS, poweredFlightPoint.massFlowKgS, 1e-8, "fuel and oxidizer live flow should conserve mass");
near(poweredFlightPoint.exhaustVelocityMs, poweredFlightPoint.thrustN / poweredFlightPoint.massFlowKgS, 1e-8, "effective exhaust velocity should equal thrust divided by mass flow");
near(poweredFlightPoint.exitPressurePa, massDriven.engine.nozzle.exitPressurePa * poweredFlightPoint.throttle, 1e-8, "exit pressure should scale with chamber/throttle command");
check(coastFlightPoint.massFlowKgS === 0 && coastFlightPoint.exitPressurePa === 0 && coastFlightPoint.exhaustVelocityMs === 0, "coast telemetry should show an inactive engine");
for (let i = 1; i < flight.points.length; i += 1) {
  check(flight.points[i].propellantRemainingKg <= flight.points[i - 1].propellantRemainingKg + 1e-8, "flight propellant must decrease monotonically");
}

const energy = massDriven.energy;
check(energy.status === "complete", "a valid trajectory should produce a complete energy ledger");
check(energy.points.length === flight.points.length, "energy statistics should preserve every flight time sample");
check(energy.bodyKey === massDriven.config.test.bodyKey, "energy potential should use the selected celestial body");
near(energy.points[0].potentialEnergyJ, 0, 1e-6, "launch altitude should be the zero-potential reference");
energy.points.forEach((point, index) => {
  check([point.totalEnergyJ, point.chemicalEnergyJ, point.potentialEnergyJ, point.kineticEnergyJ].every((value) => Number.isFinite(value) && value >= 0), `energy point ${index} should contain finite non-negative components`);
  near(point.totalEnergyJ, point.chemicalEnergyJ + point.potentialEnergyJ + point.kineticEnergyJ, Math.max(1e-5, point.totalEnergyJ * 1e-12), `energy point ${index} total should equal its three components`);
  near(point.kineticEnergyJ, 0.5 * point.massKg * point.velocityMs * point.velocityMs, Math.max(1e-5, point.kineticEnergyJ * 1e-12), `energy point ${index} kinetic energy should use current mass and velocity`);
  if (index > 0) check(point.chemicalEnergyJ <= energy.points[index - 1].chemicalEnergyJ + 1e-5, `energy point ${index} remaining chemical energy should not increase`);
});
const maxKineticEnergyJ = Math.max(...energy.points.map((point) => point.kineticEnergyJ));
near(energy.peakKinetic.kineticEnergyJ, maxKineticEnergyJ, Math.max(1e-5, maxKineticEnergyJ * 1e-12), "peak kinetic marker should select the global kinetic-energy maximum");
check(energy.peakPotential.potentialEnergyJ > 0, "ascending flight should gain positive gravitational potential energy");
check(Object.values(energy.statistics).every((value) => Number.isFinite(value) && value >= 0), "specific-energy and conversion statistics should remain finite and non-negative");
check(massDriven.formulas.some((entry) => entry.id === "flight-energy" && entry.formula.includes("½mv²")), "formula checker should trace the energy ledger");
check(noLift.energy.points.length === 1 && noLift.energy.peakKinetic.kineticEnergyJ === 0, "a no-liftoff design should still expose a stationary one-point energy ledger");
const lowSpecificEnergy = Core.calculateDesign({ propellantKey: "custom", customPropellant: { specificEnergyMjKg: 5 } });
const highSpecificEnergy = Core.calculateDesign({ propellantKey: "custom", customPropellant: { specificEnergyMjKg: 10 } });
near(highSpecificEnergy.energy.initialChemicalEnergyJ, lowSpecificEnergy.energy.initialChemicalEnergyJ * 2, Math.max(1e-5, highSpecificEnergy.energy.initialChemicalEnergyJ * 1e-12), "editable custom propellant specific energy should scale the initial energy ledger");
const shortEnergyCoast = Core.calculateDesign({ test: { energyCutoffMode: "post-burn", energyCoastPercent: 10 } });
check(shortEnergyCoast.energy.cutoff.mode === "post-burn", "energy cutoff result should record the post-burn mode");
near(shortEnergyCoast.energy.cutoff.coastDurationS, shortEnergyCoast.flight.burnTimeS * 0.10, 1e-8, "post-burn energy window should scale from actual powered duration");
near(shortEnergyCoast.energy.endPoint.timeS, shortEnergyCoast.flight.burnoutSnapshot.timeS + shortEnergyCoast.flight.burnTimeS * 0.10, 1e-8, "ten-percent coast should end at burnout plus ten percent of powered duration");
check(shortEnergyCoast.energy.points.length < shortEnergyCoast.flight.points.length, "post-burn cutoff should shorten the energy chart without truncating the flight simulation");
check(shortEnergyCoast.energy.fullPointCount === shortEnergyCoast.flight.points.length, "energy result should expose the uncut trajectory sample count");
const zeroEnergyCoast = Core.calculateDesign({ test: { energyCutoffMode: "post-burn", energyCoastPercent: 0 } });
near(zeroEnergyCoast.energy.endPoint.timeS, zeroEnergyCoast.flight.burnoutSnapshot.timeS, 1e-8, "zero-percent coast should stop the energy ledger exactly at burnout");
const longEnergyCoast = Core.calculateDesign({ test: { energyCutoffMode: "post-burn", energyCoastPercent: 50 } });
check(longEnergyCoast.energy.endPoint.timeS > shortEnergyCoast.energy.endPoint.timeS, "a larger coast percentage should move the energy cutoff later");
check(longEnergyCoast.energy.points.length > shortEnergyCoast.energy.points.length, "a larger coast percentage should retain more chart samples");
const escapingEnergyCoast = Core.calculateDesign({
  sizingMode: "delta-v",
  sizing: { targetDeltaV: 7000 },
  test: { bodyKey: "moon", energyCutoffMode: "post-burn", energyCoastPercent: 10 }
});
check(escapingEnergyCoast.flight.status === "escape", "high-energy lunar case should exercise the escape-trajectory branch");
check(escapingEnergyCoast.energy.endPoint.timeS > escapingEnergyCoast.flight.burnoutSnapshot.timeS, "escape classification must not truncate the requested post-burn energy coast window");
near(escapingEnergyCoast.energy.endPoint.timeS, escapingEnergyCoast.energy.cutoff.requestedTimeS, 1e-8, "escape trajectory energy endpoint should reach the requested coast cutoff");
check(escapingEnergyCoast.flight.points.some((point) => point.timeS > escapingEnergyCoast.flight.burnoutSnapshot.timeS && point.thrustN === 0), "escape trajectory should retain engine-off coast samples for energy statistics");
const automaticNameDesign = Core.calculateDesign({
  autoName: true,
  tanks: { diameterMode: "locked", diameterM: 5 },
  propellantKey: "lox-methane",
  engine: { cycleKey: "gas-generator" }
});
check(automaticNameDesign.config.name === "5米级-甲烷液氧-燃气循环火箭", "automatic naming should combine diameter class, propellant, and engine cycle");
check(Core.generateDesignName({ tanks: { diameterMode: "locked", diameterM: 2.5 }, propellantKey: "lox-rp1", engine: { cycleKey: "electric-pump" } }).includes("2.5米级-煤油液氧-电泵火箭"), "name generator should support other propellant and cycle combinations");

const fieldLaunch = Core.calculateDesign({ vehicle: { launchMode: "field" } });
check(fieldLaunch.flight.status === "complete", "field launch should complete for the default vehicle");
check(fieldLaunch.flight.liftoffTimeS < flight.liftoffTimeS, "field mode should leave the ground earlier than a one-second pad hold-down");
check(fieldLaunch.flight.prelaunchConsumedPropellantKg < flight.prelaunchConsumedPropellantKg, "field mode should consume less propellant before liftoff");
check(fieldLaunch.flight.points.every((point) => !point.heldDown), "field mode must not use launch-pad hold-downs");
check(fieldLaunch.flight.points.some((point) => point.groundSupported && point.massFlowKgS > 0), "field mode should remain ground-supported only until T/W exceeds one");

const titanFlight = Core.calculateDesign({ test: { bodyKey: "titan", environment: "sea" } });
const titanPoweredPoint = titanFlight.flight.points.find((point) => point.massFlowKgS > 0);
check(titanPoweredPoint.pressurePa > 101325, "Titan powered telemetry should preserve surface pressure above Earth sea level");
check(titanPoweredPoint.exhaustVelocityMs < poweredFlightPoint.exhaustVelocityMs, "high ambient pressure should lower simulated effective exhaust velocity during flight");

const unlimited = Core.calculateDesign({ vehicle: { limitLoads: false, maxQKpa: 8, maxAccelG: 2.2 } });
const limited = Core.calculateDesign({ vehicle: { limitLoads: true, maxQKpa: 8, maxAccelG: 2.2 } });
check(
  limited.flight.maxQPa < unlimited.flight.maxQPa || limited.flight.maxAccelG < unlimited.flight.maxAccelG,
  "load limiting should reduce max-Q or acceleration"
);

const pressureFedFailure = Core.calculateDesign({
  engine: { cycleKey: "pressure-fed", chamberPressureMpa: 4 },
  tanks: { pressureMpa: 0.4 }
});
check(pressureFedFailure.issues.some((issue) => issue.severity === "error" && issue.component === "挤压供给"), "invalid pressure-fed design should be flagged");
check(pressureFedFailure.staticFire.failed, "hard component limit should trigger deterministic static-fire shutdown");
check(pressureFedFailure.staticFire.faultReason.length > 0, "failed static fire should state a cause");
const pressureFed55 = Core.calculateDesign({
  engine: { cycleKey: "pressure-fed", chamberPressureMpa: 5.5 },
  tanks: { pressureMpa: 8 }
});
check(!pressureFed55.issues.some((issue) => issue.component === "发动机循环" && issue.message.includes("室压上限")), "pressure-fed cycle should accept chamber pressure below 6 MPa");
const pressureFed65 = Core.calculateDesign({
  engine: { cycleKey: "pressure-fed", chamberPressureMpa: 6.5 },
  tanks: { pressureMpa: 9 }
});
check(pressureFed65.issues.some((issue) => issue.component === "发动机循环" && issue.message.includes("6 MPa")), "pressure-fed cycle should flag chamber pressure above 6 MPa");

const staticFire = massDriven.staticFire;
check(staticFire.points.some((point) => point.phase === "点火"), "static fire should include an ignition phase");
check(staticFire.points.some((point) => point.phase === "稳态"), "static fire should include a steady phase");
check(staticFire.consumedPropellantKg > 0, "static fire should consume propellant");
for (let i = 1; i < staticFire.points.length; i += 1) {
  check(staticFire.points[i].consumedPropellantKg >= staticFire.points[i - 1].consumedPropellantKg - 1e-8, "static-fire consumed propellant must increase monotonically");
  check(staticFire.points[i].propellantRemainingKg <= staticFire.points[i - 1].propellantRemainingKg + 1e-8, "static-fire remaining propellant must decrease monotonically");
}
check(staticFire.points.every((point) => Number.isFinite(point.equivalentNetAccelG)), "static fire should expose finite equivalent acceleration");
const steadyFirePoint = staticFire.points.find((point) => point.phase === "稳态");
check(steadyFirePoint.exitPressurePa > 0 && steadyFirePoint.exhaustVelocityMs > 0, "static fire should expose live nozzle telemetry");
near(steadyFirePoint.fuelMassFlowKgS + steadyFirePoint.oxidizerMassFlowKgS, steadyFirePoint.massFlowKgS, 1e-8, "static-fire live flow should conserve mass");

const serialized = Core.serializeConfig(massDriven.config);
const roundTrip = Core.deserializeConfig(serialized);
check(roundTrip.schemaVersion === Data.schemaVersion, "configuration round trip should preserve schema version");
check(roundTrip.propellantKey === massDriven.config.propellantKey, "configuration round trip should preserve propellant");
assert.throws(() => Core.deserializeConfig('{"schemaVersion":0,"config":{}}'), /版本不兼容/);
checks += 1;

finiteDeep(massDriven, "defaultDesign");

const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "assets", "styles.css"), "utf8");
const app = fs.readFileSync(path.join(root, "js", "app.js"), "utf8");
const uiFormatSrc = fs.readFileSync(path.join(root, "js", "app", "ui-format.js"), "utf8");
const renderRocketSrc = fs.readFileSync(path.join(root, "js", "app", "render-rocket.js"), "utf8");
[
  "data-bind=\"sizingMode\"",
  "id=\"rocketSvg\"",
  "data-view=\"cartoon\"",
  "data-view=\"scale\"",
  "id=\"flightChart\"",
  "data-result-tab=\"energy\"",
  "data-result-panel=\"energy\"",
  "id=\"energyUnitSelect\"",
  "id=\"energyMetrics\"",
  "id=\"energyPeakMetrics\"",
  "id=\"energyChart\"",
  "id=\"energyAssumption\"",
  "data-bind=\"customPropellant.specificEnergyMjKg\"",
  "id=\"energyCutoffMode\"",
  "id=\"energyCoastPercent\"",
  "id=\"energyCutoffStatus\"",
  "id=\"designNameInput\"",
  "id=\"autoNameToggle\"",
  "id=\"autoNamePreview\"",
  "id=\"historicalPresetSelect\"",
  "id=\"historicalPresetReadout\"",
  "id=\"loadHistoricalPresetBtn\"",
  "data-bind=\"autoName\"",
  "id=\"summaryMassShares\"",
  "id=\"summaryDryMassShares\"",
  "id=\"includePayloadInDryBreakdown\"",
  "id=\"resetStructuralFactorBtn\"",
  "id=\"resetPriceTuningBtn\"",
  "id=\"priceDebugDetails\"",
  "id=\"rocketWisdom\"",
  "id=\"rocketWisdomKind\"",
  "id=\"rocketWisdomText\"",
  "id=\"rocketWisdomAttribution\"",
  "id=\"staticChart\"",
  "id=\"formulaList\"",
  "id=\"materialTableBody\"",
  "id=\"compareDialog\"",
  "id=\"staticRunBtn\"",
  "id=\"flightRunBtn\"",
  "id=\"animationPauseBtn\"",
  "id=\"soundToggleBtn\"",
  "id=\"environmentScenarioSelect\"",
  "id=\"animationEnvironment\"",
  "id=\"soundMasterVolume\"",
  "id=\"soundIgnitionVolume\"",
  "id=\"soundRumbleVolume\"",
  "id=\"soundJetVolume\"",
  "id=\"soundAutoFade\"",
  "id=\"soundVacuumAttenuation\"",
  "id=\"soundMixStatus\"",
  "id=\"launchSequenceSettings\"",
  "id=\"launchSequenceStatus\"",
  "id=\"countdownEnabled\"",
  "id=\"immersiveLaunch\"",
  "id=\"autoPauseAfterBurnout\"",
  "id=\"countdownSeconds\"",
  "id=\"launchModeSelect\"",
  "id=\"engineStartupSeconds\"",
  "id=\"previewAtmosphereToggle\"",
  "data-bind=\"test.previewAtmosphere\"",
  "id=\"animationLaunchState\"",
  "id=\"animationDynamicPressure\"",
  "id=\"animationThrottle\"",
  "data-bind=\"vehicle.liftoffTargetMode\"",
  "data-bind=\"vehicle.targetLiftoffAccelMs2\"",
  "data-bind=\"tanks.structureMode\"",
  "data-bind=\"tanks.fuelLinerMaterialKey\"",
  "data-bind=\"tanks.oxidizerLinerMaterialKey\"",
  "data-bind=\"tanks.structuralMaterialKey\"",
  "data-tank-structure=\"single,stiffened,sandwich,balloon\"",
  "data-tank-structure=\"dual\"",
  "data-bipropellant-tank",
  "data-liftoff-target=\"acceleration\"",
  "id=\"batterySelect\"",
  "id=\"batteryReadout\"",
  "data-electric-battery",
  "data-bind=\"engine.batteryKey\"",
  "data-bind=\"engine.customBatteryEnergyDensityWhKg\"",
  "data-bind=\"engine.customBatteryPowerDensityWKg\"",
  "id=\"flightLiveStrip\"",
  "id=\"flightLiveAltitude\"",
  "id=\"flightLiveVelocity\"",
  "id=\"flightLiveAcceleration\"",
  "id=\"flightLiveAccelerationDetail\"",
  "id=\"flightLiveDynamicPressure\"",
  "id=\"flightLiveTimeScale\"",
  "id=\"engineLiveStrip\"",
  "id=\"engineAmbientPressure\"",
  "id=\"engineExitPressure\"",
  "id=\"engineCurrentThrust\"",
  "id=\"engineMassFlow\"",
  "id=\"engineMassFlowDetail\"",
  "id=\"engineExhaustVelocity\"",
  "id=\"fuelRemainBar\"",
  "id=\"oxidizerRemainBar\"",
  "id=\"summaryAccelNote\"",
  "id=\"summaryCost\"",
  "id=\"summaryCostNote\"",
  "id=\"summaryCostShares\"",
  "data-bind=\"cost.fuelPriceCnyKg\"",
  "data-bind=\"cost.oxidizerPriceCnyKg\"",
  "data-bipropellant-cost",
  "js/core.js",
  "js/audio-model.js"
].forEach((marker) => check(html.includes(marker), `HTML contract missing ${marker}`));
check(css.includes("@media (max-width: 640px)"), "mobile breakpoint is required");
check(css.includes("prefers-reduced-motion"), "reduced-motion support is required");
check(app.includes("localStorage"), "local design persistence is required");
check(app.includes("renderComparison"), "two-design comparison is required");
check((app.includes("renderScaleRocket") || renderRocketSrc.includes("renderScaleRocket")), "true-scale vehicle drawing is required");
check(app.includes('view: "scale"') && app.includes('setView("scale")'), "true-scale vehicle drawing should be the default view");
check(app.includes("renderMaterialLibrary"), "visible absolute and relative material data are required");
check(app.includes("renderEnergy") && app.includes("renderEnergyChart"), "energy statistics require result rendering and a shared-axis chart");
check((app.includes("ENERGY_UNITS") || uiFormatSrc.includes("ENERGY_UNITS")) && ["TJ", "GJ", "MJ", "kJ"].every((unit) => app.includes(`${unit}:`) || uiFormatSrc.includes(`${unit}:`)), "energy display should support selectable engineering units");
check(app.includes("energy-peak-line") && app.includes("energy-peak-dot") && app.includes("peakKinetic"), "energy chart should mark peak kinetic energy with a vertical line and four coincident-time points");
check(["totalEnergyJ", "chemicalEnergyJ", "potentialEnergyJ", "kineticEnergyJ"].every((field) => app.includes(field)), "energy chart should render all four requested energy series");
check(app.includes("applyEnergyControls") && app.includes("energyCoastPercent") && app.includes("energyCutoffStatus"), "energy cutoff controls should recalculate and describe the selected endpoint");
check(app.includes("syncAutoNameControls") && app.includes("Core.generateDesignName"), "automatic design-name preview should follow calculated diameter, propellant, and cycle");
check(app.includes("function populateHistoricalPresets") && app.includes("function renderHistoricalPresetReadout"), "historical presets should populate the mission wizard and show cited reference dimensions and performance");
check(app.includes("function loadHistoricalPreset") && app.includes("Data.historicalRocketPresets"), "historical presets should load complete editable configurations into the calculation core");
check(app.includes("Data.modernRocketPresets") && (app.includes('appendGroup("现代代表"') || uiFormatSrc.includes('appendGroup("现代代表"')), "the mission preset selector should group modern launch vehicles separately from historical classics");
check(html.includes("经典与现代火箭预设集") && html.includes("载入参考预设"), "the mission wizard should present one combined classic-and-modern preset library");
check((html.match(/max="40"/g) || []).length >= 4, "core, booster, and serial-stage engine controls should support modern clusters up to forty engines");
check(css.includes(".historical-preset-panel") && css.includes(".historical-preset-readout"), "the historical preset library should use an integrated responsive mission-panel layout");
check(html.includes('经验结构系数 <b>推荐 0.055</b>') && app.includes("resetStructuralFactor"), "structural factor should show its recommended baseline and provide a reset action");
check(html.includes('<details class="expert-details" id="priceDebugDetails">') && html.indexOf('id="priceDebugDetails"') < html.indexOf('data-bind="cost.assemblyFactor"') && html.indexOf('id="priceDebugDetails"') < html.indexOf('data-bind="cost.priceScale"'), "price and assembly tuning should be hidden inside a closed price-debug disclosure");
check(app.includes("resetPriceTuning") && app.includes("state.config.cost.priceScale = 1") && app.includes("Data.defaultConfig.cost.assemblyFactor"), "price reset should restore one-times overall correction and the default assembly factor");
check(app.includes("priceOf(state.config.tanks.materialKey") && app.includes("priceOf(state.config.engine.pumpMaterialKey") && app.includes("priceOf(state.config.airframe.materialKey"), "price reset should reload reference prices from the currently selected materials");
check((html.match(/data-bind="tanks\.diameterMode"/g) || []).length === 2, "diameter mode should be directly available in both mission sizing and tank steps");
check((html.match(/data-bind="tanks\.diameterM"/g) || []).length === 2 && (html.match(/data-bind="tanks\.targetAspect"/g) || []).length === 2, "locked diameter and automatic aspect-ratio inputs should be duplicated beside the mission sizing mode");
check(html.includes("mission-diameter-controls") && html.includes("与“储箱”步骤中的尺寸入口同步"), "mission step should explain that its diameter controls mirror the tank step");
check(app.includes("syncBoundPeers(control, value)"), "duplicated diameter controls should immediately synchronize their peer entry");
check(app.includes("summaryMassShares") && app.includes("summaryDryMassShares") && app.includes("dryMassRatio") && app.includes("干质比 m湿/m干") && !app.includes("dryMassRatioPct"), "liftoff mass card should render separate wet/dry allocations and show wet-over-dry mass ratio as a decimal");
check(app.includes("includePayloadInDryBreakdown") && app.includes("entry.included"), "dry-mass allocation should let the user include or exclude payload while always excluding propellant");
check(app.includes("飞行器剩余总能量"), "energy ledger should clarify that its total is the energy remaining on the current vehicle");
check(app.includes("WISDOM_INTERVAL_MS = 3 * 60 * 1000") && app.includes("WISDOM_FADE_HALF_MS = 1500"), "rocket wisdom should rotate every three minutes with a three-second two-phase fade");
check(app.includes("initializeRocketWisdom()") && app.includes("switchRocketWisdomForSimulation()"), "rocket wisdom should rotate on app entry and every simulation start");
check(app.includes("setInterval(function () { rotateRocketWisdom(true); }, WISDOM_INTERVAL_MS)"), "rocket wisdom should continue rotating on the requested interval");
check(app.includes('result.tanks.structureMode === "dual"') && app.includes("linerLayer") && app.includes("structuralLayer"), "tank readouts should separately render dual-layer thickness and mass");
check(app.includes("applyPropellantReferencePrices") && app.includes("fuelPriceCnyKg") && app.includes("oxidizerPriceCnyKg"), "changing propellant presets should load matching editable reference prices");
check(app.includes("result.cost.breakdown") && app.includes("summaryCostShares"), "top total-cost card should render component cost shares from core results");
check(html.includes('value="load-sharing"') && html.includes('value="copv"') && html.includes('value="balloon"'), "tank wizard should expose dynamic load-sharing, COPV, and pressure-stabilized balloon routes");
check(html.includes('data-bind="tanks.geometryMode"') && html.includes('data-bind="tanks.commonBulkheadType"'), "tank wizard should expose separate and common-bulkhead arrangements");
check(html.includes('data-bind="tanks.commonBulkheadPressureMode"') && html.includes('data-bind="tanks.commonBulkheadControlledDeltaKpa"') && html.includes('data-bind="tanks.commonBulkheadProofFactor"'), "common-bulkhead wizard should expose self-supporting versus pressure-stabilized differential-pressure design");
check(html.includes('data-bind="tanks.commonBulkheadHeightRatio"') && html.includes('data-bind="tanks.commonBulkheadCoreThicknessMm"'), "common-bulkhead wizard should expose cap geometry and thermal-core depth");
check(html.includes('data-bind="tanks.commonBulkheadFuelMaterialKey"') && html.includes('data-bind="tanks.commonBulkheadOxidizerMaterialKey"'), "common-bulkhead wizard should allow separate contact-face materials");
check(html.includes('data-bind="boosters.enabled"') && html.includes('id="boosterReadout"') && html.includes("Add Moar Booster"), "mission wizard should expose an opt-in parallel booster editor and live readout");
check(html.includes('data-design-section-button="core"') && html.includes('data-design-section-button="boosters"') && html.includes('data-design-section-button="stage-0"') && html.includes('data-design-section-button="stage-1"') && html.includes('id="addSerialStageBtn"'), "wizard should expose core, booster, second-stage, third-stage, and add-stage navigation");
check(html.includes('data-design-section-page="boosters"') && html.includes('data-design-section-page="serial"'), "booster and reusable serial-stage editors should use independent wizard pages");
check((html.match(/data-bind="boosters\.enabled"/g) || []).length === 1, "booster enable control should exist only in the core mission page");
check(html.indexOf('data-bind="boosters.enabled"') < html.indexOf('data-design-section-page="boosters"'), "the core mission switch should gate the independent booster page");
check(app.includes("function setDesignSection") && app.includes("state.designSection") && app.includes('aria-disabled'), "wizard section switching should gate booster access and manage reusable serial stages");
check(css.includes(".design-section-nav") && css.includes(".design-section-button") && css.includes(".wizard-addon-step") && css.includes(".serial-stage-step"), "independent booster and serial-stage pages require responsive navigation styling");
check((html.match(/data-stage-step-button=/g) || []).length === 5 && html.includes('data-stage-bind="separation.mode"'), "every serial stage should reuse four design groups plus a fifth separation step");
check(html.includes('data-stage-copy-previous="propellant"') && html.includes('data-stage-copy-previous="tanks"') && html.includes('data-stage-copy-previous="engine"'), "upper stages should paste propellant, tank, and engine settings from the preceding stage");
check(html.includes('data-stage-copy="propellant"') && html.includes('data-stage-paste="propellant"') && app.includes("stageClipboard"), "upper-stage copy/paste should use detached editable snapshots");
check(app.includes("function addSerialStage") && app.includes("Data.createDefaultSerialStage") && app.includes("function deleteActiveSerialStage"), "the wizard should add further stages and allow deleting stages beyond the two defaults");
check((app.includes("renderSerialScaleRocket") || renderRocketSrc.includes("renderSerialScaleRocket")) && (app.includes("serial-stage-body") || renderRocketSrc.includes("serial-stage-body")) && css.includes(".serial-stage-body"), "the true-scale preview should draw each serial stage and interface");
check(app.includes('data-stage-bind^="tanks."') && app.includes("activeStagePropellant"), "upper-stage tank material warnings should use that stage's own propellant temperature");
check(app.includes('STORAGE_CURRENT = "rocket-sim-current-v2"') && app.includes("recoveryAttempted"), "startup should leave the broken v1 working snapshot behind and recover to a known-good default on calculation failure");
check(html.includes('id="restoreDefaultBtn"') && app.includes("function restoreDefaultDesign"), "the user should always have a visible route back to the default usable rocket");
check((html.match(/data-bind="engine\.engineCount"/g) || []).length >= 2, "core engine count should be editable from both mission and engine pages");
check(html.includes('data-booster-engine="copy-core"') && html.includes('data-booster-engine="custom" open'), "booster engine inheritance and independent editing states should remain explicit");
check(app.includes("function stepScaleBounds") && app.includes("engineCount|count|designCycles|countdownSeconds"), "discrete count inputs should reject fractional step scales that normalization would round away");
check(html.includes('data-bind="boosters.propellantMode"') && html.includes('id="boosterPropellantSelect"'), "boosters should support copying or independently selecting propellant");
check(html.includes('data-bind="boosters.diameterMode"') && html.includes('data-bind="boosters.diameterM"'), "boosters should support copied or independent diameter sizing");
check(html.includes('data-bind="boosters.engineMode"') && html.includes('id="boosterCycleSelect"') && html.includes('data-bind="boosters.targetThrustKn"'), "boosters should support copied or independent engine sizing");
check(html.includes('data-bind="boosters.includeInDeltaVSizing"') && html.includes('data-bind="boosters.separationDelayS"') && html.includes('data-bind="boosters.separationReliabilityPct"'), "booster controls should expose delta-v coupling, separation timing, and reliability");
check((app.includes("scaleBoosterSideGroups") || renderRocketSrc.includes("scaleBoosterSideGroups")) && app.includes('data-anim="booster-fill"') && (app.includes('data-engine-role="${role}"') || renderRocketSrc.includes('data-engine-role="')), "both vehicle views should render animated booster hardware, propellant, and exhaust roles");
check(app.includes("boosterSeparationSnapshot") && app.includes("boosterRemainingFraction") && app.includes("助推器已分离"), "flight playback should visualize booster depletion and separation state");
check(css.includes(".parallel-booster-controls") && css.includes(".booster-assembly.is-separated") && css.includes(".rocket-svg .booster-fluid"), "parallel booster controls and vehicle geometry require responsive visual styling");
check(html.includes('data-bind="tanks.interfaceMode"') && html.includes('data-bind="tanks.interfaceShearStrengthMpa"') && html.includes('data-bind="tanks.linerPrestressMpa"'), "layered tank wizard should expose bonding, slip, prestress, and interface strength");
check(html.includes('data-bind="tanks.bucklingKnockdownPct"') && html.includes('data-bind="tanks.ovalityPct"') && html.includes('data-bind="tanks.designCycles"'), "tank wizard should expose buckling knockdown, geometric imperfection, and pressure-cycle controls");
check(app.includes("thermalMismatchStressMpa") && app.includes("linerWrinklingUtilization") && app.includes("commonBulkhead.netMassDeltaKg"), "tank readout should render thermal mismatch, liner wrinkling, and common-bulkhead mass tradeoffs");
check(app.includes("commonBulkhead.pressureEnvelope") && app.includes("commonBulkhead.thermal.totalHeatLeakW") && app.includes("commonBulkhead.stability.bondUtilization"), "tank readout should expose common-bulkhead pressure envelope, thermal leak, and sandwich failure checks");
check(app.includes("common-bulkhead") && app.includes("minimumStabilityPressurePa"), "vehicle preview and tank readout should distinguish common bulkheads and balloon stability pressure");
check(app.includes("common-bulkhead-cost") || app.includes("共底分项计价"), "cost view should explain the signed common-bulkhead manufacturing impact");
check(app.includes('row.costRole === "common-bulkhead-net"') && app.includes("毛增加质量仅作计价基准") && app.includes("净变化"), "common-bulkhead BOM should present only one signed net mass row while retaining the gross price basis");
check(html.includes('id="commonBulkheadAdvantages"') && app.includes("共底带来的重量削减的其他优势") && app.includes("不参与计算"), "cost view should expose a clearly reference-only shortened-body advantage summary");
check(html.includes('id="tankProcessTableBody"') && app.includes("renderTankProcessLibrary"), "tank reference area should render the manufacturing process library");
check(app.includes("materialThermalExpansionPpmK") && html.includes("代表 CTE"), "material reference table should expose the representative thermal-expansion input used by layered tanks");
check(app.includes("updateMaterialTemperatureOptions") && app.includes("tankMaterialTemperatures") && app.includes("option.dataset.temperatureStatus"), "tank material options should refresh against the current propellant temperatures");
check(app.includes('option.classList.toggle("is-temperature-incompatible", incompatible)') && app.includes("温区不符") && app.includes("has-temperature-incompatible-selection"), "incompatible tank materials should receive visible option and selected-state warnings");
check(app.includes('path === "tanks.fuelLinerMaterialKey"') && app.includes('path === "tanks.oxidizerLinerMaterialKey"') && app.includes('path === "tanks.commonBulkheadFuelMaterialKey"') && app.includes('path === "tanks.structuralMaterialKey"'), "temperature screening should distinguish tank material roles");
check(css.includes(".material-select option.is-temperature-incompatible") && css.includes(".material-select.has-temperature-incompatible-selection"), "temperature-incompatible material choices require red styling");
check(Data.sources.some((source) => source.label.includes("SP-8007")) && Data.sources.some((source) => source.label.includes("Centaur")) && Data.sources.some((source) => source.label.includes("COPV")), "tank routes should include primary NASA buckling, balloon-tank, and COPV references");
check(Data.sources.some((source) => source.label.includes("SP-8088")) && Data.sources.some((source) => source.label.includes("Ares I 共底制造")) && Data.sources.some((source) => source.label.includes("共底无损检测")), "redesigned common-bulkhead model should cite NASA design, manufacturing, and NDE primary sources");
check(html.includes('data-bind="engine.clusterArchitecture"') && html.includes('value="ideal-multi-chamber"'), "engine wizard should expose realistic, shared, and ideal multi-chamber cluster architectures");
check(html.includes('data-bind="engine.perEngineFixedMassKg"') && html.includes('data-bind="engine.perEngineFixedCostCny"'), "engine wizard should expose per-engine fixed mass and cost");
check(html.includes('data-bind="engine.singleUnitReliabilityPct"') && html.includes('data-bind="engine.allowOneEngineOut"'), "engine wizard should expose reliability and engine-out controls");
check(app.includes("clusterReadout") && app.includes("missionReliabilityPct") && app.includes("clusterIntegrationMassKg"), "cluster readout should show architecture, integration mass, and mission reliability");
check((app.includes("clusterLayoutInset") || renderRocketSrc.includes("clusterLayoutInset")) && (app.includes("cluster.positions") || renderRocketSrc.includes("cluster.positions")), "true-scale preview should render the computed top-down nozzle packing layout");
check(html.indexOf('id="summaryDv"') < html.indexOf('id="summaryCost"') && html.indexOf('id="summaryCost"') < html.indexOf('id="summaryMass"'), "total-cost card should sit between ideal delta-v and liftoff mass");
check(app.includes("requestAnimationFrame(animationTick)"), "dynamic playback must use requestAnimationFrame");
check(app.includes("refreshFlightPlaybackGate") && app.includes("Core.liftoffState") && app.includes("芯级与助推器组合工况刷新直飞时间轴"), "flight playback should recover a stale core-only gate from the combined core-plus-booster launch state");
check(app.includes('"直飞运行中"') && app.includes("直飞指令已接收"), "flight playback should provide immediate visible acknowledgement while the vehicle remains held down");
check(app.includes("SpeechSynthesisUtterance") && app.includes("handleCountdownVoice"), "immersive launch requires generated Chinese voice countdown calls");
check(app.includes('frame.timeS >= 0') && app.includes('animation.boomPlayed'), "flight ignition boom must wait until T0");
check(app.includes('timeS <= 5') && app.includes('return 1'), "immersive launch should enforce real-time playback through T+5");
check(app.includes('state.animation.simTimeS = -countdownSeconds'), "flight playback should begin at the configured negative countdown time");
check(app.includes("burnout.timeS + 1") && app.includes("autoPauseHandled") && app.includes("autoPauseTimeS < endTime"), "optional burnout pause should stop once at exactly one second after shutdown");
check(app.includes("连续惯性滑行") && app.includes("熄火后 1 秒自动暂停"), "launch status should distinguish continuous coasting from optional burnout pause");
check(app.includes("window.AudioContext || window.webkitAudioContext"), "ignition and rumble must use generated Web Audio");
check(app.includes("playIgnitionBoom"), "ignition boom synthesis is required");
check(app.includes("startRumble"), "continuous engine rumble synthesis is required");
check(app.includes("lowOutput") && app.includes("jetOutput") && app.includes("turbineOutput"), "engine audio must use independent rumble, jet, and turbine channels");
check(app.includes("AudioModel.calculateSoundEnvelope"), "runtime audio must consume the tested automatic envelope model");
check(app.includes("STORAGE_AUDIO"), "sound preferences should persist locally");
check(app.includes("populateCelestialBodies") && app.includes("syncEnvironmentControls"), "environment scenario controls are required");
check(app.includes("populateBatteries") && app.includes("result.pumps.battery"), "electric-pump battery controls and readouts are required");
check(app.includes('flight.status === "limit"') && app.includes("T+${timeS} s 高度 / 上升距离"), "3600-second flight results should display 600s and 1800s altitude milestones");
check(app.includes('class="summary-milestone"') && app.includes("milestone600") && app.includes("milestone1800"), "ideal-delta-v card should show 600s and 1800s milestones below the integration-limit message");
check(app.includes("flight.burnoutSnapshot") && app.includes("熄火时速度") && app.includes("关机高度"), "ideal-delta-v card should show shutdown velocity and altitude");
check(app.includes("updateEnvironmentScene") && (app.includes("mixColor") || uiFormatSrc.includes("mixColor")), "altitude-sensitive environment backgrounds are required");
check(app.includes("idleBlueprint") && app.includes("state.config.test.previewAtmosphere") && app.includes("编辑图纸"), "idle preview toggle should switch between blueprint black and atmospheric color");
check((app.includes("applyFlamePalette") || renderRocketSrc.includes("applyFlamePalette")) && app.includes("Data.flamePalettes"), "propellant-specific flame rendering is required");
check(app.includes("updateEngineMarkers"), "dynamic engine marker updates are required");
check((app.includes("formatPressure") || uiFormatSrc.includes("formatPressure")) && (app.includes("formatThrust") || uiFormatSrc.includes("formatThrust")) && (app.includes("formatMassFlow") || uiFormatSrc.includes("formatMassFlow")), "live markers require unit-aware formatting");
check(app.includes('data-anim="fuel-fill"'), "animated fuel level is required");
check(app.includes('data-anim="plume"'), "altitude-sensitive animated exhaust plume is required");
check(app.includes('data-anim="velocity-arrow"'), "forward-relative velocity arrow is required");
check(app.includes('data-anim="accel-arrow"'), "forward-relative acceleration arrow is required");
check(app.includes('data-anim="gravity-arrow"') && app.includes('data-anim="drag-arrow"'), "flight view requires separate gravity and drag acceleration arrows");
check(app.includes("frame.qPa") && app.includes("frame.throttleState"), "dynamic telemetry must display current Q and throttle-valve state");
check(app.includes("updateFlightLiveTelemetry") && app.includes("playbackRateText") && app.includes("animationSpeed(mode, timeS)"), "persistent flight telemetry must report the actual playback multiplier");
check(app.includes('"0× · 暂停"') && app.includes('"0× · 结束"'), "playback telemetry should distinguish paused and completed simulations");
check(css.includes(".dynamic-telemetry"), "dynamic telemetry layout is required");
check(css.includes(".sound-mixer-grid"), "sound mixer responsive layout is required");
check(css.includes(".launch-sequence-grid"), "launch sequence controls require a responsive layout");
check(css.includes("[data-electric-battery][hidden]") && css.includes("[data-liftoff-target][hidden]"), "conditional liftoff and battery controls must hide cleanly");
check(css.includes("[data-tank-structure][hidden]") && css.includes("[data-bipropellant-tank][hidden]"), "tank structure and unused oxidizer-liner fields must hide cleanly");
check(css.includes("[data-tank-geometry][hidden]") && css.includes(".common-bulkhead"), "common-bulkhead controls and true-scale marker require responsive styling");
check(css.includes(".engine-live-strip") && css.includes(".engine-marker"), "live engine marker layout is required");
check(css.includes(".flight-live-strip"), "persistent flight telemetry should share the boxed live-marker layout");
check(css.includes(".energy-toolbar") && css.includes(".energy-peak-line") && css.includes(".energy-peak-dot"), "energy controls and peak markers require responsive styling");
check(css.includes(".energy-coast-band") && css.includes(".energy-cutoff-line") && css.includes(".energy-burnout-line"), "post-burn and coast-to-zero energy modes should have visibly distinct chart markers");
check(css.includes(".auto-name-field"), "automatic naming option should use the existing responsive form styling");
check(css.includes(".summary-mass-shares") && css.includes(".summary-dry-mass-shares") && css.includes(".summary-dry-toggle"), "liftoff and dry-mass allocations require compact responsive styling");
check(css.includes(".mission-diameter-controls"), "mission sizing diameter shortcut requires integrated responsive styling");
check(css.includes(".input-action") && css.includes(".debug-reset-row") && css.includes(".button-small"), "reset controls and collapsed price-debug content require compact responsive styling");
check(css.includes(".common-bulkhead-cost") && css.includes(".common-bulkhead-advantages") && css.includes(".common-bulkhead-net"), "common-bulkhead net cost and reference-only advantages require distinct readable styling");
check(css.includes("[data-common-bulkhead-type][hidden]") && css.includes("[data-common-bulkhead-pressure][hidden]"), "common-bulkhead expert controls require conditional responsive visibility");
check(css.includes(".rocket-wisdom") && css.includes("transition: opacity 1.5s ease") && css.includes(".rocket-wisdom.is-fading"), "topbar wisdom should implement the requested fade transition");
check(css.includes(".cluster-base-envelope") && css.includes(".cluster-nozzle") && css.includes(".cluster-warning-label"), "cluster packing inset and expansion warning require dedicated SVG styling");
check(css.includes("--stage-top") && css.includes("--stage-bottom") && css.includes("--stage-grid"), "environment scene color variables are required");
check(css.includes(".preview-atmosphere-control") && css.includes(".rocket-stage.is-blueprint"), "idle atmosphere control and blueprint scene styling are required");
check(css.includes("--plume-outer") && css.includes("--plume-core") && css.includes("--plume-glow"), "flame palette variables are required");
check(css.includes(".thrust-plume-core"), "layered exhaust plume styling is required");
check(css.includes(".motion-gravity") && css.includes(".motion-drag"), "gravity and drag arrows require distinct visual styling");
check(css.includes(".summary-card .summary-milestone"), "delta-v milestone lines require compact summary-card styling");
check(css.includes(".summary-cost-shares") && css.includes("repeat(4, minmax(0, 1fr))"), "four-card summary and compact cost-share layout are required");
check(css.includes("--topbar-height") && css.includes(".summary-grid") && css.includes("position: sticky") && css.includes("top: var(--topbar-height)"), "the four summary cards should remain frozen below the topbar while scrolling");
check(app.includes("initializeStickySummary") && app.includes("updateStickySummaryOffset") && app.includes("ResizeObserver"), "sticky summary offset should track responsive topbar height");
check(html.includes('id="controlTooltip"') && html.includes('role="tooltip"'), "a reusable accessible control tooltip is required");
check(app.includes("TOOLTIP_DWELL_MS = 420") && app.includes("initializeControlTooltips") && app.includes("dataset.controlHelpTrigger"), "control labels should initialize delayed hover help");
check(app.includes("CONTROL_HELP") && app.includes("OPTION_HELP") && app.includes("MANUAL_CONTROL_HELP"), "tooltips should include parameter, option, and simulation-control explanations");
check(app.includes("selectedOptionHelp") && app.includes("Data.propellants") && app.includes("Data.materials") && app.includes("Data.processes") && app.includes("Data.cycles") && app.includes("Data.batteries") && app.includes("Data.celestialBodies"), "tooltips should explain dynamic engineering presets");
check(app.includes('trigger.addEventListener("click"') && app.includes('document.addEventListener("pointerdown"') && app.includes('event.key === "Escape"') && !app.includes('control.addEventListener("focus"'), "tooltips should open only from their text triggers and dismiss outside or with Escape");
check(css.includes(".control-help-trigger") && css.includes(".control-tooltip") && css.includes(".control-tooltip[hidden]"), "control tooltip markers and responsive overlay styling are required");
check(app.includes("STORAGE_STEP_SCALES") && app.includes("STEP_SCALE_MIN_EXPONENT = -2") && app.includes("STEP_SCALE_MAX_EXPONENT = 6"), "numeric step-scale ranges and persistence are required");
check(app.includes("initializeStepScaleControls") && app.includes('input[type="number"]') && app.includes("applyStepScaleGroup"), "number inputs should receive synchronized step-scale controls");
check(app.includes('"-2": "0.01×"') && app.includes('2: "100×"') && app.includes('6: "1M×"'), "step-scale labels should cover fine through large orders of magnitude");
check(css.includes(".number-step-wrap") && css.includes(".step-scale-control") && css.includes(".step-scale-button") && css.includes(".step-scale-output"), "green numeric step-scale controls require responsive styling");
check(css.includes("grid-template-columns: minmax(0, 1fr) 28px") && css.includes(".field-with-action"), "step-scale controls should stay narrow and action-heavy parameters should receive a full row");
check(html.includes('class="field full-span field-with-action"') && html.includes('id="resetStructuralFactorBtn"'), "the structural factor and reset action should use an uncongested full-width row");

const ids = Array.from(html.matchAll(/\sid="([^"]+)"/g), (match) => match[1]);
check(new Set(ids).size === ids.length, "HTML ids must be unique");

const dataBindings = Array.from(html.matchAll(/\sdata-bind="([^"]+)"/g), (match) => match[1]);
const hasPath = (object, dottedPath) => dottedPath.split(".").every((key) => {
  if (object == null || !Object.prototype.hasOwnProperty.call(object, key)) return false;
  object = object[key];
  return true;
});
dataBindings.forEach((binding) => check(hasPath(Data.defaultConfig, binding), `unknown data binding: ${binding}`));

for (const propellantKey of Object.keys(Data.propellants)) {
  const design = Core.calculateDesign({ propellantKey });
  check(Number.isFinite(design.performance.idealDeltaV), `${propellantKey} should calculate finite performance`);
  check(design.tanks.fuel.totalVolumeM3 > 0, `${propellantKey} should create a propellant tank`);
}

for (const cycleKey of Object.keys(Data.cycles)) {
  const design = Core.calculateDesign({ engine: { cycleKey } });
  check(Number.isFinite(design.masses.wetMassKg), `${cycleKey} should calculate a finite wet mass`);
  check(design.engine.cycle.name === Data.cycles[cycleKey].name, `${cycleKey} should remain selected`);
}

for (const batteryKey of Object.keys(Data.batteries)) {
  const design = Core.calculateDesign({ engine: { cycleKey: "electric-pump", batteryKey } });
  check(design.pumps.battery.enabled, `${batteryKey} should enable electric battery sizing`);
  check(design.pumps.battery.key === batteryKey, `${batteryKey} should remain selected`);
  check(Number.isFinite(design.pumps.battery.packMassKg) && design.pumps.battery.packMassKg > 0, `${batteryKey} should produce a finite positive pack mass`);
}

console.log(`Rocket SIM verification passed (${checks} assertions).`);
