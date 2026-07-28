(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./utils.js"), require("./materials.js"), require("./engine-flow.js"));
  else root.__RocketEng = factory(root.__CoreUtils, root.__RocketMat, root.__RocketFlow);
})(typeof globalThis !== "undefined" ? globalThis : this, function (Utils, Mat, Flow) {
  "use strict";

  const G0 = 9.80665;
  const clamp = Utils.clamp;
  const round = Utils.round;
  const makeIssue = Utils.makeIssue;
  const validateCompatibility = Mat.validateCompatibility;
  const materialTemperatureFactor = Mat.materialTemperatureFactor;
  const nozzleCoefficient = Flow.nozzleCoefficient;

  function computePumpSide(label, mdotKgS, density, temperatureK, vaporPressureKpa, deltaPressurePa, config, material, propellant) {
    const issues = [];
    const efficiency = clamp(config.engine.pumpEfficiencyPct / 100, 0.35, 0.90);
    const volumeFlowM3S = mdotKgS / Math.max(1, density);
    const hydraulicPowerKw = volumeFlowM3S * Math.max(0, deltaPressurePa) / 1000;
    const shaftPowerKw = hydraulicPowerKw / efficiency;
    const availableHeadM = Math.max(0, (config.tanks.pressureMpa * 1e6 - vaporPressureKpa * 1000) / (Math.max(1, density) * G0) - 2.0);
    const requiredHeadM = 2.0 + 0.08 * Math.sqrt(Math.max(0, shaftPowerKw));
    const npshMarginM = availableHeadM - requiredHeadM;
    const tempFactor = materialTemperatureFactor(material, temperatureK);
    const allowablePa = material.yield * 1e6 * tempFactor * 0.8;
    const casingUtilization = deltaPressurePa / Math.max(1e5, allowablePa * 0.085);
    const massKg = mdotKgS <= 0 ? 0 : Math.max(4, 5 + Math.pow(Math.max(1, shaftPowerKw), 0.78) / 3.6) * (material.density / 8190) ** 0.18;

    validateCompatibility(material, propellant, temperatureK, `${label}泵`, issues);
    if (npshMarginM < 0) {
      issues.push(makeIssue("error", `${label}泵`, `NPSH 裕度 ${round(npshMarginM, 1)} m，存在汽蚀风险。`, "提高箱压、降低入口损失或降低泵转速/流量。"));
    } else if (npshMarginM < 2) {
      issues.push(makeIssue("warning", `${label}泵`, `NPSH 裕度仅 ${round(npshMarginM, 1)} m。`, "保留更大的入口压头与热状态余量。"));
    }
    if (casingUtilization > 0.8) {
      issues.push(makeIssue("error", `${label}泵`, `泵壳简化应力利用率达到 ${round(casingUtilization * 100, 0)}%。`, "选用更高强材料、增厚泵壳或降低压升。"));
    }

    return {
      label,
      mdotKgS,
      volumeFlowM3S,
      deltaPressurePa,
      hydraulicPowerKw,
      shaftPowerKw,
      efficiency,
      availableHeadM,
      requiredHeadM,
      npshMarginM,
      casingUtilization,
      materialName: material.name,
      massKg,
      issues
    };
  }

  function computeNozzleAndChamber(config, propellant, totalThrustN, ambientPressurePa, materialChamber, materialNozzle, cycle, coolingMode) {
    const issues = [];
    const engineCount = config.engine.engineCount;
    const perEngineThrustN = totalThrustN / engineCount;
    const chamberPressurePa = config.engine.chamberPressureMpa * 1e6;
    const ambientToChamber = ambientPressurePa / Math.max(1, chamberPressurePa);
    const autoExpansionRatio = ambientPressurePa < 2000 ? 58
      : ambientToChamber > 0.35 ? 3
        : ambientToChamber > 0.08 ? 6
          : ambientToChamber > 0.025 ? 10
            : 18;
    const expansionRatio = config.engine.autoExpansion ? autoExpansionRatio : clamp(config.engine.expansionRatio, 3, 220);
    const nozzle = nozzleCoefficient(chamberPressurePa, ambientPressurePa, expansionRatio, propellant.gamma);
    const throatAreaM2 = perEngineThrustN / Math.max(1e4, chamberPressurePa * nozzle.cf);
    const exitAreaM2 = throatAreaM2 * expansionRatio;
    const throatDiameterM = Math.sqrt(4 * throatAreaM2 / Math.PI);
    const exitDiameterM = Math.sqrt(4 * exitAreaM2 / Math.PI);
    const chamberDiameterM = throatDiameterM * 2.35;
    const chamberLengthM = Math.max(0.18, propellant.cStar / 1800 * chamberDiameterM * 1.35);
    const nozzleLengthM = Math.max(0.12, 0.8 * (exitDiameterM - throatDiameterM) / (2 * Math.tan(15 * Math.PI / 180)));
    const wallTempK = coolingMode.wallTempK;
    const chamberTempFactor = materialTemperatureFactor(materialChamber, wallTempK);
    const nozzleTempFactor = materialTemperatureFactor(materialNozzle, wallTempK + (config.engine.coolingKey === "radiative" ? 80 : 0));
    const chamberAllowablePa = Math.max(1e5, materialChamber.yield * 1e6 * chamberTempFactor * 0.8);
    const nozzleAllowablePa = Math.max(1e5, materialNozzle.yield * 1e6 * nozzleTempFactor * 0.8);
    const chamberWallM = Math.max(materialChamber.minGauge / 1000, chamberPressurePa * chamberDiameterM / (2 * chamberAllowablePa));
    const nozzleWallM = Math.max(materialNozzle.minGauge / 1000, chamberPressurePa * 0.12 * exitDiameterM / (2 * nozzleAllowablePa));
    const chamberAreaM2 = Math.PI * chamberDiameterM * chamberLengthM + Math.PI * chamberDiameterM * chamberDiameterM * 0.75;
    const nozzleSlantM = Math.hypot(nozzleLengthM, (exitDiameterM - throatDiameterM) / 2);
    const nozzleAreaM2 = Math.PI * (exitDiameterM + throatDiameterM) / 2 * nozzleSlantM;
    const chamberMassEachKg = chamberAreaM2 * chamberWallM * materialChamber.density * coolingMode.massFactor * 1.22;
    const nozzleMassEachKg = nozzleAreaM2 * nozzleWallM * materialNozzle.density * coolingMode.massFactor * 1.12;
    const injectorMassEachKg = Math.max(3, 0.16 * chamberMassEachKg + 0.010 * Math.pow(perEngineThrustN / 1000, 0.88));
    const exitPressureRatio = nozzle.exitPressurePa / Math.max(1, ambientPressurePa);

    validateCompatibility(materialChamber, propellant, wallTempK, "燃烧室", issues);
    validateCompatibility(materialNozzle, propellant, wallTempK, "喷管", issues);
    if (ambientPressurePa >= chamberPressurePa) {
      issues.push(makeIssue("error", "燃烧室/环境", `环境压力 ${round(ambientPressurePa / 1e6, 2)} MPa 已达到或超过室压 ${round(chamberPressurePa / 1e6, 2)} MPa，常规喷管无法正常排气。`, "提高室压、在高空平台点火，或把该场景仅用于环境比较。"));
    }
    if (ambientPressurePa > 2000 && exitPressureRatio < 0.35) {
      issues.push(makeIssue("warning", "喷管", `出口压力仅为环境压力的 ${round(exitPressureRatio, 2)} 倍，存在流动分离风险。`, "减小膨胀比或采用高度补偿/分段喷管。"));
    }
    if (config.engine.chamberPressureMpa > cycle.maxPcMpa) {
      issues.push(makeIssue("error", "发动机循环", `${cycle.name} 的教学模型室压上限为 ${cycle.maxPcMpa} MPa。`, "降低室压或选择更高压循环。"));
    }
    if (chamberWallM / Math.max(0.001, chamberDiameterM / 2) > 0.10) {
      issues.push(makeIssue("error", "燃烧室", "燃烧室壁厚/半径超出薄壁近似范围。", "降低室压或使用厚壁结构分析。"));
    }

    return {
      expansionRatio,
      thrustCoefficient: nozzle.cf,
      exitMach: nozzle.exitMach,
      exitPressurePa: nozzle.exitPressurePa,
      throatAreaM2,
      exitAreaM2,
      throatDiameterM,
      exitDiameterM,
      chamberDiameterM,
      chamberLengthM,
      nozzleLengthM,
      engineLengthM: chamberLengthM + nozzleLengthM + chamberDiameterM * 0.6,
      chamberWallM,
      nozzleWallM,
      chamberMassEachKg,
      nozzleMassEachKg,
      injectorMassEachKg,
      wallTempK,
      issues
    };
  }

  function computeClusterLayout(engineCount, nozzleExitDiameterM, bodyDiameterM, clearancePct) {
    const count = Math.round(clamp(Number(engineCount), 1, 40));
    const nozzleDiameterM = Math.max(0.001, Number(nozzleExitDiameterM) || 0.001);
    const bodyM = Math.max(0.01, Number(bodyDiameterM) || 0.01);
    const clearance = clamp(Number(clearancePct), 2, 60) / 100;
    const pitchM = nozzleDiameterM * (1 + clearance);
    const positions = [];
    const ring = function (quantity, radiusM, phaseRad) {
      for (let index = 0; index < quantity; index += 1) {
        const angle = (phaseRad || 0) + index * Math.PI * 2 / quantity;
        positions.push({ xM: radiusM * Math.cos(angle), yM: radiusM * Math.sin(angle) });
      }
    };
    if (count <= 9) {
      if (count === 1) positions.push({ xM: 0, yM: 0 });
      else if (count === 2) {
        positions.push({ xM: -pitchM / 2, yM: 0 }, { xM: pitchM / 2, yM: 0 });
      } else if (count === 3) ring(3, pitchM / Math.sqrt(3), -Math.PI / 2);
      else if (count === 4) {
        [-0.5, 0.5].forEach(function (x) { [-0.5, 0.5].forEach(function (y) { positions.push({ xM: x * pitchM, yM: y * pitchM }); }); });
      } else if (count === 5) {
        positions.push({ xM: 0, yM: 0 });
        ring(4, pitchM, Math.PI / 4);
      } else if (count === 6) ring(6, pitchM, 0);
      else if (count === 7) {
        positions.push({ xM: 0, yM: 0 });
        ring(6, pitchM, 0);
      } else if (count === 8) ring(8, pitchM / (2 * Math.sin(Math.PI / 8)), Math.PI / 8);
      else {
        var grid = [-1, 0, 1];
        grid.forEach(function (x) { grid.forEach(function (y) { positions.push({ xM: x * pitchM, yM: y * pitchM }); }); });
      }
    } else {
      var remaining = count;
      if (remaining > 0) { positions.push({ xM: 0, yM: 0 }); remaining -= 1; }
      for (var ringLevel = 1; remaining > 0; ringLevel += 1) {
        var inRing = Math.min(remaining, 6 * ringLevel);
        var radiusM = ringLevel <= 2 ? pitchM * ringLevel : pitchM * (1 + (ringLevel - 1) * 0.75);
        ring(inRing, radiusM, ringLevel % 2 === 1 ? 0 : Math.PI / (inRing || 1));
        remaining -= inRing;
      }
    }
    const gimbalAllowanceM = nozzleDiameterM * 0.08;
    const requiredRadiusM = positions.reduce(function (maximum, point) {
      return Math.max(maximum, Math.hypot(point.xM, point.yM) + nozzleDiameterM / 2 + gimbalAllowanceM);
    }, 0);
    const requiredDiameterM = requiredRadiusM * 2;
    const baseDiameterM = Math.max(bodyM, requiredDiameterM);
    return {
      engineCount: count,
      nozzleDiameterM,
      clearancePct: clearance * 100,
      pitchM,
      gimbalAllowanceM,
      requiredDiameterM,
      bodyDiameterM: bodyM,
      baseDiameterM,
      diameterMarginM: bodyM - requiredDiameterM,
      diameterExpansionRatio: baseDiameterM / bodyM,
      requiresExpansion: requiredDiameterM > bodyM * 1.001,
      positions
    };
  }

  return {
    computePumpSide,
    computeNozzleAndChamber,
    computeClusterLayout
  };
});
