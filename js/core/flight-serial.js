(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory;
  else root.__RocketFlightSerial = factory;
})(typeof globalThis !== "undefined" ? globalThis : this, function (Deps) {
  "use strict";

  const Env = Deps.Env;
  const Utils = Deps.Utils;

  const G0 = Deps.G0;
  const clamp = Utils.clamp;
  const celestialBody = Env.celestialBody;
  const environmentState = Env.environmentState;
  const effectiveIsp = Deps.effectiveIsp;
  const liftoffState = Deps.liftoffState;
  const runVerticalFlight = Deps.runVerticalFlight;

  function runSerialVerticalFlight(inputConfig, design) {
    const config = inputConfig || design.config;
    if (!design || !design.serial || !design.serial.enabled) return runVerticalFlight(config, design);
    const body = celestialBody(config);
    const launchEnvironment = environmentState(config, config.vehicle.launchAltitudeM);
    const baseVehicle = design.serial.base;
    const parallel = baseVehicle.parallel && baseVehicle.parallel.enabled ? baseVehicle.parallel : null;
    const coreStage = parallel ? parallel.core : baseVehicle;
    const stageDesigns = [coreStage].concat(design.serial.stages);
    const stageNames = ["芯级 / 第一级"].concat(design.serial.stages.map(function (stage) { return stage.stageName; }));
    const stageRemaining = stageDesigns.map(function (stage) { return stage.masses.usablePropellantKg; });
    const stageInitialPropellant = stageRemaining.slice();
    const stageBurnoutRecorded = stageDesigns.map(function () { return false; });
    const stageBurnoutSnapshots = [];
    const stageEvents = [];
    const dt = 0.10;
    const gravitationalParameter = body.gravityMs2 * body.radiusM * body.radiusM;
    const initialLiftoffState = liftoffState(config, design);
    const initialMassKg = initialLiftoffState.massKg;
    const initialTwr = initialLiftoffState.twr;
    const boosterInitialPropellantKg = parallel ? parallel.booster.masses.usablePropellantKg * parallel.count : 0;
    let boosterRemaining = boosterInitialPropellantKg;
    let boosterAttached = Boolean(parallel);
    let boosterBurnoutTimeS = null;
    let boosterSeparationSnapshot = null;
    let time = 0;
    let altitude = Math.max(0, config.vehicle.launchAltitudeM);
    let velocity = 0;
    let mass = initialMassKg;
    let activeStageIndex = 0;
    let separatedStageCount = 0;
    let stageIgnitionTimeS = 0;
    let transition = null;
    let maxAltitude = altitude;
    let maxVelocity = 0;
    let maxQ = 0;
    let maxAccel = 0;
    let maxNetAccel = 0;
    let maxDragAccel = 0;
    let maxPoweredVelocity = 0;
    let burnoutSnapshot = null;
    let coreBurnoutSnapshot = null;
    let gravityLoss = 0;
    let dragLoss = 0;
    let poweredTime = 0;
    let escaped = false;
    let liftoffTimeS = null;
    let prelaunchConsumedPropellantKg = 0;
    let thrustQualifiedS = 0;
    let padReleased = config.vehicle.launchMode === "field";
    let energyContinuationEndTimeS = null;
    const altitudeMilestones = { 600: null, 1800: null };
    const points = [];
    const totalInitialPropellantKg = stageInitialPropellant.reduce(function (sum, value) { return sum + value; }, 0) + boosterInitialPropellantKg;

    function remainingPropellantKg() {
      return stageRemaining.reduce(function (sum, value) { return sum + Math.max(0, value); }, 0) + Math.max(0, boosterRemaining);
    }

    function stageFractions() {
      return stageRemaining.map(function (value, index) {
        return clamp(value / Math.max(1e-9, stageInitialPropellant[index]), 0, 1);
      });
    }

    function addStageEvent(type, stageIndex, extra) {
      const event = Object.assign({
        type,
        stageIndex,
        stageNumber: stageIndex + 1,
        stageName: stageNames[stageIndex],
        timeS: time,
        altitudeM: Math.max(0, altitude),
        velocityMs: velocity,
        massKg: mass
      }, extra || {});
      stageEvents.push(event);
      return event;
    }

    function beginTransition(fromIndex) {
      if (transition || fromIndex >= stageDesigns.length - 1) return false;
      const toIndex = fromIndex + 1;
      const separation = design.serial.stages[fromIndex].separation;
      const hot = separation.key === "hot";
      transition = {
        fromIndex,
        toIndex,
        separation,
        hot,
        separated: false,
        ignited: false,
        separationTimeS: time + (hot ? Math.max(0.1, separation.ignitionOverlapS) : Math.max(0.1, separation.nominalCoastS)),
        ignitionTimeS: time + (hot ? 0 : Math.max(separation.nominalCoastS, separation.ignitionDelayS))
      };
      return true;
    }

    function processTransitionEvents() {
      let eventOccurred = false;
      if (!transition) return eventOccurred;
      if (!transition.ignited && time >= transition.ignitionTimeS - 1e-9) {
        activeStageIndex = transition.toIndex;
        stageIgnitionTimeS = time;
        transition.ignited = true;
        addStageEvent("ignition", activeStageIndex, {
          separationMode: transition.separation.key,
          separationName: transition.separation.name,
          hotStaging: transition.hot
        });
        eventOccurred = true;
      }
      if (!transition.separated && time >= transition.separationTimeS - 1e-9) {
        const nextStage = stageDesigns[transition.toIndex];
        const consumedNextStageKg = stageInitialPropellant[transition.toIndex] - stageRemaining[transition.toIndex];
        const postSeparationMassKg = Math.max(nextStage.masses.burnoutMassKg, nextStage.masses.wetMassKg - consumedNextStageKg);
        const massBeforeSeparationKg = mass;
        mass = Math.min(mass, postSeparationMassKg);
        separatedStageCount = Math.max(separatedStageCount, transition.toIndex);
        addStageEvent("separation", transition.fromIndex, {
          toStageIndex: transition.toIndex,
          toStageName: stageNames[transition.toIndex],
          separationMode: transition.separation.key,
          separationName: transition.separation.name,
          droppedMassKg: Math.max(0, massBeforeSeparationKg - mass),
          separationVelocityMs: transition.separation.separationVelocityMs,
          postSeparationMassKg: mass
        });
        transition.separated = true;
        eventOccurred = true;
      }
      if (transition.ignited && transition.separated) transition = null;
      return eventOccurred;
    }

    if (!(initialTwr > 1)) {
      return {
        status: "no-liftoff",
        points: [{
          timeS: 0, altitudeM: altitude, velocityMs: 0, massKg: initialMassKg, thrustN: 0, stageThrustN: 0,
          throttle: 0, throttleState: "关机", qPa: 0, accelG: 0, properAccelG: 0, netAccelG: 0,
          netAccelMs2: 0, gravityAccelG: -launchEnvironment.body.gravityMs2 / G0, dragAccelG: 0,
          propellantRemainingKg: totalInitialPropellantKg, stagePropellantRemainingKg: stageRemaining.slice(),
          stageRemainingFractions: stageFractions(), activeStageRemainingFraction: 1, activeStageIndex: 0,
          activeStageName: stageNames[0], separatedStageCount: 0, pressurePa: launchEnvironment.pressurePa,
          exitPressurePa: 0, massFlowKgS: 0, fuelMassFlowKgS: 0, oxidizerMassFlowKgS: 0,
          exhaustVelocityMs: 0, boosterPropellantRemainingKg: boosterRemaining, boosterAttached
        }],
        message: `${body.name}场景全箭起飞推重比不大于 1，串联火箭无法离架。`,
        maxAltitudeM: altitude, maxVelocityMs: 0, maxQPa: 0, maxAccelG: 0, maxNetAccelG: 0,
        maxDragAccelG: 0, burnTimeS: 0, gravityLossMs: 0, dragLossMs: 0, escaped: false,
        bodyKey: config.test.bodyKey, bodyName: body.name, stageEvents, stageBurnoutSnapshots,
        serialStageCount: stageDesigns.length, initialTwr, initialThrustN: initialLiftoffState.thrustN
      };
    }

    addStageEvent("ignition", 0, { separationMode: null, separationName: "发射点火", hotStaging: false });

    while (time < 3600) {
      let serialEventThisStep = processTransitionEvents();
      const activeStage = stageDesigns[activeStageIndex];
      const activeConfig = activeStage.config || config;
      const activePropellant = activeStage.propellant;
      const atm = environmentState(config, altitude);
      const gravity = gravitationalParameter / Math.pow(body.radiusM + altitude, 2);
      const qPa = 0.5 * atm.densityKgM3 * velocity * velocity;
      const activeRemaining = stageRemaining[activeStageIndex];
      const startupDurationS = activeStageIndex === 0 ? config.vehicle.engineStartupS : Math.min(2, activeConfig.vehicle.engineStartupS || config.vehicle.engineStartupS);
      const startupProgress = activeRemaining > 0 ? clamp((time - stageIgnitionTimeS) / Math.max(0.1, startupDurationS), 0, 1) : 0;
      const engineSpoolRatio = startupProgress * startupProgress * (3 - 2 * startupProgress);
      const baseThrottle = clamp(activeConfig.engine.throttlePct / 100, 0.30, 1.10);
      let throttle = activeRemaining > 0 ? baseThrottle * engineSpoolRatio : 0;
      const boosterCanBurn = Boolean(parallel && boosterAttached && boosterRemaining > 0 && separatedStageCount === 0);
      if (boosterCanBurn && activeRemaining <= 0) throttle = clamp(config.engine.throttlePct / 100, 0.30, 1.10);

      if (throttle > 0 && config.vehicle.limitLoads) {
        const qLimit = Math.max(1000, config.vehicle.maxQKpa * 1000);
        if (qPa > qLimit * 0.92) throttle *= clamp(qLimit / Math.max(qPa, 1), 0.38, 1);
        const estimatedStageThrustN = activeStage.performance.totalMassFlowKgS * throttle * effectiveIsp(activePropellant, activeStage.engine.cycle, atm.pressurePa) * G0;
        const estimatedBoosterThrustN = boosterCanBurn
          ? parallel.booster.performance.totalMassFlowKgS * parallel.count * throttle * effectiveIsp(parallel.booster.propellant, parallel.booster.engine.cycle, atm.pressurePa) * G0
          : 0;
        const estimatedAccelG = (estimatedStageThrustN + estimatedBoosterThrustN) / Math.max(1, mass) / G0;
        if (estimatedAccelG > config.vehicle.maxAccelG) throttle *= clamp(config.vehicle.maxAccelG / estimatedAccelG, 0.25, 1);
      }

      let stageMdot = activeRemaining > 0 ? activeStage.performance.totalMassFlowKgS * throttle : 0;
      let boosterMdot = boosterCanBurn ? parallel.booster.performance.totalMassFlowKgS * parallel.count * throttle : 0;
      if (stageMdot * dt > activeRemaining) stageMdot = activeRemaining / dt;
      if (boosterMdot * dt > boosterRemaining) boosterMdot = boosterRemaining / dt;
      const stageIsp = effectiveIsp(activePropellant, activeStage.engine.cycle, atm.pressurePa);
      const boosterIsp = parallel ? effectiveIsp(parallel.booster.propellant, parallel.booster.engine.cycle, atm.pressurePa) : 0;
      const stageThrustN = stageMdot * stageIsp * G0;
      const boosterThrustN = boosterMdot * boosterIsp * G0;
      const thrustN = stageThrustN + boosterThrustN;
      const mdot = stageMdot + boosterMdot;
      const stageFlowScale = stageMdot / Math.max(1e-9, activeStage.performance.totalMassFlowKgS);
      const boosterFlowScale = parallel ? boosterMdot / Math.max(1e-9, parallel.booster.performance.totalMassFlowKgS * parallel.count) : 0;
      const fuelMassFlowKgS = activeStage.engine.fuelMdotKgS * stageFlowScale
        + (parallel ? parallel.booster.engine.fuelMdotKgS * parallel.count * boosterFlowScale : 0);
      const oxidizerMassFlowKgS = activeStage.engine.oxidizerMdotKgS * stageFlowScale
        + (parallel ? parallel.booster.engine.oxidizerMdotKgS * parallel.count * boosterFlowScale : 0);
      const exitPressurePa = mdot > 0
        ? (activeStage.engine.nozzle.exitPressurePa * stageMdot + (parallel ? parallel.booster.engine.nozzle.exitPressurePa * boosterMdot : 0)) / mdot
        : 0;
      const exhaustVelocityMs = mdot > 1e-9 ? thrustN / mdot : 0;
      const geometryStageIndex = Math.max(activeStageIndex, separatedStageCount);
      const geometryStage = stageDesigns[Math.min(stageDesigns.length - 1, geometryStageIndex)];
      const frontalAreaM2 = parallel && boosterAttached && separatedStageCount === 0
        ? parallel.attachedFrontalAreaM2
        : geometryStage.geometry.frontalAreaM2;
      const dragN = 0.5 * atm.densityKgM3 * velocity * Math.abs(velocity) * config.vehicle.dragCoefficient * frontalAreaM2;
      const properAccel = (thrustN - dragN) / Math.max(1, mass);
      const gravityAccelG = -gravity / G0;
      const dragAccelG = -dragN / Math.max(1, mass) / G0;
      const instantTwr = thrustN / Math.max(1, mass * gravity);
      let phase;
      if (transition) {
        if (transition.hot && transition.ignited && !transition.separated) phase = `${stageNames[transition.toIndex]}热分离点火 · 级间排焰`;
        else if (transition.separated && !transition.ignited) phase = `${stageNames[transition.fromIndex]}已分离 · 等待${stageNames[transition.toIndex]}点火`;
        else phase = `${stageNames[transition.fromIndex]}燃尽 · 分离准备`;
      } else if (thrustN > 1) {
        phase = activeStageIndex === 0 && boosterCanBurn ? "芯级 + 助推器共同上升" : `${stageNames[activeStageIndex]}动力飞行`;
      } else phase = burnoutSnapshot ? "全箭关机滑行" : `${stageNames[activeStageIndex]}关机滑行`;
      const throttleState = mdot <= 1e-9 ? (transition ? "分级时序" : "关机")
        : stageMdot <= 1e-9 && boosterMdot > 0 ? "助推器续航"
          : engineSpoolRatio < 0.985 ? `${stageNames[activeStageIndex]}推力爬升`
          : throttle < baseThrottle * 0.985 ? "自动限载"
            : activeStageIndex === 0 && boosterCanBurn ? "芯级 + 助推器" : `${stageNames[activeStageIndex]}稳态`;

      if (config.vehicle.launchMode === "pad" && !padReleased) {
        thrustQualifiedS = instantTwr > 1 ? thrustQualifiedS + dt : 0;
        if (thrustQualifiedS >= 1 - 1e-9) {
          padReleased = true;
          liftoffTimeS = time + dt;
        }
      } else if (config.vehicle.launchMode === "field" && liftoffTimeS == null && instantTwr > 1) liftoffTimeS = time + dt;
      const heldDown = config.vehicle.launchMode === "pad" && !padReleased;
      const groundSupported = config.vehicle.launchMode === "field" && liftoffTimeS == null;
      const netAccel = heldDown || groundSupported ? 0 : properAccel - gravity;
      if (heldDown || groundSupported) {
        velocity = 0;
        altitude = config.vehicle.launchAltitudeM;
      } else {
        velocity += netAccel * dt;
        if (altitude <= config.vehicle.launchAltitudeM && velocity < 0 && remainingPropellantKg() > 0) velocity = 0;
        altitude += velocity * dt;
      }

      const activeBeforeStepKg = stageRemaining[activeStageIndex];
      const boosterBeforeStepKg = boosterRemaining;
      stageRemaining[activeStageIndex] = Math.max(0, stageRemaining[activeStageIndex] - stageMdot * dt);
      boosterRemaining = Math.max(0, boosterRemaining - boosterMdot * dt);
      mass = Math.max(stageDesigns[stageDesigns.length - 1].masses.burnoutMassKg, mass - mdot * dt);
      time += dt;

      if (parallel && boosterAttached && boosterBeforeStepKg > 0 && boosterRemaining <= 1e-9 && boosterBurnoutTimeS == null) boosterBurnoutTimeS = time;
      let boosterSeparatedThisStep = false;
      if (parallel && boosterAttached && boosterBurnoutTimeS != null && time >= boosterBurnoutTimeS + parallel.separationDelayS - 1e-9) {
        boosterAttached = false;
        const beforeSeparationKg = mass;
        mass = Math.max(stageDesigns[stageDesigns.length - 1].masses.burnoutMassKg, mass - parallel.separationMassKg);
        boosterSeparatedThisStep = true;
        serialEventThisStep = true;
        boosterSeparationSnapshot = {
          timeS: time, altitudeM: Math.max(0, altitude), velocityMs: velocity,
          droppedMassKg: Math.max(0, beforeSeparationKg - mass), postSeparationMassKg: mass,
          postSeparationTwr: coreStage.performance.totalThrustN / Math.max(1, mass * gravity)
        };
        stageEvents.push(Object.assign({ type: "booster-separation", stageIndex: 0, stageNumber: 1, stageName: "并联助推器" }, boosterSeparationSnapshot));
      }

      if (!stageBurnoutRecorded[activeStageIndex] && activeBeforeStepKg > 0 && stageRemaining[activeStageIndex] <= 1e-9) {
        stageBurnoutRecorded[activeStageIndex] = true;
        const snapshot = {
          timeS: time, altitudeM: Math.max(0, altitude), velocityMs: velocity,
          massKg: mass, stageIndex: activeStageIndex, stageNumber: activeStageIndex + 1,
          stageName: stageNames[activeStageIndex], maxPoweredVelocityMs: Math.max(maxPoweredVelocity, velocity)
        };
        stageBurnoutSnapshots.push(snapshot);
        addStageEvent("burnout", activeStageIndex, snapshot);
        serialEventThisStep = true;
        if (activeStageIndex === 0) coreBurnoutSnapshot = snapshot;
        if (activeStageIndex === stageDesigns.length - 1) burnoutSnapshot = snapshot;
      }

      const coreStackReady = activeStageIndex !== 0 || !parallel || (!boosterAttached && boosterRemaining <= 1e-9);
      if (!transition && stageBurnoutRecorded[activeStageIndex] && coreStackReady && activeStageIndex < stageDesigns.length - 1) {
        if (beginTransition(activeStageIndex)) serialEventThisStep = true;
      }

      [600, 1800].forEach(function (milestoneTimeS) {
        if (altitudeMilestones[milestoneTimeS] == null && time >= milestoneTimeS) {
          altitudeMilestones[milestoneTimeS] = { timeS: milestoneTimeS, altitudeM: Math.max(0, altitude), distanceFromLaunchM: Math.max(0, altitude - config.vehicle.launchAltitudeM) };
        }
      });
      const totalRemaining = remainingPropellantKg();
      if (liftoffTimeS == null || time <= liftoffTimeS + 1e-9) prelaunchConsumedPropellantKg = totalInitialPropellantKg - totalRemaining;
      if (mdot > 0) {
        poweredTime += dt;
        gravityLoss += gravity * dt;
        dragLoss += Math.abs(dragN / Math.max(1, mass)) * dt;
        maxPoweredVelocity = Math.max(maxPoweredVelocity, velocity);
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
      const fractions = stageFractions();
      if (points.length === 0 || time - points[points.length - 1].timeS >= 0.45 || releaseTransition || serialEventThisStep || boosterSeparatedThisStep || (totalRemaining <= 0 && points[points.length - 1].thrustN > 0) || (energyWindowReached && points[points.length - 1].timeS < time - 1e-9)) {
        points.push({
          timeS: time, altitudeM: Math.max(0, altitude), velocityMs: velocity, massKg: mass,
          thrustN, stageThrustN, coreThrustN: activeStageIndex === 0 ? stageThrustN : 0, boosterThrustN,
          throttle, throttleState, phase, qPa, accelG, properAccelG: accelG, netAccelG, netAccelMs2: netAccel,
          gravityAccelG, dragAccelG, propellantRemainingKg: totalRemaining,
          stagePropellantRemainingKg: stageRemaining.slice(), stageRemainingFractions: fractions,
          activeStageRemainingFraction: fractions[activeStageIndex], totalPropellantRemainingFraction: totalRemaining / Math.max(1e-9, totalInitialPropellantKg),
          activeStageIndex, activeStageNumber: activeStageIndex + 1, activeStageName: stageNames[activeStageIndex],
          separatedStageCount, transitionActive: Boolean(transition), transitionMode: transition ? transition.separation.key : null,
          boosterPropellantRemainingKg: boosterRemaining,
          boosterRemainingFraction: boosterRemaining / Math.max(1e-9, boosterInitialPropellantKg),
          boosterAttached, boosterSeparatedThisStep, pressurePa: atm.pressurePa, exitPressurePa,
          massFlowKgS: mdot, fuelMassFlowKgS, oxidizerMassFlowKgS, exhaustVelocityMs,
          engineSpoolRatio, instantTwr, heldDown, groundSupported, padReleased, thrustQualifiedS,
          launchMode: config.vehicle.launchMode, activePropellantKey: activePropellant.key,
          activePropellantMono: activePropellant.mono, activeFuelName: activePropellant.fuelName,
          activeOxidizerName: activePropellant.oxidizerName
        });
      }
      if (burnoutSnapshot && velocity > 0 && 0.5 * velocity * velocity - gravitationalParameter / (body.radiusM + altitude) >= 0) escaped = true;
      if (escaped && (energyContinuationEndTimeS == null || energyWindowReached)) break;
      if (burnoutSnapshot && velocity <= 0) break;
      if (altitude < config.vehicle.launchAltitudeM - 1) break;
    }

    const launchFailed = liftoffTimeS == null;
    return {
      status: launchFailed ? "launch-failed" : escaped ? "escape" : velocity <= 0 ? "complete" : "limit",
      message: launchFailed ? "串联火箭未在推进剂耗尽前满足离架条件。"
        : escaped ? `全部 ${stageDesigns.length} 级已依次点火分离，并达到${body.name}逃逸轨迹教学判据。`
          : velocity <= 0 ? `全部 ${stageDesigns.length} 级已依次点火分离，轨迹积分至滑行顶点。`
            : `全部 ${stageDesigns.length} 级已执行点火分离；已运行至 3600 s 教学积分上限。`,
      points, bodyKey: config.test.bodyKey, bodyName: body.name, escaped, launchMode: config.vehicle.launchMode,
      liftoffTimeS, prelaunchConsumedPropellantKg, energyContinuationEndTimeS,
      maxAltitudeM: maxAltitude, maxVelocityMs: maxVelocity, maxQPa: maxQ, maxAccelG: maxAccel,
      maxNetAccelG: maxNetAccel, maxDragAccelG: maxDragAccel, burnTimeS: poweredTime,
      gravityLossMs: gravityLoss, dragLossMs: dragLoss, burnoutSnapshot, coreBurnoutSnapshot,
      boosterBurnoutTimeS, boosterSeparationSnapshot, altitudeMilestones,
      finalAltitudeM: Math.max(0, altitude), finalMassKg: mass,
      stageEvents, stageBurnoutSnapshots, serialStageCount: stageDesigns.length,
      completedStageCount: stageBurnoutRecorded.filter(Boolean).length,
      missionSeparationReliabilityPct: design.serial.missionSeparationReliabilityPct,
      initialTwr, initialThrustN: initialLiftoffState.thrustN
    };
  }

  return { runSerialVerticalFlight };
});
