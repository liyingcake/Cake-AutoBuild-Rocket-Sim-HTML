// Pure UI formatting functions — no app state dependency.
// Pattern: globally registered, imported as aliases in app.js.
(function (root, factory) {
  root.__UIFormat = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function byId(id) {
    return document.getElementById(id);
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function getPath(object, path) {
    return path.split(".").reduce(function (value, key) {
      return value == null ? undefined : value[key];
    }, object);
  }

  function setPath(object, path, value) {
    const keys = path.split(".");
    let cursor = object;
    keys.slice(0, -1).forEach(function (key) {
      if (!cursor[key] || typeof cursor[key] !== "object") cursor[key] = {};
      cursor = cursor[key];
    });
    cursor[keys[keys.length - 1]] = value;
  }

  function readStorage(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function number(value, digits) {
    if (!Number.isFinite(Number(value))) return "\u2014";
    return Number(value).toLocaleString("zh-CN", {
      minimumFractionDigits: digits == null ? 0 : digits,
      maximumFractionDigits: digits == null ? 0 : digits
    });
  }

  function formatMass(kg) {
    if (!Number.isFinite(kg)) return "\u2014";
    if (kg >= 1e6) return number(kg / 1e6, 2) + " kt";
    if (kg >= 1000) return number(kg / 1000, 2) + " t";
    return number(kg, 1) + " kg";
  }

  function formatMoney(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return "\u2014";
    const sign = numeric < 0 ? "\u2212" : "";
    const absolute = Math.abs(numeric);
    if (absolute >= 1e8) return sign + "\u00a5" + number(absolute / 1e8, 2) + " \u4ebf";
    if (absolute >= 1e4) return sign + "\u00a5" + number(absolute / 1e4, 1) + " \u4e07";
    return sign + "\u00a5" + number(absolute, 0);
  }

  function formatLength(value) {
    if (!Number.isFinite(value)) return "\u2014";
    if (value < 0.01) return number(value * 1000, 2) + " mm";
    return number(value, 2) + " m";
  }

  function formatAltitude(value) {
    if (!Number.isFinite(value)) return "\u2014";
    if (value >= 1000) return number(value / 1000, 1) + " km";
    return number(value, 0) + " m";
  }

  function formatPressure(value) {
    if (!Number.isFinite(value)) return "\u2014";
    const pressure = Math.max(0, value);
    if (pressure >= 1e6) return number(pressure / 1e6, 3) + " MPa";
    if (pressure >= 1000) return number(pressure / 1000, pressure >= 100000 ? 1 : 2) + " kPa";
    return number(pressure, pressure < 10 ? 2 : 0) + " Pa";
  }

  function formatThrust(value) {
    if (!Number.isFinite(value)) return "\u2014";
    const thrust = Math.max(0, value);
    if (thrust >= 1e6) return number(thrust / 1e6, 2) + " MN";
    if (thrust >= 1000) return number(thrust / 1000, 1) + " kN";
    return number(thrust, 0) + " N";
  }

  function formatMassFlow(value) {
    if (!Number.isFinite(value)) return "\u2014";
    const flow = Math.max(0, value);
    return number(flow, flow >= 100 ? 1 : flow >= 10 ? 2 : 3) + " kg/s";
  }

  function createOption(value, label) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    return option;
  }

  function appendGroup(label) {
    const group = document.createElement("optgroup");
    group.label = label;
    return group;
  }

  function svgText(x, y, text, className, anchor) {
    return '<text x="' + x + '" y="' + y + '" class="' + (className || "") + '" text-anchor="' + (anchor || "start") + '">' + escapeHtml(text) + "</text>";
  }

  function hexRgb(hex) {
    const value = String(hex || "#000000").replace("#", "");
    const normalized = value.length === 3 ? value.split("").map(function (part) { return part + part; }).join("") : value;
    return {
      r: parseInt(normalized.slice(0, 2), 16) || 0,
      g: parseInt(normalized.slice(2, 4), 16) || 0,
      b: parseInt(normalized.slice(4, 6), 16) || 0
    };
  }

  function mixColor(from, to, amount) {
    const start = hexRgb(from);
    const end = hexRgb(to);
    const mix = clampValue(amount, 0, 1);
    return "rgb(" + Math.round(start.r + (end.r - start.r) * mix) + ", " + Math.round(start.g + (end.g - start.g) * mix) + ", " + Math.round(start.b + (end.b - start.b) * mix) + ")";
  }

  function colorAlpha(hex, alpha) {
    const color = hexRgb(hex);
    return "rgba(" + color.r + ", " + color.g + ", " + color.b + ", " + alpha + ")";
  }

  function clampValue(value, min, max) {
    return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
  }

  function deepCopy(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function samplePoints(points, maxPoints) {
    if (points.length <= maxPoints) return points;
    const sampled = [];
    const step = (points.length - 1) / (maxPoints - 1);
    for (let i = 0; i < maxPoints; i += 1) sampled.push(points[Math.round(i * step)]);
    return sampled;
  }

  const ENERGY_UNITS = Object.freeze({
    TJ: { divisor: 1e12, label: "TJ" },
    GJ: { divisor: 1e9, label: "GJ" },
    MJ: { divisor: 1e6, label: "MJ" },
    kJ: { divisor: 1e3, label: "kJ" }
  });

  function resolveEnergyUnit(energy) {
    const selected = AppCtx.els && AppCtx.els.energyUnitSelect ? AppCtx.els.energyUnitSelect.value : "auto";
    if (selected !== "auto" && ENERGY_UNITS[selected]) return ENERGY_UNITS[selected];
    const maximum = Math.max(1, (energy.points || []).reduce(function (m, p) { return Math.max(m, p.totalEnergyJ); }, 0));
    if (maximum >= 1e12) return ENERGY_UNITS.TJ;
    if (maximum >= 1e9) return ENERGY_UNITS.GJ;
    if (maximum >= 1e6) return ENERGY_UNITS.MJ;
    return ENERGY_UNITS.kJ;
  }

  function formatEnergy(valueJ, unit) {
    const scaled = Math.max(0, Number(valueJ) || 0) / unit.divisor;
    const digits = scaled >= 100 ? 1 : scaled >= 10 ? 2 : 3;
    return number(scaled, digits) + " " + unit.label;
  }

  return {
    byId: byId,
    escapeHtml: escapeHtml,
    getPath: getPath,
    setPath: setPath,
    readStorage: readStorage,
    number: number,
    formatMass: formatMass,
    formatMoney: formatMoney,
    formatLength: formatLength,
    formatAltitude: formatAltitude,
    formatPressure: formatPressure,
    formatThrust: formatThrust,
    formatMassFlow: formatMassFlow,
    createOption: createOption,
    appendGroup: appendGroup,
    svgText: svgText,
    hexRgb: hexRgb,
    mixColor: mixColor,
    colorAlpha: colorAlpha,
    clampValue: clampValue,
    deepCopy: deepCopy,
    samplePoints: samplePoints,
    ENERGY_UNITS: ENERGY_UNITS,
    resolveEnergyUnit: resolveEnergyUnit,
    formatEnergy: formatEnergy
  };
});
