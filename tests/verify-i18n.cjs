"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const storage = new Map();
global.localStorage = {
  getItem(key) { return storage.has(key) ? storage.get(key) : null; },
  setItem(key, value) { storage.set(key, String(value)); }
};

const I18n = require("../locales/i18n.js");
const zh = require("../locales/zh-CN.js");
const classical = require("../locales/zh-Hans-x-classical.js");
const en = require("../locales/en-US.js");
const Data = require("../js/data.js");

function flattenKeys(value, prefix, output) {
  Object.keys(value || {}).forEach((key) => {
    const next = prefix ? `${prefix}.${key}` : key;
    if (value[key] && typeof value[key] === "object" && !Array.isArray(value[key])) flattenKeys(value[key], next, output);
    else output.push(next);
  });
  return output;
}

function placeholders(value) {
  return [...String(value).matchAll(/\{([^}]+)\}/g)].map((match) => match[1]).sort();
}

assert.deepEqual(flattenKeys(en.messages, "", []).sort(), flattenKeys(zh.messages, "", []).sort(), "zh-CN and en-US dynamic message keys must match");
assert.deepEqual(flattenKeys(classical.messages, "", []).sort(), flattenKeys(zh.messages, "", []).sort(), "Classical Chinese and zh-CN dynamic message keys must match");
flattenKeys(zh.messages, "", []).forEach((key) => {
  const read = (catalog) => key.split(".").reduce((value, part) => value && value[part], catalog.messages);
  assert.deepEqual(placeholders(read(zh)), placeholders(read(en)), `message placeholders must match for ${key}`);
  assert.deepEqual(placeholders(read(zh)), placeholders(read(classical)), `Classical Chinese placeholders must match for ${key}`);
});
assert.ok(en.staticText["设计向导"], "English static UI catalog should translate the design wizard");
assert.ok(en.entities.celestialBodies.earth && en.entities.propellants["lox-methane"], "English catalog should cover primary engineering entities");

I18n.setLocale("zh-CN");
I18n.applyData(Data);
const chineseEarth = Data.celestialBodies.earth.name;
assert.equal(chineseEarth, "地球");
assert.equal(I18n.speechNumber(10), "十");

I18n.setLocale("en-US");
I18n.applyData(Data);
assert.equal(I18n.getLocale(), "en-US");
assert.equal(Data.celestialBodies.earth.name, "Earth");
assert.equal(Data.propellants["lox-methane"].shortName, "LOX/Methane");
assert.equal(Data.cycles["gas-generator"].name, "Gas-generator");
assert.equal(I18n.speechNumber(10), "ten");
assert.equal(I18n.speechLang(), "en-US");
assert.equal(storage.get(I18n.STORAGE_KEY), "en-US");
assert.equal(I18n.t("locale.changed"), "Interface language changed to English.");
assert.equal(I18n.translateText("计算失败"), "Calculation failed");
assert.equal(I18n.translateText("全流量分级燃烧循环"), "full-flow staged-combustion cycle", "longer phrases must be translated before their substrings");
[
  "发射时序与沉浸模式",
  "启用发射倒计时",
  "沉浸发射",
  "熄火后 1 秒自动暂停",
  "推力爬升时间",
  "声音混音与自动调节",
  "当前加速度 0.00 g · 最大净加速度 3.53 g",
  "注意：发动机失效",
  "简化任务成功率为 98.608%。",
  "锁定直径使封头过于扁平，当前仅保持体积守恒。",
  "损失一台发动机后推重比为 0.52，不足以保留 1.05 的继续上升裕度。",
  "提高集群总推力、降低起飞质量，或把任务可靠性按任一发动机失效即任务失败计算。",
  "燃料与氧化剂储箱",
  "采购、净化、储运与加注参考",
  "板材成形＋焊接"
].forEach((source) => {
  assert.ok(!/[\u3400-\u9fff]/.test(I18n.translateText(source)), `English UI text must not mix Chinese: ${source}`);
});
assert.equal(Data.rocketWisdom[13].text, "We came in peace for all mankind.");

I18n.setLocale("zh-Hans-x-classical");
I18n.applyData(Data);
assert.equal(I18n.getLocale(), "zh-Hans-x-classical");
assert.equal(storage.get(I18n.STORAGE_KEY), "zh-Hans-x-classical");
assert.equal(classical.htmlLang, "zh-Hans-x-classical");
assert.equal(I18n.translateText("保存方案"), "存此案");
assert.equal(I18n.translateText("恢复默认火箭"), "复归初制");
assert.equal(I18n.t("locale.changed"), "文辞已易为华夏古文。");
assert.equal(I18n.speechNumber(10), "十");
assert.equal(I18n.speechLang(), "zh-CN");
assert.equal(Data.cycles["full-flow"].complexity, "至繁");
assert.equal(Data.rocketWisdom[13].text, "吾等为天下万民之和平而至。");
assert.equal(I18n.translateText("发动机集群与推进剂储箱"), "推进机群与行空剂贮剂舱");
assert.equal(I18n.translateText("最大动压与当前加速度"), "最大疾风压与今之速变");
assert.equal(I18n.translateText("点火试车"), "举火验机");
assert.equal(I18n.translateText("直飞演示"), "冲霄拟演");
assert.equal(I18n.translateText("校核告警"), "验算戒示");
assert.equal(I18n.translateText("部件快照"), "诸器一览");
assert.equal(I18n.translateText("注意"), "戒曰");
assert.equal(I18n.t("brand.eyebrow"), "御液驾火之术");
assert.equal(I18n.t("brand.title"), "腾天之法");

const Core = require("../js/core.js");
const classicalConfig = Core.normalizeConfig({ autoName: true, stages: [], boosters: { enabled: false } });
const classicalDesign = Core.calculateDesign(classicalConfig);
assert.ok(/火箭$/.test(classicalDesign.config.name), "Classical Chinese automatic names should retain the technical rocket noun");
I18n.setLocale("en-US");
I18n.applyData(Data);
const englishConfig = Core.normalizeConfig({ autoName: true, stages: [], boosters: { enabled: false } });
const englishDesign = Core.calculateDesign(englishConfig);
assert.ok(!/[\u3400-\u9fff]/.test(englishDesign.config.name), "automatic English design names must not contain Chinese");
const englishMetrics = {
  wetMassKg: englishDesign.masses.wetMassKg,
  thrustN: englishDesign.performance.totalThrustN,
  idealDeltaV: englishDesign.performance.idealDeltaV
};

I18n.setLocale("zh-CN");
I18n.applyData(Data);
const chineseDesign = Core.calculateDesign(Object.assign({}, englishConfig, { name: "手动名称", autoName: false }));
assert.equal(Data.celestialBodies.earth.name, "地球", "switching back must restore source data");
assert.equal(chineseDesign.config.name, "手动名称", "manual design names must be preserved");
assert.ok(Math.abs(chineseDesign.masses.wetMassKg - englishMetrics.wetMassKg) < 1e-6, "locale must not change wet mass");
assert.ok(Math.abs(chineseDesign.performance.totalThrustN - englishMetrics.thrustN) < 1e-6, "locale must not change thrust");
assert.ok(Math.abs(chineseDesign.performance.idealDeltaV - englishMetrics.idealDeltaV) < 1e-6, "locale must not change ideal delta-v");
const serialized = JSON.parse(Core.serializeConfig(chineseDesign.config));
assert.equal(Object.prototype.hasOwnProperty.call(serialized, "locale"), false, "locale must not enter the exported schema");
assert.equal(Object.prototype.hasOwnProperty.call(serialized.config, "locale"), false, "locale must not enter the design config");

I18n.setLocale("xx-INVALID");
assert.equal(I18n.getLocale(), "zh-CN", "unsupported locales must fall back to zh-CN");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "js", "app.js"), "utf8");
const runtime = fs.readFileSync(path.join(root, "locales", "i18n.js"), "utf8");
assert.ok(html.includes('id="languageSelect"'), "topbar language selector is required");
assert.ok(html.includes('value="zh-Hans-x-classical"'), "language selector must expose Classical Chinese");
assert.ok(html.includes('value="zh-Hans-x-classical">文言-华夏</option>'), "Classical Chinese display name must be 文言-华夏");
assert.ok(html.includes("locales/zh-Hans-x-classical.js"), "Classical Chinese catalog must load without fetch");
I18n.setLocale("zh-Hans-x-classical");
const chineseStaticChunks = [...html.matchAll(/>([^<>]+)</g)]
  .map((match) => match[1].replace(/\s+/g, " ").trim())
  .filter((text) => /[\u3400-\u9fff]/.test(text));
const classicalizedChunks = chineseStaticChunks.filter((text) => I18n.translateText(text) !== text);
assert.ok(classicalizedChunks.length / chineseStaticChunks.length >= 0.65, "Classical Chinese should transform most static interface text");
const riskKeywords = ["风险", "无效", "失败", "不足", "超过", "高于", "低于", "越限", "失效", "无法", "不匹配", "不覆盖", "不可", "不能", "必须", "需要", "提高", "降低", "增加", "更换", "检查"];
const riskFiles = [
  path.join(root, "js", "core.js"),
  path.join(root, "js", "core", "engine-design.js"),
  path.join(root, "js", "core", "materials.js"),
  path.join(root, "js", "core", "sizing.js"),
  path.join(root, "js", "app.js")
];
const riskLiterals = [...new Set(riskFiles.flatMap((file) => {
  const source = fs.readFileSync(file, "utf8");
  return [...source.matchAll(/(["'`])((?:\\.|(?!\1)[\s\S])*?)\1/g)]
    .map((match) => match[2])
    .filter((text) => /[\u3400-\u9fff]/.test(text) && riskKeywords.some((keyword) => text.includes(keyword)));
}))];
const classicalRiskLiterals = riskLiterals.filter((text) => I18n.translateText(text) !== text);
assert.ok(riskLiterals.length >= 40, "risk-text scan should cover the main warning sources");
assert.ok(
  classicalRiskLiterals.length / riskLiterals.length >= 0.95,
  `Classical Chinese must transform nearly all visible risk and warning text (${classicalRiskLiterals.length}/${riskLiterals.length}); unchanged: ${riskLiterals.filter((text) => I18n.translateText(text) === text).slice(0, 8).join(" | ")}`
);
assert.ok(html.indexOf("locales/i18n.js") < html.indexOf("js/data.js"), "i18n runtime must load before application data");
assert.ok(app.includes("I18n.observe(document)") && app.includes("I18n.applyData(Data)"), "application must observe dynamic DOM and localize data");
assert.ok(app.includes("I18n.speechNumber") && app.includes("I18n.speechLang"), "countdown speech must follow the selected locale");
const localeListener = app.slice(app.indexOf("I18n.onChange"), app.indexOf("I18n.observe(document)"));
assert.ok(!localeListener.includes("resetAnimation("), "locale changes must not reset animation playback");
assert.ok(runtime.includes("element.textContent !== renderedText"), "keyed DOM translation must not create a self-triggering mutation loop");
assert.ok(runtime.includes("element.getAttribute(name) !== renderedValue"), "keyed attribute translation must not create a self-triggering mutation loop");

console.log("Rocket SIM localization verification passed.");
