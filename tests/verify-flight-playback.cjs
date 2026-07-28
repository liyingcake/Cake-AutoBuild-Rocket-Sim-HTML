"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Data = require("../js/data.js");
const Core = require("../js/core.js");

const root = path.resolve(__dirname, "..");
const soyuz = Core.calculateDesign(Data.historicalRocketPresets["soyuz-fregat"].config);
const launch = Core.liftoffState(soyuz.config, soyuz);
const combinedThrustN = soyuz.parallel.core.performance.totalThrustN
  + soyuz.parallel.booster.performance.totalThrustN * soyuz.parallel.count;

assert.ok(soyuz.parallel.core.performance.twr < 1, "联盟号芯级单独 T/W 应低于 1");
assert.ok(launch.parallel && launch.twr > 1, "联盟号芯级与助推器组合 T/W 应高于 1");
assert.ok(Math.abs(launch.thrustN - combinedThrustN) < 1e-6, "离架判据必须汇总芯级和全部助推器推力");
assert.ok(soyuz.flight.status !== "no-liftoff", "组合火箭不应被芯级单独 T/W 阻止直飞");
assert.ok(soyuz.flight.initialTwr > 1, "直飞时间轴应记录组合额定 T/W");
assert.ok(soyuz.flight.points.length > 100, "联盟号应生成可播放的完整直飞时间轴");
assert.ok(soyuz.flight.points.some((point) => point.coreThrustN > 0 && point.boosterThrustN > 0), "芯级与助推器应在起飞段同时工作");

const app = fs.readFileSync(path.join(root, "js", "app.js"), "utf8");
assert.ok(app.includes("refreshFlightPlaybackGate") && app.includes("Core.liftoffState"), "播放器应在点击时复核组合离架状态");
assert.ok(app.includes("直飞运行中") && app.includes("直飞指令已接收"), "播放器应立即显示已接受直飞指令");
const startBody = app.slice(app.indexOf("function startAnimation"), app.indexOf("function toggleAnimationPause"));
assert.ok(startBody.indexOf("requestAnimationFrame(animationTick)") < startBody.indexOf("ensureAudio()"), "画面动画必须先于可选声音通道启动");

console.log("Rocket SIM 联盟号直飞回归测试通过（10 项断言）。");
