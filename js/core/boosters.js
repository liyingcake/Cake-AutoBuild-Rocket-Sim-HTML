(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory;
  else root.__RocketBoosters = factory;
})(typeof globalThis !== "undefined" ? globalThis : this, function (Deps) {
  "use strict";

  var Data = Deps.Data;
  var Utils = Deps.Utils;
  var deepClone = Utils.deepClone, round = Utils.round, makeIssue = Utils.makeIssue, clamp = Utils.clamp;
  var G0 = Deps.G0;
  var normalizeConfig = Deps.normalizeConfig;

  // ---------------------------------------------------------------------------
  // local helper — mirrors config.js getPropellant
  // ---------------------------------------------------------------------------
  function getPropellant(config) {
    var raw = config.propellantKey === "custom" ? config.customPropellant : Data.propellants[config.propellantKey];
    var prop = deepClone(raw || Data.propellants["lox-methane"]);
    prop.key = config.propellantKey;
    if (!prop.flags) prop.flags = [];
    return prop;
  }

  // ---------------------------------------------------------------------------
  // boosterPropellant
  // ---------------------------------------------------------------------------
  function boosterPropellant(config) {
    if (config.boosters.propellantMode === "copy-core") return getPropellant(config);
    var propellant = deepClone(Data.propellants[config.boosters.propellantKey] || Data.propellants["lox-rp1"]);
    propellant.key = config.boosters.propellantKey;
    if (!propellant.flags) propellant.flags = [];
    return propellant;
  }

  // ---------------------------------------------------------------------------
  // aggregateCostBreakdown
  // ---------------------------------------------------------------------------
  function aggregateCostBreakdown(bom, totalCostCny) {
    var labels = {
      propellant: "\u63A8\u8FDB\u5242",
      tanks: "\u50A8\u7F50",
      airframe: "\u7BAD\u4F53",
      pumps: "\u6CF5/\u9600",
      "hot-section": "\u71C3\u70E7\u5BA4/\u55B7\u7BA1",
      other: "\u589E\u538B/\u822A\u7535\u7B49"
    };
    var order = ["propellant", "tanks", "airframe", "pumps", "hot-section", "other"];
    var sums = {};
    bom.forEach(function (row) {
      var category = labels[row.category] ? row.category : "other";
      sums[category] = (sums[category] || 0) + Math.max(0, Number(row.costCny) || 0);
    });
    return order.filter(function (category) { return sums[category] > 0; }).map(function (category) {
      return { category: category, label: labels[category], costCny: sums[category], sharePct: totalCostCny > 0 ? sums[category] / totalCostCny * 100 : 0 };
    });
  }

  // ---------------------------------------------------------------------------
  // attachParallelBoosters
  // ---------------------------------------------------------------------------
  function attachParallelBoosters(config, coreResult) {
    if (!config.boosters.enabled) {
      coreResult.parallel = { enabled: false, count: 0 };
      return coreResult;
    }

    var count = config.boosters.count;
    var propellant = boosterPropellant(config);
    var boosterConfig = deepClone(config);
    boosterConfig.boosters.enabled = false;
    boosterConfig.autoName = false;
    boosterConfig.sizingMode = "mass";
    boosterConfig.vehicle.payloadKg = 0;
    boosterConfig.vehicle.avionicsKg = Math.max(8, config.vehicle.avionicsKg * 0.12);
    boosterConfig.vehicle.includePayloadInDryBreakdown = false;
    boosterConfig.propellantKey = config.boosters.propellantMode === "copy-core" ? config.propellantKey : config.boosters.propellantKey;
    if (config.boosters.propellantMode !== "copy-core") boosterConfig.customPropellant = deepClone(config.customPropellant);
    boosterConfig.tanks.diameterMode = "locked";
    boosterConfig.tanks.diameterM = config.boosters.diameterMode === "copy-core"
      ? coreResult.geometry.diameterM
      : config.boosters.diameterM;
    if (config.boosters.engineMode === "custom") {
      boosterConfig.engine.cycleKey = config.boosters.cycleKey;
      boosterConfig.engine.engineCount = config.boosters.engineCount;
      boosterConfig.engine.chamberPressureMpa = config.boosters.chamberPressureMpa;
      boosterConfig.engine.expansionRatio = config.boosters.expansionRatio;
      boosterConfig.engine.autoExpansion = false;
    }
    boosterConfig.cost.fuelPriceCnyKg = Number(propellant.fuelPriceCnyKg) || boosterConfig.cost.fuelPriceCnyKg;
    boosterConfig.cost.oxidizerPriceCnyKg = Number(propellant.oxidizerPriceCnyKg) || boosterConfig.cost.oxidizerPriceCnyKg;
    boosterConfig = Deps.normalizeConfig(boosterConfig);

    var usablePropellantPerBoosterKg = config.boosters.sizingMode === "fixed"
      ? config.boosters.propellantMassKg
      : coreResult.masses.usablePropellantKg * config.boosters.propellantMassRatioPct / 100;
    var fixedThrustPerBoosterN = config.boosters.engineMode === "copy-core"
      ? coreResult.performance.totalThrustN
      : config.boosters.targetThrustKn * 1000;
    var booster = Deps.estimateAtPropellantMass(boosterConfig, propellant, usablePropellantPerBoosterKg, fixedThrustPerBoosterN);
    booster.config = boosterConfig;

    var core = {
      config: deepClone(coreResult.config || config),
      propellant: coreResult.propellant,
      masses: deepClone(coreResult.masses),
      performance: deepClone(coreResult.performance),
      geometry: deepClone(coreResult.geometry),
      engine: coreResult.engine,
      cost: deepClone(coreResult.cost)
    };
    var perBoosterAttachmentMassKg = Math.max(12,
      booster.masses.vehicleDryMassKg * config.boosters.attachmentMassPct / 100
      + booster.performance.totalThrustN / 1000 * 0.008);
    var attachmentMassKg = perBoosterAttachmentMassKg * count;
    var retainedAttachmentMassKg = attachmentMassKg * 0.22;
    var jettisonedAttachmentMassKg = attachmentMassKg - retainedAttachmentMassKg;
    var attachedDiameterM = core.geometry.diameterM + booster.geometry.diameterM * 2.1;
    var attachedFrontalAreaM2 = Math.PI * attachedDiameterM * attachedDiameterM / 4 * config.boosters.dragFactor;
    var launchGravityMs2 = coreResult.environment.launchGravityMs2;

    var coreBurnTimeS = core.performance.burnTimeS;
    var boosterBurnTimeS = booster.performance.burnTimeS;
    var simultaneousBurnS = Math.min(coreBurnTimeS, boosterBurnTimeS);
    var coreMdotKgS = core.performance.totalMassFlowKgS;
    var boosterMdotTotalKgS = booster.performance.totalMassFlowKgS * count;
    var initialMassKg = core.masses.wetMassKg + booster.masses.wetMassKg * count + attachmentMassKg;
    var phaseOneEndMassKg = Math.max(1, initialMassKg - (coreMdotKgS + boosterMdotTotalKgS) * simultaneousBurnS);
    var combinedExhaustVelocityMs = (core.performance.totalThrustN + booster.performance.totalThrustN * count)
      / Math.max(1e-9, coreMdotKgS + boosterMdotTotalKgS);
    var phaseOneDeltaV = combinedExhaustVelocityMs * Math.log(initialMassKg / phaseOneEndMassKg);
    var phaseTwoDeltaV = 0;
    var separationMassKg;
    var postSeparationMassKg;
    if (boosterBurnTimeS <= coreBurnTimeS) {
      separationMassKg = booster.masses.burnoutMassKg * count + jettisonedAttachmentMassKg;
      postSeparationMassKg = Math.max(core.masses.burnoutMassKg + retainedAttachmentMassKg, phaseOneEndMassKg - separationMassKg);
      var finalMassKg = core.masses.burnoutMassKg + retainedAttachmentMassKg;
      phaseTwoDeltaV = core.performance.ispS * G0 * Math.log(postSeparationMassKg / Math.max(1, finalMassKg));
    } else {
      var boosterRemainingKg = Math.max(0, booster.masses.usablePropellantKg - booster.performance.totalMassFlowKgS * simultaneousBurnS) * count;
      var phaseTwoEndMassKg = Math.max(1, phaseOneEndMassKg - boosterRemainingKg);
      phaseTwoDeltaV = booster.performance.ispS * G0 * Math.log(phaseOneEndMassKg / phaseTwoEndMassKg);
      separationMassKg = booster.masses.burnoutMassKg * count + jettisonedAttachmentMassKg;
      postSeparationMassKg = Math.max(1, phaseTwoEndMassKg - separationMassKg);
    }
    var idealDeltaV = phaseOneDeltaV + phaseTwoDeltaV;
    var totalThrustN = core.performance.totalThrustN + booster.performance.totalThrustN * count;
    var totalMassFlowKgS = core.performance.totalMassFlowKgS + booster.performance.totalMassFlowKgS * count;
    var wetMassKg = initialMassKg;
    var vehicleDryMassKg = core.masses.vehicleDryMassKg + booster.masses.vehicleDryMassKg * count + attachmentMassKg;
    var loadedPropellantKg = core.masses.loadedPropellantKg + booster.masses.loadedPropellantKg * count;
    var usablePropellantKg = core.masses.usablePropellantKg + booster.masses.usablePropellantKg * count;
    var residualPropellantKg = core.masses.residualPropellantKg + booster.masses.residualPropellantKg * count;
    var burnoutMassKg = core.masses.burnoutMassKg + retainedAttachmentMassKg;
    var twr = totalThrustN / Math.max(1, wetMassKg * launchGravityMs2);
    var liftoffNetAccelMs2 = totalThrustN / Math.max(1, wetMassKg) - launchGravityMs2;
    var postSeparationTwr = core.performance.totalThrustN / Math.max(1, postSeparationMassKg * launchGravityMs2);
    var separationReliability = Math.pow(config.boosters.separationReliabilityPct / 100, count);
    var missionReliabilityPct = core.engine.cluster.reliability.missionReliabilityPct
      * Math.pow(booster.engine.cluster.reliability.missionReliabilityPct / 100, count)
      * separationReliability;

    var boosterBom = booster.cost.bom.map(function (row) {
      return Object.assign({}, row, {
        label: "\u5E76\u8054\u52A9\u63A8\u5668 \u00D7 " + count + " \u00B7 " + row.label,
        massKg: row.massKg * count,
        baseCostCny: (Number(row.baseCostCny) || Number(row.costCny) || 0) * count,
        costCny: (Number(row.costCny) || 0) * count,
        advantage: (row.advantage || "") + " \u5DF2\u6309 " + count + " \u679A\u76F8\u540C\u52A9\u63A8\u5668\u6C47\u603B\u3002"
      });
    });
    var attachmentCostCny = (attachmentMassKg * 680 + count * 260000) * config.cost.priceScale;
    var integrationRow = {
      label: "\u52A9\u63A8\u5668\u8FDE\u63A5\u3001\u5206\u79BB\u4E0E\u6574\u6D41\u7ED3\u6784 \u00D7 " + count,
      category: "other",
      massKg: attachmentMassKg,
      material: "\u9AD8\u5F3A\u94DD\u5408\u91D1 / \u949B\u8FDE\u63A5\u4EF6",
      process: "\u627F\u529B\u63A5\u5934\u3001\u7206\u70B8\u87BA\u6813/\u63A8\u79BB\u5668\u3001\u5206\u79BB\u8BD5\u9A8C",
      unitPrice: attachmentMassKg > 0 ? attachmentCostCny / attachmentMassKg : 0,
      multiplier: 1,
      costCny: attachmentCostCny,
      advantage: "\u5176\u4E2D\u7EA6 " + round(jettisonedAttachmentMassKg, 1) + " kg \u968F\u52A9\u63A8\u5668\u629B\u79BB\uFF0C" + round(retainedAttachmentMassKg, 1) + " kg \u63A5\u5934\u7559\u5728\u82AF\u7EA7\u3002"
    };
    var bom = core.cost.bom.concat(boosterBom, [integrationRow]);
    var manufacturingCostCny = core.cost.manufacturingCostCny + booster.cost.manufacturingCostCny * count + attachmentCostCny;
    var propellantCostCny = core.cost.propellantCostCny + booster.cost.propellantCostCny * count;
    var totalCostCny = manufacturingCostCny + propellantCostCny;

    var combinedMasses = {
      usablePropellantKg: usablePropellantKg,
      loadedPropellantKg: loadedPropellantKg,
      residualPropellantKg: residualPropellantKg,
      tankMassKg: core.masses.tankMassKg + booster.masses.tankMassKg * count,
      engineMassKg: core.masses.engineMassKg + booster.masses.engineMassKg * count,
      pressurizationMassKg: core.masses.pressurizationMassKg + booster.masses.pressurizationMassKg * count,
      plumbingMassKg: core.masses.plumbingMassKg + booster.masses.plumbingMassKg * count,
      mountMassKg: core.masses.mountMassKg + booster.masses.mountMassKg * count + attachmentMassKg,
      repeatedAccessoryMassKg: core.masses.repeatedAccessoryMassKg + booster.masses.repeatedAccessoryMassKg * count,
      clusterIntegrationMassKg: core.masses.clusterIntegrationMassKg + booster.masses.clusterIntegrationMassKg * count + attachmentMassKg,
      airframeMassKg: core.masses.airframeMassKg + booster.masses.airframeMassKg * count,
      avionicsMassKg: core.masses.avionicsMassKg + booster.masses.avionicsMassKg * count,
      payloadKg: core.masses.payloadKg,
      vehicleDryMassKg: vehicleDryMassKg,
      burnoutMassKg: burnoutMassKg,
      wetMassKg: wetMassKg
    };
    combinedMasses.breakdown = [
      { category: "propellant", label: "\u63A8\u8FDB\u5242", massKg: loadedPropellantKg },
      { category: "payload", label: "\u8F7D\u8377", massKg: combinedMasses.payloadKg },
      { category: "tanks", label: "\u50A8\u7F50", massKg: combinedMasses.tankMassKg },
      { category: "airframe", label: "\u7BAD\u4F53", massKg: combinedMasses.airframeMassKg },
      { category: "propulsion", label: "\u53D1\u52A8\u673A/\u7BA1\u8DEF", massKg: combinedMasses.engineMassKg + combinedMasses.plumbingMassKg + combinedMasses.mountMassKg },
      { category: "support", label: "\u589E\u538B/\u822A\u7535", massKg: combinedMasses.pressurizationMassKg + combinedMasses.avionicsMassKg }
    ].map(function (entry) { return Object.assign({}, entry, { sharePct: entry.massKg / wetMassKg * 100 }); });
    combinedMasses.liftoffBreakdown = [
      { category: "propellant", label: "\u63A8\u8FDB\u5242", massKg: loadedPropellantKg },
      { category: "dry", label: "\u7ED3\u6784\u5E72\u91CD", massKg: vehicleDryMassKg },
      { category: "payload", label: "\u8F7D\u8377", massKg: combinedMasses.payloadKg }
    ].map(function (entry) { return Object.assign({}, entry, { sharePct: entry.massKg / wetMassKg * 100 }); });
    var includePayload = config.vehicle.includePayloadInDryBreakdown;
    combinedMasses.dryBreakdownBaseKg = vehicleDryMassKg + (includePayload ? combinedMasses.payloadKg : 0);
    combinedMasses.dryBreakdownIncludesPayload = includePayload;
    combinedMasses.dryBreakdown = [
      { category: "tanks", label: "\u50A8\u7F50", massKg: combinedMasses.tankMassKg, included: true },
      { category: "propulsion", label: "\u53D1\u52A8\u673A/\u7BA1\u8DEF", massKg: combinedMasses.engineMassKg + combinedMasses.plumbingMassKg + combinedMasses.mountMassKg, included: true },
      { category: "airframe", label: "\u7BAD\u4F53", massKg: combinedMasses.airframeMassKg, included: true },
      { category: "support", label: "\u589E\u538B/\u822A\u7535", massKg: combinedMasses.pressurizationMassKg + combinedMasses.avionicsMassKg, included: true },
      { category: "payload", label: "\u8F7D\u8377", massKg: combinedMasses.payloadKg, included: includePayload }
    ].map(function (entry) {
      return Object.assign({}, entry, { sharePct: entry.included ? entry.massKg / Math.max(1, combinedMasses.dryBreakdownBaseKg) * 100 : null });
    });
    combinedMasses.dryMassRatio = vehicleDryMassKg > 0 ? wetMassKg / vehicleDryMassKg : 0;
    combinedMasses.dryMassFraction = wetMassKg > 0 ? vehicleDryMassKg / wetMassKg : 0;
    combinedMasses.dryMassFractionPct = combinedMasses.dryMassFraction * 100;
    combinedMasses.payloadRatioPct = wetMassKg > 0 ? combinedMasses.payloadKg / wetMassKg * 100 : 0;

    var parallelIssues = booster.issues.filter(function (issue) { return issue.component !== "\u8D77\u98DE"; }).map(function (issue) {
      return Object.assign({}, issue, { component: "\u52A9\u63A8\u5668 \u00B7 " + issue.component });
    });
    if (boosterBurnTimeS > coreBurnTimeS * 1.05) parallelIssues.push(makeIssue("warning", "\u5E76\u8054\u52A9\u63A8\u5668", "\u52A9\u63A8\u5668\u71C3\u65F6 " + round(boosterBurnTimeS, 1) + " s \u957F\u4E8E\u82AF\u7EA7 " + round(coreBurnTimeS, 1) + " s\uFF0C\u82AF\u7EA7\u4F1A\u5148\u5173\u673A\u5E76\u88AB\u7EE7\u7EED\u643A\u5E26\u3002", "\u964D\u4F4E\u5355\u679A\u52A9\u63A8\u5668\u63A8\u8FDB\u5242\u91CF\u3001\u63D0\u9AD8\u52A9\u63A8\u5668\u63A8\u529B\uFF0C\u6216\u589E\u52A0\u82AF\u7EA7\u71C3\u65F6\u3002"));
    if (boosterBurnTimeS < coreBurnTimeS * 0.28) parallelIssues.push(makeIssue("warning", "\u5E76\u8054\u52A9\u63A8\u5668", "\u52A9\u63A8\u5668\u4EC5\u5DE5\u4F5C\u82AF\u7EA7\u71C3\u65F6\u7684 " + round(boosterBurnTimeS / Math.max(0.1, coreBurnTimeS) * 100, 0) + "%\uFF0C\u5206\u79BB\u5F88\u65E9\u4E14\u8FDE\u63A5\u7CFB\u7EDF\u6536\u76CA\u504F\u4F4E\u3002", "\u628A\u52A9\u63A8\u5668\u71C3\u65F6\u8C03\u6574\u5230\u82AF\u7EA7\u71C3\u65F6\u7684\u7EA6 35%\u201380% \u518D\u6BD4\u8F83\u8D28\u91CF\u6536\u76CA\u3002"));
    if (postSeparationTwr < 1) parallelIssues.push(makeIssue("warning", "\u52A9\u63A8\u5668\u5206\u79BB", "\u52A9\u63A8\u5668\u5206\u79BB\u540E\u82AF\u7EA7\u77AC\u65F6 T/W \u7EA6 " + round(postSeparationTwr, 2) + "\uFF0C\u5728\u5F53\u524D\u91CD\u529B\u573A\u4E0B\u4E0D\u80FD\u7EE7\u7EED\u52A0\u901F\u4E0A\u5347\u3002", "\u63D0\u9AD8\u82AF\u7EA7\u63A8\u529B\u3001\u5EF6\u8FDF\u5206\u79BB\u6216\u51CF\u5C0F\u52A9\u63A8\u5668\u643A\u5E26\u7684\u82AF\u7EA7\u63A8\u8FDB\u5242\u3002"));
    if (missionReliabilityPct < 95) parallelIssues.push(makeIssue("warning", "\u5E76\u8054\u4EFB\u52A1\u53EF\u9760\u6027", "\u53D1\u52A8\u673A\u65CF\u4E0E " + count + " \u6B21\u5206\u79BB\u4E32\u8054\u540E\u7684\u7B80\u5316\u4EFB\u52A1\u53EF\u9760\u6027\u7EA6 " + round(missionReliabilityPct, 3) + "%\u3002", "\u63D0\u9AD8\u5355\u679A\u52A9\u63A8\u5668\u4E0E\u5206\u79BB\u673A\u6784\u53EF\u9760\u6027\uFF0C\u6216\u51CF\u5C11\u5E76\u8054\u679A\u6570\u3002"));

    coreResult.masses = combinedMasses;
    coreResult.performance = {
      ambientPressurePa: core.performance.ambientPressurePa,
      ispS: totalThrustN / Math.max(1e-9, totalMassFlowKgS * G0),
      idealDeltaV: idealDeltaV,
      twr: twr,
      liftoffNetAccelMs2: liftoffNetAccelMs2,
      burnTimeS: Math.max(coreBurnTimeS, boosterBurnTimeS),
      totalThrustN: totalThrustN,
      totalMassFlowKgS: totalMassFlowKgS,
      coreOnlyIdealDeltaV: core.performance.idealDeltaV,
      boosterDeltaVGain: idealDeltaV - core.performance.idealDeltaV
    };
    coreResult.geometry = Object.assign({}, core.geometry, {
      coreFrontalAreaM2: core.geometry.frontalAreaM2,
      frontalAreaM2: attachedFrontalAreaM2,
      attachedDiameterM: attachedDiameterM,
      boosterDiameterM: booster.geometry.diameterM,
      boosterLengthM: booster.geometry.vehicleLengthM,
      vehicleLengthM: Math.max(core.geometry.vehicleLengthM, booster.geometry.vehicleLengthM)
    });
    coreResult.cost = {
      bom: bom,
      breakdown: aggregateCostBreakdown(bom, totalCostCny),
      subtotalCostCny: core.cost.subtotalCostCny + booster.cost.subtotalCostCny * count + attachmentCostCny,
      manufacturingSubtotalCostCny: core.cost.manufacturingSubtotalCostCny + booster.cost.manufacturingSubtotalCostCny * count + attachmentCostCny,
      manufacturingCostCny: manufacturingCostCny,
      propellantCostCny: propellantCostCny,
      totalCostCny: totalCostCny,
      costIndex: core.cost.totalCostCny > 0 ? core.cost.costIndex * totalCostCny / core.cost.totalCostCny : core.cost.costIndex,
      engineCostFactor: core.cost.engineCostFactor,
      clusterAssemblyFactor: core.cost.clusterAssemblyFactor
    };
    coreResult.parallel = {
      enabled: true,
      count: count,
      core: core,
      booster: booster,
      propellant: propellant,
      usablePropellantPerBoosterKg: usablePropellantPerBoosterKg,
      attachmentMassKg: attachmentMassKg,
      perBoosterAttachmentMassKg: perBoosterAttachmentMassKg,
      retainedAttachmentMassKg: retainedAttachmentMassKg,
      jettisonedAttachmentMassKg: jettisonedAttachmentMassKg,
      separationMassKg: separationMassKg,
      separationDelayS: config.boosters.separationDelayS,
      attachedDiameterM: attachedDiameterM,
      attachedFrontalAreaM2: attachedFrontalAreaM2,
      simultaneousBurnS: simultaneousBurnS,
      coreBurnTimeS: coreBurnTimeS,
      boosterBurnTimeS: boosterBurnTimeS,
      phaseOneDeltaV: phaseOneDeltaV,
      phaseTwoDeltaV: phaseTwoDeltaV,
      idealDeltaV: idealDeltaV,
      postSeparationMassKg: postSeparationMassKg,
      postSeparationTwr: postSeparationTwr,
      missionReliabilityPct: missionReliabilityPct,
      separationReliabilityPct: separationReliability * 100,
      optimization: {
        burnTimeRatioPct: boosterBurnTimeS / Math.max(0.1, coreBurnTimeS) * 100,
        deltaVGainMs: idealDeltaV - core.performance.idealDeltaV,
        attachmentSharePct: attachmentMassKg / Math.max(1, booster.masses.wetMassKg * count) * 100,
        preferredBurnTimeBandPct: [35, 80]
      }
    };
    coreResult.issues = coreResult.issues.concat(parallelIssues);
    if (coreResult.performance.twr > 1) {
      coreResult.issues = coreResult.issues.filter(function (issue) {
        return !(issue.component === "\u8D77\u98DE" && issue.severity === "error");
      });
    }
    coreResult.formulas.push({
      id: "parallel-booster-delta-v",
      title: "\u5E76\u8054\u52A9\u63A8\u5668\u4E24\u76F8\u7406\u60F3 \u0394v",
      formula: "\u0394v = v\u2091,\u5E76\u8054\u00B7ln(m\u2080/m\u2081) + v\u2091,\u7EED\u822A\u00B7ln(m\u2082/m\u2083)",
      inputs: "\u52A9\u63A8\u5668 " + count + " \u679A\uFF0C\u6BCF\u679A\u53EF\u7528\u63A8\u8FDB\u5242 " + round(usablePropellantPerBoosterKg, 1) + " kg\uFF1B\u5171\u540C\u71C3\u70E7 " + round(simultaneousBurnS, 1) + " s\uFF1B\u5206\u79BB\u8D28\u91CF " + round(separationMassKg, 1) + " kg",
      result: idealDeltaV,
      unit: "m/s",
      source: "\u7406\u60F3\u706B\u7BAD\u65B9\u7A0B\u7684\u5206\u6BB5\u8D28\u91CF\u4E8B\u4EF6\u6559\u5B66\u6A21\u578B",
      assumption: "\u82AF\u7EA7\u4E0E\u52A9\u63A8\u5668\u65E0\u4EA4\u53C9\u4F9B\u7ED9\uFF1B\u5171\u540C\u8282\u6D41\uFF1B\u52A9\u63A8\u5668\u71C3\u5C3D\u540E\u6309\u8BBE\u5B9A\u5EF6\u8FDF\u6574\u4F53\u5206\u79BB\uFF1B\u5FFD\u7565\u5206\u79BB\u51B2\u91CF\u3002"
    });
    return coreResult;
  }

  return {
    boosterPropellant: boosterPropellant,
    aggregateCostBreakdown: aggregateCostBreakdown,
    attachParallelBoosters: attachParallelBoosters
  };
});
