(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.__CoreUtils = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const G0 = 9.80665;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
  }

  function round(value, digits) {
    const p = 10 ** (digits == null ? 3 : digits);
    return Math.round((Number(value) + Number.EPSILON) * p) / p;
  }

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function deepMerge(base, input) {
    const output = deepClone(base);
    if (!input || typeof input !== "object") return output;
    Object.keys(input).forEach(function (key) {
      const value = input[key];
      if (value && typeof value === "object" && !Array.isArray(value) && output[key] && typeof output[key] === "object" && !Array.isArray(output[key])) {
        output[key] = deepMerge(output[key], value);
      } else {
        output[key] = value;
      }
    });
    return output;
  }

  function makeIssue(severity, component, message, suggestion) {
    return { severity, component, message, suggestion: suggestion || "检查输入与材料/工艺选择。" };
  }

  function processFamily(material) {
    if (material.tags.indexOf("composite") >= 0) return "composite";
    if (material.tags.indexOf("polymer") >= 0) return "polymer";
    return "metal";
  }

  return { G0, clamp, round, deepClone, deepMerge, makeIssue, processFamily };
});
