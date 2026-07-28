# Rocket SIM — JS 模块说明

## 文件结构

```
js/
├── data.js              — 静态数据字典（推进剂、天体等）
├── audio-model.js       — 声音包络模型
├── core.js              — 核心模块调度入口
├── app.js               — 主应用入口（UI、事件、渲染编排）
├── app/
│   ├── app-context.js   — 共享状态容器
│   ├── ui-format.js     — 纯 UI 格式化函数
│   └── render-rocket.js — SVG 火箭渲染函数
└── core/
    ├── utils.js         — 通用工具函数
    ├── environment.js   — 天体环境模型
    ├── engine-flow.js   — 发动机喷管等熵流
    ├── materials.js     — 材料数据库
    ├── tank-geometry.js — 储箱几何与质量
    ├── engine-design.js — 发动机设计（泵、喷管、集群）
    ├── config.js        — 配置读写与规范化
    ├── boosters.js      — 并联助推器
    ├── sizing.js        — 尺寸反算（目标 Δv/推力/燃时）
    ├── serial-stages.js — 串联多级
    ├── flight-core.js   — 一维直飞（芯级）
    ├── flight-parallel.js— 一维直飞（并联助推器）
    ├── flight-serial.js — 一维直飞（串联多级）
    ├── static-fire.js   — 地面试车
    └── energy.js         — 能量统计
```

---

## 根目录文件

### `js/data.js` — 1109 行

**注册为**: `window.RocketSimData`

**内容**: 全部教学级静态数据字典：
- `celestialBodies` — 9 种天体（地球/火星/月球/水星/土卫六/木卫二/谷神星/金星/地球化金星）
- `propellants` — 9 组推进剂预设 + 自定义入口
- `materials` — 26 个代表材料条目
- `processes` — 制造工艺（旋压/搅拌焊/铣削网格/纤维缠绕等）
- `cycles` — 6 种发动机循环（挤压/电泵/燃气发生器/分级燃烧/膨胀/开式）
- `coolingMethods` — 3 种冷却方式
- `batteries` — 6 种电池类型
- `flamePalettes` — 每种推进剂的风格化尾焰配色
- `historicalRocketPresets` / `modernRocketPresets` — 历史/现代火箭预设
- 默认配置模板 `defaultConfig`

**依赖**: 无

---

### `js/audio-model.js` — 43 行

**注册为**: `window.RocketSimAudioModel`

**内容**: 声音合成包络模型。将物理状态映射到 WebAudio 参数：推力→音量/频率、高度→滤波器截止、速度→多普勒偏移。导出 `calculateSoundEnvelope()` 供 app.js 运行时使用。

**依赖**: 无

---

### `js/core.js` — 1922 行

**注册为**: `window.RocketSimCore`

**内容**: 核心模块调度入口。负责：
1. 通过 DI（依赖注入）加载 14 个 `js/core/` 子模块
2. 暴露顶层 API：`normalizeConfig()`, `calculateDesign()`, `environmentState()`, `generateDesignName()`, `boosterPropellant()`, `serialStagePropellant()` 等
3. 将子模块函数组合为完整设计计算流水线

**依赖**: `data.js`, `core/utils.js`, `core/environment.js`, `core/engine-flow.js`, `core/materials.js`, `core/tank-geometry.js`, `core/engine-design.js`, `core/config.js`, `core/boosters.js`, `core/sizing.js`, `core/serial-stages.js`, `core/flight-core.js`, `core/flight-parallel.js`, `core/flight-serial.js`, `core/static-fire.js`, `core/energy.js`

---

### `js/app.js` — 3776 行

**入口**: 自动在 `DOMContentLoaded` 后执行

**内容**: 主应用控制器。约 190 个函数，按功能分组：
- **初始化** (init → cacheElements → bindEvents → calculateAndRender)
- **控件绑定** (fillControls, bindControlValue, syncBoundPeers 等)
- **音频系统** (initAudio, playIgnitionBoom, startRumble 等)
- **直飞动画** (animationTick, updateDynamicVisual, applyAnimationFrame 等)
- **结果渲染** (renderResults, renderSummary, renderOverview, renderCostBreakdown, renderEnergyChart 等)
- **工具提示** (initializeControlTooltips, CONTROL_HELP, OPTION_HELP)
- **设计向导** (setDesignSection, addSerialStage, deleteActiveSerialStage 等)
- **历史预设** (populateHistoricalPresets, loadHistoricalPreset 等)
- **入口函数** `renderRocket` — 调度 SVG 火箭绘制（调用 render-rocket.js）

**依赖**: 全部根目录文件 + `app/app-context.js`, `app/ui-format.js`, `app/render-rocket.js`

---

## `js/app/` — UI 层模块

### `app-context.js` — 3 行

**注册为**: `window.AppCtx`

**内容**: 纯容器对象。由 app.js 初始化时填充：
- `AppCtx.state` — 全局状态对象引用
- `AppCtx.els` — DOM 元素缓存引用
- `AppCtx.audioState` — 音频状态引用

**用途**: 让提取出的模块（如 render-rocket.js）可以读取 app.js 的状态，无需直接依赖 window。

---

### `ui-format.js` — 210 行

**注册为**: `window.__UIFormat`

**内容**: 25 个纯函数，无 app 状态依赖：

| 函数 | 用途 |
|---|---|
| `byId(id)` | 简化 `getElementById` |
| `escapeHtml(value)` | HTML 转义 |
| `getPath(object, path)` | 安全深层取值 |
| `setPath(object, path, value)` | 安全深层赋值 |
| `readStorage(key, fallback)` | localStorage 读取 + JSON 解析 |
| `number(value, digits)` | 数字格式化（zh-CN 本地化） |
| `formatMass(kg)` | 质量 → "x t" / "x kg" 等 |
| `formatMoney(value)` | 金额 → "¥x 万" / "¥x 亿" |
| `formatLength(value)` | 长度 → "x mm" / "x m" |
| `formatAltitude(value)` | 高度 → "x km" / "x m" |
| `formatPressure(value)` | 压力 → "x MPa" / "x kPa" / "x Pa" |
| `formatThrust(value)` | 推力 → "x MN" / "x kN" / "x N" |
| `formatMassFlow(value)` | 质量流量 → "x kg/s" |
| `createOption(value, label)` | 创建 `<option>` |
| `appendGroup(label)` | 创建 `<optgroup>` |
| `svgText(x, y, text, className, anchor)` | 生成 SVG `<text>` 元素 |
| `hexRgb(hex)` | 十六进制 → RGB 对象 |
| `mixColor(from, to, amount)` | 颜色插值 |
| `colorAlpha(hex, alpha)` | 颜色 + 透明度 |
| `clampValue(value, min, max)` | 数值限幅 |
| `deepCopy(value)` | JSON 深拷贝 |
| `samplePoints(points, maxPoints)` | 均匀降采样 |
| `ENERGY_UNITS` | 能量单位表（TJ/GJ/MJ/kJ） |
| `resolveEnergyUnit(energy)` | 自动选择能量单位 |
| `formatEnergy(valueJ, unit)` | 能量格式化 |

---

### `render-rocket.js` — 297 行

**注册为**: `window.__RocketRender`

**内容**: 12 个 SVG 火箭渲染函数。依赖 AppCtx（读取 `els` 和 `state.zoom`）和 __UIFormat。

| 函数 | 用途 |
|---|---|
| `flamePalette(result)` | 取推进剂对应的尾焰配色 |
| `serialFlightStageDesign(index)` | 串联模式下取指定级的设计结果 |
| `flameStyleForDesign(design)` | 生成 CSS 尾焰样式字符串 |
| `applyFlamePalette(result)` | 将尾焰配色写入 DOM |
| `boosterFlameStyle(result)` | 助推器尾焰 CSS 样式 |
| `nozzleGroup(...)` | 生成喷管/尾焰 SVG 组 |
| `motionOverlay()` | 速度/加速度/重力/阻力箭头 SVG |
| `renderCartoonRocket(result)` | Q 版火箭（固定布局） |
| `clusterLayoutInset(...)` | 多发动机喷口俯视包络 |
| `scaleBoosterSideGroups(...)` | 真实比例助推器侧面 |
| `renderSerialScaleRocket(result)` | 真实比例串联多级火箭 |
| `renderScaleRocket(result)` | 真实比例单级火箭 |

---

## `js/core/` — 核心计算模块

所有核心模块均使用 UMD 模式，在浏览器中注册到 `window.__Rocket*`，在 Node.js 中通过 `module.exports` 导出。

### `utils.js` — 47 行

**注册**: `window.__CoreUtils`

**导出**: `G0`, `clamp`, `round`, `deepClone`, `deepMerge`, `makeIssue`, `processFamily`

**用途**: 基础工具函数。`G0` = 9.80665，`makeIssue()` 用于生成设计校验问题列表，`processFamily()` 用于遍历配置家族链。

---

### `environment.js` — 57 行

**注册**: `window.__RocketEnv`

**导出**: `atmosphere`, `celestialBody`, `atmosphereForBody`, `environmentState`

**用途**: 天体环境建模。`atmosphere()` 实现地球标准大气分段模型（对流层/平流层），`atmosphereForBody()` 处理其他天体（按标高指数衰减），`environmentState()` 返回完整的当前环境状态。

---

### `engine-flow.js` — 51 行

**注册**: `window.__RocketFlow`

**导出**: `areaRatioFromMach`, `exitMachForAreaRatio`, `nozzleCoefficient`, `effectiveIsp`

**用途**: 喷管等熵流动。面积比 ↔ 马赫数互转、推力系数计算、有效比冲（计入环境压力修正）。

---

### `materials.js` — 99 行

**注册**: `window.__RocketMat`

**导出**: `materialTemperatureFactor`, `materialModulusPa`, `materialThermalExpansionPpmK`, `validateMaterialProcess`, `compatibleTankProcess`, `validateCompatibility`, `contactPropellantProfile`

**用途**: 材料属性查询与相容性检查。温区筛查（按推进剂温度过滤材料）、热膨胀系数、弹性模量、工艺相容性。

---

### `tank-geometry.js` — 122 行

**注册**: `window.__RocketTankGeom`

**导出**: `computeTankBuckling`, `splitPropellant`, `tankGeometry`, `resolveTankDiameter`, `massFromUsableVolume`

**用途**: 储箱设计。支持单层/双层/共底/载荷共享/COPV/蜂窝夹芯/压力稳定 7 种结构模式。`computeTankBuckling()` 做轴压屈曲校核，`splitPropellant()` 按混合比拆分燃料/氧化剂体积。

---

### `engine-design.js` — 199 行

**注册**: `window.__RocketEng`

**导出**: `computePumpSide`, `computeNozzleAndChamber`, `computeClusterLayout`

**用途**: 发动机设计。泵参数（功率/压力升/空化余量）、燃烧室/喉部/出口几何、多发动机集群排布（喷口俯视包络 + 扩径判断）。

---

### `config.js` — 31 行

**注册**: `window.__RocketCfg`

**导出**: `getPropellant`, `getBattery`

**用途**: 配置辅助。从当前配置中提取推进剂对象（支持 `custom` 回退）、获取电池参数。

---

### `boosters.js` — 334 行

**注册**: `window.__RocketBoosters`

**导出**: `boosterPropellant`, `aggregateCostBreakdown`, `attachParallelBoosters`

**用途**: 并联助推器完整设计。1-8 枚液体/单组元助推器，支持芯级联动或独立，计算每枚的储箱/发动机/箭体/成本/气动包络/分离可靠性。

---

### `sizing.js` — 182 行

**注册**: `window.__RocketSizing`

**导出**: `targetThrustForWetMass`, `estimateAtPropellantMass`, `solveSizing`, `liftoffState`

**用途**: 尺寸反算核心。三种反算模式（目标 Δv / 目标推力+燃时 / 目标起飞推重比），迭代解算推进剂/tankage/发动机尺寸。`liftoffState()` 判断摇臂解锁条件。

---

### `serial-stages.js` — 350 行

**注册**: `window.__RocketSerials`

**导出**: `serialStagePropellant`, `separationSystemForStage`, `configForSerialStage`, `estimateSerialStage`, `buildSerialStageStack`, `attachSerialStages`

**用途**: 串联多级设计。每级独立推进剂/发动机/储箱，级间分离系统（热分离/冷分离/推力箍），多级堆叠与 Δv 分配。

---

### `flight-core.js` — 199 行

**注册**: `window.__RocketFlight`

**导出**: `runVerticalFlight`

**用途**: 芯级一维直飞。4 阶 Runge-Kutta 积分，计入推力爬升/节流、重力损失、阻力、质量消耗、环境压力变化。返回完整时间序列。

---

### `flight-parallel.js` — 237 行

**注册**: `window.__RocketParallel`

**导出**: `runParallelVerticalFlight`

**用途**: 并联助推器直飞。芯级 + N 枚助推器同时燃烧、分别消耗推进剂，分离时刻抛掉助推器干重/残余/连接质量，切换到芯级迎风面积。

---

### `flight-serial.js` — 384 行

**注册**: `window.__RocketSerial`

**导出**: `runSerialVerticalFlight`

**用途**: 串联多级直飞。逐级燃烧、级间分离、上面级点火，支持滑行段和多次分离事件。跟踪每级剩余推进剂。

---

### `static-fire.js` — 92 行

**注册**: `window.__RocketStaticFire`

**导出**: `runStaticFire`

**用途**: 地面试车模拟。固定高度/环境压力，输出推力曲线、推进剂消耗、尾焰参数时间序列。

---

### `energy.js` — 162 行

**注册**: `window.__RocketEnergy`

**导出**: `calculateEnergyStatistics`

**用途**: 能量统计。从飞行时间序列计算每点的总能量/化学能/重力势能/动能，支持自动单位选择和截止模式（速度归零 / 燃尽+滑行）。
