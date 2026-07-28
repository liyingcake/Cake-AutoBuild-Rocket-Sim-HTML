(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory;
  else root.__RocketStaticFire = factory;
})(typeof globalThis !== "undefined" ? globalThis : this, function (Deps) {
  "use strict";

  const Env = Deps.Env;
  const Utils = Deps.Utils;

  const G0 = Deps.G0;
  const clamp = Utils.clamp;
  const round = Utils.round;
  const environmentState = Env.environmentState;

  function runStaticFire(inputConfig, design) {
    const config = inputConfig || design.config;
    if (!design || !design.performance) return { status: "invalid", points: [], message: "缺少设计结果。" };
    const testEnvironment = environmentState(config, config.vehicle.launchAltitudeM);
    const testGravityMs2 = testEnvironment.body.gravityMs2 * Math.pow(testEnvironment.body.radiusM / (testEnvironment.body.radiusM + config.vehicle.launchAltitudeM), 2);
    const duration = clamp(config.test.durationS, 3, 180);
    const totalTime = duration + 6.5;
    const hardFailure = design.issues.find(function (entry) {
      return entry.severity === "error" && ["起飞", "Δv 反算"].indexOf(entry.component) < 0;
    });
    const faultTime = hardFailure ? Math.min(totalTime - 1, 4.6 + duration * 0.18) : null;
    const points = [];
    const dt = 0.10;
    let failed = false;
    let consumedPropellantKg = 0;
    for (let t = 0; t <= totalTime + 1e-6; t += dt) {
      let command = 0;
      let phase = "预增压";
      if (t >= 2 && t < 3) {
        phase = "点火";
        command = 0.12 * (t - 2);
      } else if (t >= 3 && t < 5) {
        phase = "爬升";
        command = 0.12 + 0.88 * (t - 3) / 2;
      } else if (t >= 5 && t < 5 + duration) {
        phase = "稳态";
        command = 1;
      } else if (t >= 5 + duration) {
        phase = "关机";
        command = Math.max(0, 1 - (t - 5 - duration) / 1.5);
      }
      if (faultTime != null && t >= faultTime) {
        failed = true;
        phase = "故障关机";
        command = Math.max(0, 1 - (t - faultTime) / 0.45);
      }
      const ripple = phase === "稳态" ? 1 + 0.006 * Math.sin(t * 7.2) : 1;
      const response = clamp(command * ripple, 0, 1.02);
      const massFlowKgS = design.performance.totalMassFlowKgS * response;
      const thrustN = design.performance.totalThrustN * response;
      consumedPropellantKg = Math.min(design.masses.usablePropellantKg, consumedPropellantKg + massFlowKgS * dt);
      points.push({
        timeS: round(t, 2),
        phase,
        tankPressureMpa: config.tanks.pressureMpa * (0.94 + 0.06 * Math.min(1, t / 2)) * (failed ? 0.98 : 1),
        chamberPressureMpa: config.engine.chamberPressureMpa * response,
        thrustKn: thrustN / 1000,
        thrustN,
        massFlowKgS,
        fuelMassFlowKgS: design.engine.fuelMdotKgS * response,
        oxidizerMassFlowKgS: design.engine.oxidizerMdotKgS * response,
        exitPressurePa: design.engine.nozzle.exitPressurePa * response,
        exhaustVelocityMs: massFlowKgS > 1e-9 ? thrustN / massFlowKgS : 0,
        consumedPropellantKg,
        propellantRemainingKg: Math.max(0, design.masses.usablePropellantKg - consumedPropellantKg),
        equivalentNetAccelG: design.performance.totalThrustN * response / Math.max(1, design.masses.wetMassKg - consumedPropellantKg) / G0 - testGravityMs2 / G0,
        thrustRatio: response,
        pressurePa: testEnvironment.pressurePa,
        pumpPowerKw: design.pumps.totalShaftPowerKw * Math.pow(response, 1.08),
        wallTempK: 293 + (design.engine.nozzle.wallTempK - 293) * Math.pow(response, 0.72)
      });
      if (failed && command <= 0 && t > faultTime + 1) break;
    }
    return {
      status: failed ? "failed" : "complete",
      failed,
      bodyKey: config.test.bodyKey,
      bodyName: testEnvironment.body.name,
      faultTimeS: faultTime,
      faultReason: hardFailure ? `${hardFailure.component}：${hardFailure.message}` : "",
      message: failed ? "检测到确定性越限，试车已执行故障关机。" : "点火、稳态和关机时序完成。",
      consumedPropellantKg,
      points
    };
  }

  return { runStaticFire };
});
