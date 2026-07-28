(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.__RocketFlow = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
  }

  function areaRatioFromMach(mach, gamma) {
    const term = (2 / (gamma + 1)) * (1 + ((gamma - 1) / 2) * mach * mach);
    return (1 / mach) * Math.pow(term, (gamma + 1) / (2 * (gamma - 1)));
  }

  function exitMachForAreaRatio(areaRatio, gamma) {
    let low = 1.00001;
    let high = 20;
    for (let i = 0; i < 70; i += 1) {
      const mid = (low + high) / 2;
      if (areaRatioFromMach(mid, gamma) < areaRatio) low = mid;
      else high = mid;
    }
    return (low + high) / 2;
  }

  function nozzleCoefficient(chamberPressurePa, ambientPressurePa, expansionRatio, gamma) {
    const mach = exitMachForAreaRatio(expansionRatio, gamma);
    const pePc = Math.pow(1 + ((gamma - 1) / 2) * mach * mach, -gamma / (gamma - 1));
    const momentum = Math.sqrt(
      (2 * gamma * gamma / (gamma - 1)) *
      Math.pow(2 / (gamma + 1), (gamma + 1) / (gamma - 1)) *
      Math.max(0, 1 - Math.pow(pePc, (gamma - 1) / gamma))
    );
    const pressure = (pePc - ambientPressurePa / chamberPressurePa) * expansionRatio;
    return {
      cf: clamp(momentum + pressure, 0.35, 2.35),
      exitMach: mach,
      exitPressurePa: pePc * chamberPressurePa,
      pePc
    };
  }

  function effectiveIsp(propellant, cycle, ambientPressurePa) {
    const pressureFraction = Math.max(0, Number(ambientPressurePa) || 0) / 101325;
    const base = propellant.ispVac - (propellant.ispVac - propellant.ispSea) * pressureFraction;
    return Math.max(20, base * cycle.performanceFactor);
  }

  return { areaRatioFromMach, exitMachForAreaRatio, nozzleCoefficient, effectiveIsp };
});
