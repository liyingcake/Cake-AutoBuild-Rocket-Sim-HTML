(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("../data.js"), require("./utils.js"));
  else root.__RocketMat = factory(root.RocketSimData, root.__CoreUtils);
})(typeof globalThis !== "undefined" ? globalThis : this, function (Data, Utils) {
  "use strict";

  const clamp = Utils.clamp;
  const round = Utils.round;
  const makeIssue = Utils.makeIssue;
  const processFamily = Utils.processFamily;
  const deepClone = Utils.deepClone;

  function materialTemperatureFactor(material, temperatureK) {
    if (!material || temperatureK < material.minTemp || temperatureK > material.maxTemp) return 0;
    if (temperatureK <= 293) return 1;
    const fraction = clamp((temperatureK - 293) / Math.max(1, material.maxTemp - 293), 0, 1);
    return 1 - fraction * (1 - material.hotFactor);
  }

  function materialModulusPa(material, temperatureK) {
    if (!material) return 1e9;
    const temperatureFactor = temperatureK <= 293 ? 1 : 0.82 + 0.18 * materialTemperatureFactor(material, temperatureK);
    const directionalFactor = material.tags.indexOf("anisotropic") >= 0 ? 0.78 : 1;
    return Math.max(1e8, material.modulus * 1e9 * temperatureFactor * directionalFactor);
  }

  function materialThermalExpansionPpmK(material) {
    const tags = material.tags || [];
    if (tags.indexOf("composite") >= 0) return 2.0;
    if (tags.indexOf("polymer") >= 0) return 65;
    if (tags.indexOf("aluminum") >= 0) return 23.2;
    if (tags.indexOf("copper") >= 0) return 17.0;
    if (tags.indexOf("titanium") >= 0) return 8.8;
    if (tags.indexOf("superalloy") >= 0) return 13.0;
    if (tags.indexOf("refractory") >= 0) return 7.2;
    if (tags.indexOf("stainless") >= 0) return 16.5;
    if (tags.indexOf("steel") >= 0 || tags.indexOf("ultra-high-strength") >= 0) return 12.0;
    return 11.5;
  }

  function validateMaterialProcess(material, process, component, issues) {
    const family = processFamily(material);
    if (process.allowed.indexOf(family) < 0) {
      issues.push(makeIssue("error", component, `${material.name} 与“${process.name}”工艺类别不匹配。`, "更换工艺或选择相容的材料族。"));
    }
    if (material.tags.indexOf("anisotropic") >= 0) {
      issues.push(makeIssue("info", component, `${material.name} 具有方向性，当前按代表性折减值计算。`, "详细设计需使用铺层或打印方向的实测数据。"));
    }
  }

  function compatibleTankProcess(material, preferredProcess) {
    const family = processFamily(material);
    if (preferredProcess && preferredProcess.allowed.indexOf(family) >= 0) return preferredProcess;
    if (family === "composite") return Data.processes["composite-layup"];
    if (family === "polymer") return Data.processes["polymer-molded"];
    return Data.processes["sheet-weld"];
  }

  function validateCompatibility(material, propellant, temperatureK, component, issues) {
    if (temperatureK < material.minTemp || temperatureK > material.maxTemp) {
      issues.push(makeIssue("error", component, `${material.name} 工作温区 ${material.minTemp}–${material.maxTemp} K，当前工质/壁温为 ${round(temperatureK, 0)} K。`, "选择覆盖该温区的材料或改变热管理方案。"));
    }
    const tags = material.tags;
    const flags = propellant.flags;
    if (flags.indexOf("fluorine") >= 0 && (tags.indexOf("polymer") >= 0 || tags.indexOf("composite") >= 0 || tags.indexOf("titanium") >= 0 || tags.indexOf("aluminum") >= 0 || tags.indexOf("copper") >= 0)) {
      issues.push(makeIssue("error", component, `${material.name} 未作为液氟环境的默认相容材料。`, "仅使用经氟化钝化和专项认证的材料/涂层数据。"));
    }
    if (flags.indexOf("hydrogen") >= 0 && (tags.indexOf("high-strength") >= 0 || tags.indexOf("ultra-high-strength") >= 0)) {
      issues.push(makeIssue("warning", component, `${material.name} 在氢环境下存在氢脆敏感性。`, "降低应力、控制表面与热处理，并使用氢相容试验数据。"));
    }
    if (flags.indexOf("oxidizer") >= 0 && (tags.indexOf("polymer") >= 0 || tags.indexOf("composite") >= 0 || tags.indexOf("titanium") >= 0)) {
      issues.push(makeIssue("warning", component, `${material.name} 接触强氧化剂需要点火、冲击与清洁度专项评估。`, "增加相容内衬并进行氧相容性认证。"));
    }
    if (tags.indexOf("liner-required") >= 0) {
      issues.push(makeIssue("warning", component, `${material.name} 仅作为承力缠绕层，当前质量已加入简化内衬修正。`, "详细设计需独立选择内衬材料和厚度。"));
    }
  }

  function contactPropellantProfile(propellant, role) {
    if (!propellant || role === "combined") return propellant;
    const profile = deepClone(propellant);
    profile.name = role === "oxidizer" ? propellant.oxidizerName : propellant.fuelName;
    profile.flags = (propellant.flags || []).filter(function (flag) {
      if (role === "fuel") return flag !== "oxidizer" && flag !== "fluorine";
      return flag !== "hydrogen" && flag !== "hydrazine" && flag !== "coking";
    });
    return profile;
  }

  return {
    materialTemperatureFactor,
    materialModulusPa,
    materialThermalExpansionPpmK,
    validateMaterialProcess,
    compatibleTankProcess,
    validateCompatibility,
    contactPropellantProfile
  };
});
