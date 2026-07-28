(function (root, factory) {
  const data = factory();
  if (typeof module === "object" && module.exports) module.exports = data;
  root.RocketSimData = data;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const schemaVersion = 1;

  const celestialBodies = {
    earth: { name: "地球", shortName: "地球", radiusM: 6371000, gravityMs2: 9.80665, surfacePressurePa: 101325, surfaceDensityKgM3: 1.225, surfaceTemperatureK: 288.15, scaleHeightM: 8500, gasConstant: 287.05, lapseRateKPerM: -0.0065, minTemperatureK: 216.65, visualAtmosphereM: 110000, sceneSurface: "#5f96ad", sceneHorizon: "#214c61", sceneSpace: "#02050b", atmosphere: "氮氧大气" },
    venus: { name: "金星", shortName: "金星", radiusM: 6051800, gravityMs2: 8.87, surfacePressurePa: 9200000, surfaceDensityKgM3: 65.0, surfaceTemperatureK: 737, scaleHeightM: 15900, gasConstant: 188.92, lapseRateKPerM: -0.0080, minTemperatureK: 230, visualAtmosphereM: 260000, sceneSurface: "#c8883d", sceneHorizon: "#724424", sceneSpace: "#050308", atmosphere: "92 bar 级高温 CO₂ 大气" },
    "venus-500kpa": { name: "金星（部分地球化 500 kPa）", shortName: "地球化金星", radiusM: 6051800, gravityMs2: 8.87, surfacePressurePa: 500000, surfaceDensityKgM3: 5.75, surfaceTemperatureK: 303, scaleHeightM: 9800, gasConstant: 287.05, lapseRateKPerM: -0.0070, minTemperatureK: 205, visualAtmosphereM: 145000, sceneSurface: "#82a982", sceneHorizon: "#385b50", sceneSpace: "#02050a", atmosphere: "概念性 500 kPa 温和混合大气", conceptual: true },
    mars: { name: "火星", shortName: "火星", radiusM: 3389500, gravityMs2: 3.71, surfacePressurePa: 610, surfaceDensityKgM3: 0.020, surfaceTemperatureK: 210, scaleHeightM: 11100, gasConstant: 188.92, lapseRateKPerM: -0.0010, minTemperatureK: 145, visualAtmosphereM: 90000, sceneSurface: "#a85d3b", sceneHorizon: "#4b2d2c", sceneSpace: "#03050a", atmosphere: "稀薄 CO₂ 大气" },
    moon: { name: "月球", shortName: "月球", radiusM: 1737400, gravityMs2: 1.62, surfacePressurePa: 0, surfaceDensityKgM3: 0, surfaceTemperatureK: 250, scaleHeightM: 0, gasConstant: 0, lapseRateKPerM: 0, minTemperatureK: 80, visualAtmosphereM: 18000, sceneSurface: "#585a61", sceneHorizon: "#22252c", sceneSpace: "#010207", atmosphere: "近真空外逸层" },
    mercury: { name: "水星", shortName: "水星", radiusM: 2439700, gravityMs2: 3.70, surfacePressurePa: 0, surfaceDensityKgM3: 0, surfaceTemperatureK: 440, scaleHeightM: 0, gasConstant: 0, lapseRateKPerM: 0, minTemperatureK: 100, visualAtmosphereM: 22000, sceneSurface: "#6f6255", sceneHorizon: "#2c2825", sceneSpace: "#020205", atmosphere: "近真空外逸层" },
    titan: { name: "土卫六", shortName: "土卫六", radiusM: 2574700, gravityMs2: 1.352, surfacePressurePa: 146700, surfaceDensityKgM3: 5.30, surfaceTemperatureK: 94, scaleHeightM: 20000, gasConstant: 296.8, lapseRateKPerM: -0.0007, minTemperatureK: 70, visualAtmosphereM: 600000, sceneSurface: "#b27a2f", sceneHorizon: "#66401e", sceneSpace: "#040308", atmosphere: "浓厚氮/甲烷大气" },
    europa: { name: "木卫二", shortName: "木卫二", radiusM: 1560800, gravityMs2: 1.315, surfacePressurePa: 0, surfaceDensityKgM3: 0, surfaceTemperatureK: 102, scaleHeightM: 0, gasConstant: 0, lapseRateKPerM: 0, minTemperatureK: 60, visualAtmosphereM: 16000, sceneSurface: "#738b9b", sceneHorizon: "#293844", sceneSpace: "#01030a", atmosphere: "极稀薄氧外逸层" },
    ceres: { name: "谷神星", shortName: "谷神星", radiusM: 476000, gravityMs2: 0.27, surfacePressurePa: 0, surfaceDensityKgM3: 0, surfaceTemperatureK: 167, scaleHeightM: 0, gasConstant: 0, lapseRateKPerM: 0, minTemperatureK: 70, visualAtmosphereM: 9000, sceneSurface: "#625e59", sceneHorizon: "#242426", sceneSpace: "#010205", atmosphere: "极稀薄水汽外逸层" }
  };

  const flamePalettes = {
    steam: { name: "冰蓝蒸汽", outer: "#8bdcff", core: "#f4fdff", glow: "#70bfff", lengthFactor: 0.82, widthFactor: 1.15 },
    "lox-co": { name: "青紫电弧", outer: "#5bc8ff", core: "#d6a8ff", glow: "#6e7dff", lengthFactor: 1.02, widthFactor: 0.92 },
    "lox-methane": { name: "甲烷蓝焰", outer: "#4ab8ff", core: "#d8fbff", glow: "#4d7dff", lengthFactor: 1.08, widthFactor: 0.86 },
    "lox-rp1": { name: "煤油金焰", outer: "#ff7a32", core: "#ffe066", glow: "#ff3f24", lengthFactor: 0.95, widthFactor: 1.18 },
    "lox-lh2": { name: "氢氧幽蓝", outer: "#8ea7ff", core: "#f6f3ff", glow: "#796cff", lengthFactor: 1.20, widthFactor: 0.72 },
    "lf2-lh2": { name: "氟氢极光", outer: "#8cff9d", core: "#fff6c7", glow: "#61e6d6", lengthFactor: 1.16, widthFactor: 0.82 },
    hydrazine: { name: "联氨琥珀焰", outer: "#ff8a3d", core: "#fff0a6", glow: "#ff4e55", lengthFactor: 0.88, widthFactor: 1.08 },
    "nto-mmh": { name: "自燃玫橙", outer: "#ff647f", core: "#ffd36b", glow: "#ff3b4f", lengthFactor: 0.94, widthFactor: 1.05 },
    "nto-udmh": { name: "自燃金红", outer: "#ff6a33", core: "#ffe176", glow: "#ec2948", lengthFactor: 0.92, widthFactor: 1.12 },
    custom: { name: "自定义霓虹焰", outer: "#d66cff", core: "#fff4ff", glow: "#5ee7ff", lengthFactor: 1.00, widthFactor: 1.00 }
  };

  const propellants = {
    "steam": {
      name: "水 / 蒸汽（单组元热推进）",
      shortName: "蒸汽",
      mono: true,
      fuelName: "水",
      oxidizerName: "—",
      fuelPriceCnyKg: 0.01,
      oxidizerPriceCnyKg: 0,
      specificEnergyMjKg: 3.0,
      fuelDensity: 958,
      oxidizerDensity: 0,
      fuelTemperatureK: 373,
      oxidizerTemperatureK: 293,
      mixtureRatio: 0,
      cStar: 920,
      gamma: 1.30,
      chamberTemperatureK: 850,
      ispSea: 105,
      ispVac: 185,
      fuelVaporPressureKpa: 101,
      oxidizerVaporPressureKpa: 0,
      storability: "常温水可储，工作前需外部加热",
      toxicity: "低",
      corrosivity: "低",
      flags: ["heated"],
      note: "代表热水/蒸汽火箭的简化有效参数，不模拟加热器。"
    },
    "lox-co": {
      name: "液氧 / 一氧化碳",
      shortName: "LOX/CO",
      fuelName: "液态一氧化碳",
      oxidizerName: "液氧",
      fuelPriceCnyKg: 22,
      oxidizerPriceCnyKg: 1.8,
      specificEnergyMjKg: 9.2,
      fuelDensity: 790,
      oxidizerDensity: 1141,
      fuelTemperatureK: 68,
      oxidizerTemperatureK: 90,
      mixtureRatio: 0.62,
      cStar: 1620,
      gamma: 1.24,
      chamberTemperatureK: 3180,
      ispSea: 255,
      ispVac: 315,
      fuelVaporPressureKpa: 115,
      oxidizerVaporPressureKpa: 101,
      storability: "双低温",
      toxicity: "高（CO）",
      corrosivity: "中",
      flags: ["cryogenic", "toxic", "oxidizer"],
      note: "罕见概念组合；性能参数为教学估计。"
    },
    "lox-methane": {
      name: "液氧 / 液态甲烷",
      shortName: "LOX/CH₄",
      fuelName: "液态甲烷",
      oxidizerName: "液氧",
      fuelPriceCnyKg: 8,
      oxidizerPriceCnyKg: 1.8,
      specificEnergyMjKg: 11.1,
      fuelDensity: 422,
      oxidizerDensity: 1141,
      fuelTemperatureK: 112,
      oxidizerTemperatureK: 90,
      mixtureRatio: 3.50,
      cStar: 1850,
      gamma: 1.22,
      chamberTemperatureK: 3550,
      ispSea: 325,
      ispVac: 372,
      fuelVaporPressureKpa: 116,
      oxidizerVaporPressureKpa: 101,
      storability: "双低温",
      toxicity: "低",
      corrosivity: "中",
      flags: ["cryogenic", "oxidizer"],
      note: "清洁燃烧、适合再生冷却；密度为沸点附近代表值。"
    },
    "lox-rp1": {
      name: "液氧 / RP-1 煤油",
      shortName: "LOX/RP‑1",
      fuelName: "RP-1",
      oxidizerName: "液氧",
      fuelPriceCnyKg: 12,
      oxidizerPriceCnyKg: 1.8,
      specificEnergyMjKg: 11.9,
      fuelDensity: 810,
      oxidizerDensity: 1141,
      fuelTemperatureK: 293,
      oxidizerTemperatureK: 90,
      mixtureRatio: 2.60,
      cStar: 1780,
      gamma: 1.22,
      chamberTemperatureK: 3670,
      ispSea: 300,
      ispVac: 342,
      fuelVaporPressureKpa: 1,
      oxidizerVaporPressureKpa: 101,
      storability: "氧化剂低温，燃料常温可储",
      toxicity: "中",
      corrosivity: "中",
      flags: ["cryogenic", "oxidizer", "coking"],
      note: "高密度推进剂；再生冷却需关注结焦。"
    },
    "lox-lh2": {
      name: "液氧 / 液氢",
      shortName: "LOX/LH₂",
      fuelName: "液氢",
      oxidizerName: "液氧",
      fuelPriceCnyKg: 45,
      oxidizerPriceCnyKg: 1.8,
      specificEnergyMjKg: 18.5,
      fuelDensity: 71,
      oxidizerDensity: 1141,
      fuelTemperatureK: 20,
      oxidizerTemperatureK: 90,
      mixtureRatio: 5.50,
      cStar: 2380,
      gamma: 1.20,
      chamberTemperatureK: 3540,
      ispSea: 365,
      ispVac: 452,
      fuelVaporPressureKpa: 101,
      oxidizerVaporPressureKpa: 101,
      storability: "深低温",
      toxicity: "低",
      corrosivity: "中",
      flags: ["cryogenic", "deep-cryogenic", "hydrogen", "oxidizer"],
      note: "高比冲、低燃料密度；需校核氢脆、渗透与绝热。"
    },
    "lf2-lh2": {
      name: "液氟 / 液氢",
      shortName: "LF₂/LH₂",
      fuelName: "液氢",
      oxidizerName: "液氟",
      fuelPriceCnyKg: 45,
      oxidizerPriceCnyKg: 260,
      specificEnergyMjKg: 14.0,
      fuelDensity: 71,
      oxidizerDensity: 1505,
      fuelTemperatureK: 20,
      oxidizerTemperatureK: 85,
      mixtureRatio: 9.0,
      cStar: 2470,
      gamma: 1.18,
      chamberTemperatureK: 4300,
      ispSea: 390,
      ispVac: 478,
      fuelVaporPressureKpa: 101,
      oxidizerVaporPressureKpa: 120,
      storability: "深低温、极强反应性",
      toxicity: "极高",
      corrosivity: "极高",
      flags: ["cryogenic", "deep-cryogenic", "hydrogen", "fluorine", "toxic", "oxidizer"],
      note: "仅作历史概念对比；极端危险、腐蚀和材料相容性苛刻。"
    },
    "hydrazine": {
      name: "联氨催化分解（单组元）",
      shortName: "N₂H₄",
      mono: true,
      fuelName: "联氨",
      oxidizerName: "—",
      fuelPriceCnyKg: 180,
      oxidizerPriceCnyKg: 0,
      specificEnergyMjKg: 3.5,
      fuelDensity: 1010,
      oxidizerDensity: 0,
      fuelTemperatureK: 293,
      oxidizerTemperatureK: 293,
      mixtureRatio: 0,
      cStar: 1220,
      gamma: 1.26,
      chamberTemperatureK: 1180,
      ispSea: 205,
      ispVac: 235,
      fuelVaporPressureKpa: 2,
      oxidizerVaporPressureKpa: 0,
      storability: "常温长期可储",
      toxicity: "极高",
      corrosivity: "高",
      flags: ["storable", "toxic", "hydrazine"],
      note: "催化床分解模型；不使用氧化剂泵。"
    },
    "nto-mmh": {
      name: "四氧化二氮 / 单甲基肼",
      shortName: "NTO/MMH",
      fuelName: "MMH",
      oxidizerName: "NTO",
      fuelPriceCnyKg: 520,
      oxidizerPriceCnyKg: 75,
      specificEnergyMjKg: 15.7,
      fuelDensity: 880,
      oxidizerDensity: 1440,
      fuelTemperatureK: 293,
      oxidizerTemperatureK: 293,
      mixtureRatio: 2.00,
      cStar: 1710,
      gamma: 1.23,
      chamberTemperatureK: 3360,
      ispSea: 282,
      ispVac: 326,
      fuelVaporPressureKpa: 6,
      oxidizerVaporPressureKpa: 96,
      storability: "常温可储、自燃",
      toxicity: "极高",
      corrosivity: "高",
      flags: ["storable", "toxic", "hypergolic", "oxidizer", "hydrazine"],
      note: "高毒自燃组合；需专用密封、清洗和防护。"
    },
    "nto-udmh": {
      name: "四氧化二氮 / 偏二甲肼",
      shortName: "NTO/UDMH",
      fuelName: "UDMH",
      oxidizerName: "NTO",
      fuelPriceCnyKg: 150,
      oxidizerPriceCnyKg: 75,
      specificEnergyMjKg: 14.1,
      fuelDensity: 790,
      oxidizerDensity: 1440,
      fuelTemperatureK: 293,
      oxidizerTemperatureK: 293,
      mixtureRatio: 2.20,
      cStar: 1680,
      gamma: 1.23,
      chamberTemperatureK: 3300,
      ispSea: 278,
      ispVac: 320,
      fuelVaporPressureKpa: 16,
      oxidizerVaporPressureKpa: 96,
      storability: "常温可储、自燃",
      toxicity: "极高",
      corrosivity: "高",
      flags: ["storable", "toxic", "hypergolic", "oxidizer", "hydrazine"],
      note: "高毒可储组合；数据为代表工况。"
    }
  };

  const materials = {
    "peek": { name: "PEEK", category: "高温聚合物", density: 1320, yield: 100, ultimate: 115, modulus: 3.6, conductivity: 0.25, minTemp: 20, maxTemp: 520, hotFactor: 0.45, minGauge: 1.2, price: 520, scarcity: 1.7, tags: ["polymer"], note: "适合绝缘、密封和低载荷部件，不作为高压主承力壳体默认材料。" },
    "ptfe": { name: "PTFE", category: "聚合物", density: 2200, yield: 23, ultimate: 30, modulus: 0.5, conductivity: 0.25, minTemp: 20, maxTemp: 530, hotFactor: 0.35, minGauge: 1.5, price: 110, scarcity: 1.2, tags: ["polymer", "liner"], note: "耐化学性好、强度低，适合衬里和密封。" },
    "pai": { name: "PAI Torlon 类", category: "高温聚合物", density: 1420, yield: 150, ultimate: 185, modulus: 5.0, conductivity: 0.26, minTemp: 30, maxTemp: 550, hotFactor: 0.55, minGauge: 1.0, price: 860, scarcity: 2.0, tags: ["polymer"], note: "代表高性能聚合物，价格和牌号差异较大。" },
    "cfrp-qi": { name: "准各向同性 CFRP", category: "碳纤维复材", density: 1580, yield: 620, ultimate: 780, modulus: 70, conductivity: 5, minTemp: 90, maxTemp: 420, hotFactor: 0.55, minGauge: 1.0, price: 430, scarcity: 1.8, tags: ["composite", "anisotropic"], note: "按准各向同性层合板代表值；必须考虑铺层、冲击损伤和低温树脂。" },
    "copv-carbon": { name: "碳纤维/环氧缠绕层", category: "碳纤维复材", density: 1650, yield: 900, ultimate: 1250, modulus: 105, conductivity: 4, minTemp: 90, maxTemp: 410, hotFactor: 0.50, minGauge: 1.2, price: 610, scarcity: 2.0, tags: ["composite", "anisotropic", "liner-required"], note: "只代表缠绕层；储箱必须另计金属或聚合物内衬。" },
    "cast-iron": { name: "灰铸铁 ASTM A48 类", category: "铸铁", density: 7200, yield: 130, ultimate: 210, modulus: 100, conductivity: 46, minTemp: 180, maxTemp: 670, hotFactor: 0.55, minGauge: 3.0, price: 8, scarcity: 0.8, tags: ["brittle"], note: "密度高且低温韧性差，仅用于对比或地面设备。" },
    "steel-4130": { name: "AISI 4130", category: "合金钢", density: 7850, yield: 435, ultimate: 670, modulus: 205, conductivity: 42, minTemp: 170, maxTemp: 720, hotFactor: 0.58, minGauge: 0.8, price: 22, scarcity: 1.0, tags: ["steel"], note: "性能取决于热处理和焊接状态。" },
    "steel-4340": { name: "AISI 4340 调质", category: "高强钢", density: 7850, yield: 1080, ultimate: 1280, modulus: 205, conductivity: 44, minTemp: 180, maxTemp: 700, hotFactor: 0.55, minGauge: 0.8, price: 38, scarcity: 1.15, tags: ["steel", "high-strength"], note: "高强状态对缺口、氢和焊接质量敏感。" },
    "ss-304l": { name: "304L 不锈钢（参考）", category: "不锈钢", density: 8000, yield: 215, ultimate: 505, modulus: 193, conductivity: 16, minTemp: 4, maxTemp: 870, hotFactor: 0.42, minGauge: 0.7, price: 24, scarcity: 1.0, tags: ["stainless", "cryogenic"], note: "本模拟器相对强度与成本指数的基准材料。" },
    "ss-316l": { name: "316L 不锈钢", category: "不锈钢", density: 8000, yield: 205, ultimate: 515, modulus: 193, conductivity: 16, minTemp: 4, maxTemp: 870, hotFactor: 0.42, minGauge: 0.7, price: 31, scarcity: 1.05, tags: ["stainless", "cryogenic", "corrosion-resistant"], note: "耐腐蚀性优于 304L，强度仍取决于产品形态。" },
    "ss-17-4ph": { name: "17-4PH H900", category: "沉淀硬化不锈钢", density: 7780, yield: 1170, ultimate: 1310, modulus: 197, conductivity: 18, minTemp: 190, maxTemp: 590, hotFactor: 0.60, minGauge: 0.8, price: 68, scarcity: 1.3, tags: ["stainless", "high-strength"], note: "高强但低温和焊后状态需单独认证。" },
    "al-2219": { name: "铝合金 2219‑T87", category: "铝合金", density: 2840, yield: 350, ultimate: 455, modulus: 73, conductivity: 120, minTemp: 20, maxTemp: 450, hotFactor: 0.45, minGauge: 0.9, price: 62, scarcity: 1.35, tags: ["aluminum", "cryogenic", "weldable"], note: "典型焊接低温储箱候选；焊缝区需降额。" },
    "al-6061": { name: "铝合金 6061‑T6", category: "铝合金", density: 2700, yield: 276, ultimate: 310, modulus: 69, conductivity: 167, minTemp: 20, maxTemp: 420, hotFactor: 0.40, minGauge: 1.0, price: 28, scarcity: 1.0, tags: ["aluminum", "cryogenic", "weldable"], note: "易加工、易获得；焊接热影响区强度下降明显。" },
    "al-7075": { name: "铝合金 7075‑T6", category: "高强铝合金", density: 2810, yield: 503, ultimate: 572, modulus: 72, conductivity: 130, minTemp: 80, maxTemp: 390, hotFactor: 0.38, minGauge: 0.9, price: 45, scarcity: 1.15, tags: ["aluminum", "high-strength"], note: "高比强度但熔焊和应力腐蚀性能较差。" },
    "cu-c18150": { name: "CuCrZr C18150", category: "铜合金", density: 8890, yield: 380, ultimate: 450, modulus: 120, conductivity: 320, minTemp: 80, maxTemp: 760, hotFactor: 0.38, minGauge: 0.8, price: 145, scarcity: 1.5, tags: ["copper", "hot-wall"], note: "高导热燃烧室内衬候选；通常需要外部承力套。" },
    "grcop-42": { name: "GRCop‑42 类", category: "高温铜合金", density: 8900, yield: 410, ultimate: 520, modulus: 125, conductivity: 350, minTemp: 80, maxTemp: 1050, hotFactor: 0.50, minGauge: 0.7, price: 520, scarcity: 2.6, tags: ["copper", "hot-wall", "additive-compatible"], note: "NASA 系高热流密度铜合金的代表值；批次与工艺差异较大。" },
    "ti-64": { name: "Ti‑6Al‑4V", category: "钛合金", density: 4430, yield: 880, ultimate: 950, modulus: 114, conductivity: 7, minTemp: 80, maxTemp: 670, hotFactor: 0.55, minGauge: 0.8, price: 150, scarcity: 1.7, tags: ["titanium", "high-strength"], note: "高比强度；与液氧、摩擦点火和氢环境的适用性需谨慎验证。" },
    "ti-525": { name: "Ti‑5Al‑2.5Sn ELI", category: "低温钛合金", density: 4480, yield: 760, ultimate: 825, modulus: 110, conductivity: 7, minTemp: 20, maxTemp: 700, hotFactor: 0.58, minGauge: 0.8, price: 210, scarcity: 1.9, tags: ["titanium", "cryogenic"], note: "代表低间隙低温钛合金，仍需推进剂相容性认证。" },
    "maraging-250": { name: "18Ni 马氏体时效钢 250", category: "特种钢", density: 8000, yield: 1720, ultimate: 1790, modulus: 190, conductivity: 25, minTemp: 170, maxTemp: 750, hotFactor: 0.62, minGauge: 0.7, price: 180, scarcity: 1.9, tags: ["steel", "ultra-high-strength"], note: "超高强度、昂贵，热处理和氢脆控制关键。" },
    "a286": { name: "A‑286", category: "铁镍基耐热合金", density: 7940, yield: 760, ultimate: 1030, modulus: 200, conductivity: 15, minTemp: 80, maxTemp: 980, hotFactor: 0.62, minGauge: 0.8, price: 175, scarcity: 1.8, tags: ["superalloy", "hot-section"], note: "适合高温紧固件、涡轮与壳体类零件。" },
    "inconel-718": { name: "Inconel 718", category: "镍基高温合金", density: 8190, yield: 1030, ultimate: 1240, modulus: 200, conductivity: 11, minTemp: 20, maxTemp: 1080, hotFactor: 0.68, minGauge: 0.7, price: 230, scarcity: 2.0, tags: ["superalloy", "hot-section", "cryogenic"], note: "强度、耐温和可焊性平衡良好；加工成本高。" },
    "haynes-230": { name: "Haynes 230", category: "镍基高温合金", density: 8970, yield: 390, ultimate: 860, modulus: 211, conductivity: 9, minTemp: 80, maxTemp: 1420, hotFactor: 0.58, minGauge: 0.8, price: 310, scarcity: 2.2, tags: ["superalloy", "hot-section"], note: "高温抗氧化和热稳定性优先，不以室温屈服强度见长。" },
    "c103": { name: "C‑103 铌合金", category: "难熔合金", density: 8850, yield: 240, ultimate: 330, modulus: 90, conductivity: 38, minTemp: 200, maxTemp: 1650, hotFactor: 0.52, minGauge: 0.8, price: 1250, scarcity: 3.8, tags: ["refractory", "hot-section"], note: "高温喷管候选；高温氧化环境通常需要涂层。" },
    "am-alsi10mg": { name: "增材 AlSi10Mg", category: "3D 打印金属", density: 2670, yield: 230, ultimate: 360, modulus: 70, conductivity: 120, minTemp: 70, maxTemp: 430, hotFactor: 0.40, minGauge: 1.0, price: 85, scarcity: 1.5, tags: ["aluminum", "additive", "anisotropic"], note: "按热处理后代表值；构建方向、孔隙和表面状态需降额。" },
    "am-in718": { name: "增材 Inconel 718", category: "3D 打印金属", density: 8150, yield: 900, ultimate: 1120, modulus: 195, conductivity: 11, minTemp: 50, maxTemp: 1050, hotFactor: 0.62, minGauge: 0.8, price: 390, scarcity: 2.4, tags: ["superalloy", "additive", "anisotropic", "hot-section"], note: "包含打印方向与孔隙折减，未替代 HIP 与材料鉴定。" },
    "am-ti64": { name: "增材 Ti‑6Al‑4V", category: "3D 打印金属", density: 4410, yield: 780, ultimate: 900, modulus: 110, conductivity: 7, minTemp: 100, maxTemp: 650, hotFactor: 0.50, minGauge: 0.9, price: 330, scarcity: 2.2, tags: ["titanium", "additive", "anisotropic"], note: "打印态/热处理态差异显著，疲劳性能对缺陷敏感。" }
  };

  const processes = {
    "sheet-weld": { name: "板材成形＋焊接", difficulty: 1.35, waste: 1.15, strengthFactor: 0.92, weldEfficiency: 0.85, allowed: ["metal"], advantage: "大尺寸薄壁效率高，可维修；焊缝需降额与检验。" },
    "spin-weld": { name: "旋压/整体成形封头＋环焊", difficulty: 1.65, waste: 1.22, strengthFactor: 0.96, weldEfficiency: 0.90, allowed: ["metal"], advantage: "减少封头拼缝并改善形状一致性；受设备尺寸和材料成形性约束。" },
    "friction-stir-weld": { name: "摩擦搅拌焊铝合金筒段", difficulty: 1.85, waste: 1.12, strengthFactor: 0.98, weldEfficiency: 0.94, allowed: ["metal"], advantage: "低热输入、接头效率高；主要适用于可搅拌焊合金并需要专用工装。" },
    "integral-grid": { name: "整体铣削等网格/正交网格", difficulty: 2.85, waste: 3.10, strengthFactor: 1.08, weldEfficiency: 0.95, allowed: ["metal"], advantage: "提高屈曲刚度并减少独立筋条连接；材料去除率、设备行程和检验成本高。" },
    "flow-formed": { name: "流动成形整体加筋筒段", difficulty: 2.55, waste: 1.20, strengthFactor: 1.06, weldEfficiency: 0.98, allowed: ["metal"], advantage: "近净成形、焊缝少且尺寸一致；需要大型专机和尺度验证。" },
    "filament-wound": { name: "内衬成形＋纤维缠绕固化", difficulty: 2.95, waste: 1.18, strengthFactor: 0.92, weldEfficiency: 1.00, allowed: ["composite"], advantage: "沿主应力方向配置纤维；需控制铺放角、固化、冲击损伤和内衬界面。" },
    "sandwich-bonded": { name: "夹芯面板粘接＋周边连接", difficulty: 2.75, waste: 1.28, strengthFactor: 0.90, weldEfficiency: 0.92, allowed: ["metal", "composite"], advantage: "高弯曲刚度并可兼顾隔热；需检查面板起皱、芯层剪切和脱粘。" },
    "common-bulkhead-honeycomb": { name: "共底双面板＋蜂窝芯粘接", difficulty: 3.10, waste: 1.35, strengthFactor: 0.90, weldEfficiency: 0.90, allowed: ["metal", "composite"], advantage: "同时承担隔热与双向压差；连接环、粘接质量、检漏和双侧焊缝复杂。" },
    "machined": { name: "整体机加工", difficulty: 2.30, waste: 2.40, strengthFactor: 1.00, weldEfficiency: 1.00, allowed: ["metal", "polymer"], advantage: "尺寸与表面质量好，但材料去除率和成本高。" },
    "forged-machined": { name: "锻造＋机加工", difficulty: 2.55, waste: 1.75, strengthFactor: 1.08, weldEfficiency: 1.00, allowed: ["metal"], advantage: "组织和疲劳性能较好，模具与后加工成本高。" },
    "cast-machined": { name: "铸造＋机加工", difficulty: 1.70, waste: 1.28, strengthFactor: 0.82, weldEfficiency: 0.95, allowed: ["metal"], advantage: "复杂近净成形，需承担缺陷、壁厚和检验折减。" },
    "additive": { name: "金属增材＋后处理", difficulty: 3.25, waste: 1.12, strengthFactor: 0.86, weldEfficiency: 1.00, allowed: ["metal"], advantage: "可集成流道并减少零件数，需后处理、检测和方向性折减。" },
    "composite-layup": { name: "复材铺层/缠绕", difficulty: 2.65, waste: 1.20, strengthFactor: 0.88, weldEfficiency: 1.00, allowed: ["composite"], advantage: "比强度高、可定向设计；需内衬并关注层间与冲击损伤。" },
    "polymer-molded": { name: "聚合物模压/机加工", difficulty: 1.45, waste: 1.20, strengthFactor: 0.90, weldEfficiency: 1.00, allowed: ["polymer"], advantage: "耐化学和绝缘性好，仅适合有限载荷与温度。" },
    "ablative-wrap": { name: "烧蚀层包覆", difficulty: 1.85, waste: 1.25, strengthFactor: 0.75, weldEfficiency: 1.00, allowed: ["composite", "polymer", "metal"], advantage: "以材料消耗吸热，系统简单但不可长时间重复使用。" }
  };

  const cycles = {
    "pressure-fed": { name: "挤压供给", performanceFactor: 0.985, massFactor: 0.72, costFactor: 0.72, maxPcMpa: 6.0, complexity: "低", note: "无主泵；教学室压上限提高至 6 MPa，但储箱压力仍必须覆盖室压、喷注与管路损失。" },
    "gas-generator": { name: "燃气发生器", performanceFactor: 0.965, massFactor: 1.00, costFactor: 1.00, maxPcMpa: 18, complexity: "中", note: "少量推进剂驱动涡轮后排放，性能略有损失。" },
    "electric-pump": { name: "电泵", performanceFactor: 0.985, massFactor: 0.92, costFactor: 0.10, maxPcMpa: 8, complexity: "中", note: "无燃气发生器、预燃室和涡轮热端，发动机制造成本按 0.10× 教学修正；质量仍受电池比能量与比功率约束。" },
    "expander": { name: "膨胀循环", performanceFactor: 0.995, massFactor: 0.92, costFactor: 1.25, maxPcMpa: 12, complexity: "中高", note: "利用再生冷却吸热驱动涡轮，受可用热量和发动机尺度限制。" },
    "staged": { name: "分级燃烧", performanceFactor: 1.010, massFactor: 1.18, costFactor: 1.65, maxPcMpa: 28, complexity: "高", note: "预燃室排气全部进入主室，压力和材料要求高。" },
    "full-flow": { name: "全流量分级燃烧", performanceFactor: 1.018, massFactor: 1.32, costFactor: 2.15, maxPcMpa: 35, complexity: "极高", note: "燃料富与氧化剂富预燃室分别驱动两套涡轮机械。" }
  };

  const batteries = {
    "primary-lithium": { name: "一次锂电池（高比能）", type: "一次电池", chemistry: "锂金属一次体系", rechargeable: false, energyDensityWhKg: 500, powerDensityWKg: 350, packOverheadPct: 22, costCnyKg: 1500, note: "比能量高但持续比功率有限，较长燃时可能由输出功率决定质量。" },
    "secondary-li-ion": { name: "二次锂离子电池", type: "二次电池", chemistry: "高倍率锂离子", rechargeable: true, energyDensityWhKg: 240, powerDensityWKg: 1500, packOverheadPct: 18, costCnyKg: 720, note: "比能量与功率密度均衡，可重复充电，作为默认电泵电源。" },
    "high-power-lipo": { name: "高功率锂聚合物", type: "二次电池", chemistry: "高倍率 Li-Po", rechargeable: true, energyDensityWhKg: 185, powerDensityWKg: 3200, packOverheadPct: 20, costCnyKg: 980, note: "适合短时大功率放电，但热管理、循环寿命和封装要求更高。" },
    "silver-zinc": { name: "银锌特种电池", type: "特种电池", chemistry: "Ag-Zn", rechargeable: false, energyDensityWhKg: 135, powerDensityWKg: 2100, packOverheadPct: 16, costCnyKg: 2600, note: "航空航天传统高功率体系，成本高、寿命有限。" },
    "lithium-sulfur": { name: "锂硫高比能电池", type: "特种二次电池", chemistry: "Li-S 概念包", rechargeable: true, energyDensityWhKg: 400, powerDensityWKg: 850, packOverheadPct: 25, costCnyKg: 1800, note: "以概念级包参数表示高比能潜力，成熟度与循环寿命不确定。" },
    custom: { name: "自定义特殊电池", type: "用户定义", chemistry: "自定义", rechargeable: false, energyDensityWhKg: 300, powerDensityWKg: 1000, packOverheadPct: 20, costCnyKg: 1000, note: "使用下方用户输入的比能量、比功率、封装余量与参考价。" }
  };

  const cooling = {
    "regenerative": { name: "再生冷却", wallTempK: 760, massFactor: 1.12, costFactor: 1.35, reusable: true, note: "以燃料为主冷却剂；按流量与温升估算吸热能力。" },
    "ablative": { name: "烧蚀冷却", wallTempK: 1180, massFactor: 1.28, costFactor: 0.82, reusable: false, note: "增加可消耗内衬质量，适合较短燃时。" },
    "radiative": { name: "辐射冷却", wallTempK: 1500, massFactor: 0.82, costFactor: 1.05, reusable: true, note: "依赖高温材料与表面积，适合较小热流密度。" }
  };

  const stageSeparationModes = {
    cold: {
      name: "冷分离 · 先分离后点火",
      shortName: "冷分离",
      description: "前一级关机后先解除级间连接，以冷气推离器/反推装置建立安全间距，再启动上一级。",
      baseMassKg: 18,
      massPerDiameterKg: 12,
      baseCostCny: 420000,
      separationVelocityMs: 1.5,
      nominalCoastS: 1.8,
      ignitionOverlapS: 0,
      lowerRetainedFraction: 0.72,
      reliabilityPct: 99.72,
      fixedMotors: null,
      risk: "存在短暂无推力滑行；液体上面级通常需要推进剂沉底或姿态控制。"
    },
    mechanical: {
      name: "机械式 · 弹簧/推杆",
      shortName: "机械式",
      description: "爆炸螺栓、夹箍或锁紧环释放后，由预载弹簧或机械推杆提供小分离速度。",
      baseMassKg: 12,
      massPerDiameterKg: 8,
      baseCostCny: 280000,
      separationVelocityMs: 0.8,
      nominalCoastS: 0.9,
      ignitionOverlapS: 0,
      lowerRetainedFraction: 0.78,
      reliabilityPct: 99.78,
      fixedMotors: null,
      risk: "系统简单但分离冲量有限，对姿态误差、残余推力和再接触裕度更敏感。"
    },
    "ullage-solid": {
      name: "小固推分离 · 固定沉底/反推器",
      shortName: "小固推",
      description: "在级间配置固定参数的小型固体沉底与反推电机；本模型不允许把它们当作主推进器调参。",
      baseMassKg: 34,
      massPerDiameterKg: 18,
      baseCostCny: 860000,
      separationVelocityMs: 3.5,
      nominalCoastS: 0.55,
      ignitionOverlapS: 0,
      lowerRetainedFraction: 0.48,
      reliabilityPct: 99.62,
      fixedMotors: { count: 4, thrustKnEach: 12, burnTimeS: 1.2, propellantKgEach: 8.0 },
      risk: "提供明确的正向沉底加速度和级间间距，但增加火工品、局部热流、振动与一次性硬件。"
    },
    hot: {
      name: "热分离 · 上一级提前点火",
      shortName: "热分离",
      description: "上一级在级间仍连接或刚开始释放时点火，通过开口/排焰级间段维持加速度并推动分离。",
      baseMassKg: 50,
      massPerDiameterKg: 28,
      baseCostCny: 1800000,
      separationVelocityMs: 1.1,
      nominalCoastS: 0,
      ignitionOverlapS: 1.0,
      lowerRetainedFraction: 0.66,
      reliabilityPct: 99.45,
      fixedMotors: null,
      risk: "避免无推力滑行，但必须处理发动机羽流冲击、隔热、排焰开口、瞬态载荷与级间再接触。"
    }
  };

  const defaultConfig = {
    schemaVersion,
    name: "LOX/甲烷概念级",
    autoName: false,
    sizingMode: "mass",
    propellantKey: "lox-methane",
    customPropellant: {
      name: "自定义推进剂",
      shortName: "CUSTOM",
      mono: false,
      fuelName: "自定义燃料",
      oxidizerName: "自定义氧化剂",
      fuelPriceCnyKg: 10,
      oxidizerPriceCnyKg: 5,
      specificEnergyMjKg: 12,
      fuelDensity: 800,
      oxidizerDensity: 1100,
      fuelTemperatureK: 293,
      oxidizerTemperatureK: 293,
      mixtureRatio: 2.5,
      cStar: 1700,
      gamma: 1.22,
      chamberTemperatureK: 3300,
      ispSea: 285,
      ispVac: 330,
      fuelVaporPressureKpa: 5,
      oxidizerVaporPressureKpa: 20,
      storability: "用户定义",
      toxicity: "未知",
      corrosivity: "未知",
      flags: ["custom"],
      note: "必须由用户提供有效热力与密度参数。"
    },
    sizing: {
      propellantMassKg: 18000,
      propellantVolumeM3: 18,
      massInputKind: "mass",
      targetDeltaV: 4200,
      targetThrustKn: 520,
      burnTimeS: 125
    },
    vehicle: {
      payloadKg: 1200,
      avionicsKg: 85,
      structuralFactor: 0.055,
      includePayloadInDryBreakdown: false,
      liftoffTargetMode: "twr",
      targetTwr: 1.42,
      targetLiftoffAccelMs2: 4.12,
      dragCoefficient: 0.34,
      launchAltitudeM: 0,
      countdownEnabled: true,
      countdownSeconds: 10,
      immersiveLaunch: true,
      pauseAfterBurnout: false,
      launchMode: "pad",
      engineStartupS: 3.0,
      maxQKpa: 45,
      maxAccelG: 4.5,
      limitLoads: true
    },
    boosters: {
      enabled: false,
      count: 2,
      sizingMode: "core-ratio",
      propellantMassRatioPct: 28,
      propellantMassKg: 4200,
      propellantMode: "copy-core",
      propellantKey: "lox-rp1",
      diameterMode: "copy-core",
      diameterM: 1.35,
      engineMode: "copy-core",
      cycleKey: "gas-generator",
      engineCount: 1,
      targetThrustKn: 420,
      chamberPressureMpa: 8,
      expansionRatio: 14,
      attachmentMassPct: 2.2,
      separationDelayS: 0.8,
      separationReliabilityPct: 99.7,
      dragFactor: 1.08,
      includeInDeltaVSizing: true
    },
    tanks: {
      pressureMpa: 0.42,
      ullagePct: 4,
      residualPct: 2,
      structureMode: "single",
      geometryMode: "separate",
      commonBulkheadType: "honeycomb",
      commonBulkheadPressureMode: "self-supporting",
      commonBulkheadControlledDeltaKpa: 60,
      commonBulkheadProofFactor: 1.25,
      commonBulkheadHeightRatio: 0.42,
      commonBulkheadCoreThicknessMm: 25,
      commonBulkheadFuelMaterialKey: "al-2219",
      commonBulkheadOxidizerMaterialKey: "al-2219",
      interfaceMode: "bonded",
      interfaceEfficiencyPct: 85,
      interfaceShearStrengthMpa: 18,
      linerPrestressMpa: 0,
      bucklingKnockdownPct: 35,
      ovalityPct: 0.5,
      designCycles: 20,
      balloonMinGaugeMm: 0.25,
      balloonGroundSupport: true,
      diameterMode: "auto",
      diameterM: 2.25,
      targetAspect: 4.8,
      materialKey: "al-2219",
      fuelLinerMaterialKey: "ss-304l",
      oxidizerLinerMaterialKey: "ss-304l",
      structuralMaterialKey: "al-2219",
      processKey: "sheet-weld",
      pressurization: "helium",
      insulationKgM2: 1.6
    },
    engine: {
      cycleKey: "gas-generator",
      engineCount: 1,
      clusterArchitecture: "independent",
      perEngineFixedMassKg: 35,
      perEngineFixedCostCny: 180000,
      nozzleClearancePct: 12,
      singleUnitReliabilityPct: 99.7,
      sharedPowerpackReliabilityPct: 99.8,
      allowOneEngineOut: true,
      chamberPressureMpa: 9.0,
      expansionRatio: 24,
      autoExpansion: true,
      coolingKey: "regenerative",
      throttlePct: 100,
      pumpEfficiencyPct: 72,
      turbineEfficiencyPct: 62,
      batteryKey: "secondary-li-ion",
      batteryReservePct: 20,
      batteryEfficiencyPct: 92,
      customBatteryEnergyDensityWhKg: 300,
      customBatteryPowerDensityWKg: 1000,
      customBatteryPackOverheadPct: 20,
      customBatteryCostCnyKg: 1000,
      lineDropPct: 8,
      injectorDropPct: 20,
      mixtureRatioOverride: 0,
      pumpMaterialKey: "inconel-718",
      chamberMaterialKey: "grcop-42",
      nozzleMaterialKey: "inconel-718",
      pumpProcessKey: "machined",
      hotProcessKey: "additive"
    },
    airframe: {
      materialKey: "al-7075",
      processKey: "sheet-weld"
    },
    cost: {
      tankPriceCnyKg: 62,
      pumpPriceCnyKg: 230,
      hotPriceCnyKg: 390,
      airframePriceCnyKg: 45,
      fuelPriceCnyKg: 8,
      oxidizerPriceCnyKg: 1.8,
      assemblyFactor: 1.18,
      priceScale: 1.0
    },
    test: {
      durationS: 22,
      environment: "sea",
      bodyKey: "earth",
      previewAtmosphere: false,
      energyCutoffMode: "apogee",
      energyCoastPercent: 10
    }
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function createDefaultSerialStage(stageNumber) {
    const stage = {
      id: `stage-${stageNumber}`,
      name: `第${stageNumber}级`,
      enabled: true,
      sizingMode: "mass",
      propellantMassKg: stageNumber === 2 ? 6200 : 1800,
      targetDeltaV: stageNumber === 2 ? 3000 : 1800,
      targetThrustKn: stageNumber === 2 ? 165 : 42,
      burnTimeS: stageNumber === 2 ? 245 : 180,
      structuralFactor: stageNumber === 2 ? 0.062 : 0.075,
      avionicsKg: stageNumber === 2 ? 48 : 28,
      propellantKey: stageNumber === 2 ? "lox-lh2" : "nto-mmh",
      customPropellant: clone(defaultConfig.customPropellant),
      tanks: clone(defaultConfig.tanks),
      engine: clone(defaultConfig.engine),
      airframe: clone(defaultConfig.airframe),
      separation: {
        mode: stageNumber === 2 ? "ullage-solid" : "mechanical",
        ignitionDelayS: stageNumber === 2 ? 0.6 : 1.0,
        reliabilityPct: stageNumber === 2 ? 99.6 : 99.75
      }
    };
    stage.tanks.diameterMode = "locked";
    stage.tanks.diameterM = stageNumber === 2 ? 1.85 : 1.25;
    stage.tanks.targetAspect = stageNumber === 2 ? 5.4 : 4.8;
    stage.tanks.pressureMpa = stageNumber === 2 ? 0.32 : 0.85;
    stage.tanks.materialKey = stageNumber === 2 ? "al-2219" : "ti-6al-4v";
    stage.tanks.structuralMaterialKey = stage.tanks.materialKey;
    stage.tanks.pressurization = stageNumber === 2 ? "autogenous" : "helium";
    stage.engine.cycleKey = stageNumber === 2 ? "expander" : "pressure-fed";
    stage.engine.engineCount = 1;
    stage.engine.chamberPressureMpa = stageNumber === 2 ? 6.0 : 0.55;
    stage.engine.expansionRatio = stageNumber === 2 ? 72 : 20;
    stage.engine.autoExpansion = false;
    stage.engine.clusterArchitecture = "independent";
    return stage;
  }

  defaultConfig.stages = [createDefaultSerialStage(2), createDefaultSerialStage(3)];

  function mergePreset(target, patch) {
    Object.keys(patch || {}).forEach(function (key) {
      const value = patch[key];
      if (value && typeof value === "object" && !Array.isArray(value) && target[key] && typeof target[key] === "object" && !Array.isArray(target[key])) {
        mergePreset(target[key], value);
      } else {
        target[key] = clone(value);
      }
    });
    return target;
  }

  function historicalStage(stageNumber, patch) {
    return mergePreset(createDefaultSerialStage(stageNumber), patch);
  }

  function historicalConfig(patch) {
    const config = clone(defaultConfig);
    config.autoName = false;
    config.stages = [];
    config.boosters.enabled = false;
    config.sizingMode = "mass";
    config.sizing.massInputKind = "mass";
    config.tanks.diameterMode = "locked";
    config.engine.autoExpansion = false;
    config.test.bodyKey = "earth";
    config.test.environment = "sea";
    config.test.previewAtmosphere = false;
    return mergePreset(config, patch);
  }

  const ethanolLoxPropellant = mergePreset(clone(defaultConfig.customPropellant), {
    name: "液氧 / 乙醇水溶液（历史近似）",
    shortName: "LOX/乙醇",
    fuelName: "乙醇水溶液",
    oxidizerName: "液氧",
    fuelPriceCnyKg: 4.5,
    oxidizerPriceCnyKg: 1.8,
    specificEnergyMjKg: 8.0,
    fuelDensity: 850,
    oxidizerDensity: 1141,
    fuelTemperatureK: 293,
    oxidizerTemperatureK: 90,
    mixtureRatio: 1.35,
    cStar: 1450,
    gamma: 1.22,
    chamberTemperatureK: 2700,
    ispSea: 205,
    ispVac: 235,
    fuelVaporPressureKpa: 6,
    oxidizerVaporPressureKpa: 101,
    storability: "燃料常温、液氧低温",
    toxicity: "中",
    corrosivity: "低",
    flags: ["cryogenic", "historical"],
    note: "用于 V-2/A-4 的教学复刻；不包含历史配方比例与制造信息。"
  });

  const historicalRocketPresets = {
    "v2-a4": {
      name: "V-2 / A-4",
      year: 1942,
      country: "德国",
      role: "早期弹道火箭",
      reference: { heightM: 14.0, diameterM: 1.65, liftoffMassKg: 13150, thrustKn: 270, propellantMassKg: 8600, stages: 1 },
      sourceLabel: "NASA · Wernher von Braun / V-2 历史资料",
      sourceUrl: "https://www.nasa.gov/people/wernher-von-braun/",
      fidelity: "外形、起飞质量、单发动机和液氧/乙醇体系按历史量级复刻；室压、比冲、干重与接液/热端材料使用教学代表值。",
      config: historicalConfig({
        name: "历史复刻 · V-2 / A-4",
        propellantKey: "custom",
        customPropellant: ethanolLoxPropellant,
        sizing: { propellantMassKg: 8600 },
        vehicle: { payloadKg: 1000, avionicsKg: 120, structuralFactor: 0.12, targetTwr: 2.08, maxAccelG: 8 },
        tanks: { diameterM: 1.65, pressureMpa: 0.18, targetAspect: 5.3, materialKey: "ss-304l", structuralMaterialKey: "ss-304l", processKey: "sheet-weld" },
        engine: { cycleKey: "gas-generator", engineCount: 1, clusterArchitecture: "independent", chamberPressureMpa: 1.5, expansionRatio: 4.5, coolingKey: "regenerative", pumpMaterialKey: "ss-304l", chamberMaterialKey: "ss-304l", nozzleMaterialKey: "ss-304l" },
        airframe: { materialKey: "steel-4130", processKey: "sheet-weld" },
        cost: { fuelPriceCnyKg: 4.5, oxidizerPriceCnyKg: 1.8 }
      })
    },
    "mercury-redstone": {
      name: "水星-红石",
      year: 1961,
      country: "美国",
      role: "载人亚轨道运载器",
      reference: { heightM: 25.3, diameterM: 1.80, liftoffMassKg: 29930, thrustKn: 347, propellantMassKg: 20700, stages: 1 },
      sourceLabel: "NASA · Mercury-Redstone Launch Vehicle",
      sourceUrl: "https://www.nasa.gov/history/mercury-redstone-launch-vehicle/",
      fidelity: "按 NASA 页面 78,000 lbf、143.5 s、65,987 lb 和 5.9 ft 口径设置；推进剂采用该页面的 LOX/RP-1 口径。",
      config: historicalConfig({
        name: "历史复刻 · 水星-红石",
        propellantKey: "lox-rp1",
        sizing: { propellantMassKg: 20700 },
        vehicle: { payloadKg: 1814, avionicsKg: 180, structuralFactor: 0.09, targetTwr: 1.18, maxAccelG: 6.5 },
        tanks: { diameterM: 1.80, pressureMpa: 0.24, targetAspect: 7.0, materialKey: "al-2219", structuralMaterialKey: "al-2219", processKey: "sheet-weld" },
        engine: { cycleKey: "gas-generator", engineCount: 1, chamberPressureMpa: 2.5, expansionRatio: 10, coolingKey: "regenerative" },
        airframe: { materialKey: "al-7075", processKey: "sheet-weld" },
        cost: { fuelPriceCnyKg: 12, oxidizerPriceCnyKg: 1.8 }
      })
    },
    "titan-ii-glv": {
      name: "泰坦 II GLV",
      year: 1965,
      country: "美国",
      role: "双级载人轨道运载器",
      reference: { heightM: 33.2, diameterM: 3.05, liftoffMassKg: 154220, thrustKn: 1913, propellantMassKg: 131000, stages: 2 },
      sourceLabel: "NASA · Gemini Launch Vehicle 新闻资料",
      sourceUrl: "https://ntrs.nasa.gov/api/citations/19760066765/downloads/19760066765.pdf",
      fidelity: "两级尺寸、一级双发动机 430,000 lbf、二级单发动机 100,000 lbf 按 NASA 资料；Aerozine-50 以 NTO/UDMH 预设近似。",
      config: historicalConfig({
        name: "历史复刻 · 泰坦 II GLV",
        propellantKey: "nto-udmh",
        sizing: { propellantMassKg: 106000 },
        vehicle: { payloadKg: 3600, avionicsKg: 420, structuralFactor: 0.075, targetTwr: 1.27, maxAccelG: 7 },
        tanks: { diameterM: 3.05, pressureMpa: 0.34, targetAspect: 5.7, materialKey: "al-2219", structuralMaterialKey: "al-2219" },
        engine: { cycleKey: "gas-generator", engineCount: 2, clusterArchitecture: "independent", chamberPressureMpa: 5.5, expansionRatio: 8, coolingKey: "regenerative" },
        stages: [historicalStage(2, {
          name: "泰坦 II 第二级", propellantKey: "nto-udmh", propellantMassKg: 25000, targetThrustKn: 445, structuralFactor: 0.085, avionicsKg: 210,
          tanks: { diameterMode: "locked", diameterM: 3.05, pressureMpa: 0.36, materialKey: "al-2219", structuralMaterialKey: "al-2219" },
          engine: { cycleKey: "gas-generator", engineCount: 1, clusterArchitecture: "independent", chamberPressureMpa: 5.7, expansionRatio: 25, autoExpansion: false },
          separation: { mode: "mechanical", ignitionDelayS: 0.8, reliabilityPct: 99.5 }
        })]
      })
    },
    "saturn-ib": {
      name: "土星 IB",
      year: 1966,
      country: "美国",
      role: "双级载人近地轨道运载器",
      reference: { heightM: 68.3, diameterM: 6.61, liftoffMassKg: 590000, thrustKn: 7117, propellantMassKg: 504000, stages: 2 },
      sourceLabel: "NASA · Apollo Program Summary Report",
      sourceUrl: "https://www.nasa.gov/wp-content/uploads/static/history/alsj/apsr-jsc-09423.pdf",
      fidelity: "一级八台 H-1、二级单台 J-2、LOX/RP-1 与 LOX/LH2 组合按历史构型设置；各级干重由当前结构模型重算。",
      config: historicalConfig({
        name: "历史复刻 · 土星 IB",
        propellantKey: "lox-rp1",
        sizing: { propellantMassKg: 400000 },
        vehicle: { payloadKg: 18500, avionicsKg: 1200, structuralFactor: 0.055, targetTwr: 1.23, maxAccelG: 5 },
        tanks: { diameterM: 6.61, pressureMpa: 0.30, targetAspect: 4.6, materialKey: "al-2219", structuralMaterialKey: "al-2219" },
        engine: { cycleKey: "gas-generator", engineCount: 8, clusterArchitecture: "independent", chamberPressureMpa: 4.1, expansionRatio: 8, coolingKey: "regenerative" },
        stages: [historicalStage(2, {
          name: "S-IVB 第二级", propellantKey: "lox-lh2", propellantMassKg: 104000, targetThrustKn: 1001, structuralFactor: 0.068, avionicsKg: 560,
          tanks: { geometryMode: "common-bulkhead", commonBulkheadType: "honeycomb", diameterMode: "locked", diameterM: 6.61, pressureMpa: 0.28, materialKey: "al-2219", structuralMaterialKey: "al-2219", pressurization: "autogenous" },
          engine: { cycleKey: "gas-generator", engineCount: 1, chamberPressureMpa: 5.3, expansionRatio: 27.5, autoExpansion: false },
          separation: { mode: "ullage-solid", ignitionDelayS: 0.7, reliabilityPct: 99.6 }
        })]
      })
    },
    "saturn-v": {
      name: "土星 V",
      year: 1967,
      country: "美国",
      role: "三级载人登月运载器",
      reference: { heightM: 111.0, diameterM: 10.06, liftoffMassKg: 2800000, thrustKn: 34500, propellantMassKg: 2584500, stages: 3 },
      sourceLabel: "NASA · Saturn V Flight Manual / Apollo News Reference",
      sourceUrl: "https://www.nasa.gov/wp-content/uploads/static/history/afj/ap12fj/pdf/a12_sa507-flightmanual.pdf",
      fidelity: "S-IC 五台 F-1、S-II 五台 J-2、S-IVB 单台 J-2 及约 150/390/525 s 动力段按 NASA 资料量级设置；不复刻姿态小发动机。",
      config: historicalConfig({
        name: "历史复刻 · 土星 V",
        propellantKey: "lox-rp1",
        sizing: { propellantMassKg: 2038000 },
        vehicle: { payloadKg: 45000, avionicsKg: 2200, structuralFactor: 0.042, targetTwr: 1.25, maxAccelG: 4.5, maxQKpa: 35 },
        tanks: { diameterM: 10.06, pressureMpa: 0.30, targetAspect: 4.2, materialKey: "al-2219", structuralMaterialKey: "al-2219" },
        engine: { cycleKey: "gas-generator", engineCount: 5, clusterArchitecture: "independent", chamberPressureMpa: 7.0, expansionRatio: 16, coolingKey: "regenerative", perEngineFixedMassKg: 850 },
        stages: [
          historicalStage(2, {
            name: "S-II 第二级", propellantKey: "lox-lh2", propellantMassKg: 442200, targetThrustKn: 5132, structuralFactor: 0.047, avionicsKg: 1500,
            tanks: { geometryMode: "common-bulkhead", commonBulkheadType: "honeycomb", diameterMode: "locked", diameterM: 10.06, pressureMpa: 0.27, materialKey: "al-2219", structuralMaterialKey: "al-2219", pressurization: "autogenous" },
            engine: { cycleKey: "gas-generator", engineCount: 5, clusterArchitecture: "independent", chamberPressureMpa: 5.3, expansionRatio: 27.5, autoExpansion: false },
            separation: { mode: "ullage-solid", ignitionDelayS: 0.7, reliabilityPct: 99.7 }
          }),
          historicalStage(3, {
            name: "S-IVB 第三级", propellantKey: "lox-lh2", propellantMassKg: 104300, targetThrustKn: 926, structuralFactor: 0.072, avionicsKg: 620,
            tanks: { geometryMode: "common-bulkhead", commonBulkheadType: "honeycomb", diameterMode: "locked", diameterM: 6.61, pressureMpa: 0.28, materialKey: "al-2219", structuralMaterialKey: "al-2219", pressurization: "autogenous" },
            engine: { cycleKey: "gas-generator", engineCount: 1, clusterArchitecture: "independent", chamberPressureMpa: 5.3, expansionRatio: 27.5, autoExpansion: false },
            separation: { mode: "mechanical", ignitionDelayS: 1.0, reliabilityPct: 99.8 }
          })
        ]
      })
    },
    "soyuz-fregat": {
      name: "联盟号-Fregat",
      year: 2000,
      country: "苏联/俄罗斯",
      role: "四助推器并联、多级轨道运载器",
      reference: { heightM: 43.5, diameterM: 10.3, liftoffMassKg: 304000, thrustKn: 5961, propellantMassKg: 279500, stages: 4 },
      sourceLabel: "ESA · Soyuz / Fregat Launch Vehicle",
      sourceUrl: "https://sci.esa.int/web/cluster/1983-launch-vehicle",
      fidelity: "四枚侧助推器与芯级同时点火，芯级、三级均用 LOX/煤油，Fregat 用 NTO/UDMH；多室发动机以单动力包多喷管近似。",
      config: historicalConfig({
        name: "历史复刻 · 联盟号-Fregat",
        propellantKey: "lox-rp1",
        sizing: { propellantMassKg: 92000 },
        vehicle: { payloadKg: 6000, avionicsKg: 620, structuralFactor: 0.065, targetTwr: 0.68, maxAccelG: 4.5 },
        tanks: { diameterM: 2.95, pressureMpa: 0.30, targetAspect: 6.2, materialKey: "al-2219", structuralMaterialKey: "al-2219" },
        engine: { cycleKey: "gas-generator", engineCount: 8, clusterArchitecture: "ideal-multi-chamber", chamberPressureMpa: 5.1, expansionRatio: 12, coolingKey: "regenerative", perEngineFixedMassKg: 12 },
        boosters: { enabled: true, count: 4, sizingMode: "fixed", propellantMassKg: 39500, propellantMode: "custom", propellantKey: "lox-rp1", diameterMode: "custom", diameterM: 2.68, engineMode: "custom", cycleKey: "gas-generator", engineCount: 6, targetThrustKn: 1241, chamberPressureMpa: 5.8, expansionRatio: 10, attachmentMassPct: 1.5, separationDelayS: 0.3, separationReliabilityPct: 99.8, dragFactor: 1.10 },
        stages: [
          historicalStage(2, {
            name: "Block I 第三级", propellantKey: "lox-rp1", propellantMassKg: 25000, targetThrustKn: 298, structuralFactor: 0.075, avionicsKg: 240,
            tanks: { diameterMode: "locked", diameterM: 2.66, pressureMpa: 0.32, materialKey: "al-2219", structuralMaterialKey: "al-2219" },
            engine: { cycleKey: "gas-generator", engineCount: 4, clusterArchitecture: "ideal-multi-chamber", chamberPressureMpa: 6.8, expansionRatio: 18, autoExpansion: false },
            separation: { mode: "hot", ignitionDelayS: 0, reliabilityPct: 99.7 }
          }),
          historicalStage(3, {
            name: "Fregat 上面级", propellantKey: "nto-udmh", propellantMassKg: 5350, targetThrustKn: 19.62, structuralFactor: 0.11, avionicsKg: 180,
            tanks: { diameterMode: "locked", diameterM: 3.35, pressureMpa: 0.65, materialKey: "al-2219", structuralMaterialKey: "al-2219", pressurization: "helium" },
            engine: { cycleKey: "gas-generator", engineCount: 1, clusterArchitecture: "independent", chamberPressureMpa: 8.0, expansionRatio: 80, autoExpansion: false },
            separation: { mode: "mechanical", ignitionDelayS: 1.2, reliabilityPct: 99.8 }
          })
        ]
      })
    },
    "ariane-1": {
      name: "阿丽亚娜 1",
      year: 1979,
      country: "欧洲",
      role: "三级通信卫星运载器",
      reference: { heightM: 47.4, diameterM: 3.8, liftoffMassKg: 210000, thrustKn: 2450, propellantMassKg: 189000, stages: 3 },
      sourceLabel: "ESA · Ariane 1, 2, 3",
      sourceUrl: "https://www.esa.int/Enabling_Support/Space_Transportation/Ariane_1_2_32",
      fidelity: "总体高度、直径、起飞质量和 1.83 t GTO 载荷按 ESA 数据；Viking 级段以 NTO/UDMH、HM7 级段以 LOX/LH2 复刻。",
      config: historicalConfig({
        name: "历史复刻 · 阿丽亚娜 1",
        propellantKey: "nto-udmh",
        sizing: { propellantMassKg: 147000 },
        vehicle: { payloadKg: 1830, avionicsKg: 520, structuralFactor: 0.065, targetTwr: 1.19, maxAccelG: 5 },
        tanks: { diameterM: 3.8, pressureMpa: 0.36, targetAspect: 6.0, materialKey: "al-2219", structuralMaterialKey: "al-2219" },
        engine: { cycleKey: "gas-generator", engineCount: 4, clusterArchitecture: "independent", chamberPressureMpa: 5.5, expansionRatio: 8, coolingKey: "regenerative" },
        stages: [
          historicalStage(2, {
            name: "L-33 第二级", propellantKey: "nto-udmh", propellantMassKg: 34000, targetThrustKn: 720, structuralFactor: 0.08, avionicsKg: 220,
            tanks: { diameterMode: "locked", diameterM: 2.6, pressureMpa: 0.38, materialKey: "al-2219", structuralMaterialKey: "al-2219" },
            engine: { cycleKey: "gas-generator", engineCount: 1, chamberPressureMpa: 5.5, expansionRatio: 18, autoExpansion: false },
            separation: { mode: "mechanical", ignitionDelayS: 0.8, reliabilityPct: 99.6 }
          }),
          historicalStage(3, {
            name: "H-8 第三级", propellantKey: "lox-lh2", propellantMassKg: 8000, targetThrustKn: 60, structuralFactor: 0.10, avionicsKg: 160,
            tanks: { geometryMode: "common-bulkhead", commonBulkheadType: "honeycomb", diameterMode: "locked", diameterM: 2.6, pressureMpa: 0.28, materialKey: "al-2219", structuralMaterialKey: "al-2219", pressurization: "autogenous" },
            engine: { cycleKey: "expander", engineCount: 1, chamberPressureMpa: 3.5, expansionRatio: 45, autoExpansion: false },
            separation: { mode: "mechanical", ignitionDelayS: 1.0, reliabilityPct: 99.7 }
          })
        ]
      })
    }
  };

  const modernRocketPresets = {
    "starship-v3": {
      name: "星舰 V3 (Starship)",
      year: 2024,
      country: "美国",
      role: "超重型完全可复用运载器",
      reference: { heightM: 121.0, diameterM: 18.0, liftoffMassKg: 5000000, thrustKn: 74000, propellantMassKg: 4600000, stages: 2 },
      sourceLabel: "SpaceX · Starship 官方页面",
      sourceUrl: "https://www.spacex.com/vehicles/starship/",
      fidelity: "一级 33 台猛禽 3、二级 6 台猛禽（3 真空+3 海平面）按 SpaceX 已发布参数量级设置；V3 为超重型助推器与星舰组合。",
      config: historicalConfig({
        name: "星舰 V3",
        propellantKey: "lox-methane",
        sizing: { propellantMassKg: 2700000 },
        vehicle: { payloadKg: 100000, avionicsKg: 1200, structuralFactor: 0.035, targetTwr: 1.5, maxAccelG: 5 },
        tanks: { diameterM: 18.0, pressureMpa: 0.75, targetAspect: 2.2, materialKey: "ss-304l", structuralMaterialKey: "ss-304l" },
        engine: { cycleKey: "full-flow", engineCount: 33, clusterArchitecture: "ideal-multi-chamber", chamberPressureMpa: 12.0, expansionRatio: 34, coolingKey: "regenerative" },
        stages: [historicalStage(2, {
          name: "星舰 (Ship)", propellantKey: "lox-methane", propellantMassKg: 800000, targetThrustKn: 15000, structuralFactor: 0.04, avionicsKg: 600,
          tanks: { diameterMode: "locked", diameterM: 18.0, pressureMpa: 0.45, materialKey: "ss-304l", structuralMaterialKey: "ss-304l" },
          engine: { cycleKey: "full-flow", engineCount: 6, chamberPressureMpa: 12.0, expansionRatio: 80, autoExpansion: false },
          separation: { mode: "hot", ignitionDelayS: 0, reliabilityPct: 99.5 }
        })]
      })
    },
    "falcon-9-block-5": {
      name: "猎鹰 9 Block 5 (Falcon 9)",
      year: 2018,
      country: "美国",
      role: "中型两级部分可复用运载器",
      reference: { heightM: 70.0, diameterM: 3.7, liftoffMassKg: 549000, thrustKn: 7607, propellantMassKg: 409000, stages: 2 },
      sourceLabel: "SpaceX · Falcon 9 用户手册",
      sourceUrl: "https://www.spacex.com/media/falcon-9-users-guide.pdf",
      fidelity: "一级 9 台 Merlin 1D、二级单台 Merlin 1D Vac 按 SpaceX 公开手册量级设置。",
      config: historicalConfig({
        name: "猎鹰 9 Block 5",
        propellantKey: "lox-rp1",
        sizing: { propellantMassKg: 395000 },
        vehicle: { payloadKg: 22800, avionicsKg: 400, structuralFactor: 0.04, targetTwr: 1.3, maxAccelG: 5 },
        tanks: { diameterM: 3.7, pressureMpa: 0.35, targetAspect: 7.5, materialKey: "al-2219", structuralMaterialKey: "al-2219" },
        engine: { cycleKey: "gas-generator", engineCount: 9, clusterArchitecture: "independent", chamberPressureMpa: 10.0, expansionRatio: 16, coolingKey: "regenerative", perEngineFixedMassKg: 25 },
        stages: [historicalStage(2, {
          name: "猎鹰 9 第二级", propellantKey: "lox-rp1", propellantMassKg: 90000, targetThrustKn: 981, structuralFactor: 0.05, avionicsKg: 200,
          tanks: { diameterMode: "locked", diameterM: 3.7, pressureMpa: 0.35, materialKey: "al-2219", structuralMaterialKey: "al-2219" },
          engine: { cycleKey: "gas-generator", engineCount: 1, chamberPressureMpa: 10.0, expansionRatio: 40, autoExpansion: false },
          separation: { mode: "mechanical", ignitionDelayS: 0.5, reliabilityPct: 99.8 }
        })]
      })
    },
    "falcon-heavy": {
      name: "猎鹰重型 (Falcon Heavy)",
      year: 2018,
      country: "美国",
      role: "重型两级部分可复用运载器",
      reference: { heightM: 70.0, diameterM: 12.2, liftoffMassKg: 1420000, thrustKn: 22819, propellantMassKg: 1070000, stages: 2 },
      sourceLabel: "SpaceX · Falcon Heavy 官方页面",
      sourceUrl: "https://www.spacex.com/vehicles/falcon-heavy/",
      fidelity: "三核九台 Merlin 1D × 2 侧助推器 + 九台芯级、单台真空第二级；侧推复用着陆暂不计入。",
      config: historicalConfig({
        name: "猎鹰重型",
        propellantKey: "lox-rp1",
        sizing: { propellantMassKg: 400000 },
        vehicle: { payloadKg: 63800, avionicsKg: 600, structuralFactor: 0.035, targetTwr: 1.3, maxAccelG: 4.5 },
        tanks: { diameterM: 3.7, pressureMpa: 0.35, targetAspect: 7.5, materialKey: "al-2219", structuralMaterialKey: "al-2219" },
        engine: { cycleKey: "gas-generator", engineCount: 9, clusterArchitecture: "ideal-multi-chamber", chamberPressureMpa: 10.0, expansionRatio: 16, coolingKey: "regenerative", perEngineFixedMassKg: 25 },
        boosters: { enabled: true, count: 2, sizingMode: "fixed", propellantMassKg: 350000, propellantMode: "custom", propellantKey: "lox-rp1", diameterMode: "custom", diameterM: 3.7, engineMode: "custom", engineCount: 9, cycleKey: "gas-generator", targetThrustKn: 7607, chamberPressureMpa: 10.0, expansionRatio: 16, perEngineFixedMassKg: 25, attachmentMassPct: 1.8, separationDelayS: 0.3, separationReliabilityPct: 99.5, dragFactor: 1.05 },
        stages: [historicalStage(2, {
          name: "猎鹰重型上面级", propellantKey: "lox-rp1", propellantMassKg: 90000, targetThrustKn: 981, structuralFactor: 0.05, avionicsKg: 200,
          tanks: { diameterMode: "locked", diameterM: 3.7, pressureMpa: 0.35, materialKey: "al-2219", structuralMaterialKey: "al-2219" },
          engine: { cycleKey: "gas-generator", engineCount: 1, clusterArchitecture: "independent", chamberPressureMpa: 10.0, expansionRatio: 40, autoExpansion: false },
          separation: { mode: "mechanical", ignitionDelayS: 0.5, reliabilityPct: 99.8 }
        })]
      })
    },
    "new-glenn": {
      name: "新格伦 (New Glenn)",
      year: 2024,
      country: "美国",
      role: "重型两级部分可复用运载器",
      reference: { heightM: 98.0, diameterM: 7.0, liftoffMassKg: 1500000, thrustKn: 17100, propellantMassKg: 1200000, stages: 2 },
      sourceLabel: "Blue Origin · New Glenn 官方页面",
      sourceUrl: "https://www.blueorigin.com/new-glenn",
      fidelity: "一级 7 台 BE-4、二级 2 台 BE-4U 按 Blue Origin 已发布参数量级设置。",
      config: historicalConfig({
        name: "新格伦",
        propellantKey: "lox-methane",
        sizing: { propellantMassKg: 1100000 },
        vehicle: { payloadKg: 45000, avionicsKg: 800, structuralFactor: 0.038, targetTwr: 1.2, maxAccelG: 4.5 },
        tanks: { diameterM: 7.0, pressureMpa: 0.55, targetAspect: 5.5, materialKey: "al-2219", structuralMaterialKey: "al-2219" },
        engine: { cycleKey: "full-flow", engineCount: 7, clusterArchitecture: "independent", chamberPressureMpa: 13.5, expansionRatio: 25, coolingKey: "regenerative" },
        stages: [historicalStage(2, {
          name: "新格伦第二级", propellantKey: "lox-methane", propellantMassKg: 260000, targetThrustKn: 2000, structuralFactor: 0.045, avionicsKg: 400,
          tanks: { diameterMode: "locked", diameterM: 7.0, pressureMpa: 0.28, materialKey: "al-2219", structuralMaterialKey: "al-2219" },
          engine: { cycleKey: "full-flow", engineCount: 2, chamberPressureMpa: 13.5, expansionRatio: 60, autoExpansion: false },
          separation: { mode: "mechanical", ignitionDelayS: 0.6, reliabilityPct: 99.6 }
        })]
      })
    },
    "electron": {
      name: "电子号 (Electron)",
      year: 2017,
      country: "美国/新西兰",
      role: "小型两级轨道运载器",
      reference: { heightM: 18.0, diameterM: 1.2, liftoffMassKg: 12500, thrustKn: 162, propellantMassKg: 9600, stages: 2 },
      sourceLabel: "Rocket Lab · Electron 用户手册",
      sourceUrl: "https://www.rocketlabusa.com/launch/electron/",
      fidelity: "一级 9 台 Rutherford（电泵循环）、二级单台 Rutherford Vac（电泵循环）及碳纤维结构按 Rocket Lab 公开数据量级设置。",
      config: historicalConfig({
        name: "电子号",
        propellantKey: "lox-rp1",
        sizing: { propellantMassKg: 9000 },
        vehicle: { payloadKg: 300, avionicsKg: 60, structuralFactor: 0.065, targetTwr: 1.3, maxAccelG: 10 },
        tanks: { diameterM: 1.2, pressureMpa: 0.65, targetAspect: 8.5, materialKey: "al-2219", structuralMaterialKey: "al-2219", processKey: "sheet-weld" },
        engine: { cycleKey: "gas-generator", engineCount: 9, clusterArchitecture: "ideal-multi-chamber", chamberPressureMpa: 4.5, expansionRatio: 14, coolingKey: "ablative", chamberMaterialKey: "c103", nozzleMaterialKey: "c103" },
        stages: [historicalStage(2, {
          name: "电子号第二级", propellantKey: "lox-rp1", propellantMassKg: 2500, targetThrustKn: 24, structuralFactor: 0.07, avionicsKg: 40,
          tanks: { diameterMode: "locked", diameterM: 1.2, pressureMpa: 0.65, materialKey: "al-2219", structuralMaterialKey: "al-2219", processKey: "sheet-weld" },
          engine: { cycleKey: "gas-generator", engineCount: 1, chamberPressureMpa: 4.5, expansionRatio: 40, autoExpansion: false, coolingKey: "ablative", chamberMaterialKey: "c103", nozzleMaterialKey: "c103" },
          separation: { mode: "mechanical", ignitionDelayS: 0.5, reliabilityPct: 99.5 }
        })]
      })
    },
    "long-march-5": {
      name: "长征五号 (Long March 5)",
      year: 2016,
      country: "中国",
      role: "重型两级半运载器",
      reference: { heightM: 57.0, diameterM: 5.0, liftoffMassKg: 879000, thrustKn: 10560, propellantMassKg: 700000, stages: 2 },
      sourceLabel: "中国航天科技集团 · 长征五号",
      sourceUrl: "https://www.calt.com/",
      fidelity: "芯级 2 台 YF-77（氢氧燃发循环）、四个 2×YF-100 液氧煤油助推器、二级 2 台 YF-75D（膨胀循环）按公开构型设置。",
      config: historicalConfig({
        name: "长征五号",
        propellantKey: "lox-lh2",
        sizing: { propellantMassKg: 180000 },
        vehicle: { payloadKg: 25000, avionicsKg: 500, structuralFactor: 0.055, targetTwr: 1.2, maxAccelG: 5 },
        tanks: { diameterM: 5.0, pressureMpa: 0.38, targetAspect: 5.0, materialKey: "al-2219", structuralMaterialKey: "al-2219", geometryMode: "common-bulkhead", commonBulkheadType: "honeycomb" },
        engine: { cycleKey: "gas-generator", engineCount: 2, clusterArchitecture: "independent", chamberPressureMpa: 12.0, expansionRatio: 25, coolingKey: "regenerative" },
        boosters: { enabled: true, count: 4, sizingMode: "fixed", propellantMassKg: 140000, propellantMode: "custom", propellantKey: "lox-rp1", diameterMode: "custom", diameterM: 3.35, engineMode: "custom", engineCount: 2, cycleKey: "gas-generator", targetThrustKn: 1500, chamberPressureMpa: 13.0, expansionRatio: 10, attachmentMassPct: 1.2, separationDelayS: 0.3, separationReliabilityPct: 99.6, dragFactor: 1.08 },
        stages: [historicalStage(2, {
          name: "长征五号第二级", propellantKey: "lox-lh2", propellantMassKg: 35000, targetThrustKn: 176, structuralFactor: 0.06, avionicsKg: 300,
          tanks: { geometryMode: "common-bulkhead", commonBulkheadType: "honeycomb", diameterMode: "locked", diameterM: 5.0, pressureMpa: 0.28, materialKey: "al-2219", structuralMaterialKey: "al-2219", pressurization: "autogenous" },
          engine: { cycleKey: "expander", engineCount: 2, chamberPressureMpa: 4.5, expansionRatio: 80, autoExpansion: false },
          separation: { mode: "mechanical", ignitionDelayS: 0.8, reliabilityPct: 99.7 }
        })]
      })
    }
  };

  const rocketWisdom = [
    { id: 1, type: "quote", text: "地球是人类的摇篮，但人类不可能永远生活在摇篮里。", attribution: "康斯坦丁·齐奥尔科夫斯基", sourceUrl: "https://www.nasa.gov/history/space-station-20th-historical-origins-of-iss/" },
    { id: 2, type: "quote", text: "从那棵樱桃树下来时，我已不再是爬上去时的那个少年。", attribution: "罗伯特·戈达德", sourceUrl: "https://pwg.gsfc.nasa.gov/stargaze/Sgoddard.htm" },
    { id: 3, type: "quote", text: "我曾想象：若能造出一种哪怕有可能飞向火星的装置，会是多么奇妙。", attribution: "罗伯特·戈达德", sourceUrl: "https://pwg.gsfc.nasa.gov/stargaze/Sgoddard.htm" },
    { id: 4, type: "quote", text: "这是个人的一小步，却是人类的一大步。", attribution: "尼尔·阿姆斯特朗", sourceUrl: "https://www.nasa.gov/history/55-years-ago-apollo-11s-one-small-step-one-giant-leap/" },
    { id: 5, type: "quote", text: "休斯敦，这里是静海基地，鹰已着陆。", attribution: "尼尔·阿姆斯特朗", sourceUrl: "https://www.nasa.gov/history/55-years-ago-apollo-11s-one-small-step-one-giant-leap/" },
    { id: 6, type: "quote", text: "壮丽的荒凉。", attribution: "巴兹·奥尔德林", sourceUrl: "https://www.nasa.gov/history/55-years-ago-apollo-11s-one-small-step-one-giant-leap/" },
    { id: 7, type: "quote", text: "阿波罗的启示是：只要意志足够坚定，国家目标就能够实现。", attribution: "巴兹·奥尔德林", sourceUrl: "https://www.nasa.gov/history/50-years-ago-apollo-11-astronauts-address-congress/" },
    { id: 8, type: "quote", text: "感谢你们让我们有机会代表阿波罗全体成员，为全人类服务。", attribution: "尼尔·阿姆斯特朗", sourceUrl: "https://www.nasa.gov/history/50-years-ago-apollo-11-astronauts-address-congress/" },
    { id: 9, type: "quote", text: "太空中那条极薄的蓝线，就是地球全部的大气；它让脆弱变得一目了然。", attribution: "萨莉·莱德", sourceUrl: "https://science.nasa.gov/people/sally-ride/" },
    { id: 10, type: "quote", text: "保持对科学的兴趣，也认真学好数学与科学。", attribution: "萨莉·莱德", sourceUrl: "https://science.nasa.gov/people/sally-ride/" },
    { id: 11, type: "quote", text: "休斯敦，我们这里出过一个问题。", attribution: "吉姆·洛弗尔，阿波罗 13 号", sourceUrl: "https://www.nasa.gov/news-release/nasa-commemorates-50th-anniversary-of-apollo-13-a-successful-failure/" },
    { id: 12, type: "quote", text: "坚韧而胜任——这是进入任务控制中心的门票。", attribution: "吉恩·克兰兹", sourceUrl: "https://www.nasa.gov/podcasts/houston-we-have-a-podcast/call-sign-white-flight/" },
    { id: 13, type: "quote", text: "晚睡、早起、拼命工作，还要让世界知道。", attribution: "沃纳·冯·布劳恩", sourceUrl: "https://ecolloq.gsfc.nasa.gov/archive/2006-Spring/announce.buckbee.html" },
    { id: 14, type: "quote", text: "我们为全人类和平而来。", attribution: "阿波罗 11 号月面铭牌", sourceUrl: "https://www.nasa.gov/wp-content/uploads/static/history/alsj/a11/a11ov.html" },
    { id: 15, type: "meme", text: "推重比小于 1 的火箭不叫运载器，叫带喷火功能的地面景观。", attribution: "Rocket SIM 工程部" },
    { id: 16, type: "meme", text: "火箭方程的潜台词：每多带一公斤，就要给这一公斤以及它的燃料一起买票。", attribution: "Rocket SIM 工程部" },
    { id: 17, type: "meme", text: "载荷提出再加一台相机，结构组听见的是再加一串推进剂。", attribution: "Rocket SIM 工程部" },
    { id: 18, type: "meme", text: "干质比每降低一点，工程师的黑眼圈就增加一点。", attribution: "Rocket SIM 工程部" },
    { id: 19, type: "meme", text: "质量预算不会消失，它只会从“余量”转移到“为什么又超重”。", attribution: "Rocket SIM 工程部" },
    { id: 20, type: "meme", text: "泵说自己只负责加压，电池、涡轮和材料组同时笑出了声。", attribution: "Rocket SIM 工程部" },
    { id: 21, type: "meme", text: "NPSH 裕度不足时，泵不会与你争论，它会用汽蚀发表意见。", attribution: "Rocket SIM 工程部" },
    { id: 22, type: "meme", text: "提高室压很容易：先把所有下游部件的难度旋钮一起拧高。", attribution: "Rocket SIM 工程部" },
    { id: 23, type: "meme", text: "喷管膨胀比选得太大，海平面会亲自提醒你什么叫流动分离。", attribution: "Rocket SIM 工程部" },
    { id: 24, type: "meme", text: "Max Q：火箭速度还没到最大，空气已经先表达了最大意见。", attribution: "Rocket SIM 工程部" },
    { id: 25, type: "meme", text: "节流不是认输，是和大气、结构与任务经理进行三方谈判。", attribution: "Rocket SIM 工程部" },
    { id: 26, type: "meme", text: "“只改一个参数”是火箭工程里最有想象力的一句话。", attribution: "Rocket SIM 工程部" },
    { id: 27, type: "meme", text: "安全系数的作用，是给现实世界保留拒绝理想公式的权利。", attribution: "Rocket SIM 工程部" },
    { id: 28, type: "meme", text: "80% 利用率不是浪费，剩下的 20% 叫“希望今天也按模型来”。", attribution: "Rocket SIM 工程部" },
    { id: 29, type: "meme", text: "低温推进剂的爱好：收缩、沸腾，并考验每一条密封。", attribution: "Rocket SIM 工程部" },
    { id: 30, type: "meme", text: "材料表上的最高工作温度，通常不是邀请你长期住在那里。", attribution: "Rocket SIM 工程部" },
    { id: 31, type: "meme", text: "碳纤维很轻；连接、衬里、检验和工程会议会努力补回来。", attribution: "Rocket SIM 工程部" },
    { id: 32, type: "meme", text: "电泵省掉了涡轮热端，然后电池带着质量账单从门外进来了。", attribution: "Rocket SIM 工程部" },
    { id: 33, type: "meme", text: "挤压供给没有泵，但储箱会替泵承担压力与体重。", attribution: "Rocket SIM 工程部" },
    { id: 34, type: "meme", text: "燃气发生器循环：牺牲一点推进剂，换取一台比较讲道理的泵。", attribution: "Rocket SIM 工程部" },
    { id: 35, type: "meme", text: "膨胀循环相信热量会工作，直到发动机尺度告诉它热量今天不够。", attribution: "Rocket SIM 工程部" },
    { id: 36, type: "meme", text: "分级燃烧把废气也送进主室：性能很好，管路图开始长出第二张纸。", attribution: "Rocket SIM 工程部" },
    { id: 37, type: "meme", text: "全流量分级燃烧：既然复杂度已经很高，不如让两边都转起来。", attribution: "Rocket SIM 工程部" },
    { id: 38, type: "meme", text: "再生冷却的浪漫：燃料在燃烧前，先救一次发动机。", attribution: "Rocket SIM 工程部" },
    { id: 39, type: "meme", text: "烧蚀冷却的工作哲学：我不是坏了，我是在按计划减少。", attribution: "Rocket SIM 工程部" },
    { id: 40, type: "meme", text: "辐射冷却：只要足够热，宇宙也会帮忙带走一点。", attribution: "Rocket SIM 工程部" },
    { id: 41, type: "meme", text: "倒计时最后十秒很短，前面的设计评审却足够长。", attribution: "Rocket SIM 工程部" },
    { id: 42, type: "meme", text: "地面试车成功：发动机没去任何地方，但数据去了很多会议。", attribution: "Rocket SIM 工程部" },
    { id: 43, type: "meme", text: "遥测的意义：让火箭在出问题时至少说清楚自己为什么不高兴。", attribution: "Rocket SIM 工程部" },
    { id: 44, type: "meme", text: "单位换算是最安静的推进系统，也是最突然的故障模式。", attribution: "Rocket SIM 工程部" },
    { id: 45, type: "meme", text: "模拟器里每次爆炸都免费；现实里连“不爆炸”也很贵。", attribution: "Rocket SIM 工程部" },
    { id: 46, type: "meme", text: "大气越浓，喷管越像在拥挤的电梯里练习伸展。", attribution: "Rocket SIM 工程部" },
    { id: 47, type: "meme", text: "真空里听不见轰鸣，但工程师仍能听见预算燃烧的声音。", attribution: "Rocket SIM 工程部" },
    { id: 48, type: "meme", text: "增加发动机数量可以提高推力，也可以增加需要同时正常工作的东西。", attribution: "Rocket SIM 工程部" },
    { id: 49, type: "meme", text: "进入轨道不是飞得够高，而是横着掉得足够快。", attribution: "Rocket SIM 工程部" },
    { id: 50, type: "meme", text: "最好的试车结果不是“没有异常”，而是异常都比点火更早被发现。", attribution: "Rocket SIM 工程部" }
  ];

  const sources = [
    { label: "NASA SP-125 液体火箭发动机设计", url: "https://ntrs.nasa.gov/archive/nasa/casi.ntrs.nasa.gov/19710019929.pdf" },
    { label: "NASA COPV 入门（NASA/SP-2011-573）", url: "https://ntrs.nasa.gov/archive/nasa/casi.ntrs.nasa.gov/20110008406.pdf" },
    { label: "NASA 发射器结构材料与储箱路线", url: "https://ntrs.nasa.gov/api/citations/20170001809/downloads/20170001809.pdf?attachment=true" },
    { label: "NASA SP-8007 Rev.2 薄壁圆筒屈曲", url: "https://ntrs.nasa.gov/citations/20205011530" },
    { label: "NASA Saturn S-II 共底与关键制造工艺", url: "https://ntrs.nasa.gov/api/citations/19720013818/downloads/19720013818.pdf" },
    { label: "NASA SP-8088 液体推进剂储箱设计准则 · 共底双向压差、屈曲与接头", url: "https://ntrs.nasa.gov/api/citations/19750004950/downloads/19750004950.pdf" },
    { label: "NASA Ares I 共底制造 · 旋压面板、Y 环、FSW 与蜂窝芯", url: "https://ntrs.nasa.gov/api/citations/20080037300/downloads/20080037300.pdf?attachment=true" },
    { label: "NASA Ares I 共底无损检测 · 粘接、蜂窝芯与脱粘缺陷", url: "https://ntrs.nasa.gov/archive/nasa/casi.ntrs.nasa.gov/20100017376.pdf" },
    { label: "NASA Centaur 压力稳定气球储箱历史", url: "https://www.nasa.gov/history/centaur-americas-workhorse-in-space/" },
    { label: "NASA 整体加筋/流动成形筒段研究", url: "https://ntrs.nasa.gov/citations/20205006777" },
    { label: "NASA Glenn 推力方程", url: "https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/thrust-force/" },
    { label: "NASA Glenn 理想火箭方程", url: "https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/ideal-rocket-equation/" },
    { label: "NIST 低温流体性质入口", url: "https://trc.nist.gov/cryogenics/fluidProperties.html" },
    { label: "NASA Mars 环境与飞行入门", url: "https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/mars/" },
    { label: "NASA 月球事实页", url: "https://science.nasa.gov/moon/facts/" },
    { label: "NASA 水星事实页", url: "https://science.nasa.gov/mercury/facts/" },
    { label: "NASA 金星事实页", url: "https://science.nasa.gov/venus/venus-facts/" },
    { label: "NASA 土卫六事实页", url: "https://science.nasa.gov/saturn/moons/titan/facts/" },
    { label: "NASA 木卫二事实页", url: "https://science.nasa.gov/jupiter/jupiter-moons/europa/europa-facts/" },
    { label: "NASA 谷神星事实页", url: "https://science.nasa.gov/dwarf-planets/ceres/facts/" },
    { label: "NASA Ares I 级间分离、沉底与反推电机", url: "https://ntrs.nasa.gov/api/citations/20120016802/downloads/20120016802.pdf" },
    { label: "NASA 热分离羽流与级间瞬态研究", url: "https://www.nas.nasa.gov/SC24/research/project24.php" },
    { label: "NASA 水星-红石运载器历史参数", url: "https://www.nasa.gov/history/mercury-redstone-launch-vehicle/" },
    { label: "NASA 土星 V Flight Manual", url: "https://www.nasa.gov/wp-content/uploads/static/history/afj/ap12fj/pdf/a12_sa507-flightmanual.pdf" },
    { label: "NASA Apollo Program Summary · 土星 IB", url: "https://www.nasa.gov/wp-content/uploads/static/history/alsj/apsr-jsc-09423.pdf" },
    { label: "NASA Gemini Launch Vehicle · 泰坦 II", url: "https://ntrs.nasa.gov/api/citations/19760066765/downloads/19760066765.pdf" },
    { label: "ESA Soyuz / Fregat 运载器参数", url: "https://sci.esa.int/web/cluster/1983-launch-vehicle" },
    { label: "ESA Ariane 1/2/3 历史参数", url: "https://www.esa.int/Enabling_Support/Space_Transportation/Ariane_1_2_32" },
    { label: "NASA V-2 / Wernher von Braun 历史页", url: "https://www.nasa.gov/people/wernher-von-braun/" }
  ];

  return { schemaVersion, celestialBodies, flamePalettes, propellants, materials, processes, cycles, batteries, cooling, stageSeparationModes, createDefaultSerialStage, defaultConfig, historicalRocketPresets, modernRocketPresets, rocketWisdom, sources };
});
