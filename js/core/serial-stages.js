(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory;
  else root.__RocketSerials = factory;
})(typeof globalThis !== "undefined" ? globalThis : this, function (Deps) {
  "use strict";

  var Data = Deps.Data;
  var clamp = Deps.Utils.clamp;
  var round = Deps.Utils.round;
  var deepClone = Deps.Utils.deepClone;
  var makeIssue = Deps.Utils.makeIssue;
  var deepMerge = Deps.Utils.deepMerge;
  var getPropellant = Deps.Cfg.getPropellant;
  var normalizeConfig = Deps.normalizeConfig;
  var effectiveIsp = Deps.effectiveIsp;
  var aggregateCostBreakdown = Deps.aggregateCostBreakdown;
  var G0 = Deps.G0;

  function serialStagePropellant(stage) {
    var raw = stage.propellantKey === "custom" ? stage.customPropellant : Data.propellants[stage.propellantKey];
    var propellant = deepClone(raw || Data.propellants["lox-methane"]);
    propellant.key = stage.propellantKey;
    if (!propellant.flags) propellant.flags = [];
    return propellant;
  }

  function separationSystemForStage(stage, stageResult, priceScale) {
    var mode = Data.stageSeparationModes[stage.separation.mode] || Data.stageSeparationModes.cold;
    var diameterM = Math.max(stageResult.geometry.diameterM, stageResult.geometry.baseDiameterM || 0);
    var motorPropellantMassKg = mode.fixedMotors
      ? mode.fixedMotors.count * mode.fixedMotors.propellantKgEach
      : 0;
    var hardwareMassKg = mode.baseMassKg + mode.massPerDiameterKg * diameterM;
    var totalMassKg = hardwareMassKg + motorPropellantMassKg;
    var retainedOnLowerKg = totalMassKg * mode.lowerRetainedFraction;
    var retainedOnUpperKg = totalMassKg - retainedOnLowerKg;
    var costCny = (mode.baseCostCny + hardwareMassKg * (stage.separation.mode === "hot" ? 2200 : 950) + motorPropellantMassKg * 1800)
      * Math.max(0.1, Number(priceScale) || 1);
    var reliabilityPct = Math.min(mode.reliabilityPct, stage.separation.reliabilityPct);
    return {
      key: stage.separation.mode,
      name: mode.name,
      description: mode.description,
      risk: mode.risk,
      hardwareMassKg: hardwareMassKg,
      motorPropellantMassKg: motorPropellantMassKg,
      totalMassKg: totalMassKg,
      retainedOnLowerKg: retainedOnLowerKg,
      retainedOnUpperKg: retainedOnUpperKg,
      costCny: costCny,
      reliabilityPct: reliabilityPct,
      separationVelocityMs: mode.separationVelocityMs,
      nominalCoastS: mode.nominalCoastS,
      ignitionDelayS: stage.separation.ignitionDelayS,
      ignitionOverlapS: mode.ignitionOverlapS,
      interstageLengthM: Math.max(0.18, 0.16 + diameterM * (stage.separation.mode === "hot" ? 0.34 : 0.18)),
      fixedMotors: mode.fixedMotors ? deepClone(mode.fixedMotors) : null
    };
  }

  function configForSerialStage(config, stage, payloadMassKg) {
    var stageConfig = deepClone(config);
    stageConfig.autoName = false;
    stageConfig.stages = [];
    stageConfig.boosters.enabled = false;
    stageConfig.sizingMode = "mass";
    stageConfig.propellantKey = stage.propellantKey;
    stageConfig.customPropellant = deepClone(stage.customPropellant);
    stageConfig.tanks = deepClone(stage.tanks);
    stageConfig.engine = deepClone(stage.engine);
    stageConfig.airframe = deepClone(stage.airframe);
    stageConfig.vehicle.payloadKg = Math.max(0, payloadMassKg);
    stageConfig.vehicle.avionicsKg = stage.avionicsKg;
    stageConfig.vehicle.structuralFactor = stage.structuralFactor;
    stageConfig.vehicle.includePayloadInDryBreakdown = false;
    stageConfig.test.environment = "vacuum";
    stageConfig.test.previewAtmosphere = false;
    var propellant = serialStagePropellant(stage);
    stageConfig.cost.fuelPriceCnyKg = Math.max(0, Number(propellant.fuelPriceCnyKg) || 0);
    stageConfig.cost.oxidizerPriceCnyKg = Math.max(0, Number(propellant.oxidizerPriceCnyKg) || 0);
    return normalizeConfig(stageConfig);
  }

  function estimateSerialStage(config, stage, payloadMassKg, index) {
    var stageConfig = configForSerialStage(config, stage, payloadMassKg);
    var propellant = getPropellant(stageConfig);
    var cycle = Data.cycles[stageConfig.engine.cycleKey] || Data.cycles["gas-generator"];
    var fixedThrustN = Math.max(100, stage.targetThrustKn * 1000);
    var usablePropellantKg = stage.propellantMassKg;
    var result;
    var converged = true;
    if (stage.sizingMode === "thrust-time") {
      var isp = effectiveIsp(propellant, cycle, 0);
      usablePropellantKg = fixedThrustN / Math.max(1, isp * G0) * stage.burnTimeS;
      result = Deps.estimateAtPropellantMass(stageConfig, propellant, usablePropellantKg, fixedThrustN);
    } else if (stage.sizingMode === "delta-v") {
      var low = 1;
      var high = Math.max(100, payloadMassKg * 0.8);
      var highResult = Deps.estimateAtPropellantMass(stageConfig, propellant, high, fixedThrustN);
      while (highResult.performance.idealDeltaV < stage.targetDeltaV && high < 1e7) {
        high *= 2;
        highResult = Deps.estimateAtPropellantMass(stageConfig, propellant, high, fixedThrustN);
      }
      if (highResult.performance.idealDeltaV < stage.targetDeltaV) {
        usablePropellantKg = high;
        result = highResult;
        converged = false;
      } else {
        for (var iteration = 0; iteration < 46; iteration += 1) {
          var mid = (low + high) / 2;
          var midResult = Deps.estimateAtPropellantMass(stageConfig, propellant, mid, fixedThrustN);
          if (midResult.performance.idealDeltaV < stage.targetDeltaV) low = mid;
          else high = mid;
        }
        usablePropellantKg = (low + high) / 2;
        result = Deps.estimateAtPropellantMass(stageConfig, propellant, usablePropellantKg, fixedThrustN);
      }
    } else {
      usablePropellantKg = stage.propellantMassKg;
      result = Deps.estimateAtPropellantMass(stageConfig, propellant, usablePropellantKg, fixedThrustN);
    }
    result.config = stageConfig;
    result.sizing = {
      mode: stage.sizingMode,
      solvedUsablePropellantKg: usablePropellantKg,
      targetDeltaV: stage.targetDeltaV,
      targetThrustN: fixedThrustN,
      converged: converged
    };
    result.stageIndex = index;
    result.stageNumber = index + 2;
    result.stageName = stage.name;
    result.separation = separationSystemForStage(stage, result, config.cost.priceScale);
    if (!converged) {
      result.issues.unshift(makeIssue("error", stage.name + " Δv 反算", "\u5728\u63a8\u8fdb\u5242\u641c\u7d22\u4e0a\u9650\u5185\u65e0\u6cd5\u8fbe\u5230 " + round(stage.targetDeltaV, 0) + " m/s\u3002", "\u964d\u4f4e\u672c\u7ea7\u76ee\u6807 \u0394v\u3001\u4e0a\u65b9\u7ea7\u6bb5\u8d28\u91cf\u6216\u7ed3\u6784\u7cfb\u6570\u3002"));
    }
    return result;
  }

  function buildSerialStageStack(config) {
    var configured = config.stages.map(function (stage, index) {
      return { index: index, stage: stage, enabled: stage.enabled, result: null };
    });
    var payloadMassKg = config.vehicle.payloadKg;
    var totalInterfaceMassKg = 0;
    for (var index = configured.length - 1; index >= 0; index -= 1) {
      var entry = configured[index];
      if (!entry.enabled) continue;
      entry.result = estimateSerialStage(config, entry.stage, payloadMassKg, index);
      payloadMassKg = entry.result.masses.wetMassKg + entry.result.separation.totalMassKg;
      totalInterfaceMassKg += entry.result.separation.totalMassKg;
    }
    var enabled = configured.filter(function (entry) { return entry.enabled && entry.result; });
    return {
      configured: configured,
      enabled: enabled,
      stackWetMassKg: enabled.length ? payloadMassKg : config.vehicle.payloadKg,
      totalInterfaceMassKg: totalInterfaceMassKg
    };
  }

  function attachSerialStages(config, baseResult, stack) {
    var active = stack.enabled;
    if (!active.length) {
      baseResult.serial = { enabled: false, count: 0, configuredStages: stack.configured };
      return baseResult;
    }

    if (!baseResult.config || !baseResult.config.engine) baseResult.config = deepClone(config);
    var baseSnapshot = deepClone(baseResult);
    var stageResults = active.map(function (entry) { return entry.result; });
    var stageBom = [];
    var separationReliability = 1;
    var interfaceMassKg = 0;
    var interfaceLengthM = 0;
    var upperStageIdealDeltaV = 0;
    var upperStageBurnTimeS = 0;
    var tankMassKg = baseResult.masses.tankMassKg;
    var engineMassKg = baseResult.masses.engineMassKg;
    var pressurizationMassKg = baseResult.masses.pressurizationMassKg;
    var plumbingMassKg = baseResult.masses.plumbingMassKg;
    var mountMassKg = baseResult.masses.mountMassKg;
    var airframeMassKg = baseResult.masses.airframeMassKg;
    var avionicsMassKg = baseResult.masses.avionicsMassKg;
    var usablePropellantKg = baseResult.masses.usablePropellantKg;
    var loadedPropellantKg = baseResult.masses.loadedPropellantKg;
    var residualPropellantKg = baseResult.masses.residualPropellantKg;
    var vehicleDryMassKg = baseResult.masses.vehicleDryMassKg;
    var serialIssues = [];

    active.forEach(function (entry) {
      var stageResult = entry.result;
      var separation = stageResult.separation;
      upperStageIdealDeltaV += stageResult.performance.idealDeltaV;
      upperStageBurnTimeS += stageResult.performance.burnTimeS + separation.ignitionDelayS;
      interfaceMassKg += separation.totalMassKg;
      interfaceLengthM += separation.interstageLengthM;
      separationReliability *= separation.reliabilityPct / 100;
      tankMassKg += stageResult.masses.tankMassKg;
      engineMassKg += stageResult.masses.engineMassKg;
      pressurizationMassKg += stageResult.masses.pressurizationMassKg;
      plumbingMassKg += stageResult.masses.plumbingMassKg;
      mountMassKg += stageResult.masses.mountMassKg + separation.totalMassKg;
      airframeMassKg += stageResult.masses.airframeMassKg;
      avionicsMassKg += stageResult.masses.avionicsMassKg;
      usablePropellantKg += stageResult.masses.usablePropellantKg;
      loadedPropellantKg += stageResult.masses.loadedPropellantKg;
      residualPropellantKg += stageResult.masses.residualPropellantKg;
      vehicleDryMassKg += stageResult.masses.vehicleDryMassKg + separation.totalMassKg;
      stageResult.cost.bom.forEach(function (row) {
        stageBom.push(Object.assign({}, row, {
          label: stageResult.stageName + " \u00b7 " + row.label,
          advantage: (row.advantage || "") + " \u5f52\u5c5e\u4e8e\u4e32\u8054" + stageResult.stageName + "\u3002"
        }));
      });
      stageBom.push({
        label: stageResult.stageName + " \u00b7 " + separation.name,
        category: "other",
        massKg: separation.totalMassKg,
        material: separation.key === "hot" ? "\u6392\u7109\u7ea7\u95f4\u6bb5\u3001\u70ed\u76fe\u4e0e\u8fde\u63a5\u673a\u6784" : separation.fixedMotors ? "\u7ea7\u95f4\u8fde\u63a5\u3001\u706b\u5de5\u54c1\u4e0e\u56fa\u5b9a\u5c0f\u56fa\u63a8" : "\u7ea7\u95f4\u8fde\u63a5\u3001\u706b\u5de5\u54c1\u4e0e\u63a8\u79bb\u673a\u6784",
        process: "\u7ea7\u95f4\u96c6\u6210\u3001\u5206\u79bb\u8bd5\u9a8c\u4e0e\u65f6\u5e8f\u9a8c\u8bc1",
        unitPrice: separation.totalMassKg > 0 ? separation.costCny / separation.totalMassKg : 0,
        multiplier: 1,
        baseCostCny: separation.costCny,
        costCny: separation.costCny,
        advantage: separation.description + " " + separation.risk
      });
      stageResult.issues.filter(function (issue) { return issue.component !== "\u8d77\u98de"; }).forEach(function (issue) {
        serialIssues.push(Object.assign({}, issue, { component: stageResult.stageName + " \u00b7 " + issue.component }));
      });
      if (separation.reliabilityPct < 99.5) {
        serialIssues.push(makeIssue("warning", stageResult.stageName + "\u5206\u79bb", separation.name + "\u7b80\u5316\u53ef\u9760\u6027\u4e3a " + round(separation.reliabilityPct, 3) + "%\u3002", "\u63d0\u9ad8\u5206\u79bb\u673a\u6784\u5197\u4f59\u3001\u4f20\u611f\u786e\u8ba4\u4e0e\u5730\u9762\u5168\u6d41\u7a0b\u9a8c\u8bc1\u8986\u76d6\u7387\u3002"));
      }
      if (separation.key === "hot") {
        serialIssues.push(makeIssue("warning", stageResult.stageName + "\u70ed\u5206\u79bb", "\u4e0a\u4e00\u7ea7\u7fbd\u6d41\u4f1a\u76f4\u63a5\u4f5c\u7528\u4e8e\u7ea7\u95f4\u6bb5\u548c\u524d\u4e00\u7ea7\u9876\u90e8\u7ed3\u6784\u3002", "\u68c0\u67e5\u6392\u7109\u5f00\u53e3\u3001\u70ed\u76fe\u3001\u77ac\u6001\u538b\u529b\u3001\u4fa7\u5411\u8d37\u8377\u4e0e\u518d\u63a5\u89e6\u88d5\u5ea6\u3002"));
      }
    });

    var bom = baseResult.cost.bom.concat(stageBom);
    var manufacturingCostCny = bom.reduce(function (sum, row) { return sum + (row.category === "propellant" ? 0 : Math.max(0, Number(row.costCny) || 0)); }, 0);
    var propellantCostCny = bom.reduce(function (sum, row) { return sum + (row.category === "propellant" ? Math.max(0, Number(row.costCny) || 0) : 0); }, 0);
    var totalCostCny = manufacturingCostCny + propellantCostCny;
    var wetMassKg = baseResult.masses.wetMassKg;
    var finalStage = stageResults[stageResults.length - 1];
    var burnoutMassKg = finalStage.masses.burnoutMassKg;
    var payloadKg = config.vehicle.payloadKg;
    var combinedMasses = Object.assign({}, baseResult.masses, {
      usablePropellantKg: usablePropellantKg,
      loadedPropellantKg: loadedPropellantKg,
      residualPropellantKg: residualPropellantKg,
      tankMassKg: tankMassKg,
      engineMassKg: engineMassKg,
      pressurizationMassKg: pressurizationMassKg,
      plumbingMassKg: plumbingMassKg,
      mountMassKg: mountMassKg,
      airframeMassKg: airframeMassKg,
      avionicsMassKg: avionicsMassKg,
      payloadKg: payloadKg,
      vehicleDryMassKg: vehicleDryMassKg,
      burnoutMassKg: burnoutMassKg,
      wetMassKg: wetMassKg
    });
    combinedMasses.breakdown = [
      { category: "propellant", label: "\u63a8\u8fdb\u5242", massKg: loadedPropellantKg },
      { category: "payload", label: "\u8f7d\u8377", massKg: payloadKg },
      { category: "tanks", label: "\u50a8\u7bb1", massKg: tankMassKg },
      { category: "airframe", label: "\u7bad\u4f53", massKg: airframeMassKg },
      { category: "propulsion", label: "\u53d1\u52a8\u673a/\u7ba1\u8def", massKg: engineMassKg + plumbingMassKg + mountMassKg },
      { category: "support", label: "\u589e\u538b/\u822a\u7535", massKg: pressurizationMassKg + avionicsMassKg }
    ].map(function (entry) { return Object.assign({}, entry, { sharePct: entry.massKg / Math.max(1, wetMassKg) * 100 }); });
    combinedMasses.liftoffBreakdown = [
      { category: "propellant", label: "\u63a8\u8fdb\u5242", massKg: loadedPropellantKg },
      { category: "dry", label: "\u7ed3\u6784\u5e72\u91cd", massKg: vehicleDryMassKg },
      { category: "payload", label: "\u8f7d\u8377", massKg: payloadKg }
    ].map(function (entry) { return Object.assign({}, entry, { sharePct: entry.massKg / Math.max(1, wetMassKg) * 100 }); });
    var includePayload = config.vehicle.includePayloadInDryBreakdown;
    combinedMasses.dryBreakdownBaseKg = vehicleDryMassKg + (includePayload ? payloadKg : 0);
    combinedMasses.dryBreakdownIncludesPayload = includePayload;
    combinedMasses.dryBreakdown = [
      { category: "tanks", label: "\u50a8\u7bb1", massKg: tankMassKg, included: true },
      { category: "propulsion", label: "\u53d1\u52a8\u673a/\u7ba1\u8def", massKg: engineMassKg + plumbingMassKg + mountMassKg, included: true },
      { category: "airframe", label: "\u7bad\u4f53", massKg: airframeMassKg, included: true },
      { category: "support", label: "\u589e\u538b/\u822a\u7535", massKg: pressurizationMassKg + avionicsMassKg, included: true },
      { category: "payload", label: "\u8f7d\u8377", massKg: payloadKg, included: includePayload }
    ].map(function (entry) {
      return Object.assign({}, entry, { sharePct: entry.included ? entry.massKg / Math.max(1, combinedMasses.dryBreakdownBaseKg) * 100 : null });
    });
    combinedMasses.dryMassRatio = vehicleDryMassKg > 0 ? wetMassKg / vehicleDryMassKg : 0;
    combinedMasses.dryMassFraction = wetMassKg > 0 ? vehicleDryMassKg / wetMassKg : 0;
    combinedMasses.dryMassFractionPct = combinedMasses.dryMassFraction * 100;
    combinedMasses.payloadRatioPct = wetMassKg > 0 ? payloadKg / wetMassKg * 100 : 0;

    var stageLengthM = stageResults.reduce(function (sum, stageResult) { return sum + stageResult.geometry.vehicleLengthM; }, 0);
    var stageDiameters = stageResults.map(function (stageResult) { return stageResult.geometry.baseDiameterM; });
    baseResult.masses = combinedMasses;
    baseResult.performance = Object.assign({}, baseResult.performance, {
      idealDeltaV: baseResult.performance.idealDeltaV + upperStageIdealDeltaV,
      totalMissionBurnTimeS: baseResult.performance.burnTimeS + upperStageBurnTimeS,
      coreStageIdealDeltaV: baseResult.performance.idealDeltaV,
      upperStageIdealDeltaV: upperStageIdealDeltaV
    });
    baseResult.geometry = Object.assign({}, baseResult.geometry, {
      coreStageLengthM: baseResult.geometry.vehicleLengthM,
      vehicleLengthM: baseResult.geometry.vehicleLengthM + stageLengthM + interfaceLengthM,
      maximumSerialDiameterM: Math.max.apply(Math, [baseResult.geometry.baseDiameterM].concat(stageDiameters))
    });
    baseResult.cost = Object.assign({}, baseResult.cost, {
      bom: bom,
      breakdown: aggregateCostBreakdown(bom, totalCostCny),
      manufacturingCostCny: manufacturingCostCny,
      propellantCostCny: propellantCostCny,
      totalCostCny: totalCostCny,
      subtotalCostCny: totalCostCny,
      manufacturingSubtotalCostCny: manufacturingCostCny
    });
    baseResult.issues = baseResult.issues.concat(serialIssues);
    baseResult.formulas.push({
      id: "serial-stage-delta-v",
      title: "\u4e32\u8054\u5206\u7ea7\u7406\u60f3 \u0394v",
      formula: "\u0394v\u603b = \u03a3[Isp\u1d62\u00b7g\u2080\u00b7ln(m\u2080,\u1d62/mf,\u1d62)]",
      inputs: ["\u82af\u7ea7 " + round(baseSnapshot.performance.idealDeltaV, 0) + " m/s"].concat(stageResults.map(function (stageResult) { return stageResult.stageName + " " + round(stageResult.performance.idealDeltaV, 0) + " m/s"; })).join("\uff1b"),
      result: baseResult.performance.idealDeltaV,
      unit: "m/s",
      source: "NASA Glenn \u7406\u60f3\u706b\u7bad\u65b9\u7a0b\u7684\u9010\u7ea7\u8d28\u91cf\u4e8b\u4ef6\u6559\u5b66\u6a21\u578b",
      assumption: "\u6bcf\u7ea7\u72ec\u7acb\u4f9b\u7ed9\uff1b\u4e0b\u4e00\u7ea7\u71c3\u5c3d\u540e\u6309\u9009\u5b9a\u6a21\u5f0f\u629b\u5f03\uff0c\u5206\u79bb\u7cfb\u7edf\u8ba1\u5165\u8d28\u91cf\u3001\u6210\u672c\u4e0e\u53ef\u9760\u6027\uff1b\u672a\u628a\u5c0f\u5206\u79bb\u51b2\u91cf\u8ba1\u5165\u4efb\u52a1 \u0394v\u3002"
    });
    baseResult.serial = {
      enabled: true,
      count: stageResults.length,
      totalStageCount: stageResults.length + 1,
      base: baseSnapshot,
      stages: stageResults,
      configuredStages: stack.configured,
      interfaceMassKg: interfaceMassKg,
      totalIdealDeltaV: baseResult.performance.idealDeltaV,
      upperStageIdealDeltaV: upperStageIdealDeltaV,
      missionSeparationReliabilityPct: separationReliability * 100
    };
    return baseResult;
  }

  return {
    serialStagePropellant: serialStagePropellant,
    separationSystemForStage: separationSystemForStage,
    configForSerialStage: configForSerialStage,
    estimateSerialStage: estimateSerialStage,
    buildSerialStageStack: buildSerialStageStack,
    attachSerialStages: attachSerialStages
  };
});
