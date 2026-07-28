(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory;
  else root.__RocketFlight = factory;
})(typeof globalThis !== "undefined" ? globalThis : this, function (Deps) {
  "use strict";

  const Env = Deps.Env;
  const Utils = Deps.Utils;

  const G0 = Deps.G0;
  const clamp = Utils.clamp;
  const celestialBody = Env.celestialBody;
  const environmentState = Env.environmentState;
  const effectiveIsp = Deps.effectiveIsp;
  const runParallelVerticalFlight = Deps.runParallelVerticalFlight;

  function runVerticalFlight(inputConfig, design) {
    const config = inputConfig || design.config;
    if (!design || !design.performance) return { status: "invalid", points: [], message: "缺少设计结果。" };
    if (design.parallel && design.parallel.enabled) return runParallelVerticalFlight(config, design);
    const body = celestialBody(config);
    const launchEnvironment = environmentState(config, config.vehicle.launchAltitudeM);
    if (design.performance.twr <= 1) return { status: "no-liftoff", points: [{ timeS: 0, altitudeM: config.vehicle.launchAltitudeM, velocityMs: 0, massKg: design.masses.wetMassKg, thrustN: 0, throttle: 0, throttleState: "关机", qPa: 0, accelG: 0, properAccelG: 0, netAccelG: 0, netAccelMs2: 0, gravityAccelG: -launchEnvironment.body.gravityMs2 / G0, dragAccelG: 0, propellantRemainingKg: design.masses.usablePropellantKg, pressurePa: launchEnvironment.pressurePa, exitPressurePa: 0, massFlowKgS: 0, fuelMassFlowKgS: 0, oxidizerMassFlowKgS: 0, exhaustVelocityMs: 0 }], message: `${body.name}场景推重比不大于 1，火箭无法离架。`, maxAltitudeM: config.vehicle.launchAltitudeM, maxVelocityMs: 0, maxQPa: 0, maxAccelG: 0, maxNetAccelG: 0, maxDragAccelG: 0, burnTimeS: 0, gravityLossMs: 0, dragLossMs: 0, escaped: false, bodyKey: config.test.bodyKey };
    const propellant = design.propellant;
    const cycle = design.engine.cycle;
    const dt = 0.10;
    let time = 0;
    let altitude = Math.max(0, config.vehicle.launchAltitudeM);
    let velocity = 0;
    let mass = design.masses.wetMassKg;
    let propRemaining = design.masses.usablePropellantKg;
    let maxAltitude = altitude;
    let maxVelocity = 0;
    let maxQ = 0;
    let maxAccel = 0;
    let maxNetAccel = 0;
    let maxDragAccel = 0;
    let maxPoweredVelocity = 0;
    let burnoutSnapshot = null;
    let gravityLoss = 0;
    let dragLoss = 0;
    let poweredTime = 0;
    let escaped = false;
    let launchFailed = false;
    let liftoffTimeS = null;
    let prelaunchConsumedPropellantKg = 0;
    let thrustQualifiedS = 0;
    let padReleased = config.vehicle.launchMode === "field";
    let energyContinuationEndTimeS = null;
    const altitudeMilestones = {
      600: null,
      1800: null
    };
    const points = [];
    const baseThrottle = clamp(config.engine.throttlePct / 100, 0.30, 1.10);
    const startupTimeS = config.vehicle.engineStartupS;
    const fullMdot = design.performance.totalMassFlowKgS;

    const gravitationalParameter = body.gravityMs2 * body.radiusM * body.radiusM;
    while (time < 3600) {
      const atm = environmentState(config, altitude);
      const gravity = gravitationalParameter / Math.pow(body.radiusM + altitude, 2);
      const qPa = 0.5 * atm.densityKgM3 * velocity * velocity;
      const startupProgress = propRemaining > 0 ? clamp(time / startupTimeS, 0, 1) : 0;
      const engineSpoolRatio = startupProgress * startupProgress * (3 - 2 * startupProgress);
      let throttle = propRemaining > 0 ? baseThrottle * engineSpoolRatio : 0;
      if (throttle > 0 && config.vehicle.limitLoads) {
        const qLimit = Math.max(1000, config.vehicle.maxQKpa * 1000);
        if (qPa > qLimit * 0.92) throttle *= clamp(qLimit / Math.max(qPa, 1), 0.38, 1);
        const estimatedIsp = effectiveIsp(propellant, cycle, atm.pressurePa);
        const estimatedThrust = fullMdot * throttle * estimatedIsp * G0;
        const estimatedAccelG = estimatedThrust / Math.max(1, mass) / G0;
        if (estimatedAccelG > config.vehicle.maxAccelG) throttle *= clamp(config.vehicle.maxAccelG / estimatedAccelG, 0.25, 1);
      }
      let mdot = fullMdot * throttle;
      if (mdot * dt > propRemaining) {
        mdot = propRemaining / dt;
        throttle = mdot / Math.max(1e-9, fullMdot);
      }
      const isp = effectiveIsp(propellant, cycle, atm.pressurePa);
      const thrustN = mdot * isp * G0;
      const flowScale = mdot / Math.max(1e-9, fullMdot);
      const fuelMassFlowKgS = design.engine.fuelMdotKgS * flowScale;
      const oxidizerMassFlowKgS = design.engine.oxidizerMdotKgS * flowScale;
      const exitPressurePa = design.engine.nozzle.exitPressurePa * throttle;
      const exhaustVelocityMs = mdot > 1e-9 ? thrustN / mdot : 0;
      const dragN = 0.5 * atm.densityKgM3 * velocity * Math.abs(velocity) * config.vehicle.dragCoefficient * design.geometry.frontalAreaM2;
      const properAccel = (thrustN - dragN) / Math.max(1, mass);
      const gravityAccelG = -gravity / G0;
      const dragAccelG = -dragN / Math.max(1, mass) / G0;
      const instantTwr = thrustN / Math.max(1, mass * gravity);
      const throttleState = mdot <= 1e-9 ? "关机"
        : engineSpoolRatio < 0.985 ? "推力爬升"
          : throttle < baseThrottle * 0.985 ? "自动限载"
            : throttle > 1.001 ? "超额节流" : "稳态";
      if (config.vehicle.launchMode === "pad" && !padReleased) {
        thrustQualifiedS = instantTwr > 1 ? thrustQualifiedS + dt : 0;
        if (thrustQualifiedS >= 1 - 1e-9) {
          padReleased = true;
          liftoffTimeS = time + dt;
        }
      } else if (config.vehicle.launchMode === "field" && liftoffTimeS == null && instantTwr > 1) {
        liftoffTimeS = time + dt;
      }
      const heldDown = config.vehicle.launchMode === "pad" && !padReleased;
      const groundSupported = config.vehicle.launchMode === "field" && liftoffTimeS == null;
      const netAccel = heldDown || groundSupported ? 0 : properAccel - gravity;
      if (heldDown || groundSupported) {
        velocity = 0;
        altitude = config.vehicle.launchAltitudeM;
      } else {
        velocity += netAccel * dt;
        if (altitude <= config.vehicle.launchAltitudeM && velocity < 0 && propRemaining > 0) velocity = 0;
        altitude += velocity * dt;
      }
      const propellantBeforeStepKg = propRemaining;
      propRemaining = Math.max(0, propRemaining - mdot * dt);
      mass = Math.max(design.masses.burnoutMassKg, mass - mdot * dt);
      time += dt;
      [600, 1800].forEach(function (milestoneTimeS) {
        if (altitudeMilestones[milestoneTimeS] == null && time >= milestoneTimeS) {
          altitudeMilestones[milestoneTimeS] = {
            timeS: milestoneTimeS,
            altitudeM: Math.max(0, altitude),
            distanceFromLaunchM: Math.max(0, altitude - config.vehicle.launchAltitudeM)
          };
        }
      });
      if (liftoffTimeS == null || time <= liftoffTimeS + 1e-9) {
        prelaunchConsumedPropellantKg = design.masses.usablePropellantKg - propRemaining;
      }
      if (throttle > 0) {
        poweredTime += dt;
        gravityLoss += gravity * dt;
        dragLoss += Math.abs(dragN / Math.max(1, mass)) * dt;
        maxPoweredVelocity = Math.max(maxPoweredVelocity, velocity);
      }
      if (!burnoutSnapshot && propellantBeforeStepKg > 0 && propRemaining <= 0) {
        burnoutSnapshot = {
          timeS: time,
          altitudeM: Math.max(0, altitude),
          distanceFromLaunchM: Math.max(0, altitude - config.vehicle.launchAltitudeM),
          velocityMs: velocity,
          maxPoweredVelocityMs: Math.max(maxPoweredVelocity, velocity)
        };
      }
      energyContinuationEndTimeS = burnoutSnapshot && config.test.energyCutoffMode === "post-burn"
        ? burnoutSnapshot.timeS + poweredTime * config.test.energyCoastPercent / 100
        : null;
      const energyWindowReached = energyContinuationEndTimeS != null && time >= energyContinuationEndTimeS - 1e-9;
      const accelG = Math.abs(properAccel) / G0;
      const netAccelG = netAccel / G0;
      maxAltitude = Math.max(maxAltitude, altitude);
      maxVelocity = Math.max(maxVelocity, velocity);
      maxQ = Math.max(maxQ, qPa);
      maxAccel = Math.max(maxAccel, accelG);
      maxNetAccel = Math.max(maxNetAccel, Math.abs(netAccelG));
      maxDragAccel = Math.max(maxDragAccel, Math.abs(dragAccelG));
      const releaseTransition = liftoffTimeS != null && Math.abs(time - liftoffTimeS) <= dt * 1.1;
      if (points.length === 0 || time - points[points.length - 1].timeS >= 0.45 || releaseTransition || (propRemaining <= 0 && points[points.length - 1].thrustN > 0) || (energyWindowReached && points[points.length - 1].timeS < time - 1e-9)) {
        points.push({ timeS: time, altitudeM: Math.max(0, altitude), velocityMs: velocity, massKg: mass, thrustN, throttle, throttleState, qPa, accelG, properAccelG: accelG, netAccelG, netAccelMs2: netAccel, gravityAccelG, dragAccelG, propellantRemainingKg: propRemaining, pressurePa: atm.pressurePa, exitPressurePa, massFlowKgS: mdot, fuelMassFlowKgS, oxidizerMassFlowKgS, exhaustVelocityMs, engineSpoolRatio, instantTwr, heldDown, groundSupported, padReleased, thrustQualifiedS, launchMode: config.vehicle.launchMode });
      }
      if (propRemaining <= 0 && velocity > 0 && 0.5 * velocity * velocity - gravitationalParameter / (body.radiusM + altitude) >= 0) {
        escaped = true;
      }
      if (escaped && (energyContinuationEndTimeS == null || energyWindowReached)) break;
      if (propRemaining <= 0 && velocity <= 0) break;
      if (altitude < config.vehicle.launchAltitudeM - 1) break;
    }
    launchFailed = liftoffTimeS == null;
    return {
      status: launchFailed ? "launch-failed" : escaped ? "escape" : velocity <= 0 ? "complete" : "limit",
      message: launchFailed ? "发动机未在推进剂耗尽前满足离架条件。" : escaped ? `已达到${body.name}逃逸轨迹教学判据。` : velocity <= 0 ? "已积分至滑行顶点。" : "已运行至 3600 s 教学积分上限。",
      points,
      bodyKey: config.test.bodyKey,
      bodyName: body.name,
      escaped,
      launchMode: config.vehicle.launchMode,
      liftoffTimeS,
      prelaunchConsumedPropellantKg,
      energyContinuationEndTimeS,
      maxAltitudeM: maxAltitude,
      maxVelocityMs: maxVelocity,
      maxQPa: maxQ,
      maxAccelG: maxAccel,
      maxNetAccelG: maxNetAccel,
      maxDragAccelG: maxDragAccel,
      burnTimeS: poweredTime,
      gravityLossMs: gravityLoss,
      dragLossMs: dragLoss,
      burnoutSnapshot,
      altitudeMilestones,
      finalAltitudeM: Math.max(0, altitude),
      finalMassKg: mass
    };
  }

  return { runVerticalFlight };
});
