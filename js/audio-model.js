(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.RocketSimAudioModel = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function clamp(value, min, max) {
    const numeric = Number(value);
    return Math.min(max, Math.max(min, Number.isFinite(numeric) ? numeric : min));
  }

  function listeningFade(engineElapsedS, enabled) {
    if (!enabled) return 1;
    const elapsed = Math.max(0, Number(engineElapsedS) || 0);
    if (elapsed <= 8) return 1;
    if (elapsed >= 12) return 0.4;
    return 1 - 0.6 * ((elapsed - 8) / 4);
  }

  function vacuumFactor(pressurePa, enabled) {
    if (!enabled) return 1;
    const pressureRatio = clamp((Number(pressurePa) || 0) / 101325, 0, 1);
    return 0.1 + 0.9 * Math.sqrt(pressureRatio);
  }

  function calculateSoundEnvelope(options) {
    const settings = options || {};
    const comfort = listeningFade(settings.engineElapsedS, settings.autoListeningFade !== false);
    const ambient = vacuumFactor(settings.pressurePa, settings.vacuumAttenuation !== false);
    return Object.freeze({
      listeningFactor: comfort,
      vacuumFactor: ambient,
      effectiveFactor: comfort * ambient
    });
  }

  return Object.freeze({
    listeningFade,
    vacuumFactor,
    calculateSoundEnvelope
  });
});
