(function () {
  "use strict";

  const Data = window.RocketSimData;
  const Core = window.RocketSimCore;
  const AudioModel = window.RocketSimAudioModel;
  const I18n = window.RocketSimI18n;
  if (I18n) I18n.applyData(Data);

  // Import extracted module namespaces
  const AppCtx = window.AppCtx || {};
  const UIFormat = window.__UIFormat;
  const byId = UIFormat.byId;
  const escapeHtml = UIFormat.escapeHtml;
  const getPath = UIFormat.getPath;
  const setPath = UIFormat.setPath;
  const readStorage = UIFormat.readStorage;
  const number = UIFormat.number;
  const formatMass = UIFormat.formatMass;
  const formatMoney = UIFormat.formatMoney;
  const formatLength = UIFormat.formatLength;
  const formatAltitude = UIFormat.formatAltitude;
  const formatPressure = UIFormat.formatPressure;
  const formatThrust = UIFormat.formatThrust;
  const formatMassFlow = UIFormat.formatMassFlow;
  const createOption = UIFormat.createOption;
  const appendGroup = UIFormat.appendGroup;
  const svgText = UIFormat.svgText;
  const hexRgb = UIFormat.hexRgb;
  const mixColor = UIFormat.mixColor;
  const colorAlpha = UIFormat.colorAlpha;
  const clampValue = UIFormat.clampValue;
  const deepCopy = UIFormat.deepCopy;
  const samplePoints = UIFormat.samplePoints;
  const ENERGY_UNITS = UIFormat.ENERGY_UNITS;
  const resolveEnergyUnit = UIFormat.resolveEnergyUnit;
  const formatEnergy = UIFormat.formatEnergy;
  const RR = window.__RocketRender;
  const flamePalette = RR.flamePalette;
  const serialFlightStageDesign = RR.serialFlightStageDesign;
  const flameStyleForDesign = RR.flameStyleForDesign;
  const applyFlamePalette = RR.applyFlamePalette;
  const boosterFlameStyle = RR.boosterFlameStyle;
  const nozzleGroup = RR.nozzleGroup;
  const motionOverlay = RR.motionOverlay;
  const renderCartoonRocket = RR.renderCartoonRocket;
  const clusterLayoutInset = RR.clusterLayoutInset;
  const scaleBoosterSideGroups = RR.scaleBoosterSideGroups;
  const renderSerialScaleRocket = RR.renderSerialScaleRocket;
  const renderScaleRocket = RR.renderScaleRocket;
  // v2 deliberately starts from a known-good default instead of reviving the
  // broken in-progress snapshot produced before multi-stage config snapshots.
  // The named design library keeps its original key and is not deleted.
  const STORAGE_CURRENT = "rocket-sim-current-v2";
  const STORAGE_LIBRARY = "rocket-sim-design-library-v1";
  const STORAGE_AUDIO = "rocket-sim-audio-v1";
  const STORAGE_STEP_SCALES = "rocket-sim-step-scales-v1";
  const WISDOM_INTERVAL_MS = 3 * 60 * 1000;
  const WISDOM_FADE_HALF_MS = 1500;
  const TOOLTIP_DWELL_MS = 420;
  const STEP_SCALE_MIN_EXPONENT = -2;
  const STEP_SCALE_MAX_EXPONENT = 6;
  const CONTROL_HELP = Object.freeze({
    name: "用于保存、比较和导出方案的显示名称；只负责识别方案，不参与物理或成本计算。",
    autoName: "开启后按计算得到的箭体直径级别、推进剂组合和发动机循环自动命名，关闭后可手动编辑。",
    sizingMode: "选择反算的边界条件。被选中的量作为已知输入，其余推进剂量、燃时、尺寸和性能由同一质量闭环求解。",
    "sizing.massInputKind": "决定总量反算采用质量还是总体积作为已知量；两者会通过燃料/氧化剂密度与混合比互相换算。",
    "sizing.propellantMassKg": "可用推进剂的装载总质量，按混合比分配给燃料与氧化剂，并进一步决定储箱体积、燃时与理想 Δv。",
    "sizing.propellantVolumeM3": "燃料与氧化剂的可用总体积；模型按密度和混合比反算各自质量，不包含气枕、残余和绝热体积。",
    "sizing.targetDeltaV": "用理想火箭方程给定目标速度增量，迭代推进剂量、干重和尺寸直到质量闭环收敛。",
    "sizing.targetThrustKn": "所有发动机的目标总推力。模型结合有效排气速度得到总质量流量，再与燃时一起反算推进剂量。",
    "sizing.burnTimeS": "目标稳态燃烧持续时间；与质量流量相乘得到推进剂需求，点火爬升阶段另由动态演示处理。",
    "boosters.enabled": "在芯级外增加同时点火、燃尽后抛离的并联助推器。模型会加入助推器自身储箱、发动机、箭体、连接分离机构、气动包络、成本和可靠性。",
    "boosters.count": "相同并联助推器的枚数。增加数量会同时增加推力、推进剂、干重、连接件、阻力面积和必须成功完成的分离事件。",
    "boosters.sizingMode": "决定单枚助推器推进剂量是跟随芯级可用推进剂按比例缩放，还是保持用户指定的固定质量。",
    "boosters.propellantMassRatioPct": "每一枚助推器的可用推进剂质量相对于芯级可用推进剂质量的百分比；助推器总推进剂还要乘以枚数。",
    "boosters.propellantMassKg": "固定给定每一枚助推器的可用推进剂质量，不含气枕和残余推进剂。",
    "boosters.propellantMode": "复制芯级推进剂时两者共享工质预设；独立模式允许助推器采用不同的液体或单组元推进剂。",
    "boosters.propellantKey": "独立助推器推进剂预设，决定密度、温度、混合比、比冲、成本、毒性和储箱相容性。",
    "boosters.diameterMode": "复制模式让助推器与芯级同直径；独立模式允许更常见的较细助推器，并重新计算储箱长度和并联包络。",
    "boosters.diameterM": "单枚助推器箭体与储箱直径；它影响储箱长度、壳体质量、喷口包络和全箭迎风面积。",
    "boosters.engineMode": "复制芯级发动机组会沿用循环、发动机数量和室压并按助推器流量重新尺寸化；独立模式使用下方专用工况。",
    "boosters.cycleKey": "助推器独立发动机的供给循环，影响室压上限、泵、电池或涡轮机械质量、成本与可靠性。",
    "boosters.engineCount": "每一枚助推器内部的发动机数量；总助推器发动机数等于本数值乘以助推器枚数。",
    "boosters.targetThrustKn": "每一枚助推器全部发动机的合计目标推力，用于反算质量流量、喷管和发动机系统。",
    "boosters.chamberPressureMpa": "助推器燃烧室压力；独立发动机模式下用于泵功率、热负荷、喷口和材料校核。",
    "boosters.expansionRatio": "助推器喷管出口面积与喉部面积比；首版并联系统按固定膨胀比计算。",
    "boosters.attachmentMassPct": "连接梁、推力传递接头和局部分离结构相对助推器干重的经验质量系数，另叠加随推力变化的下限。",
    "boosters.separationDelayS": "助推器可用推进剂耗尽后到执行抛离的延迟；延迟期间仍携带助推器干重与残余推进剂。",
    "boosters.separationReliabilityPct": "单枚助推器成功解锁、推离且不碰撞芯级的简化概率；多枚分离按串联系统相乘。",
    "boosters.dragFactor": "对芯级加环列助推器几何包络面积施加的气动修正，用于近似缝隙、支架、激波干扰和非圆截面。",
    "boosters.includeInDeltaVSizing": "开启时目标 Δv 反算使用并联共同燃烧、抛离和芯级续航的分段结果；关闭时只用芯级自身 Δv 约束推进剂量。",
    "vehicle.payloadKg": "由火箭运送、但不属于推进系统和箭体结构的有效载荷；它会增加起飞质量并降低可获得 Δv。",
    "vehicle.liftoffTargetMode": "选择用推重比或离架净加速度描述起飞目标；净加速度模式会自动考虑当前天体的表面重力。",
    "vehicle.targetTwr": "目标起飞推重比 T/W。1.0 表示推力刚好等于当地重力，实际离架还受爬升、摇臂判据和阻力影响。",
    "vehicle.targetLiftoffAccelMs2": "目标离架瞬间的向上净加速度；模型按 F=m(g+a) 反算所需总推力。",
    "vehicle.dragCoefficient": "一维阻力模型的无量纲阻力系数；阻力按 0.5·ρ·v²·Cd·A 计算，并随环境密度和速度变化。",
    "vehicle.launchAltitudeM": "发射点相对所选天体参考表面的高度；它改变初始环境压力、密度、重力和背景状态。",
    "vehicle.maxQKpa": "启用载荷限制后允许的最大动压 Q；控制器会在接近上限时降低节流以减小气动载荷。",
    "vehicle.maxAccelG": "启用载荷限制后允许的最大净加速度；推进剂变轻造成过载上升时会自动降推。",
    "vehicle.limitLoads": "让直飞控制器同时限制最大动压和最大加速度。关闭时只执行固定节流指令。",
    "vehicle.structuralFactor": "概念级箭体、整流罩与箱间结构的经验质量基准；它与外形面积、材料、工艺和发动机集群修正共同决定非储箱干重。",
    "vehicle.avionicsKg": "导航、控制、遥测、电源和线束的合计估算质量，直接计入结构干重。",
    propellantKey: "选择推进剂的密度、温度、混合比、比冲和相容性预设；这些数据共同影响储箱、泵、喷管、成本和飞行性能。",
    "engine.mixtureRatioOverride": "用氧化剂质量流量/燃料质量流量 O/F 覆盖推进剂预设；填 0 时使用数据库推荐值。",
    "customPropellant.mono": "单组元模式不再建立独立氧化剂箱和氧化剂泵，全部装载量视为一种推进剂。",
    "tanks.pressureMpa": "储箱内部工作压力。它决定壳体膜应力、壁厚和增压需求；挤压供给时还必须覆盖室压及供给系统压降。",
    "tanks.ullagePct": "液面上方预留的气相空间比例，为热膨胀和增压气体提供容积；数值越大，储箱几何体积越大。",
    "tanks.residualPct": "燃尽后因吸入口、管路和运行裕量而不可用的推进剂比例；会增加装载量但不贡献有效燃时。",
    "tanks.pressurization": "选择用独立氦气或推进剂自生气体维持箱压；两者的气瓶、换热、管路质量和适用性不同。",
    "tanks.geometryMode": "独立双箱各有封头与箱间段；共底让两种推进剂共享分隔结构，以更复杂的压差、隔热和制造换取长度收益。",
    "tanks.commonBulkheadType": "选择共底的承压与隔热构造。单层轻但热桥明显；真空双层和蜂窝夹芯更复杂，也能隔离不同温度的推进剂。",
    "tanks.commonBulkheadPressureMode": "自承式按任一侧失压的最危险压差设计；压力稳定式依赖联锁保持较小压差，结构更轻但运行约束更强。",
    "tanks.commonBulkheadControlledDeltaKpa": "压力稳定共底在加注、点火和飞行期间允许的最大受控压差；越小越轻，但阀门和控制系统必须更可靠。",
    "tanks.commonBulkheadProofFactor": "把工作压差放大到验证或证明载荷，用于覆盖试验与不确定性；系数越高，面板通常越厚。",
    "tanks.commonBulkheadHeightRatio": "球冠拱高与箭体半径之比。它改变共底曲率、表面积、轴向长度和膜应力效率。",
    "tanks.commonBulkheadCoreThicknessMm": "真空双层的隔离间隙或蜂窝夹芯厚度；影响热漏、面板稳定性、连接环质量和制造难度。",
    "tanks.structureMode": "选择储箱的主要承力路径。模型会据此切换单层、分层载荷共享、COPV、加筋、夹芯或压力稳定壳的公式与失效检查。",
    "tanks.diameterMode": "自动模式按目标长径比求直径；锁定模式把箭体直径作为硬约束，并让储箱长度随体积变化。",
    "tanks.diameterM": "箭体与储箱的共同外径约束。增大直径可缩短储箱、减小部分膜应力，但增加迎风面积、封头面积和发动机包络空间。",
    "tanks.targetAspect": "自动尺寸模式下，储箱组总长与直径的目标比例；较小值偏粗短，较大值偏细长。",
    "tanks.insulationKgM2": "覆盖低温储箱外表面的绝热系统面密度；按箱体面积计入质量，并用于低温储存的教学估算。",
    "tanks.interfaceMode": "决定内衬与外承力层如何传递载荷：共同应变、接触滑移或带制造预应力的自紧界面。",
    "tanks.interfaceEfficiencyPct": "界面把理论共同变形传递到另一层的有效比例；低效率会减少载荷共享并增大局部剪切与皱曲风险。",
    "tanks.interfaceShearStrengthMpa": "粘接层或界面的代表剪切强度，用于检查层间载荷传递是否超过允许值。",
    "tanks.linerPrestressMpa": "制造、自紧或缠绕固化在内衬中留下的初始压应力；可推迟受压时的拉伸屈服，但会改变卸压状态。",
    "tanks.bucklingKnockdownPct": "把理想薄壳屈曲载荷折减为可用值，以代表焊缝、边界、凹陷和几何缺陷的不利影响。",
    "tanks.ovalityPct": "筒体初始椭圆度相对直径的比例；缺陷越大，轴压和弯曲下的屈曲裕量越低。",
    "tanks.designCycles": "计划承受的加压—卸压循环次数，用于教学级疲劳利用率与寿命警告。",
    "tanks.balloonMinGaugeMm": "压力稳定气球储箱允许的最小可制造板厚；过薄会受焊接、检漏、搬运和凹痕控制。",
    "tanks.balloonGroundSupport": "配置失压时维持超薄壳形状的张紧架和运输工装；增加地面系统成本，但避免壳体在无压状态下塌陷。",
    "engine.engineCount": "并联发动机或喷口数量。独立架构会重复计算附件、泵和试车，并检查集群排布、扩径、振动与任务可靠性。",
    "engine.cycleKey": "发动机循环决定如何提高推进剂压力，并修正室压上限、性能、机械质量、成本和复杂度。",
    "engine.clusterArchitecture": "决定多喷口是否使用独立泵、共用动力包或理想化单泵；无论哪种架构都要通过喷口包络与箭体扩径检查。",
    "engine.perEngineFixedMassKg": "每台发动机重复出现的控制器、阀门、点火器、万向节和安装件质量，不随泵是否共用而消失。",
    "engine.perEngineFixedCostCny": "每台发动机的重复附件、装配、验收和单机试车固定成本。",
    "engine.nozzleClearancePct": "相邻喷口外径之间的最小净间隙，按喷口直径百分比计；用于集群俯视排布和箭体扩径检查。",
    "engine.singleUnitReliabilityPct": "单台发动机完整完成任务的独立概率，用于估算集群全部成功或允许一台失效时的任务可靠性。",
    "engine.sharedPowerpackReliabilityPct": "共用动力包自身的任务成功概率；它是多燃烧室系统的单点故障来源。",
    "engine.allowOneEngineOut": "允许一台发动机失效后继续任务；可靠性按组合概率计算，同时检查剩余推力是否仍足以满足任务。",
    "engine.chamberPressureMpa": "燃烧室稳态压力。提高室压通常改善喷管尺度和性能，但会显著增加泵功率、储箱供给压力、热流和材料负担。",
    "engine.throttlePct": "相对额定工况的推力指令。直飞时还可能因最大 Q 或最大过载限制被进一步降低。",
    "engine.coolingKey": "选择燃烧室与喷管吸收热流的主要方式；不同方式会改变壁温、质量、成本、重复使用性和工质相容性。",
    "engine.pumpEfficiencyPct": "推进剂泵把轴功转化为液压功的效率；轴功率=体积流量×压升/效率，效率越低所需动力和热负荷越高。",
    "engine.injectorDropPct": "喷注器压降相对室压的比例，用于保证喷注与燃烧稳定；它直接增加泵或储箱必须提供的供给压力。",
    "engine.lineDropPct": "管路、阀门和集流歧管压降相对室压的比例；发动机集群会在此基础上叠加分流惩罚。",
    "engine.autoExpansion": "根据所选环境压力自动选择喷管膨胀比，兼顾有效推力与海平面流动分离风险。",
    "engine.expansionRatio": "喷管出口面积与喉部面积 Ae/At；较大值适合低压/真空，但会增大喷口直径并可能在稠密大气中发生分离。",
    "engine.batteryKey": "电泵电源预设。电池包质量同时取比能量和比功率约束中的较大值，并加入封装与储备。",
    "engine.batteryReservePct": "在理论能量需求上增加的电池储能裕量，用于覆盖电压下垂、低温、老化和工况不确定性。",
    "engine.batteryEfficiencyPct": "电池经控制器、电机和传动到泵轴的总效率；效率越低，电池输出功率和所需能量越大。",
    "airframe.materialKey": "箭体、整流罩与箱间结构的代表材料；密度、强度、温区、稀缺度和价格共同修正质量与成本。",
    "airframe.processKey": "箭体材料的主要成形与连接工艺；影响接头效率、强度折减、备料损耗、加工难度和成本。",
    "test.environment": "表面/大气模式使用所选天体的大气和重力；强制真空模式把环境压力与气动阻力置零用于对比。",
    "test.previewAtmosphere": "只改变编辑待机时的预览背景。关闭时使用图纸黑，开启时显示所选天体表面大气色；不改变计算环境。",
    "test.durationS": "地面试车进入稳态后保持的目标时长，用于时序图、推进剂消耗和温度/压力边界检查。",
    "cost.assemblyFactor": "对系统集成、焊接、装配和检验工作量施加的整体成本倍率；仅用于方案间教学概算。",
    "cost.priceScale": "对全部制造概算施加的最终价格倍率，默认 1.00；适合敏感性分析，不代表实时市场报价。"
  });
  const OPTION_HELP = Object.freeze({
    sizingMode: {
      mass: "直接给定可用推进剂总量，适合从既有储量或容积出发观察尺寸、燃时与 Δv。",
      "delta-v": "给定目标理想 Δv 与载荷，迭代求解推进剂和干重；若目标超出质量闭环会给出告警。",
      "thrust-time": "给定总推力和燃时，以质量流量反算推进剂与储箱，适合发动机工况先行的方案。"
    },
    "sizing.massInputKind": {
      mass: "质量为硬输入，体积由燃料/氧化剂密度和 O/F 混合比换算。",
      volume: "总体积为硬输入，质量由两种工质的密度与 O/F 混合比反算。"
    },
    "boosters.sizingMode": {
      "core-ratio": "单枚推进剂量随芯级推进剂一起缩放，适合比较不同载荷与 Δv 目标下相似构型。",
      fixed: "单枚助推器保持固定推进剂装载，芯级变化不会自动改变助推器尺寸。"
    },
    "boosters.propellantMode": {
      "copy-core": "助推器与芯级使用同一推进剂预设，物流与相容性更统一。",
      custom: "助推器使用独立推进剂，可形成煤油助推器配氢氧芯级等异构组合。"
    },
    "boosters.diameterMode": {
      "copy-core": "每枚助推器复制当前计算得到的芯级直径，形成等径并联构型。",
      custom: "使用独立直径重新尺寸化助推器储箱、箭体和包络。"
    },
    "boosters.engineMode": {
      "copy-core": "复制芯级发动机循环、数量、室压、喷管与材料路线，并针对助推器工质和流量重新估算。",
      custom: "单独给定助推器循环、发动机数、总推力、室压与膨胀比。"
    },
    "vehicle.liftoffTargetMode": {
      twr: "用无量纲 T/W 指定起飞余量，便于沿用常见火箭设计经验。",
      acceleration: "用 m/s² 指定离架净加速度，跨地球、月球、火星等环境时更直观。"
    },
    "test.environment": {
      sea: "采用所选天体随高度变化的大气压力、密度、阻力和当地重力。",
      vacuum: "强制把大气压力与阻力置零，但仍保留所选天体的半径和重力。"
    },
    "tanks.pressurization": {
      helium: "用高压氦气瓶和减压系统维持箱压；工质相容性好，但要承担气瓶与管路质量。",
      autogenous: "把少量推进剂气化后回送储箱；可减少高压氦气系统，但需要换热、控制和相容性。"
    },
    "tanks.geometryMode": {
      separate: "两个储箱分别保留相邻封头和箱间结构，制造成熟且失效路径清楚。",
      "common-bulkhead": "用一个内部共底分隔两种推进剂，取消相邻封头并缩短级段，但必须处理双侧压力与热隔离。"
    },
    "tanks.commonBulkheadType": {
      "single-sheet": "一张球冠压差膜，质量和零件数较少，但冷热推进剂之间的穿壁热漏最大。",
      vacuum: "两张各自承压的壳体由真空间隙隔开，热隔离好，但连接环、密封、抽真空与检漏复杂。",
      honeycomb: "两张面板与蜂窝芯共同稳定，兼顾隔热与刚度；需检查面板起皱、芯层压溃和低温粘接。"
    },
    "tanks.commonBulkheadPressureMode": {
      "self-supporting": "不依赖主动压差控制，按任一侧满压、另一侧失压的包络定尺寸。",
      "pressure-stabilized": "依赖阀门和控制器维持有限压差，可减薄共底，但联锁失效会成为关键危险工况。"
    },
    "tanks.structureMode": {
      single: "单一材料壳同时负责密封、相容性与主要承压，计算路径最直接。",
      dual: "旧版兼容预设：内衬固定承担 5%，外层承担 95%；只用于复现历史方案。",
      "load-sharing": "内衬和外层按温度修正后的 E·t 刚度、界面效率、热失配和预应力动态分担载荷。",
      copv: "内衬负责密封与相容性，纤维缠绕层承担主要环向载荷，并检查界面与卸压状态。",
      stiffened: "薄蒙皮配整体等网格/正交网格，提高轴压与弯曲屈曲能力，但加工和缺陷控制更复杂。",
      sandwich: "双面板加芯层提高弯曲刚度并可兼顾隔热，重点检查面板起皱、芯层剪切和脱粘。",
      balloon: "极薄金属壳依赖最低内压保持形状；质量效率高，但失压、搬运凹痕与地面保障非常敏感。"
    },
    "tanks.diameterMode": {
      auto: "模型改变直径，使储箱组总长/直径接近目标长径比。",
      locked: "保持用户指定直径，所有体积变化主要反映为储箱和箭体长度变化。"
    },
    "tanks.interfaceMode": {
      bonded: "各层共同变形，按刚度分担载荷；同时承受热膨胀失配带来的界面剪切。",
      slip: "允许有限相对滑动，内衬更偏向密封作用；需要检查接触、摩擦、局部脱离与皱曲。",
      prestressed: "利用缠绕固化或自紧留下压缩预应力，重新分配加压与卸压时的层间应力。"
    },
    "engine.clusterArchitecture": {
      independent: "每台发动机拥有独立泵和附件，冗余路径清楚，但重复质量、成本与集成惩罚最高。",
      "shared-powerpack": "多燃烧室共用动力包，减少部分涡轮机械，却引入分流管路和单点故障。",
      "ideal-multi-chamber": "保留旧版单泵多室优势，忽略大部分重复泵质量；仍计算喷口排布与箭体扩径。"
    },
    "engine.autoExpansion": {
      true: "由环境压力选择膨胀比，并限制稠密大气下的过膨胀和喷流分离。",
      false: "使用手动 Ae/At，便于固定喷管几何做环境对比。"
    },
    "engine.allowOneEngineOut": {
      true: "任务成功条件允许最多一台发动机失效，并检查剩余推力能力。",
      false: "所有必需发动机都必须成功工作，集群数量增加会更快降低任务可靠性。"
    },
    "test.energyCutoffMode": {
      apogee: "继续统计到上升速度归零的滑行顶点，展示完整的动能—势能转换。",
      "post-burn": "在燃尽后只追加可调百分比的滑行时间，适合聚焦动力段附近的能量变化。"
    },
    "vehicle.launchMode": {
      pad: "摇臂固定火箭，检测 T/W>1 持续 1 秒后释放；等待期间仍消耗推进剂。",
      field: "无发射架约束，推力首次超过重量就开始运动。"
    }
  });
  const MANUAL_CONTROL_HELP = Object.freeze({
    scaleZoom: { key: "view.scaleZoom", label: "真实比例视图缩放", description: "只调整真实比例 SVG 在预览区内的显示倍率，不改变箭体、储箱或喷口的计算尺寸。", unit: "%" },
    playbackSpeed: { key: "simulation.playbackSpeed", label: "演示速度", description: "选择动态试车和直飞的观看倍率。自动模式会压缩长时滑行；沉浸发射仍会在倒计时至 T+5 锁定 1×。" },
    environmentScenarioSelect: { key: "test.bodyKey", label: "环境模拟", description: "选择直飞积分使用的天体半径、重力、大气、温度和背景预设。" },
    countdownEnabled: { key: "vehicle.countdownEnabled", label: "启用发射倒计时", description: "让直飞从 T-10 至 T-13 的预计时刻开始，并在点火前展示发射准备状态。" },
    immersiveLaunch: { key: "vehicle.immersiveLaunch", label: "沉浸发射", description: "倒计时至 T+5 强制 1× 播放，并使用浏览器语音合成进行中文 10 到 1 报数。" },
    autoPauseAfterBurnout: { key: "vehicle.pauseAfterBurnout", label: "熄火后 1 秒自动暂停", description: "启用后直飞在关机后 1 秒暂停一次；继续播放后仍会积分惯性滑行，关闭时则不中断。" },
    countdownSeconds: { key: "vehicle.countdownSeconds", label: "预计倒计时", description: "设置直飞演示从哪个负时间开始，最长不超过 T-13；它只影响播放时序，不改变推进系统设计。", unit: "s" },
    launchModeSelect: { key: "vehicle.launchMode", label: "起飞约束", description: "选择发射场摇臂固定或无发射架的野地起飞判据；两者都计算点火爬升期间的推进剂消耗。" },
    engineStartupSeconds: { key: "vehicle.engineStartupS", label: "推力爬升时间", description: "发动机从 0 推力爬升到节流目标的时间常数，用于点火动态、离架判据和预释放推进剂消耗。", unit: "s" },
    soundMasterVolume: { key: "audio.master", label: "总音量", description: "控制点火、低频轰鸣、喷流和涡轮所有合成声部的总增益。", unit: "%" },
    soundIgnitionVolume: { key: "audio.ignition", label: "点火爆鸣", description: "控制点火瞬间短促宽带冲击声的独立音量，不改变持续发动机声。", unit: "%" },
    soundRumbleVolume: { key: "audio.rumble", label: "低频轰鸣", description: "控制由低频振荡与噪声合成的发动机主体轰鸣声部。", unit: "%" },
    soundJetVolume: { key: "audio.jet", label: "喷流 / 涡轮", description: "控制高频喷流噪声与涡轮机械声部，和低频轰鸣采用独立通道。", unit: "%" },
    soundAutoFade: { key: "audio.autoFade", label: "试听保护", description: "发动机连续工作 8 秒后，在 4 秒内把持续声线性降至 40%，减少长时间试听干扰。" },
    soundVacuumAttenuation: { key: "audio.vacuum", label: "真空代入感", description: "按当前环境压力衰减合成声音；接近真空时降到约 10%，这是氛围效果而非声学传播仿真。" },
    energyCutoffMode: { key: "test.energyCutoffMode", label: "能量统计截止", description: "决定能量曲线统计完整滑行至速度归零，还是只显示燃尽后指定比例的追加滑行。" },
    energyCoastPercent: { key: "test.energyCoastPercent", label: "燃尽后追加滑行", description: "在实际燃烧时长基础上追加的滑行百分比；只作用于能量统计页的截止时间。", unit: "% 燃时" },
    energyUnitSelect: { key: "energy.displayUnit", label: "能量显示单位", description: "选择总能量、化学能、势能和动能共用纵轴的显示单位；自动模式按量级选择 TJ、GJ、MJ 或 kJ。" },
    includePayloadInDryBreakdown: { key: "vehicle.includePayloadInDryBreakdown", label: "载荷计入干重分配", description: "只改变干重百分比图的分母与载荷条目；推进剂始终排除，不改变火箭质量、Δv 或飞行计算。" },
    historicalPresetSelect: { key: "historical.preset", label: "历史火箭预设", description: "选择一组依据公开历史资料整理的级段、推进剂、尺寸、推力与发动机参数。列表值用于教学复刻，载入后仍可逐项修改。" },
    loadHistoricalPresetBtn: { key: "historical.load", label: "载入历史复刻", description: "用所选历史构型替换当前未保存的工作参数，并切回芯级任务页；方案库中已保存的设计不会删除。" }
  });
  const DEFAULT_AUDIO_SETTINGS = Object.freeze({
    enabled: true,
    masterVolume: 0.65,
    ignitionVolume: 0.85,
    rumbleVolume: 0.8,
    jetVolume: 0.65,
    autoListeningFade: true,
    vacuumAttenuation: true
  });
  const initialAudioSettings = loadAudioSettings();

  const state = {
    config: Core.normalizeConfig(loadCurrentConfig()),
    result: null,
    step: 0,
    designSection: "core",
    activeStageIndex: 0,
    stageStep: 0,
    stageClipboard: {},
    view: "scale",
    zoom: 1,
    resultTab: "overview",
    saved: loadSavedDesigns(),
    renderTimer: null,
    toastTimer: null,
    recoveryAttempted: false,
    soundEnabled: initialAudioSettings.enabled,
    audioSettings: initialAudioSettings,
    animation: {
      mode: null,
      playing: false,
      paused: false,
      simTimeS: 0,
      lastTimestamp: 0,
      rafId: 0,
      frame: null,
      boomPlayed: false,
      lastIgnitedStageIndex: -1,
      lastCountdownSpoken: null,
      autoPauseHandled: false
    }
  };
  AppCtx.state = state;

  const els = {};
  AppCtx.els = els;
  const audioState = { context: null, master: null, ignitionBus: null, rumble: null };
  AppCtx.audioState = audioState;
  const wisdomState = { index: -1, intervalId: 0, swapTimerId: 0 };
  const tooltipState = { timerId: 0, control: null, trigger: null, pinned: false };
  const stepScaleState = { values: loadStepScaleSettings(), groups: new Map() };
  let topbarResizeObserver = null;



  function writeStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      showToast("浏览器阻止了本地存储；当前计算仍可使用。", true);
      return false;
    }
  }

  function loadCurrentConfig() {
    const stored = readStorage(STORAGE_CURRENT, null);
    if (stored && stored.schemaVersion === Data.schemaVersion && stored.config) return stored.config;
    return Data.defaultConfig;
  }

  function loadSavedDesigns() {
    const stored = readStorage(STORAGE_LIBRARY, []);
    if (!Array.isArray(stored)) return [];
    return stored.filter(function (entry) {
      return entry && entry.schemaVersion === Data.schemaVersion && entry.config;
    }).slice(0, 30);
  }

  function loadAudioSettings() {
    const stored = readStorage(STORAGE_AUDIO, null) || {};
    return {
      enabled: stored.enabled !== false,
      masterVolume: clampValue(stored.masterVolume == null ? DEFAULT_AUDIO_SETTINGS.masterVolume : stored.masterVolume, 0, 1),
      ignitionVolume: clampValue(stored.ignitionVolume == null ? DEFAULT_AUDIO_SETTINGS.ignitionVolume : stored.ignitionVolume, 0, 1),
      rumbleVolume: clampValue(stored.rumbleVolume == null ? DEFAULT_AUDIO_SETTINGS.rumbleVolume : stored.rumbleVolume, 0, 1),
      jetVolume: clampValue(stored.jetVolume == null ? DEFAULT_AUDIO_SETTINGS.jetVolume : stored.jetVolume, 0, 1),
      autoListeningFade: stored.autoListeningFade !== false,
      vacuumAttenuation: stored.vacuumAttenuation !== false
    };
  }

  function loadStepScaleSettings() {
    const stored = readStorage(STORAGE_STEP_SCALES, {});
    if (!stored || typeof stored !== "object" || Array.isArray(stored)) return {};
    const values = {};
    Object.keys(stored).forEach(function (key) {
      const exponent = Math.round(Number(stored[key]));
      if (Number.isFinite(exponent)) values[key] = clampValue(exponent, STEP_SCALE_MIN_EXPONENT, STEP_SCALE_MAX_EXPONENT);
    });
    return values;
  }

  function saveStepScaleSettings() {
    writeStorage(STORAGE_STEP_SCALES, stepScaleState.values);
  }

  function saveAudioSettings() {
    state.audioSettings.enabled = state.soundEnabled;
    writeStorage(STORAGE_AUDIO, state.audioSettings);
  }

  function saveCurrentConfig() {
    writeStorage(STORAGE_CURRENT, { schemaVersion: Data.schemaVersion, config: state.config });
  }

  function showToast(message, isError) {
    if (!els.toast) return;
    els.toast.textContent = message;
    els.toast.style.borderColor = isError ? "var(--danger)" : "var(--border-strong)";
    els.toast.classList.add("is-visible");
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(function () {
      els.toast.classList.remove("is-visible");
    }, 3000);
  }

  function renderRocketWisdom(entry) {
    if (!entry) return;
    els.rocketWisdomKind.textContent = entry.type === "quote" ? "火箭名言" : "轨道段子";
    els.rocketWisdomText.textContent = entry.text;
    els.rocketWisdomAttribution.textContent = entry.attribution ? `— ${entry.attribution}` : "";
  }

  function rotateRocketWisdom(animate) {
    const entries = Data.rocketWisdom || [];
    if (!entries.length || !els.rocketWisdom) return;
    clearTimeout(wisdomState.swapTimerId);
    wisdomState.index = wisdomState.index < 0
      ? Math.floor(Math.random() * entries.length)
      : (wisdomState.index + 1) % entries.length;
    const nextEntry = entries[wisdomState.index];
    const reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!animate || reducedMotion) {
      els.rocketWisdom.classList.remove("is-fading");
      renderRocketWisdom(nextEntry);
      return;
    }
    els.rocketWisdom.classList.remove("is-fading");
    void els.rocketWisdom.offsetWidth;
    els.rocketWisdom.classList.add("is-fading");
    wisdomState.swapTimerId = setTimeout(function () {
      renderRocketWisdom(nextEntry);
      requestAnimationFrame(function () { els.rocketWisdom.classList.remove("is-fading"); });
    }, WISDOM_FADE_HALF_MS);
  }

  function restartRocketWisdomClock() {
    clearInterval(wisdomState.intervalId);
    wisdomState.intervalId = setInterval(function () { rotateRocketWisdom(true); }, WISDOM_INTERVAL_MS);
  }

  function initializeRocketWisdom() {
    rotateRocketWisdom(false);
    restartRocketWisdomClock();
  }

  function updateStickySummaryOffset() {
    const topbar = document.querySelector(".topbar");
    if (!topbar) return;
    const isSticky = window.getComputedStyle(topbar).position === "sticky";
    const topbarHeight = isSticky ? Math.ceil(topbar.getBoundingClientRect().height) : 0;
    document.documentElement.style.setProperty("--topbar-height", `${topbarHeight}px`);
  }

  function initializeStickySummary() {
    const topbar = document.querySelector(".topbar");
    updateStickySummaryOffset();
    if (topbar && "ResizeObserver" in window) {
      topbarResizeObserver = new ResizeObserver(updateStickySummaryOffset);
      topbarResizeObserver.observe(topbar);
    }
    window.addEventListener("resize", updateStickySummaryOffset);
  }

  function switchRocketWisdomForSimulation() {
    rotateRocketWisdom(true);
    restartRocketWisdomClock();
  }



  function tooltipDescriptionForKey(key) {
    if (key.indexOf("stage.") === 0) key = key.slice(6);
    if (CONTROL_HELP[key]) return CONTROL_HELP[key];
    if (key.indexOf("customPropellant.") === 0) {
      return "自定义推进剂的教学参数会替代数据库预设，并直接进入密度换算、质量流量、喷管和能量计算；应使用同一工况下自洽的数据。";
    }
    if (/MaterialKey$/.test(key) || key.endsWith("materialKey")) {
      return "选择该部件的代表材料；模型会使用其密度、温度降额、强度、导热率、相容性、参考价格和最小工艺厚度。";
    }
    if (/ProcessKey$/.test(key) || key.endsWith("processKey")) {
      return "选择主要制造工艺；接头效率、性能折减、备料损耗、加工难度和适用材料族会随之改变。";
    }
    if (key.indexOf("engine.customBattery") === 0) {
      return "自定义电池包参数用于同时检查能量需求和峰值功率需求，最终包质量取两种约束中较大的结果。";
    }
    if (key.indexOf("cost.") === 0) {
      return "可编辑的人民币教学参考价，用于物料清单和方案相对比较；不接入实时行情，也不包含研发、设施与认证。";
    }
    if (key.indexOf("tanks.") === 0) {
      return "储箱结构输入会参与体积、壁厚、质量、屈曲、热环境、制造成本或运行边界计算。";
    }
    if (key.indexOf("engine.") === 0) {
      return "发动机输入会参与推进剂流量、供给压力、泵功率、喷管几何、热负荷、质量、成本或可靠性计算。";
    }
    if (key.indexOf("vehicle.") === 0) {
      return "整箭任务与结构输入会参与起飞质量、推力目标、飞行载荷或干重闭环。";
    }
    if (key.indexOf("test.") === 0) {
      return "此选项控制教学试车、直飞、环境或结果展示范围，不代表认证级试验程序。";
    }
    return "此参数会在下一次设计计算中更新相关尺寸、质量、性能、成本和校核结果。";
  }

  function selectedOptionHelp(key, value, control) {
    if (key.indexOf("stage.") === 0) key = key.slice(6);
    const mapped = OPTION_HELP[key] && OPTION_HELP[key][String(value)];
    if (mapped) return mapped;
    if (key === "propellantKey" || key === "boosters.propellantKey") {
      const propellant = value === "custom" ? state.config.customPropellant : Data.propellants[value];
      if (!propellant) return "";
      const mix = propellant.mono ? "单组元" : `O/F ${number(propellant.mixtureRatio, 2)}`;
      return `${propellant.note} 代表参数：${mix}，燃料密度 ${number(propellant.fuelDensity, 0)} kg/m³，海平面/真空比冲 ${number(propellant.ispSea, 0)}/${number(propellant.ispVac, 0)} s。`;
    }
    if ((key === "engine.cycleKey" || key === "boosters.cycleKey") && Data.cycles[value]) {
      const cycle = Data.cycles[value];
      return `${cycle.note} 教学室压上限 ${number(cycle.maxPcMpa, 1)} MPa，复杂度 ${cycle.complexity}，性能/质量/成本修正 ${number(cycle.performanceFactor, 3)}×/${number(cycle.massFactor, 2)}×/${number(cycle.costFactor, 2)}×。`;
    }
    if (key === "engine.coolingKey" && Data.cooling[value]) {
      const cooling = Data.cooling[value];
      return `${cooling.note} 代表壁温 ${number(cooling.wallTempK, 0)} K，质量/成本修正 ${number(cooling.massFactor, 2)}×/${number(cooling.costFactor, 2)}×，${cooling.reusable ? "可重复使用路线" : "消耗性路线"}。`;
    }
    if (key === "engine.batteryKey" && Data.batteries[value]) {
      const battery = Data.batteries[value];
      return `${battery.note} ${number(battery.energyDensityWhKg, 0)} Wh/kg，${number(battery.powerDensityWKg, 0)} W/kg，封装余量 ${number(battery.packOverheadPct, 0)}%。`;
    }
    if (key === "test.bodyKey" && Data.celestialBodies[value]) {
      const body = Data.celestialBodies[value];
      return `${body.atmosphere}；表面重力 ${number(body.gravityMs2, 3)} m/s²，压力 ${formatPressure(body.surfacePressurePa)}，温度 ${number(body.surfaceTemperatureK, 0)} K${body.conceptual ? "。这是概念性环境预设" : ""}。`;
    }
    const isMaterial = /MaterialKey$/.test(key) || key.endsWith("materialKey") || (control && control.classList.contains("material-select"));
    if (isMaterial && Data.materials[value]) {
      const material = Data.materials[value];
      const selected = control && control.selectedOptions && control.selectedOptions[0];
      const temperatureWarning = selected && selected.dataset.temperatureStatus === "incompatible"
        ? `温度警告：材料温区 ${number(material.minTemp, 0)}–${number(material.maxTemp, 0)} K，当前接触/结构温度需要 ${selected.dataset.temperatureRequirement}。`
        : "";
      return `${temperatureWarning}${material.note} 代表值：密度 ${number(material.density, 0)} kg/m³，屈服 ${number(material.yield, 0)} MPa，弹性模量 ${number(material.modulus, 1)} GPa，温区 ${number(material.minTemp, 0)}–${number(material.maxTemp, 0)} K，参考价 ¥${number(material.price, 0)}/kg。`;
    }
    const isProcess = /ProcessKey$/.test(key) || key.endsWith("processKey") || (control && control.classList.contains("process-select"));
    if (isProcess && Data.processes[value]) {
      const process = Data.processes[value];
      return `${process.advantage} 强度修正 ${number(process.strengthFactor, 2)}×，接头效率 ${number(process.weldEfficiency * 100, 0)}%，备料损耗 ${number(process.waste, 2)}×，难度 ${number(process.difficulty, 2)}×。`;
    }
    if (control && control.tagName === "SELECT" && control.selectedOptions && control.selectedOptions[0]) {
      return `当前采用“${control.selectedOptions[0].textContent.trim()}”预设；切换后会立即重新计算相关结果与警告。`;
    }
    return "";
  }

  function controlHelpContainer(control) {
    return control.closest(".mode-option, .switch-field, .field, .launch-option, .launch-field, .sound-option, .sound-range, .preview-atmosphere-control, .zoom-control, .playback-settings label, .energy-toolbar label, .summary-dry-toggle, label");
  }

  function createTextTriggerFromLabel(container, control, labelText) {
    const textNodes = Array.from(container.childNodes).filter(function (node) {
      return node.nodeType === Node.TEXT_NODE && node.textContent.trim();
    });
    if (!textNodes.length) return null;
    const trigger = document.createElement("span");
    trigger.textContent = labelText || textNodes[0].textContent.trim();
    container.replaceChild(trigger, textNodes[0]);
    textNodes.slice(1).forEach(function (node) { node.remove(); });
    return trigger;
  }

  function findControlHelpTrigger(control, manual) {
    const container = controlHelpContainer(control);
    if (!container) return null;
    if (container.classList.contains("mode-option")) {
      const copy = control.nextElementSibling;
      return copy && (copy.querySelector("strong") || copy);
    }
    if (container.classList.contains("switch-field") || container.classList.contains("launch-option") || container.classList.contains("sound-option")) {
      const copy = Array.from(container.children).find(function (child) { return child !== control && child.tagName === "SPAN"; });
      return copy && (copy.querySelector("strong") || copy);
    }
    const candidate = Array.from(container.children).find(function (child) {
      return (child.tagName === "SPAN" || child.tagName === "LABEL") && !child.contains(control);
    });
    if (candidate) return candidate;
    return createTextTriggerFromLabel(container, control, manual && manual.label);
  }

  function readableTriggerText(trigger) {
    if (!trigger) return "参数说明";
    const clone = trigger.cloneNode(true);
    clone.querySelectorAll("small, output, input, select, button").forEach(function (node) { node.remove(); });
    return clone.textContent.replace(/\s+/g, " ").trim() || "参数说明";
  }

  function controlUnit(control, manual) {
    if (manual && manual.unit) return manual.unit;
    const container = controlHelpContainer(control);
    const unitNode = container && container.querySelector("b");
    if (!unitNode) return "";
    const unit = unitNode.textContent.replace(/\s+/g, " ").trim();
    return /推荐|默认|预设|^0\s*=/.test(unit) ? "" : unit;
  }

  function controlParameterText(control, manual) {
    if (control.type === "checkbox") return `当前状态：${control.checked ? "已开启" : "已关闭"}`;
    if (control.type === "radio") return `此选项：${control.checked ? "已选择" : "未选择"} · 参数值 ${control.value}`;
    if (control.tagName === "SELECT") {
      const selected = control.selectedOptions && control.selectedOptions[0];
      return `当前选择：${selected ? selected.textContent.trim() : "—"}`;
    }
    const unit = controlUnit(control, manual);
    const value = control.value === "" ? "空" : `${control.value}${unit ? ` ${unit}` : ""}`;
    if (control.type === "number" || control.type === "range") {
      const range = [];
      if (control.min !== "") range.push(`最小 ${control.min}`);
      if (control.max !== "") range.push(`最大 ${control.max}`);
      if (control.step && control.step !== "any") range.push(`步进 ${control.step}`);
      return `当前值：${value}${range.length ? ` · ${range.join(" · ")}` : ""}`;
    }
    if (control.type === "text") return `当前值：${value}${control.maxLength > 0 ? ` · 最多 ${control.maxLength} 字符` : ""}`;
    return `当前值：${value}`;
  }

  function positionControlTooltip(trigger) {
    if (!els.controlTooltip || !trigger) return;
    els.controlTooltip.hidden = false;
    els.controlTooltip.style.visibility = "hidden";
    els.controlTooltip.style.left = "12px";
    els.controlTooltip.style.top = "12px";
    const triggerRect = trigger.getBoundingClientRect();
    const tooltipRect = els.controlTooltip.getBoundingClientRect();
    let left = triggerRect.left;
    let top = triggerRect.bottom + 9;
    if (left + tooltipRect.width > window.innerWidth - 12) left = window.innerWidth - tooltipRect.width - 12;
    if (top + tooltipRect.height > window.innerHeight - 12) top = triggerRect.top - tooltipRect.height - 9;
    left = clampValue(left, 12, Math.max(12, window.innerWidth - tooltipRect.width - 12));
    top = clampValue(top, 12, Math.max(12, window.innerHeight - tooltipRect.height - 12));
    els.controlTooltip.style.left = `${left}px`;
    els.controlTooltip.style.top = `${top}px`;
    els.controlTooltip.style.visibility = "visible";
  }

  function showControlTooltip(control, trigger, manual) {
    if (!els.controlTooltip || !control || !trigger) return;
    clearTimeout(tooltipState.timerId);
    tooltipState.control = control;
    tooltipState.trigger = trigger;
    const key = control.dataset.bind || (control.dataset.stageBind ? `stage.${control.dataset.stageBind}` : "") || (manual && manual.key) || control.id;
    const optionValue = control.type === "checkbox" ? String(control.checked) : control.value;
    els.controlTooltipTitle.textContent = (manual && manual.label) || readableTriggerText(trigger);
    els.controlTooltipDescription.textContent = (manual && manual.description) || tooltipDescriptionForKey(key);
    els.controlTooltipParameters.textContent = controlParameterText(control, manual);
    const optionHelp = selectedOptionHelp(key, optionValue, control);
    els.controlTooltipOption.textContent = optionHelp;
    els.controlTooltipOption.hidden = !optionHelp;
    positionControlTooltip(trigger);
  }

  function hideControlTooltip(force) {
    clearTimeout(tooltipState.timerId);
    tooltipState.timerId = 0;
    if (!force && tooltipState.pinned) return;
    if (force) tooltipState.pinned = false;
    if (els.controlTooltip) els.controlTooltip.hidden = true;
    tooltipState.control = null;
    tooltipState.trigger = null;
  }

  function registerControlTooltip(control, manual) {
    if (!control || control.dataset.tooltipReady === "true") return;
    const trigger = findControlHelpTrigger(control, manual);
    if (!trigger) return;
    control.dataset.tooltipReady = "true";
    trigger.classList.add("control-help-trigger");
    trigger.dataset.controlHelpTrigger = "true";
    control.setAttribute("aria-describedby", "controlTooltip");
    trigger.addEventListener("pointerenter", function () {
      if (tooltipState.pinned && tooltipState.control === control) return;
      clearTimeout(tooltipState.timerId);
      tooltipState.timerId = setTimeout(function () {
        showControlTooltip(control, trigger, manual);
      }, TOOLTIP_DWELL_MS);
    });
    trigger.addEventListener("pointerleave", function () { hideControlTooltip(false); });
    trigger.addEventListener("click", function () {
      const alreadyPinned = tooltipState.pinned && tooltipState.control === control && !els.controlTooltip.hidden;
      if (alreadyPinned) {
        hideControlTooltip(true);
        return;
      }
      tooltipState.pinned = true;
      showControlTooltip(control, trigger, manual);
    });
    ["input", "change"].forEach(function (eventName) {
      control.addEventListener(eventName, function () {
        if (tooltipState.control === control) showControlTooltip(control, trigger, manual);
      });
    });
  }

  function initializeControlTooltips() {
    document.querySelectorAll("[data-bind], [data-stage-bind]").forEach(function (control) {
      registerControlTooltip(control, null);
    });
    Object.keys(MANUAL_CONTROL_HELP).forEach(function (id) {
      registerControlTooltip(byId(id), MANUAL_CONTROL_HELP[id]);
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") hideControlTooltip(true);
    });
    document.addEventListener("pointerdown", function (event) {
      if (tooltipState.pinned && tooltipState.trigger && !tooltipState.trigger.contains(event.target)) hideControlTooltip(true);
    });
    document.addEventListener("scroll", function () { hideControlTooltip(true); }, true);
    window.addEventListener("resize", function () { hideControlTooltip(true); });
  }

  function stepScaleLabel(exponent) {
    const labels = {
      "-2": "0.01×",
      "-1": "0.1×",
      0: "1×",
      1: "10×",
      2: "100×",
      3: "1k×",
      4: "10k×",
      5: "100k×",
      6: "1M×"
    };
    return labels[String(exponent)] || `${number(Math.pow(10, exponent), 0)}×`;
  }

  function normalizedStepValue(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) return "1";
    return String(Number(numeric.toPrecision(12)));
  }

  function stepScaleKey(input) {
    return input.dataset.bind || (input.dataset.stageBind ? `stage.${input.dataset.stageBind}` : "") || input.id || "";
  }

  function stepScaleBounds(input, baseStep) {
    const key = stepScaleKey(input).replace(/^stage\./, "");
    const discreteCount = /(?:^|\.)(?:engineCount|count|designCycles|countdownSeconds)$/.test(key);
    let minExponent = discreteCount ? 0 : STEP_SCALE_MIN_EXPONENT;
    let maxExponent = STEP_SCALE_MAX_EXPONENT;
    const min = Number(input.getAttribute("min"));
    const max = Number(input.getAttribute("max"));
    if (Number.isFinite(min) && Number.isFinite(max) && max > min) {
      const availableSteps = (max - min) / Math.max(Number.EPSILON, baseStep);
      maxExponent = Math.min(maxExponent, Math.max(0, Math.floor(Math.log10(Math.max(1, availableSteps)) + 1e-12)));
    }
    if (minExponent > maxExponent) minExponent = maxExponent;
    return { minExponent, maxExponent };
  }

  function stepScaleGroupBounds(group) {
    return group.entries.reduce(function (bounds, entry) {
      return {
        minExponent: Math.max(bounds.minExponent, entry.minExponent),
        maxExponent: Math.min(bounds.maxExponent, entry.maxExponent)
      };
    }, { minExponent: STEP_SCALE_MIN_EXPONENT, maxExponent: STEP_SCALE_MAX_EXPONENT });
  }

  function applyStepScaleGroup(key, exponent, persist) {
    const group = stepScaleState.groups.get(key);
    if (!group) return;
    const bounds = stepScaleGroupBounds(group);
    const normalizedExponent = clampValue(Math.round(exponent), bounds.minExponent, bounds.maxExponent);
    group.exponent = normalizedExponent;
    const multiplier = Math.pow(10, normalizedExponent);
    group.entries.forEach(function (entry) {
      const effectiveStep = entry.baseStep * multiplier;
      entry.input.step = normalizedStepValue(effectiveStep);
      entry.input.dataset.stepScaleExponent = String(normalizedExponent);
      entry.input.dataset.effectiveStep = normalizedStepValue(effectiveStep);
      entry.output.value = stepScaleLabel(normalizedExponent);
      entry.output.textContent = stepScaleLabel(normalizedExponent);
      entry.up.disabled = normalizedExponent >= bounds.maxExponent;
      entry.down.disabled = normalizedExponent <= bounds.minExponent;
      entry.control.setAttribute("aria-label", `步进倍率 ${stepScaleLabel(normalizedExponent)}，当前步进 ${normalizedStepValue(effectiveStep)}`);
    });
    if (persist) {
      if (normalizedExponent === 0) delete stepScaleState.values[key];
      else stepScaleState.values[key] = normalizedExponent;
      saveStepScaleSettings();
    }
  }

  function registerStepScaleControl(input) {
    if (!input || input.dataset.stepScaleReady === "true") return;
    const baseStep = Number(input.getAttribute("step"));
    const key = stepScaleKey(input);
    if (!key || !Number.isFinite(baseStep) || baseStep <= 0) return;
    input.dataset.stepScaleReady = "true";
    input.dataset.baseStep = normalizedStepValue(baseStep);

    const wrapper = document.createElement("span");
    wrapper.className = "number-step-wrap";
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);

    const control = document.createElement("span");
    control.className = "step-scale-control";
    control.setAttribute("role", "group");
    const labelTrigger = controlHelpContainer(input) && controlHelpContainer(input).querySelector("[data-control-help-trigger]");
    const fieldName = labelTrigger ? readableTriggerText(labelTrigger) : "参数";

    const up = document.createElement("button");
    up.type = "button";
    up.className = "step-scale-button step-scale-up";
    up.textContent = "▲";
    up.setAttribute("aria-label", `增大“${fieldName}”的步进量级`);

    const output = document.createElement("output");
    output.className = "step-scale-output";
    output.setAttribute("aria-live", "polite");

    const down = document.createElement("button");
    down.type = "button";
    down.className = "step-scale-button step-scale-down";
    down.textContent = "▼";
    down.setAttribute("aria-label", `减小“${fieldName}”的步进量级`);

    control.appendChild(up);
    control.appendChild(output);
    control.appendChild(down);
    wrapper.appendChild(control);

    let group = stepScaleState.groups.get(key);
    if (!group) {
      const storedExponent = Number(stepScaleState.values[key]);
      group = {
        exponent: Number.isFinite(storedExponent) ? clampValue(Math.round(storedExponent), STEP_SCALE_MIN_EXPONENT, STEP_SCALE_MAX_EXPONENT) : 0,
        entries: []
      };
      stepScaleState.groups.set(key, group);
    }
    const bounds = stepScaleBounds(input, baseStep);
    group.entries.push({ input, baseStep, control, up, down, output, minExponent: bounds.minExponent, maxExponent: bounds.maxExponent });
    applyStepScaleGroup(key, group.exponent, false);

    up.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      applyStepScaleGroup(key, group.exponent + 1, true);
    });
    down.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      applyStepScaleGroup(key, group.exponent - 1, true);
    });
  }

  function initializeStepScaleControls() {
    document.querySelectorAll('input[type="number"]').forEach(registerStepScaleControl);
  }

  function populatePropellants() {
    els.propellantSelect.innerHTML = "";
    Object.keys(Data.propellants).forEach(function (key) {
      els.propellantSelect.appendChild(createOption(key, Data.propellants[key].name));
    });
    els.propellantSelect.appendChild(createOption("custom", "自定义推进剂参数"));
  }

  function populateMaterialSelect(select) {
    const groups = {};
    Object.keys(Data.materials).forEach(function (key) {
      const material = Data.materials[key];
      if (!groups[material.category]) groups[material.category] = [];
      groups[material.category].push({ key, material });
    });
    select.innerHTML = "";
    Object.keys(groups).forEach(function (category) {
      const group = document.createElement("optgroup");
      group.label = category;
      groups[category].forEach(function (entry) {
        const option = createOption(entry.key, entry.material.name);
        option.dataset.baseLabel = entry.material.name;
        option.dataset.materialKey = entry.key;
        group.appendChild(option);
      });
      select.appendChild(group);
    });
  }

  function selectedPropellantForMaterialTemperature() {
    return state.config.propellantKey === "custom"
      ? state.config.customPropellant
      : Data.propellants[state.config.propellantKey];
  }

  function selectedBoosterPropellantForMaterialTemperature() {
    if (!state.config.boosters.enabled) return null;
    if (state.config.boosters.propellantMode === "copy-core") return selectedPropellantForMaterialTemperature();
    return Data.propellants[state.config.boosters.propellantKey] || null;
  }

  function uniqueTemperatures(values) {
    const seen = {};
    return values.filter(function (value) {
      const temperature = Number(value);
      if (!Number.isFinite(temperature) || temperature <= 0) return false;
      const key = String(Math.round(temperature * 10) / 10);
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    }).map(Number);
  }

  function tankMaterialTemperatures(path, propellant, tankConfig, includeBoosters) {
    if (!propellant) return [];
    const tanks = tankConfig || state.config.tanks;
    const fuelTemperatureK = Number(propellant.fuelTemperatureK);
    const oxidizerTemperatureK = Number(propellant.oxidizerTemperatureK);
    const bipropellantTemperatures = propellant.mono
      ? [fuelTemperatureK]
      : [fuelTemperatureK, oxidizerTemperatureK];
    const booster = includeBoosters === false ? null : selectedBoosterPropellantForMaterialTemperature();
    const boosterFuelTemperatures = booster ? [Number(booster.fuelTemperatureK)] : [];
    const boosterOxidizerTemperatures = booster && !booster.mono ? [Number(booster.oxidizerTemperatureK)] : [];
    const allFluidTemperatures = bipropellantTemperatures.concat(boosterFuelTemperatures, boosterOxidizerTemperatures);
    if (path === "tanks.materialKey") return uniqueTemperatures(allFluidTemperatures);
    if (path === "tanks.fuelLinerMaterialKey") return uniqueTemperatures([fuelTemperatureK].concat(boosterFuelTemperatures));
    if (path === "tanks.oxidizerLinerMaterialKey") return uniqueTemperatures((propellant.mono ? [] : [oxidizerTemperatureK]).concat(boosterOxidizerTemperatures));
    if (path === "tanks.commonBulkheadFuelMaterialKey") {
      return tanks.commonBulkheadType === "single-sheet"
        ? uniqueTemperatures(allFluidTemperatures)
        : uniqueTemperatures([fuelTemperatureK].concat(boosterFuelTemperatures));
    }
    if (path === "tanks.commonBulkheadOxidizerMaterialKey") {
      return uniqueTemperatures((propellant.mono ? [] : [oxidizerTemperatureK]).concat(boosterOxidizerTemperatures));
    }
    if (path === "tanks.structuralMaterialKey") {
      const legacyFixedSplit = tanks.structureMode === "dual";
      const thermalCoupling = legacyFixedSplit
        ? 0
        : tanks.interfaceMode === "slip"
          ? 0.25
          : clampValue(Number(tanks.interfaceEfficiencyPct) / 100, 0, 1);
      return uniqueTemperatures(allFluidTemperatures.map(function (temperatureK) {
        return 293 + (temperatureK - 293) * thermalCoupling;
      }));
    }
    return [];
  }

  function updateMaterialTemperatureOptions() {
    const propellant = selectedPropellantForMaterialTemperature();
    const activeStage = activeSerialStage();
    const activeStagePropellant = activeStage
      ? (activeStage.propellantKey === "custom" ? activeStage.customPropellant : Data.propellants[activeStage.propellantKey])
      : null;
    const tankSelects = Array.from(document.querySelectorAll('.material-select[data-bind^="tanks."]')).map(function (select) {
      return { select, path: select.dataset.bind, propellant, tanks: state.config.tanks, includeBoosters: true };
    }).concat(Array.from(document.querySelectorAll('.material-select[data-stage-bind^="tanks."]')).map(function (select) {
      return { select, path: select.dataset.stageBind, propellant: activeStagePropellant, tanks: activeStage && activeStage.tanks, includeBoosters: false };
    }));
    tankSelects.forEach(function (entry) {
      const select = entry.select;
      const temperatures = tankMaterialTemperatures(entry.path, entry.propellant, entry.tanks, entry.includeBoosters);
      const requirement = temperatures.map(function (temperatureK) { return `${number(temperatureK, 0)} K`; }).join(" / ");
      let invalidCount = 0;
      Array.from(select.options).forEach(function (option) {
        const material = Data.materials[option.value];
        const baseLabel = option.dataset.baseLabel || (material && material.name) || option.textContent;
        const incompatible = Boolean(material && temperatures.some(function (temperatureK) {
          return temperatureK < material.minTemp || temperatureK > material.maxTemp;
        }));
        option.classList.toggle("is-temperature-incompatible", incompatible);
        option.dataset.temperatureStatus = incompatible ? "incompatible" : "compatible";
        option.dataset.temperatureRequirement = requirement;
        option.textContent = incompatible ? `⚠ ${baseLabel} · 温区不符` : baseLabel;
        option.setAttribute("aria-label", incompatible
          ? `${baseLabel}，温区不符合。材料范围 ${material.minTemp} 到 ${material.maxTemp} K，当前需要 ${requirement}`
          : baseLabel);
        if (incompatible) invalidCount += 1;
      });
      const selectedOption = select.selectedOptions && select.selectedOptions[0];
      const selectedIncompatible = Boolean(selectedOption && selectedOption.dataset.temperatureStatus === "incompatible");
      select.classList.toggle("has-temperature-incompatible-selection", selectedIncompatible);
      select.dataset.temperatureRequirement = requirement;
      select.dataset.temperatureInvalidCount = String(invalidCount);
      if (selectedIncompatible) select.setAttribute("aria-invalid", "true");
      else select.removeAttribute("aria-invalid");
    });
  }

  function populateProcessSelect(select) {
    select.innerHTML = "";
    Object.keys(Data.processes).forEach(function (key) {
      select.appendChild(createOption(key, Data.processes[key].name));
    });
  }

  function populateCelestialBodies() {
    els.environmentScenarioSelect.innerHTML = "";
    Object.keys(Data.celestialBodies).forEach(function (key) {
      const body = Data.celestialBodies[key];
      const gravityRatio = body.gravityMs2 / Core.G0;
      els.environmentScenarioSelect.appendChild(createOption(key, `${body.name} · ${number(gravityRatio, 2)} g`));
    });
  }

  function populateBatteries() {
    els.batterySelect.innerHTML = "";
    Object.keys(Data.batteries).forEach(function (key) {
      const battery = Data.batteries[key];
      els.batterySelect.appendChild(createOption(key, `${battery.name} · ${battery.energyDensityWhKg} Wh/kg · ${battery.powerDensityWKg} W/kg`));
    });
  }

  function selectedHistoricalPreset() {
    if (!els.historicalPresetSelect) return null;
    return Data.historicalRocketPresets[els.historicalPresetSelect.value] || null;
  }

  function renderHistoricalPresetReadout() {
    if (!els.historicalPresetReadout) return;
    const preset = selectedHistoricalPreset();
    if (!preset) {
      els.historicalPresetReadout.innerHTML = "<span>尚未选择历史型号。</span>";
      return;
    }
    const reference = preset.reference || {};
    els.historicalPresetReadout.innerHTML = `
      <strong>${escapeHtml(preset.name)} · ${escapeHtml(preset.year)} · ${escapeHtml(preset.country)}</strong>
      <span>${escapeHtml(preset.role)}</span>
      <div class="readout-grid">
        <span>历史全高 <b>${number(reference.heightM, 1)} m</b></span>
        <span>最大直径 <b>${number(reference.diameterM, 2)} m</b></span>
        <span>起飞质量 <b>${escapeHtml(formatMass(reference.liftoffMassKg))}</b></span>
        <span>起飞推力 <b>${number(reference.thrustKn, 0)} kN</b></span>
        <span>推进剂 <b>${escapeHtml(formatMass(reference.propellantMassKg))}</b></span>
        <span>历史级数 <b>${number(reference.stages, 0)}</b></span>
      </div>
      <span>${escapeHtml(preset.fidelity)}</span>
      <a href="${escapeHtml(preset.sourceUrl)}" target="_blank" rel="noreferrer">${escapeHtml(preset.sourceLabel)} ↗</a>`;
  }

  function populateHistoricalPresets() {
    if (!els.historicalPresetSelect) return;
    els.historicalPresetSelect.innerHTML = "";
    const classicGroup = appendGroup("经典代表");
    Object.keys(Data.historicalRocketPresets).forEach(function (key) {
      const preset = Data.historicalRocketPresets[key];
      classicGroup.appendChild(createOption(key, `${preset.year} · ${preset.name} · ${preset.country}`));
    });
    els.historicalPresetSelect.appendChild(classicGroup);
    if (typeof Data.modernRocketPresets !== "undefined") {
      const modernGroup = appendGroup("现代代表");
      Object.keys(Data.modernRocketPresets).forEach(function (key) {
        const preset = Data.modernRocketPresets[key];
        modernGroup.appendChild(createOption(key, `${preset.year} · ${preset.name} · ${preset.country}`));
      });
      els.historicalPresetSelect.appendChild(modernGroup);
    }
    renderHistoricalPresetReadout();
  }

  function loadHistoricalPreset() {
    const preset = selectedHistoricalPreset();
    if (!preset) {
      showToast("请选择要载入的历史火箭。", true);
      return;
    }
    if (!window.confirm(`载入“${preset.name}”会替换当前未保存的工作参数；方案库不会删除。是否继续？`)) return;
    resetAnimation(false);
    state.recoveryAttempted = false;
    state.result = null;
    state.config = Core.normalizeConfig(deepCopy(preset.config));
    state.designSection = "core";
    state.activeStageIndex = 0;
    state.stageStep = 0;
    fillControls();
    setDesignSection("core", { silent: true });
    setStep(0);
    calculateAndRender();
    showToast(`已载入“${preset.name}”历史复刻；所有参数均可继续微调。`);
  }

  function populateStaticSelects() {
    populateHistoricalPresets();
    populatePropellants();
    populateCelestialBodies();
    populateBatteries();
    document.querySelectorAll(".material-select").forEach(populateMaterialSelect);
    document.querySelectorAll(".process-select").forEach(populateProcessSelect);
    els.cycleSelect.innerHTML = "";
    Object.keys(Data.cycles).forEach(function (key) {
      els.cycleSelect.appendChild(createOption(key, Data.cycles[key].name));
    });
    els.boosterCycleSelect.innerHTML = "";
    Object.keys(Data.cycles).forEach(function (key) {
      els.boosterCycleSelect.appendChild(createOption(key, Data.cycles[key].name));
    });
    els.boosterPropellantSelect.innerHTML = "";
    Object.keys(Data.propellants).forEach(function (key) {
      els.boosterPropellantSelect.appendChild(createOption(key, Data.propellants[key].name));
    });
    els.coolingSelect.innerHTML = "";
    Object.keys(Data.cooling).forEach(function (key) {
      els.coolingSelect.appendChild(createOption(key, Data.cooling[key].name));
    });
    els.stagePropellantSelect.innerHTML = "";
    Object.keys(Data.propellants).forEach(function (key) {
      els.stagePropellantSelect.appendChild(createOption(key, Data.propellants[key].name));
    });
    els.stagePropellantSelect.appendChild(createOption("custom", "本级自定义推进剂"));
    els.stageCycleSelect.innerHTML = "";
    Object.keys(Data.cycles).forEach(function (key) {
      els.stageCycleSelect.appendChild(createOption(key, Data.cycles[key].name));
    });
    els.stageCoolingSelect.innerHTML = "";
    Object.keys(Data.cooling).forEach(function (key) {
      els.stageCoolingSelect.appendChild(createOption(key, Data.cooling[key].name));
    });
  }

  function syncEnvironmentControls() {
    if (!els.environmentScenarioSelect) return;
    const body = Data.celestialBodies[state.config.test.bodyKey] || Data.celestialBodies.earth;
    els.environmentScenarioSelect.value = state.config.test.bodyKey;
    const mode = state.config.test.environment === "vacuum" ? "强制真空" : body.atmosphere;
    if (els.animationEnvironment) els.animationEnvironment.textContent = `${body.name} · ${number(body.gravityMs2 / Core.G0, 2)} g · ${mode}`;
  }

  function syncLaunchControls() {
    if (!els.launchSequenceSettings) return;
    const vehicle = state.config.vehicle;
    els.countdownEnabled.checked = vehicle.countdownEnabled;
    els.immersiveLaunch.checked = vehicle.immersiveLaunch;
    els.autoPauseAfterBurnout.checked = vehicle.pauseAfterBurnout;
    els.countdownSeconds.value = String(vehicle.countdownSeconds);
    els.countdownSeconds.disabled = !vehicle.countdownEnabled;
    els.launchModeSelect.value = vehicle.launchMode;
    els.engineStartupSeconds.value = String(vehicle.engineStartupS);
    const countdownLabel = vehicle.countdownEnabled ? `T-${vehicle.countdownSeconds}` : "无倒计时";
    const immersiveLabel = vehicle.immersiveLaunch ? "语音 / 1×" : "普通播放";
    const modeLabel = vehicle.launchMode === "pad" ? "发射场摇臂" : "野地无发射架";
    const coastLabel = vehicle.pauseAfterBurnout ? "熄火后暂停" : "连续惯性滑行";
    els.launchSequenceStatus.textContent = `${countdownLabel} · ${immersiveLabel} · ${modeLabel} · ${coastLabel}`;
  }

  function applyLaunchControls() {
    if (state.animation.mode) resetAnimation(false);
    state.config.vehicle.countdownEnabled = els.countdownEnabled.checked;
    state.config.vehicle.immersiveLaunch = els.immersiveLaunch.checked;
    state.config.vehicle.pauseAfterBurnout = els.autoPauseAfterBurnout.checked;
    state.config.vehicle.countdownSeconds = Number(els.countdownSeconds.value);
    state.config.vehicle.launchMode = els.launchModeSelect.value;
    state.config.vehicle.engineStartupS = Number(els.engineStartupSeconds.value);
    state.config = Core.normalizeConfig(state.config);
    syncLaunchControls();
    scheduleCalculate();
  }

  function fillControls() {
    document.querySelectorAll("[data-bind]").forEach(function (control) {
      const value = getPath(state.config, control.dataset.bind);
      if (control.type === "radio") {
        control.checked = control.value === value;
      } else if (control.type === "checkbox") {
        control.checked = Boolean(value);
      } else {
        control.value = value == null ? "" : value;
      }
    });
    syncConditionalFields();
    syncEnvironmentControls();
    syncLaunchControls();
    syncEnergyControls();
    syncAutoNameControls();
    updateMaterialTemperatureOptions();
    renderSerialStageNav();
    fillSerialStageControls();
  }

  function syncEnergyControls() {
    if (!els.energyCutoffMode) return;
    els.energyCutoffMode.value = state.config.test.energyCutoffMode;
    els.energyCoastPercent.value = state.config.test.energyCoastPercent;
    els.energyCoastField.hidden = state.config.test.energyCutoffMode !== "post-burn";
  }

  function applyEnergyControls() {
    state.config.test.energyCutoffMode = els.energyCutoffMode.value;
    state.config.test.energyCoastPercent = Number(els.energyCoastPercent.value);
    state.config = Core.normalizeConfig(state.config);
    syncEnergyControls();
    scheduleCalculate();
  }

  function activeSerialStage() {
    if (!Array.isArray(state.config.stages) || !state.config.stages.length) return null;
    state.activeStageIndex = Math.max(0, Math.min(state.config.stages.length - 1, state.activeStageIndex));
    return state.config.stages[state.activeStageIndex];
  }

  function stageNumberText(index) {
    return String(index + 2).padStart(2, "0");
  }

  function previousStageName(index) {
    if (index <= 0) return "芯级 / 第一级";
    const previous = state.config.stages[index - 1];
    return previous ? previous.name : `第${index + 1}级`;
  }

  function renderSerialStageNav() {
    if (!els.designSectionNav || !els.addSerialStageBtn) return;
    els.designSectionNav.querySelectorAll("[data-serial-stage-button]").forEach(function (button) { button.remove(); });
    state.config.stages.forEach(function (stage, index) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "design-section-button";
      button.dataset.designSectionButton = `stage-${index}`;
      button.dataset.serialStageButton = "";
      button.dataset.stageIndex = String(index);
      button.setAttribute("aria-pressed", String(state.designSection === `stage-${index}`));
      button.innerHTML = `<span>STAGE ${stageNumberText(index)}</span>${escapeHtml(stage.name)}${stage.enabled ? "" : " · 已关闭"}`;
      if (state.designSection === `stage-${index}`) button.classList.add("is-active");
      els.designSectionNav.insertBefore(button, els.addSerialStageBtn);
    });
    els.addSerialStageBtn.disabled = state.config.stages.length >= 7;
    els.addSerialStageBtn.querySelector("span").textContent = state.config.stages.length >= 7 ? "MAX STAGE 08" : "ADD STAGE";
  }

  function setSerialStageStep(index) {
    state.stageStep = Math.max(0, Math.min(4, Number(index) || 0));
    document.querySelectorAll("[data-stage-step]").forEach(function (section) {
      section.classList.toggle("is-active", Number(section.dataset.stageStep) === state.stageStep);
    });
    document.querySelectorAll("[data-stage-step-button]").forEach(function (button) {
      button.classList.toggle("is-active", Number(button.dataset.stageStepButton) === state.stageStep);
    });
    if (state.designSection.indexOf("stage-") === 0) {
      els.stepCount.textContent = `S${stageNumberText(state.activeStageIndex)} · ${state.stageStep + 1}/5`;
      els.prevStepBtn.textContent = state.stageStep === 0 ? "返回芯级" : "上一步";
      els.prevStepBtn.disabled = false;
      const hasNextStage = state.activeStageIndex < state.config.stages.length - 1;
      els.nextStepBtn.textContent = state.stageStep < 4 ? "下一步" : hasNextStage ? "下一级" : "返回芯级";
    }
  }

  function syncSerialStageConditionalFields() {
    const stage = activeSerialStage();
    if (!stage) return;
    document.querySelectorAll("[data-stage-sizing]").forEach(function (field) {
      field.hidden = field.dataset.stageSizing !== stage.sizingMode;
    });
    document.querySelectorAll("[data-stage-diameter]").forEach(function (field) {
      field.hidden = field.dataset.stageDiameter !== stage.tanks.diameterMode;
    });
    document.querySelectorAll("[data-stage-layered-tank]").forEach(function (field) {
      field.hidden = !["dual", "load-sharing", "copv"].includes(stage.tanks.structureMode);
    });
    document.querySelectorAll("[data-stage-manual-expansion]").forEach(function (field) {
      field.hidden = Boolean(stage.engine.autoExpansion);
    });
  }

  function renderSerialStageReadouts() {
    const stage = activeSerialStage();
    if (!stage || !els.serialStageReadout) return;
    const propellant = stage.propellantKey === "custom" ? stage.customPropellant : Data.propellants[stage.propellantKey];
    const separationMode = Data.stageSeparationModes[stage.separation.mode] || Data.stageSeparationModes.cold;
    const configuredResult = state.result && state.result.serial && state.result.serial.configuredStages
      ? state.result.serial.configuredStages.find(function (entry) { return entry.index === state.activeStageIndex; })
      : null;
    const stageResult = configuredResult && configuredResult.result;
    els.serialStageCarryNote.textContent = `${stage.name}与${previousStageName(state.activeStageIndex)}连接；本级携带其上方全部已启用级段与最终载荷。`;
    if (!stage.enabled) {
      els.serialStageReadout.innerHTML = `<strong>${escapeHtml(stage.name)}已关闭</strong><span>参数仍保存在方案中；重新开启后会恢复参与质量、成本、可靠性和逐级 Δv 计算。</span>`;
    } else if (stageResult) {
      els.serialStageReadout.innerHTML = `<strong>${escapeHtml(stage.name)} · ${escapeHtml(propellant.shortName || propellant.name)} · ${escapeHtml(stageResult.engine.cycle.name)}</strong>
        <div class="readout-grid">
          <span>携带上方质量 <b>${formatMass(stageResult.masses.payloadKg)}</b></span>
          <span>可用推进剂 <b>${formatMass(stageResult.masses.usablePropellantKg)}</b></span>
          <span>本级湿重 / 干重 <b>${formatMass(stageResult.masses.wetMassKg)} / ${formatMass(stageResult.masses.vehicleDryMassKg)}</b></span>
          <span>本级理想 Δv <b>${number(stageResult.performance.idealDeltaV, 0)} m/s</b></span>
          <span>真空推力 / 燃时 <b>${number(stageResult.performance.totalThrustN / 1000, 1)} kN / ${number(stageResult.performance.burnTimeS, 1)} s</b></span>
          <span>直径 / 长度 <b>${number(stageResult.geometry.diameterM, 2)} / ${number(stageResult.geometry.vehicleLengthM, 2)} m</b></span>
        </div>`;
    } else {
      els.serialStageReadout.innerHTML = `<strong>${escapeHtml(stage.name)}等待计算</strong>`;
    }
    const mixText = propellant.mono ? "单组元" : `O/F ${number(stage.engine.mixtureRatioOverride > 0 ? stage.engine.mixtureRatioOverride : propellant.mixtureRatio, 2)}`;
    els.serialStagePropellantReadout.innerHTML = `<strong>${escapeHtml(propellant.name)} · ${mixText}</strong>
      <div class="readout-grid"><span>燃料密度 <b>${number(propellant.fuelDensity, 0)} kg/m³</b></span><span>氧化剂密度 <b>${propellant.mono ? "—" : `${number(propellant.oxidizerDensity, 0)} kg/m³`}</b></span><span>海平面 / 真空比冲 <b>${number(propellant.ispSea, 0)} / ${number(propellant.ispVac, 0)} s</b></span><span>储存性 <b>${escapeHtml(propellant.storability)}</b></span></div>`;
    const separation = stageResult ? stageResult.separation : null;
    const motorText = separationMode.fixedMotors
      ? `${separationMode.fixedMotors.count} 台 × ${number(separationMode.fixedMotors.thrustKnEach, 1)} kN × ${number(separationMode.fixedMotors.burnTimeS, 1)} s，固定固体推进剂 ${number(separationMode.fixedMotors.propellantKgEach, 1)} kg/台`
      : "无固定小固推电机";
    els.serialStageSeparationReadout.innerHTML = `<strong>${escapeHtml(separationMode.name)}</strong>
      <span>${escapeHtml(separationMode.description)}</span>
      <div class="readout-grid">
        <span>预设分离速度 <b>${number(separationMode.separationVelocityMs, 2)} m/s</b></span>
        <span>名义无推力滑行 <b>${number(separationMode.nominalCoastS, 2)} s</b></span>
        <span>上级提前点火重叠 <b>${number(separationMode.ignitionOverlapS, 2)} s</b></span>
        <span>系统质量 / 成本 <b>${separation ? `${formatMass(separation.totalMassKg)} / ${formatMoney(separation.costCny)}` : "待计算"}</b></span>
        <span class="full-span">固定分离动力 <b>${escapeHtml(motorText)}</b></span>
      </div>
      <span>${escapeHtml(separationMode.risk)}</span>`;
    [els.stagePropellantCopySource, els.stageTankCopySource, els.stageEngineCopySource].forEach(function (label) {
      if (label) label.textContent = `前一级来源：${previousStageName(state.activeStageIndex)}`;
    });
  }

  function fillSerialStageControls() {
    const stage = activeSerialStage();
    if (!stage) return;
    document.querySelectorAll("[data-stage-bind]").forEach(function (control) {
      const value = getPath(stage, control.dataset.stageBind);
      if (control.type === "checkbox") control.checked = Boolean(value);
      else control.value = value == null ? "" : value;
    });
    els.serialStageKicker.textContent = `SERIAL STAGE ${stageNumberText(state.activeStageIndex)}`;
    els.serialStageHeading.textContent = `${stage.name}设计`;
    els.deleteSerialStageBtn.hidden = state.activeStageIndex < 2;
    syncSerialStageConditionalFields();
    updateMaterialTemperatureOptions();
    setSerialStageStep(state.stageStep);
    renderSerialStageReadouts();
  }

  function serialStageGroup(stage, group) {
    if (group === "propellant") {
      return {
        propellantKey: stage.propellantKey,
        customPropellant: deepCopy(stage.customPropellant),
        mixtureRatioOverride: stage.engine.mixtureRatioOverride
      };
    }
    return deepCopy(stage[group]);
  }

  function applySerialStageGroup(stage, group, payload) {
    if (group === "propellant") {
      stage.propellantKey = payload.propellantKey;
      stage.customPropellant = deepCopy(payload.customPropellant);
      stage.engine.mixtureRatioOverride = Number(payload.mixtureRatioOverride) || 0;
    } else {
      stage[group] = deepCopy(payload);
    }
  }

  function previousSerialStageGroup(index, group) {
    if (index > 0) return serialStageGroup(state.config.stages[index - 1], group);
    if (group === "propellant") {
      return { propellantKey: state.config.propellantKey, customPropellant: deepCopy(state.config.customPropellant), mixtureRatioOverride: state.config.engine.mixtureRatioOverride };
    }
    return deepCopy(state.config[group]);
  }

  function copyPreviousSerialStageGroup(group) {
    const stage = activeSerialStage();
    if (!stage) return;
    applySerialStageGroup(stage, group, previousSerialStageGroup(state.activeStageIndex, group));
    state.config = Core.normalizeConfig(state.config);
    renderSerialStageNav();
    fillSerialStageControls();
    scheduleCalculate();
    showToast(`已把${previousStageName(state.activeStageIndex)}的${group === "propellant" ? "推进剂" : group === "tanks" ? "储箱" : "发动机"}参数粘贴到${stage.name}，现在可以继续微调。`);
  }

  function copySerialStageGroup(group) {
    const stage = activeSerialStage();
    if (!stage) return;
    state.stageClipboard[group] = serialStageGroup(stage, group);
    showToast(`已复制${stage.name}的${group === "propellant" ? "推进剂" : group === "tanks" ? "储箱" : "发动机"}参数。`);
  }

  function pasteSerialStageGroup(group) {
    const stage = activeSerialStage();
    if (!stage) return;
    if (!state.stageClipboard[group]) {
      showToast("剪贴板中还没有这一类参数；请先复制本级或直接粘贴前一级。", true);
      return;
    }
    applySerialStageGroup(stage, group, state.stageClipboard[group]);
    state.config = Core.normalizeConfig(state.config);
    renderSerialStageNav();
    fillSerialStageControls();
    scheduleCalculate();
    showToast(`已粘贴到${stage.name}，复制来源不再与本级联动。`);
  }

  function addSerialStage() {
    if (state.config.stages.length >= 7) return;
    const newIndex = state.config.stages.length;
    const stageNumber = newIndex + 2;
    const previous = state.config.stages[newIndex - 1];
    const stage = Data.createDefaultSerialStage(stageNumber);
    if (previous) {
      stage.propellantKey = previous.propellantKey;
      stage.customPropellant = deepCopy(previous.customPropellant);
      stage.tanks = deepCopy(previous.tanks);
      stage.engine = deepCopy(previous.engine);
      stage.airframe = deepCopy(previous.airframe);
      stage.propellantMassKg = Math.max(100, previous.propellantMassKg * 0.55);
      stage.targetThrustKn = Math.max(1, previous.targetThrustKn * 0.55);
      stage.tanks.diameterM = Math.max(0.2, previous.tanks.diameterM * 0.82);
      stage.separation.mode = "mechanical";
    }
    state.config.stages.push(stage);
    state.config = Core.normalizeConfig(state.config);
    state.activeStageIndex = newIndex;
    state.stageStep = 0;
    renderSerialStageNav();
    setDesignSection(`stage-${newIndex}`, { silent: true });
    scheduleCalculate();
    showToast(`已增加${state.config.stages[newIndex].name}；推进剂、储箱和发动机以相邻上一级为起点，可继续微调。`);
  }

  function deleteActiveSerialStage() {
    if (state.activeStageIndex < 2 || state.config.stages.length <= 2) return;
    const removed = state.config.stages[state.activeStageIndex];
    state.config.stages.splice(state.activeStageIndex, 1);
    state.config = Core.normalizeConfig(state.config);
    state.activeStageIndex = Math.max(0, state.activeStageIndex - 1);
    state.stageStep = 0;
    renderSerialStageNav();
    setDesignSection(`stage-${state.activeStageIndex}`, { silent: true });
    scheduleCalculate();
    showToast(`已删除${removed.name}。`);
  }

  function syncAutoNameControls() {
    if (!els.designNameInput) return;
    const automaticName = Core.generateDesignName(state.config, state.result);
    els.designNameInput.disabled = Boolean(state.config.autoName);
    els.autoNamePreview.textContent = state.config.autoName
      ? `当前：${automaticName}`
      : `自动示例：${automaticName}`;
  }

  function readControl(control) {
    if (control.type === "radio") {
      if (!control.checked) return;
      return control.value;
    }
    if (control.type === "checkbox") return control.checked;
    if (control.type === "number" || control.type === "range") {
      const value = Number(control.value);
      return Number.isFinite(value) ? value : 0;
    }
    return control.value;
  }

  function syncBoundPeers(source, value) {
    document.querySelectorAll(`[data-bind="${source.dataset.bind}"]`).forEach(function (peer) {
      if (peer === source) return;
      if (peer.type === "radio") peer.checked = peer.value === value;
      else if (peer.type === "checkbox") peer.checked = Boolean(value);
      else peer.value = value == null ? "" : value;
    });
  }

  function updatePriceFromMaterial(path, materialKey) {
    const material = Data.materials[materialKey];
    if (!material) return;
    const priceMap = {
      "tanks.materialKey": "cost.tankPriceCnyKg",
      "engine.pumpMaterialKey": "cost.pumpPriceCnyKg",
      "engine.chamberMaterialKey": "cost.hotPriceCnyKg",
      "airframe.materialKey": "cost.airframePriceCnyKg"
    };
    if (priceMap[path]) {
      setPath(state.config, priceMap[path], material.price);
      const priceControl = document.querySelector(`[data-bind="${priceMap[path]}"]`);
      if (priceControl) priceControl.value = material.price;
    }
  }

  function applyPropellantReferencePrices(propellantKey) {
    const propellant = propellantKey === "custom" ? state.config.customPropellant : Data.propellants[propellantKey];
    if (!propellant) return;
    state.config.cost.fuelPriceCnyKg = Number(propellant.fuelPriceCnyKg) || 0;
    state.config.cost.oxidizerPriceCnyKg = Number(propellant.oxidizerPriceCnyKg) || 0;
    ["fuelPriceCnyKg", "oxidizerPriceCnyKg"].forEach(function (key) {
      const control = document.querySelector(`[data-bind="cost.${key}"]`);
      if (control) control.value = state.config.cost[key];
    });
  }

  function resetStructuralFactor() {
    state.config.vehicle.structuralFactor = Data.defaultConfig.vehicle.structuralFactor;
    state.config = Core.normalizeConfig(state.config);
    fillControls();
    scheduleCalculate();
    showToast(`经验结构系数已恢复为 ${number(Data.defaultConfig.vehicle.structuralFactor, 3)}。`);
  }

  function resetPriceTuning() {
    const propellant = state.config.propellantKey === "custom" ? state.config.customPropellant : Data.propellants[state.config.propellantKey];
    const priceOf = function (materialKey, fallback) {
      return Data.materials[materialKey] ? Data.materials[materialKey].price : fallback;
    };
    const referencePrice = function (value, fallback) {
      const numeric = Number(value);
      return Number.isFinite(numeric) ? numeric : fallback;
    };
    state.config.cost.assemblyFactor = Data.defaultConfig.cost.assemblyFactor;
    state.config.cost.priceScale = 1;
    state.config.cost.fuelPriceCnyKg = referencePrice(propellant && propellant.fuelPriceCnyKg, Data.defaultConfig.cost.fuelPriceCnyKg);
    state.config.cost.oxidizerPriceCnyKg = referencePrice(propellant && propellant.oxidizerPriceCnyKg, Data.defaultConfig.cost.oxidizerPriceCnyKg);
    state.config.cost.tankPriceCnyKg = priceOf(state.config.tanks.materialKey, Data.defaultConfig.cost.tankPriceCnyKg);
    state.config.cost.pumpPriceCnyKg = priceOf(state.config.engine.pumpMaterialKey, Data.defaultConfig.cost.pumpPriceCnyKg);
    state.config.cost.hotPriceCnyKg = priceOf(state.config.engine.chamberMaterialKey, Data.defaultConfig.cost.hotPriceCnyKg);
    state.config.cost.airframePriceCnyKg = priceOf(state.config.airframe.materialKey, Data.defaultConfig.cost.airframePriceCnyKg);
    state.config = Core.normalizeConfig(state.config);
    fillControls();
    scheduleCalculate();
    showToast("价格、装配系数与当前材料参考价已恢复默认；总体修正为 1.00×。");
  }

  function onBoundControl(event) {
    const control = event.target.closest("[data-bind]");
    if (!control) return;
    const value = readControl(control);
    if (value === undefined) return;
    if (state.animation.mode) resetAnimation(false);
    setPath(state.config, control.dataset.bind, value);
    syncBoundPeers(control, value);
    if (control.dataset.bind === "propellantKey") applyPropellantReferencePrices(value);
    if (control.dataset.bind === "tanks.structureMode") {
      const presets = {
        copv: { structuralMaterialKey: "copv-carbon", processKey: "filament-wound", interfaceMode: "slip" },
        stiffened: { materialKey: "al-2219", processKey: "integral-grid" },
        sandwich: { materialKey: "al-2219", processKey: "sandwich-bonded" },
        balloon: { materialKey: "ss-304l", processKey: "sheet-weld" },
        "load-sharing": { processKey: "sheet-weld" }
      };
      const preset = presets[value];
      if (preset) {
        Object.keys(preset).forEach(function (key) { state.config.tanks[key] = preset[key]; });
        document.querySelectorAll('[data-bind^="tanks."]').forEach(function (tankControl) {
          const tankValue = getPath(state.config, tankControl.dataset.bind);
          if (tankValue != null && tankControl.type !== "checkbox") tankControl.value = tankValue;
        });
      }
    }
    if (control.dataset.bind.endsWith("materialKey")) updatePriceFromMaterial(control.dataset.bind, value);
    syncConditionalFields();
    syncEnvironmentControls();
    syncAutoNameControls();
    updateMaterialTemperatureOptions();
    scheduleCalculate();
  }

  function onStageBoundControl(event) {
    const control = event.target.closest("[data-stage-bind]");
    if (!control) return;
    const stage = activeSerialStage();
    if (!stage) return;
    const value = readControl(control);
    if (value === undefined) return;
    if (state.animation.mode) resetAnimation(false);
    const path = control.dataset.stageBind;
    setPath(stage, path, value);
    if (path === "tanks.structureMode") {
      const presets = {
        copv: { structuralMaterialKey: "copv-carbon", processKey: "filament-wound", interfaceMode: "slip" },
        stiffened: { materialKey: "al-2219", processKey: "integral-grid" },
        sandwich: { materialKey: "al-2219", processKey: "sandwich-bonded" },
        balloon: { materialKey: "ss-304l", processKey: "sheet-weld" },
        "load-sharing": { processKey: "sheet-weld" }
      };
      const preset = presets[value];
      if (preset) Object.keys(preset).forEach(function (key) { stage.tanks[key] = preset[key]; });
      fillSerialStageControls();
    }
    syncSerialStageConditionalFields();
    updateMaterialTemperatureOptions();
    if (["name", "enabled"].includes(path)) renderSerialStageNav();
    if (["propellantKey", "separation.mode"].includes(path)) renderSerialStageReadouts();
    syncAutoNameControls();
    scheduleCalculate();
  }

  function syncConditionalFields() {
    document.querySelectorAll("[data-mode-fields]").forEach(function (group) {
      group.hidden = group.dataset.modeFields !== state.config.sizingMode;
    });
    document.querySelectorAll("[data-mass-kind]").forEach(function (field) {
      field.hidden = field.dataset.massKind !== state.config.sizing.massInputKind;
    });
    document.querySelectorAll("[data-diameter-mode]").forEach(function (field) {
      field.hidden = field.dataset.diameterMode !== state.config.tanks.diameterMode;
    });
    document.querySelectorAll("[data-booster-enabled]").forEach(function (field) {
      field.hidden = !state.config.boosters.enabled;
    });
    document.querySelectorAll("[data-booster-sizing]").forEach(function (field) {
      field.hidden = field.dataset.boosterSizing !== state.config.boosters.sizingMode;
    });
    document.querySelectorAll("[data-booster-propellant]").forEach(function (field) {
      field.hidden = field.dataset.boosterPropellant !== state.config.boosters.propellantMode;
    });
    document.querySelectorAll("[data-booster-diameter]").forEach(function (field) {
      field.hidden = field.dataset.boosterDiameter !== state.config.boosters.diameterMode;
    });
    document.querySelectorAll("[data-booster-engine]").forEach(function (field) {
      field.hidden = field.dataset.boosterEngine !== state.config.boosters.engineMode;
    });
    document.querySelectorAll("[data-booster-delta-v]").forEach(function (field) {
      field.hidden = state.config.sizingMode !== "delta-v";
    });
    const boosterSectionButton = document.querySelector('[data-design-section-button="boosters"]');
    if (boosterSectionButton) {
      boosterSectionButton.classList.toggle("is-locked", !state.config.boosters.enabled);
      boosterSectionButton.setAttribute("aria-disabled", String(!state.config.boosters.enabled));
    }
    if (!state.config.boosters.enabled && state.designSection === "boosters") {
      setDesignSection("core", { silent: true });
    }
    document.querySelectorAll("[data-expansion-manual]").forEach(function (field) {
      field.hidden = Boolean(state.config.engine.autoExpansion);
    });
    document.querySelectorAll("[data-liftoff-target]").forEach(function (field) {
      field.hidden = field.dataset.liftoffTarget !== state.config.vehicle.liftoffTargetMode;
    });
    document.querySelectorAll("[data-electric-battery]").forEach(function (field) {
      field.hidden = state.config.engine.cycleKey !== "electric-pump";
    });
    document.querySelectorAll("[data-battery-custom]").forEach(function (field) {
      field.hidden = state.config.engine.batteryKey !== "custom";
    });
    const selectedPropellant = state.config.propellantKey === "custom" ? state.config.customPropellant : Data.propellants[state.config.propellantKey];
    document.querySelectorAll("[data-bipropellant-cost]").forEach(function (field) {
      field.hidden = Boolean(selectedPropellant && selectedPropellant.mono);
    });
    document.querySelectorAll("[data-tank-structure]").forEach(function (field) {
      const allowedModes = field.dataset.tankStructure.split(",");
      const wrongMode = allowedModes.indexOf(state.config.tanks.structureMode) < 0;
      const unusedOxidizer = field.hasAttribute("data-bipropellant-tank") && Boolean(selectedPropellant && selectedPropellant.mono);
      field.hidden = wrongMode || unusedOxidizer;
    });
    document.querySelectorAll("[data-tank-geometry]").forEach(function (field) {
      field.hidden = field.dataset.tankGeometry !== state.config.tanks.geometryMode || Boolean(selectedPropellant && selectedPropellant.mono);
    });
    document.querySelectorAll("[data-common-bulkhead-type]").forEach(function (field) {
      const allowedTypes = field.dataset.commonBulkheadType.split(",");
      field.hidden = state.config.tanks.geometryMode !== "common-bulkhead" || allowedTypes.indexOf(state.config.tanks.commonBulkheadType) < 0 || Boolean(selectedPropellant && selectedPropellant.mono);
    });
    document.querySelectorAll("[data-common-bulkhead-pressure]").forEach(function (field) {
      const allowedTypes = field.hasAttribute("data-common-bulkhead-type") ? field.dataset.commonBulkheadType.split(",") : null;
      const wrongType = allowedTypes && allowedTypes.indexOf(state.config.tanks.commonBulkheadType) < 0;
      field.hidden = state.config.tanks.geometryMode !== "common-bulkhead" || wrongType || field.dataset.commonBulkheadPressure !== state.config.tanks.commonBulkheadPressureMode || Boolean(selectedPropellant && selectedPropellant.mono);
    });
    document.querySelectorAll("[data-scale-control]").forEach(function (field) {
      field.hidden = state.view !== "scale";
    });
    els.customPropDetails.open = state.config.propellantKey === "custom";
  }

  function scheduleCalculate() {
    clearTimeout(state.renderTimer);
    state.renderTimer = setTimeout(calculateAndRender, 55);
  }

  function calculateAndRender() {
    try {
      state.config = Core.normalizeConfig(state.config);
      state.result = Core.calculateDesign(state.config);
      if (state.config.autoName) {
        state.config.name = state.result.config.name;
        state.result.config.name = state.config.name;
        els.designNameInput.value = state.config.name;
      }
      saveCurrentConfig();
      renderAll();
      state.recoveryAttempted = false;
    } catch (error) {
      console.error(error);
      if (!state.recoveryAttempted) {
        state.recoveryAttempted = true;
        resetAnimation(false);
        state.result = null;
        state.config = Core.normalizeConfig(deepCopy(Data.defaultConfig));
        state.designSection = "core";
        state.activeStageIndex = 0;
        state.stageStep = 0;
        fillControls();
        setStep(0);
        calculateAndRender();
        showToast(state.recoveryAttempted
          ? "默认方案仍无法显示，请重新加载页面；已保存的方案库未删除。"
          : "当前工作配置无法完整计算，已自动恢复默认可用火箭；已保存的方案库未删除。", true);
        return;
      }
      els.statusText.textContent = "计算失败";
      els.statusDot.className = "status-dot has-error";
      showToast(`计算失败：${error.message || error}`, true);
    }
  }

  function restoreDefaultDesign() {
    if (!window.confirm("恢复默认火箭会替换当前未保存的工作参数；方案库中的已保存方案不会删除。是否继续？")) return;
    resetAnimation(false);
    state.recoveryAttempted = false;
    state.result = null;
    state.config = Core.normalizeConfig(deepCopy(Data.defaultConfig));
    state.designSection = "core";
    state.activeStageIndex = 0;
    state.stageStep = 0;
    fillControls();
    setDesignSection("core", { silent: true });
    setStep(0);
    calculateAndRender();
    showToast("已加载默认可用火箭；方案库保持不变。");
  }

  function setDesignSection(section, options) {
    const stageMatch = /^stage-(\d+)$/.exec(section || "");
    let nextSection = ["core", "boosters"].includes(section) || stageMatch ? section : "core";
    const settings = options || {};
    if (nextSection === "boosters" && !state.config.boosters.enabled) {
      if (!settings.silent) showToast("请先在“任务”页启用并联助推器。", true);
      nextSection = "core";
    }
    if (stageMatch) {
      const requestedIndex = Number(stageMatch[1]);
      if (!state.config.stages[requestedIndex]) nextSection = "core";
      else state.activeStageIndex = requestedIndex;
    }
    state.designSection = nextSection;
    document.querySelectorAll("[data-design-section-button]").forEach(function (button) {
      const active = button.dataset.designSectionButton === nextSection;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
      if (button.dataset.designSectionButton === "boosters") {
        button.classList.toggle("is-locked", !state.config.boosters.enabled);
        button.setAttribute("aria-disabled", String(!state.config.boosters.enabled));
      }
    });
    const isCore = nextSection === "core";
    const isSerialStage = nextSection.indexOf("stage-") === 0;
    const pageKey = isSerialStage ? "serial" : nextSection;
    els.coreStepNav.hidden = !isCore;
    document.querySelectorAll(".wizard-step[data-step]").forEach(function (sectionElement) {
      sectionElement.classList.toggle("is-active", isCore && Number(sectionElement.dataset.step) === state.step);
    });
    document.querySelectorAll("[data-design-section-page]").forEach(function (page) {
      page.classList.toggle("is-active", page.dataset.designSectionPage === pageKey);
    });
    if (isCore) {
      els.stepCount.textContent = `${state.step + 1} / 5`;
      els.prevStepBtn.textContent = "上一步";
      els.prevStepBtn.disabled = state.step === 0;
      els.nextStepBtn.textContent = state.step === 4 ? "回到第一步" : "下一步";
    } else if (isSerialStage) {
      fillSerialStageControls();
      setSerialStageStep(state.stageStep);
    } else {
      els.stepCount.textContent = "助推器";
      els.prevStepBtn.textContent = "返回芯级";
      els.prevStepBtn.disabled = false;
      els.nextStepBtn.textContent = "返回芯级";
    }
  }

  function setStep(index) {
    state.step = Math.max(0, Math.min(4, index));
    document.querySelectorAll("[data-step-button]").forEach(function (button) {
      button.classList.toggle("is-active", Number(button.dataset.stepButton) === state.step);
    });
    setDesignSection("core", { silent: true });
  }

  function setResultTab(tab) {
    state.resultTab = tab;
    document.querySelectorAll("[data-result-tab]").forEach(function (button) {
      const active = button.dataset.resultTab === tab;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", String(active));
    });
    document.querySelectorAll("[data-result-panel]").forEach(function (panel) {
      panel.classList.toggle("is-active", panel.dataset.resultPanel === tab);
    });
  }

  function renderDataList(container, rows) {
    container.innerHTML = `<div class="data-list">${rows.map(function (row) {
      return `<div class="data-row"><span>${escapeHtml(row[0])}</span><strong>${escapeHtml(row[1])}</strong></div>`;
    }).join("")}</div>`;
  }

  function renderSummary(result) {
    els.designNameHeader.textContent = result.config.name;
    els.summaryDv.textContent = `${number(result.performance.idealDeltaV, 0)} m/s`;
    const flight = result.flight;
    const summaryLines = [];
    summaryLines.push(`<span class="summary-note-line">${escapeHtml(flight.status === "complete" ? `直飞顶点 ${formatAltitude(flight.maxAltitudeM)}` : flight.message)}</span>`);
    if (result.serial && result.serial.enabled) {
      const stageDvText = [`芯级 ${number(result.serial.base.performance.idealDeltaV, 0)}`].concat(result.serial.stages.map(function (stageResult) {
        return `${stageResult.stageName} ${number(stageResult.performance.idealDeltaV, 0)}`;
      })).join(" + ");
      summaryLines.push(`<span class="summary-milestone summary-flight-event"><b>${result.serial.totalStageCount} 级串联</b> ${escapeHtml(stageDvText)} m/s · 分离可靠性 ${number(result.serial.missionSeparationReliabilityPct, 3)}% · 动态直飞暂演示至芯级滑行顶点</span>`);
    }
    if (flight.status === "limit" && flight.altitudeMilestones && flight.altitudeMilestones[600] && flight.altitudeMilestones[1800]) {
      const milestone600 = flight.altitudeMilestones[600];
      const milestone1800 = flight.altitudeMilestones[1800];
      summaryLines.push(`<span class="summary-milestone"><b>T+600 s</b> 高度 ${escapeHtml(formatAltitude(milestone600.altitudeM))} · 上升 ${escapeHtml(formatAltitude(milestone600.distanceFromLaunchM))}</span>`);
      summaryLines.push(`<span class="summary-milestone"><b>T+1800 s</b> 高度 ${escapeHtml(formatAltitude(milestone1800.altitudeM))} · 上升 ${escapeHtml(formatAltitude(milestone1800.distanceFromLaunchM))}</span>`);
    }
    if (flight.burnoutSnapshot) {
      summaryLines.push(`<span class="summary-milestone summary-flight-event"><b>熄火</b> 熄火时速度 ${escapeHtml(`${number(flight.burnoutSnapshot.velocityMs, 0)} m/s`)} · 关机高度 ${escapeHtml(formatAltitude(flight.burnoutSnapshot.altitudeM))}</span>`);
    }
    if (flight.boosterSeparationSnapshot) {
      const separation = flight.boosterSeparationSnapshot;
      summaryLines.push(`<span class="summary-milestone summary-flight-event"><b>助推器分离</b> T+${number(separation.timeS, 1)} s · ${escapeHtml(formatAltitude(separation.altitudeM))} · 抛离 ${escapeHtml(formatMass(separation.droppedMassKg))}</span>`);
    }
    els.summaryDvNote.innerHTML = summaryLines.join("");
    els.summaryCost.textContent = formatMoney(result.cost.totalCostCny);
    els.summaryCostNote.textContent = `制造 ${formatMoney(result.cost.manufacturingCostCny)} · 推进剂 ${formatMoney(result.cost.propellantCostCny)}`;
    els.summaryCostShares.innerHTML = result.cost.breakdown.map(function (entry) {
      return `<span><b>${escapeHtml(entry.label)}</b>${number(entry.sharePct, 1)}%</span>`;
    }).join("");
    els.summaryMass.textContent = formatMass(result.masses.wetMassKg);
    els.summaryMassNote.textContent = `结构干重 ${formatMass(result.masses.vehicleDryMassKg)} · 载荷 ${formatMass(result.masses.payloadKg)}`;
    els.summaryMassShares.innerHTML = result.masses.liftoffBreakdown.map(function (entry) {
      return `<span><b>${escapeHtml(entry.label)}</b>${number(entry.sharePct, 1)}%</span>`;
    }).join("") + `<span><b>干质比 m湿/m干</b>${number(result.masses.dryMassRatio, 2)}</span>`;
    els.includePayloadInDryBreakdown.checked = result.masses.dryBreakdownIncludesPayload;
    els.summaryDryMassShares.innerHTML = result.masses.dryBreakdown.map(function (entry) {
      return entry.included
        ? `<span><b>${escapeHtml(entry.label)}</b>${number(entry.sharePct, 1)}%</span>`
        : `<span class="is-excluded"><b>${escapeHtml(entry.label)}</b>未计入 · ${escapeHtml(formatMass(entry.massKg))}</span>`;
    }).join("");
    els.summaryThrust.textContent = `${number(result.performance.totalThrustN / 1000, 1)} kN`;
    els.summaryThrustNote.textContent = result.parallel && result.parallel.enabled
      ? `T/W ${number(result.performance.twr, 2)} · 离架净加速度 ${number(result.performance.liftoffNetAccelMs2, 2)} m/s² · 芯级 + ${result.parallel.count} 枚助推器`
      : `T/W ${number(result.performance.twr, 2)} · 离架净加速度 ${number(result.performance.liftoffNetAccelMs2, 2)} m/s² · ${result.config.engine.engineCount} 台 ${result.engine.cluster.architecture.name}`;
    els.summaryAccelNote.textContent = `当前加速度 0.00 g · 最大净加速度 ${number(result.flight.maxNetAccelG || 0, 2)} g`;

    const errors = result.issues.filter(function (issue) { return issue.severity === "error"; }).length;
    const warnings = result.issues.filter(function (issue) { return issue.severity === "warning"; }).length;
    els.statusDot.className = "status-dot" + (errors ? " has-error" : warnings ? " has-warning" : "");
    els.statusText.textContent = errors ? `${errors} 项硬性越限` : warnings ? `${warnings} 项需关注` : "设计校核通过";
  }

  function renderReadouts(result) {
    const prop = result.propellant;
    const ofText = prop.mono ? "单组元" : `O/F ${number(result.split.mixtureRatio, 2)}`;
    els.propellantReadout.innerHTML = `
      <strong>${escapeHtml(prop.name)} · ${escapeHtml(ofText)}</strong>
      <div class="readout-grid">
        <span>燃料密度 <b>${number(prop.fuelDensity, 0)} kg/m³</b></span>
        <span>氧化剂密度 <b>${prop.mono ? "—" : `${number(prop.oxidizerDensity, 0)} kg/m³`}</b></span>
        <span>燃料/推进剂参考价 <b>¥${number(result.config.cost.fuelPriceCnyKg, 2)}/kg</b></span>
        <span>氧化剂参考价 <b>${prop.mono ? "—" : `¥${number(result.config.cost.oxidizerPriceCnyKg, 2)}/kg`}</b></span>
        <span>海平面 / 真空 Isp <b>${number(prop.ispSea, 0)} / ${number(prop.ispVac, 0)} s</b></span>
        <span>燃烧温度 <b>${number(prop.chamberTemperatureK, 0)} K</b></span>
        <span>储存性 <b>${escapeHtml(prop.storability)}</b></span>
        <span>毒性 / 腐蚀 <b>${escapeHtml(prop.toxicity)} / ${escapeHtml(prop.corrosivity)}</b></span>
      </div>
      <span>${escapeHtml(prop.note)}</span>`;

    if (result.parallel && result.parallel.enabled) {
      const parallel = result.parallel;
      const booster = parallel.booster;
      const architecture = state.config.boosters.engineMode === "copy-core" ? "复制芯级发动机组" : "独立发动机方案";
      const diameterMode = state.config.boosters.diameterMode === "copy-core" ? "复制芯级直径" : "独立直径";
      const propellantMode = state.config.boosters.propellantMode === "copy-core" ? "复制芯级推进剂" : parallel.propellant.name;
      const burnRatio = parallel.optimization.burnTimeRatioPct;
      const burnAdvice = burnRatio < 35 ? "燃时偏短，可增加单枚推进剂或降低推力"
        : burnRatio > 80 ? "燃时偏长，注意芯级先关机与拖带"
          : "燃时落在建议的芯级 35%–80% 区间";
      els.boosterReadout.innerHTML = `
        <strong>Add Moar Booster · ${parallel.count} 枚并联液体助推器</strong>
        <div class="readout-grid">
          <span>推进剂 / 架构 <b>${escapeHtml(propellantMode)} · ${escapeHtml(architecture)}</b></span>
          <span>直径 / 单枚长度 <b>${number(booster.geometry.diameterM, 2)} / ${number(booster.geometry.vehicleLengthM, 2)} m · ${escapeHtml(diameterMode)}</b></span>
          <span>单枚推进剂 / 湿质量 <b>${formatMass(parallel.usablePropellantPerBoosterKg)} / ${formatMass(booster.masses.wetMassKg)}</b></span>
          <span>单枚推力 / 发动机 <b>${number(booster.performance.totalThrustN / 1000, 1)} kN / ${booster.config.engine.engineCount} 台</b></span>
          <span>助推 / 芯级燃时 <b>${number(parallel.boosterBurnTimeS, 1)} / ${number(parallel.coreBurnTimeS, 1)} s</b></span>
          <span>分离质量 / 延迟 <b>${formatMass(parallel.separationMassKg)} / ${number(parallel.separationDelayS, 1)} s</b></span>
          <span>并联 Δv 增益 <b>${number(parallel.optimization.deltaVGainMs, 0)} m/s</b></span>
          <span>分离后芯级 T/W <b>${number(parallel.postSeparationTwr, 2)}</b></span>
          <span>连接质量占比 <b>${number(parallel.optimization.attachmentSharePct, 2)}%</b></span>
          <span>全并联系统可靠性 <b>${number(parallel.missionReliabilityPct, 3)}%</b></span>
        </div>
        <span>优化提示：${escapeHtml(burnAdvice)}；当前全箭包络直径约 ${number(parallel.attachedDiameterM, 2)} m。</span>`;
    } else {
      els.boosterReadout.innerHTML = "";
    }

    const tankStructureNames = {
      single: "单层全金属/单一材料",
      dual: "旧版固定 5:95 双层",
      "load-sharing": "动态载荷共享双层",
      copv: "内衬 COPV",
      stiffened: "整体加筋壳体",
      sandwich: "夹芯壳体",
      balloon: "压力稳定气球储箱"
    };
    const commonBulkhead = result.tanks.commonBulkhead;
    const commonBulkheadText = commonBulkhead
      ? `<span>共底形式 / 工况 <b>${escapeHtml(commonBulkhead.typeName)} · ${escapeHtml(commonBulkhead.pressureModeName)}</b></span>
         <span>共底拱高 / 曲率半径 <b>${number(commonBulkhead.geometry.domeRiseM, 3)} / ${number(commonBulkhead.geometry.curvatureRadiusM, 3)} m</b></span>
         <span>单侧失压 / 证明压差 <b>${number(commonBulkhead.pressureEnvelope.fullLossDifferentialPressurePa / 1000, 1)} / ${number(commonBulkhead.pressureEnvelope.designDifferentialPressurePa / 1000, 1)} kPa</b></span>
         <span>膜应力 / 反向屈曲利用率 <b>${number(commonBulkhead.pressureEnvelope.designBurstUtilization * 100, 1)}% / ${number(commonBulkhead.pressureEnvelope.designCollapseUtilization * 100, 1)}%</b></span>
         <span>燃料侧面板 <b>${escapeHtml(commonBulkhead.faces.fuel.materialName)} · ${number(commonBulkhead.faces.fuel.thicknessM * 1000, 2)} mm</b></span>
         ${commonBulkhead.faces.oxidizer ? `<span>氧化剂侧面板 <b>${escapeHtml(commonBulkhead.faces.oxidizer.materialName)} · ${number(commonBulkhead.faces.oxidizer.thicknessM * 1000, 2)} mm</b></span>` : ""}
         <span>共底新增 / 取消封头 <b>${formatMass(commonBulkhead.addedMassKg)} / ${formatMass(commonBulkhead.removedDomeMassKg)}</b></span>
         <span>共底净质量 / 缩短 <b>${formatMass(commonBulkhead.netMassDeltaKg)} / ${number(commonBulkhead.lengthSavingM, 2)} m</b></span>
         <span>热漏 / 等效冷侧蒸发 <b>${number(commonBulkhead.thermal.totalHeatLeakW, 0)} W / ${number(commonBulkhead.thermal.equivalentBoiloffKgH, 2)} kg/h</b></span>
         ${commonBulkhead.type === "honeycomb" ? `<span>芯层 / 起皱 / 粘接利用率 <b>${number(commonBulkhead.stability.coreCrushUtilization * 100, 1)}% / ${number(commonBulkhead.stability.faceWrinklingUtilization * 100, 1)}% / ${number(commonBulkhead.stability.bondUtilization * 100, 1)}%</b></span>` : ""}
         ${commonBulkhead.pressureMode === "pressure-stabilized" ? `<span>单侧失压紧急利用率 <b>${number(Math.max(commonBulkhead.pressureEnvelope.emergencyBurstUtilization, commonBulkhead.pressureEnvelope.emergencyCollapseUtilization) * 100, 1)}%</b></span>` : ""}`
      : `<span>储箱布置 <b>两个独立储箱</b></span>`;
    if (["dual", "load-sharing", "copv"].includes(result.tanks.structureMode)) {
      const fuelLiner = Data.materials[state.config.tanks.fuelLinerMaterialKey];
      const oxidizerLiner = Data.materials[state.config.tanks.oxidizerLinerMaterialKey];
      const structural = Data.materials[state.config.tanks.structuralMaterialKey];
      const fuelLayers = result.tanks.fuel;
      const oxidizerLayers = result.tanks.oxidizer;
      const sharing = fuelLayers.loadSharing;
      els.tankMaterialReadout.innerHTML = `
        <strong>${escapeHtml(tankStructureNames[result.tanks.structureMode])} · 内衬 ${number(sharing.linerFraction * 100, 1)}% / 外层 ${number(sharing.structuralFraction * 100, 1)}%</strong>
        <div class="readout-grid">
          <span>${prop.mono ? "推进剂" : "燃料"}内衬 <b>${escapeHtml(fuelLiner.name)}</b></span>
          <span>内衬厚度 / 质量 <b>${number(fuelLayers.linerLayer.cylinderThicknessM * 1000, 2)} mm / ${formatMass(fuelLayers.linerLayer.massKg)}</b></span>
          ${oxidizerLayers ? `<span>氧化剂内衬 <b>${escapeHtml(oxidizerLiner.name)}</b></span><span>内衬厚度 / 质量 <b>${number(oxidizerLayers.linerLayer.cylinderThicknessM * 1000, 2)} mm / ${formatMass(oxidizerLayers.linerLayer.massKg)}</b></span>` : ""}
          <span>外承力层 <b>${escapeHtml(structural.name)}</b></span>
          <span>燃料箱外层厚度 <b>${number(fuelLayers.structuralLayer.cylinderThicknessM * 1000, 2)} mm</b></span>
          <span>界面模式 / 约束 <b>${escapeHtml(fuelLayers.interfaceMode)} / ${number(sharing.interfaceEfficiencyPct, 0)}%</b></span>
          <span>热失配应力 <b>${number(sharing.thermalMismatchStressMpa, 1)} MPa</b></span>
          <span>层间剪切利用率 <b>${number(sharing.interfaceUtilization * 100, 1)}%</b></span>
          <span>内衬皱曲利用率 <b>${number(sharing.linerWrinklingUtilization * 100, 1)}%</b></span>
          <span>外层屈曲利用率 <b>${number(fuelLayers.buckling.utilization * 100, 1)}%</b></span>
          <span>疲劳/循环利用率 <b>${number(fuelLayers.fatigueUtilization * 100, 1)}%</b></span>
          ${commonBulkheadText}
          <span>储箱总质量 <b>${formatMass(result.tanks.totalMassKg)}</b></span>
        </div>
        <span>${result.tanks.structureMode === "dual" ? "旧版固定比例仅供历史方案比较。" : "载荷分配由温度修正后的 E·t 刚度迭代求解，并叠加热膨胀失配、预应力、界面剪切、卸压皱曲与轴向屈曲。"}</span>`;
    } else {
      const material = Data.materials[state.config.tanks.materialKey];
      const relativeStrength = material.yield / Data.materials["ss-304l"].yield;
      const specificStrength = material.yield * 1e6 / material.density / 1000;
      els.tankMaterialReadout.innerHTML = `
        <strong>${escapeHtml(tankStructureNames[result.tanks.structureMode])} · ${escapeHtml(material.name)} · 相对强度 ${number(relativeStrength, 2)}</strong>
        <div class="readout-grid">
          <span>密度 <b>${number(material.density, 0)} kg/m³</b></span>
          <span>屈服 / 抗拉 <b>${number(material.yield, 0)} / ${number(material.ultimate, 0)} MPa</b></span>
          <span>比屈服强度 <b>${number(specificStrength, 1)} kN·m/kg</b></span>
          <span>工作温区 <b>${number(material.minTemp, 0)}–${number(material.maxTemp, 0)} K</b></span>
          <span>导热率 <b>${number(material.conductivity, 1)} W/m·K</b></span>
          <span>参考价 <b>¥${number(material.price, 0)}/kg</b></span>
          <span>膜应力利用率 <b>${number(result.tanks.fuel.membraneUtilization * 100, 1)}%</b></span>
          <span>轴向屈曲利用率 <b>${number(result.tanks.fuel.buckling.utilization * 100, 1)}%</b></span>
          <span>疲劳/循环利用率 <b>${number(result.tanks.fuel.fatigueUtilization * 100, 1)}%</b></span>
          ${result.tanks.structureMode === "balloon" ? `<span>最低维形压力 <b>${number(result.tanks.fuel.minimumStabilityPressurePa / 1000, 1)} kPa</b></span><span>地面工装参考质量 <b>${formatMass(result.tanks.fuel.groundSupportMassKg)}</b></span>` : ""}
          ${commonBulkheadText}
          <span>储箱总质量 <b>${formatMass(result.tanks.totalMassKg)}</b></span>
        </div>
        <span>${escapeHtml(material.note)}</span>`;
    }

    const cycle = result.engine.cycle;
    els.cycleReadout.innerHTML = `
      <strong>${escapeHtml(cycle.name)} · 复杂度 ${escapeHtml(cycle.complexity)}</strong>
      <div class="readout-grid">
        <span>教学室压上限 <b>${number(cycle.maxPcMpa, 1)} MPa</b></span>
        <span>性能修正 <b>${number(cycle.performanceFactor, 3)}×</b></span>
        <span>质量修正 <b>${number(cycle.massFactor, 2)}×</b></span>
        <span>发动机成本修正 <b>${number(cycle.costFactor, 2)}×</b></span>
      </div>
      <span>${escapeHtml(cycle.note)}</span>`;

    const cluster = result.engine.cluster;
    const reliability = cluster.reliability;
    const expansionText = cluster.requiresExpansion
      ? `需扩径至 ${number(cluster.baseDiameterM, 2)} m（${number(cluster.diameterExpansionRatio, 2)}×）`
      : `包络余量 ${number(cluster.diameterMarginM, 2)} m`;
    els.clusterReadout.innerHTML = `
      <strong>${escapeHtml(cluster.architecture.name)} · ${result.config.engine.engineCount} 台 / ${cluster.pumpUnitCount || 0} 套泵组</strong>
      <div class="readout-grid">
        <span>喷口包络 / 箭体 <b>${number(cluster.requiredDiameterM, 2)} / ${number(cluster.bodyDiameterM, 2)} m</b></span>
        <span>基座检查 <b>${escapeHtml(expansionText)}</b></span>
        <span>总管路压降 <b>${number(cluster.effectiveLineDropPct, 2)}% Pc</b></span>
        <span>重复附件质量 <b>${formatMass(cluster.repeatedAccessoryMassKg)}</b></span>
        <span>推力架/分流/振动 <b>${formatMass(cluster.clusterIntegrationMassKg)}</b></span>
        <span>一台失效后 T/W <b>${result.config.engine.engineCount > 1 ? number(reliability.engineOutTwr, 2) : "—"}</b></span>
        <span>任务可靠性 <b>${number(reliability.missionReliabilityPct, 3)}%</b></span>
        <span>失效继续能力 <b>${reliability.oneEngineOutCapable ? "可继续上升" : "不满足/未启用"}</b></span>
      </div>
      <span>${escapeHtml(cluster.architecture.note)}</span>`;

    const battery = result.pumps.battery;
    if (battery.enabled) {
      els.batteryReadout.innerHTML = `
        <strong>${escapeHtml(battery.name)} · ${escapeHtml(battery.type)} · ${battery.rechargeable ? "可充电" : "不可充电/有限循环"}</strong>
        <div class="readout-grid">
          <span>比能量 <b>${number(battery.energyDensityWhKg, 0)} Wh/kg</b></span>
          <span>比功率 <b>${number(battery.powerDensityWKg, 0)} W/kg</b></span>
          <span>所需输出功率 <b>${number(battery.requiredOutputPowerKw, 0)} kW</b></span>
          <span>所需储能 <b>${number(battery.requiredStoredEnergyKwh, 2)} kWh</b></span>
          <span>电池包质量 <b>${formatMass(battery.packMassKg)}</b></span>
          <span>电气系统总质量 <b>${formatMass(battery.totalElectricalMassKg)}</b></span>
          <span>质量控制项 <b>${escapeHtml(battery.sizingBasis)}</b></span>
          <span>等效放电倍率 <b>${number(battery.effectiveDischargeRateC, 1)} C</b></span>
        </div>
        <span>${escapeHtml(battery.note)}</span>`;
    } else {
      els.batteryReadout.innerHTML = "";
    }
  }

  function renderOverview(result) {
    const massRows = [
      ["可用推进剂", formatMass(result.masses.usablePropellantKg)],
      ["装载推进剂", formatMass(result.masses.loadedPropellantKg)],
      ["储箱与绝热", formatMass(result.masses.tankMassKg)],
      ["发动机系统", formatMass(result.masses.engineMassKg)],
      ["增压 / 管路", formatMass(result.masses.pressurizationMassKg + result.masses.plumbingMassKg)],
      ["箭体 / 安装", formatMass(result.masses.airframeMassKg + result.masses.mountMassKg)],
      ["航电", formatMass(result.masses.avionicsMassKg)],
      ["有效载荷", formatMass(result.masses.payloadKg)],
      ["起飞质量", formatMass(result.masses.wetMassKg)]
    ];
    if (result.parallel && result.parallel.enabled) {
      massRows.splice(2, 0,
        ["芯级起飞质量", formatMass(result.parallel.core.masses.wetMassKg)],
        [`助推器 × ${result.parallel.count}`, formatMass(result.parallel.booster.masses.wetMassKg * result.parallel.count)],
        ["连接与分离结构", formatMass(result.parallel.attachmentMassKg)]
      );
    }
    if (result.serial && result.serial.enabled) {
      const insertion = result.serial.stages.map(function (stageResult) {
        return [`${stageResult.stageName}点火质量`, formatMass(stageResult.masses.wetMassKg + stageResult.separation.totalMassKg)];
      });
      insertion.push(["级间分离系统", formatMass(result.serial.interfaceMassKg)]);
      massRows.splice.apply(massRows, [2, 0].concat(insertion));
    }
    renderDataList(els.massTable, massRows);
    const performanceRows = [
      ["场景环境", `${result.environment.bodyName} · ${number(result.environment.launchGravityMs2 / Core.G0, 2)} g · ${result.environment.forcedVacuum ? "强制真空" : formatPressure(result.environment.launchPressurePa)}`],
      ["环境有效比冲", `${number(result.performance.ispS, 1)} s`],
      ["理想 Δv", `${number(result.performance.idealDeltaV, 0)} m/s`],
      ["总推力", `${number(result.performance.totalThrustN / 1000, 1)} kN`],
      ["起飞推重比", number(result.performance.twr, 2)],
      ["离架净加速度", `${number(result.performance.liftoffNetAccelMs2, 2)} m/s²`],
      ["总质量流量", `${number(result.performance.totalMassFlowKgS, 2)} kg/s`],
      ["估算燃时", `${number(result.performance.burnTimeS, 1)} s`],
      ["储箱结构 / 布置", `${result.tanks.fuel.structureMode} · ${result.tanks.commonBulkhead ? result.tanks.commonBulkhead.typeName : "独立储箱"}`],
      ["储箱膜应力 / 屈曲利用率", `${number(result.tanks.fuel.membraneUtilization * 100, 1)}% / ${number(result.tanks.fuel.buckling.utilization * 100, 1)}%`],
      ["集群架构", result.engine.cluster.architecture.name],
      ["任务可靠性", `${number(result.engine.cluster.reliability.missionReliabilityPct, 3)}%`],
      ["一台失效后 T/W", result.config.engine.engineCount > 1 ? number(result.engine.cluster.reliability.engineOutTwr, 2) : "—"],
      ["箭体直径", `${number(result.geometry.diameterM, 2)} m`],
      ["集群基座直径", `${number(result.geometry.baseDiameterM, 2)} m`],
      ["级段总长", `${number(result.geometry.vehicleLengthM, 2)} m`],
      ["喉径 / 出口径", `${number(result.engine.nozzle.throatDiameterM, 3)} / ${number(result.engine.nozzle.exitDiameterM, 3)} m`]
    ];
    if (result.parallel && result.parallel.enabled) {
      performanceRows.splice(3, 0,
        ["芯级单独理想 Δv", `${number(result.performance.coreOnlyIdealDeltaV, 0)} m/s`],
        ["并联助推 Δv 增益", `${number(result.performance.boosterDeltaVGain, 0)} m/s`],
        ["助推器燃时 / 分离延迟", `${number(result.parallel.boosterBurnTimeS, 1)} / ${number(result.parallel.separationDelayS, 1)} s`],
        ["分离后芯级 T/W", number(result.parallel.postSeparationTwr, 2)],
        ["并联包络直径", `${number(result.parallel.attachedDiameterM, 2)} m`]
      );
    }
    if (result.serial && result.serial.enabled) {
      const serialRows = result.serial.stages.reduce(function (rows, stageResult) {
        rows.push(
          [`${stageResult.stageName}理想 Δv`, `${number(stageResult.performance.idealDeltaV, 0)} m/s`],
          [`${stageResult.stageName}推力 / 燃时`, `${number(stageResult.performance.totalThrustN / 1000, 1)} kN / ${number(stageResult.performance.burnTimeS, 1)} s`],
          [`${stageResult.stageName}分离`, `${stageResult.separation.name} · ${number(stageResult.separation.reliabilityPct, 3)}%`]
        );
        return rows;
      }, []);
      serialRows.push(["串联分离任务可靠性", `${number(result.serial.missionSeparationReliabilityPct, 3)}%`]);
      performanceRows.splice.apply(performanceRows, [3, 0].concat(serialRows));
    }
    renderDataList(els.performanceTable, performanceRows);
    const pumpRows = [
      ["燃料泵流量", `${number(result.pumps.fuel.mdotKgS, 2)} kg/s`],
      ["氧化剂泵流量", `${number(result.pumps.oxidizer.mdotKgS, 2)} kg/s`],
      ["总轴功率", `${number(result.pumps.totalShaftPowerKw, 0)} kW`],
      ["泵组数量 / 架构", `${result.pumps.pumpUnitCount} / ${result.engine.cluster.architecture.name}`],
      ["基础 / 集群 / 总管路压降", `${number(result.pumps.baseLineDropPct, 1)} / ${number(result.pumps.clusterLineDropPct, 1)} / ${number(result.pumps.effectiveLineDropPct, 1)}% Pc`],
      ["燃料泵 NPSH 裕度", `${number(result.pumps.fuel.npshMarginM, 1)} m`],
      ["氧泵 NPSH 裕度", result.propellant.mono ? "—" : `${number(result.pumps.oxidizer.npshMarginM, 1)} m`],
      ["燃料泵壳利用率", `${number(result.pumps.fuel.casingUtilization * 100, 1)}%`],
      ["氧泵壳利用率", result.propellant.mono ? "—" : `${number(result.pumps.oxidizer.casingUtilization * 100, 1)}%`],
      ["喷管膨胀比", number(result.engine.nozzle.expansionRatio, 1)],
      ["热流密度", `${number(result.engine.heatFluxMwM2, 2)} MW/m²`],
      ["冷却裕度", `${number(result.engine.coolingMargin, 2)}×`],
      ["壁面工作温度", `${number(result.engine.nozzle.wallTempK, 0)} K`]
    ];
    if (result.pumps.battery.enabled) {
      pumpRows.splice(3, 0,
        ["电池类型", `${result.pumps.battery.name} · ${result.pumps.battery.rechargeable ? "二次/可充" : "一次/特种"}`],
        ["电池输出功率", `${number(result.pumps.battery.requiredOutputPowerKw, 0)} kW`],
        ["所需储能", `${number(result.pumps.battery.requiredStoredEnergyKwh, 2)} kWh`],
        ["电池包 / 电气总质量", `${formatMass(result.pumps.battery.packMassKg)} / ${formatMass(result.pumps.battery.totalElectricalMassKg)}`],
        ["电池定容控制项", result.pumps.battery.sizingBasis]
      );
    }
    renderDataList(els.pumpTable, pumpRows);
  }

  function renderIssues(result) {
    const seen = new Set();
    const unique = result.issues.filter(function (issue) {
      const key = `${issue.severity}|${issue.component}|${issue.message}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    els.issueCount.textContent = String(unique.length);
    if (!unique.length) {
      els.issueList.innerHTML = `<div class="issue-empty"><strong>当前未发现硬性越限</strong><br>仍需把结果视为概念阶段估算。</div>`;
      return;
    }
    const order = { error: 0, warning: 1, info: 2 };
    unique.sort(function (a, b) { return order[a.severity] - order[b.severity]; });
    els.issueList.innerHTML = unique.map(function (issue) {
      const label = issue.severity === "error" ? "越限" : issue.severity === "warning" ? "注意" : "假设";
      return `<article class="issue-item ${escapeHtml(issue.severity)}"><strong>${label} · ${escapeHtml(issue.component)}</strong><span>${escapeHtml(issue.message)}</span><small>${escapeHtml(issue.suggestion)}</small></article>`;
    }).join("");
  }

  function renderSnapshot(result) {
    const fuelTank = result.tanks.fuel;
    const oxTank = result.tanks.oxidizer;
    const snapshotStructureNames = { single: "单层壳体", dual: "旧版固定 5:95 双层", "load-sharing": "动态载荷共享双层", copv: "内衬 COPV", stiffened: "整体加筋", sandwich: "夹芯壳体", balloon: "压力稳定气球" };
    const layeredTank = ["dual", "load-sharing", "copv"].includes(result.tanks.structureMode);
    const fuelThickness = layeredTank
      ? `内 ${number(fuelTank.linerLayer.cylinderThicknessM * 1000, 2)} + 外 ${number(fuelTank.structuralLayer.cylinderThicknessM * 1000, 2)} = ${number(fuelTank.cylinderThicknessM * 1000, 2)} mm`
      : `${number(fuelTank.cylinderThicknessM * 1000, 2)} mm`;
    const oxidizerThickness = oxTank
      ? (layeredTank
        ? `内 ${number(oxTank.linerLayer.cylinderThicknessM * 1000, 2)} + 外 ${number(oxTank.structuralLayer.cylinderThicknessM * 1000, 2)} = ${number(oxTank.cylinderThicknessM * 1000, 2)} mm`
        : `${number(oxTank.cylinderThicknessM * 1000, 2)} mm`)
      : "—";
    const rows = [
      ["燃料箱容积", `${number(fuelTank.totalVolumeM3, 2)} m³`],
      ["燃料箱壁厚", fuelThickness],
      ["氧化剂箱容积", oxTank ? `${number(oxTank.totalVolumeM3, 2)} m³` : "单组元"],
      ["氧化剂箱壁厚", oxidizerThickness],
      ["储箱结构/布置", `${snapshotStructureNames[result.tanks.structureMode] || result.tanks.structureMode} · ${result.tanks.commonBulkhead ? result.tanks.commonBulkhead.typeName : "独立双箱"}`],
      ["膜应力 / 屈曲利用率", `${number(fuelTank.membraneUtilization * 100, 1)}% / ${number(fuelTank.buckling.utilization * 100, 1)}%`],
      ["增压系统", `${result.pressurization.type} · ${formatMass(result.pressurization.totalMassKg)}`],
      ["泵材料", result.pumps.fuel.materialName],
      ["燃烧室壁厚", `${number(result.engine.nozzle.chamberWallM * 1000, 2)} mm`],
      ["喷管壁厚", `${number(result.engine.nozzle.nozzleWallM * 1000, 2)} mm`],
      ["发动机簇", `${result.config.engine.engineCount} 台 · ${formatMass(result.masses.engineMassKg)}`],
      ["概算总成本", formatMoney(result.cost.totalCostCny)]
    ];
    if (result.pumps.battery.enabled) {
      rows.splice(rows.length - 2, 0, ["电泵电源", `${result.pumps.battery.name} · ${formatMass(result.pumps.battery.totalElectricalMassKg)}`]);
    }
    els.componentSnapshot.innerHTML = rows.map(function (row) {
      return `<div class="snapshot-item"><span>${escapeHtml(row[0])}</span><strong>${escapeHtml(row[1])}</strong></div>`;
    }).join("");
  }

  function renderRocket(result) {
    applyFlamePalette(result);
    if (state.view === "scale") renderScaleRocket(result);
    else renderCartoonRocket(result);
    const palette = flamePalette(result);
    const boosterCaption = result.parallel && result.parallel.enabled ? ` · ${result.parallel.count} 枚助推器` : "";
    const serialCaption = result.serial && result.serial.enabled ? ` · ${result.serial.totalStageCount} 级串联` : "";
    els.visualCaption.textContent = state.view === "scale"
      ? `同一比例尺 · ${number(result.geometry.vehicleLengthM, 2)} m × 最大直径 ${number(result.geometry.maximumSerialDiameterM || result.geometry.attachedDiameterM || result.geometry.baseDiameterM, 2)} m${boosterCaption}${serialCaption} · 缩放 ${number(state.zoom * 100, 0)}% · ${palette.name}`
      : `固定易读布局 · 真实外形 ${number(result.geometry.vehicleLengthM, 2)} m × ${number(result.geometry.diameterM, 2)} m${boosterCaption}${serialCaption} · ${result.config.engine.engineCount} 台芯级发动机 · ${palette.name}`;
    if (state.animation.frame && state.animation.mode) updateDynamicVisual(state.animation.frame, state.animation.mode);
  }

  function interpolateTimeline(points, timeS) {
    if (!points || !points.length) return null;
    if (timeS <= points[0].timeS) return Object.assign({}, points[0]);
    if (timeS >= points[points.length - 1].timeS) return Object.assign({}, points[points.length - 1]);
    let low = 0;
    let high = points.length - 1;
    while (high - low > 1) {
      const mid = Math.floor((low + high) / 2);
      if (points[mid].timeS <= timeS) low = mid;
      else high = mid;
    }
    const before = points[low];
    const after = points[high];
    const mix = clampValue((timeS - before.timeS) / Math.max(1e-9, after.timeS - before.timeS), 0, 1);
    const frame = {};
    const discreteNumericKeys = new Set(["activeStageIndex", "activeStageNumber", "separatedStageCount"]);
    const keys = new Set(Object.keys(before).concat(Object.keys(after)));
    keys.forEach(function (key) {
      if (Array.isArray(before[key]) && Array.isArray(after[key]) && before[key].length === after[key].length && before[key].every(Number.isFinite) && after[key].every(Number.isFinite)) {
        frame[key] = before[key].map(function (value, index) { return value + (after[key][index] - value) * mix; });
      } else if (Number.isFinite(before[key]) && Number.isFinite(after[key]) && !discreteNumericKeys.has(key)) frame[key] = before[key] + (after[key] - before[key]) * mix;
      else frame[key] = mix < 0.5 ? before[key] : after[key];
    });
    frame.timeS = timeS;
    return frame;
  }

  function animationFrameFor(mode, timeS) {
    if (!state.result) return null;
    const result = state.result;
    const source = mode === "flight" ? result.flight.points : result.staticFire.points;
    if (mode === "flight" && timeS < 0) {
      const environment = Core.environmentState(state.config, state.config.vehicle.launchAltitudeM);
      const localGravity = environment.body.gravityMs2 * Math.pow(environment.body.radiusM / (environment.body.radiusM + state.config.vehicle.launchAltitudeM), 2);
      return {
        mode,
        phase: `倒计时 T-${Math.max(1, Math.ceil(-timeS))}`,
        timeS,
        velocityMs: 0,
        accelerationG: 0,
        gravityAccelG: -localGravity / Core.G0,
        dragAccelG: 0,
        qPa: 0,
        throttle: 0,
        throttleState: "倒计时待机",
        altitudeM: state.config.vehicle.launchAltitudeM,
        pressurePa: environment.pressurePa,
        thrustRatio: 0,
        currentThrustN: 0,
        massFlowKgS: 0,
        fuelMassFlowKgS: 0,
        oxidizerMassFlowKgS: 0,
        exitPressurePa: 0,
        exhaustVelocityMs: 0,
        propellantRemainingKg: result.masses.usablePropellantKg,
        loadedRemainingKg: result.masses.loadedPropellantKg,
        remainingFraction: 1,
        stagePropellantRemainingKg: result.serial && result.serial.enabled
          ? [result.serial.base.parallel && result.serial.base.parallel.enabled ? result.serial.base.parallel.core.masses.usablePropellantKg : result.serial.base.masses.usablePropellantKg].concat(result.serial.stages.map(function (stage) { return stage.masses.usablePropellantKg; }))
          : null,
        stageRemainingFractions: result.serial && result.serial.enabled ? new Array(result.serial.totalStageCount).fill(1) : null,
        activeStageRemainingFraction: 1,
        activeStageIndex: 0,
        activeStageName: "芯级 / 第一级",
        separatedStageCount: 0,
        fuelRemainingKg: result.split.loadedFuelKg,
        oxidizerRemainingKg: result.split.loadedOxidizerKg,
        engineSpoolRatio: 0,
        instantTwr: 0,
        heldDown: state.config.vehicle.launchMode === "pad",
        groundSupported: state.config.vehicle.launchMode === "field",
        padReleased: state.config.vehicle.launchMode === "field",
        thrustQualifiedS: 0,
        launchMode: state.config.vehicle.launchMode
      };
    }
    const raw = interpolateTimeline(source, timeS);
    if (!raw) return null;
    const serialFlight = Boolean(result.serial && result.serial.enabled && mode === "flight");
    const activeStageIndex = serialFlight ? Math.max(0, Math.round(Number(raw.activeStageIndex) || 0)) : 0;
    const activeDesign = serialFlight ? serialFlightStageDesign(activeStageIndex) : result;
    let propellantRemainingKg;
    let phase;
    let velocityMs;
    let accelerationG;
    let altitudeM;
    let pressurePa;
    let thrustRatio;
    if (mode === "flight") {
      propellantRemainingKg = Math.max(0, raw.propellantRemainingKg == null
        ? raw.massKg - result.masses.burnoutMassKg
        : raw.propellantRemainingKg);
      const finalFlightTime = source.length ? source[source.length - 1].timeS : 0;
      phase = raw.phase || (raw.thrustN > 1
        ? (result.parallel && result.parallel.enabled ? (raw.boosterAttached === false ? "助推器已分离 · 芯级续航" : "芯级 + 助推器共同上升") : "动力上升")
        : result.flight.escaped && timeS >= finalFlightTime - 0.55
          ? "达到逃逸轨迹"
          : raw.velocityMs > 1 ? "关机滑行" : "到达顶点");
      velocityMs = raw.velocityMs || 0;
      accelerationG = raw.netAccelG || 0;
      altitudeM = raw.altitudeM || 0;
      pressurePa = raw.pressurePa == null ? 101325 : raw.pressurePa;
      thrustRatio = clampValue(raw.thrustN / Math.max(1, activeDesign.performance.totalThrustN), 0, 1.1);
    } else {
      propellantRemainingKg = Math.max(0, raw.propellantRemainingKg == null
        ? result.masses.usablePropellantKg - (raw.consumedPropellantKg || 0)
        : raw.propellantRemainingKg);
      phase = raw.phase || "预增压";
      velocityMs = 0;
      accelerationG = raw.equivalentNetAccelG || 0;
      altitudeM = state.config.vehicle.launchAltitudeM;
      pressurePa = raw.pressurePa == null ? Core.environmentState(state.config, altitudeM).pressurePa : raw.pressurePa;
      thrustRatio = clampValue(raw.thrustRatio == null ? raw.thrustKn * 1000 / Math.max(1, result.performance.totalThrustN) : raw.thrustRatio, 0, 1.1);
    }
    const loadedRemainingKg = serialFlight
      ? activeDesign.masses.residualPropellantKg + Math.max(0, Number(raw.stagePropellantRemainingKg && raw.stagePropellantRemainingKg[activeStageIndex]) || 0)
      : result.masses.residualPropellantKg + propellantRemainingKg;
    const remainingFraction = serialFlight && Number.isFinite(raw.activeStageRemainingFraction)
      ? clampValue(raw.activeStageRemainingFraction, 0, 1)
      : clampValue(loadedRemainingKg / Math.max(1e-9, result.masses.loadedPropellantKg), 0, 1);
    const coreRemainingFraction = serialFlight && Array.isArray(raw.stageRemainingFractions)
      ? clampValue(Number(raw.stageRemainingFractions[0]) || 0, 0, 1)
      : result.parallel && result.parallel.enabled && Number.isFinite(raw.corePropellantRemainingKg)
      ? clampValue(raw.corePropellantRemainingKg / Math.max(1e-9, result.parallel.core.masses.usablePropellantKg), 0, 1)
      : remainingFraction;
    const boosterRemainingFraction = result.parallel && result.parallel.enabled && Number.isFinite(raw.boosterPropellantRemainingKg)
      ? clampValue(raw.boosterPropellantRemainingKg / Math.max(1e-9, result.parallel.booster.masses.usablePropellantKg * result.parallel.count), 0, 1)
      : remainingFraction;
    const currentThrustN = Math.max(0, raw.thrustN == null
      ? (raw.thrustKn == null ? result.performance.totalThrustN * thrustRatio : raw.thrustKn * 1000)
      : raw.thrustN);
    const massFlowKgS = Math.max(0, raw.massFlowKgS == null
      ? result.performance.totalMassFlowKgS * thrustRatio
      : raw.massFlowKgS);
    const flowScale = massFlowKgS / Math.max(1e-9, activeDesign.performance.totalMassFlowKgS);
    const fuelMassFlowKgS = Math.max(0, raw.fuelMassFlowKgS == null ? activeDesign.engine.fuelMdotKgS * flowScale : raw.fuelMassFlowKgS);
    const oxidizerMassFlowKgS = Math.max(0, raw.oxidizerMassFlowKgS == null ? activeDesign.engine.oxidizerMdotKgS * flowScale : raw.oxidizerMassFlowKgS);
    const exitPressurePa = Math.max(0, raw.exitPressurePa == null ? activeDesign.engine.nozzle.exitPressurePa * thrustRatio : raw.exitPressurePa);
    const exhaustVelocityMs = Math.max(0, raw.exhaustVelocityMs == null
      ? (massFlowKgS > 1e-9 ? currentThrustN / massFlowKgS : 0)
      : raw.exhaustVelocityMs);
    const qPa = mode === "flight" ? Math.max(0, raw.qPa || 0) : 0;
    const gravityAccelG = mode === "flight" ? (Number.isFinite(raw.gravityAccelG) ? raw.gravityAccelG : 0) : 0;
    const dragAccelG = mode === "flight" ? (Number.isFinite(raw.dragAccelG) ? raw.dragAccelG : 0) : 0;
    const throttle = mode === "flight" ? Math.max(0, raw.throttle || 0) : thrustRatio;
    const throttleState = mode === "flight"
      ? (raw.throttleState || (throttle > 0 ? "稳态" : "关机"))
      : `试车时序 · ${phase}`;
    return Object.assign(raw, {
      mode,
      phase,
      velocityMs,
      accelerationG,
      altitudeM,
      pressurePa,
      thrustRatio,
      currentThrustN,
      massFlowKgS,
      fuelMassFlowKgS,
      oxidizerMassFlowKgS,
      exitPressurePa,
      exhaustVelocityMs,
      qPa,
      gravityAccelG,
      dragAccelG,
      throttle,
      throttleState,
      propellantRemainingKg,
      loadedRemainingKg,
      remainingFraction,
      coreRemainingFraction,
      boosterRemainingFraction,
      boosterAttached: raw.boosterAttached == null ? Boolean(result.parallel && result.parallel.enabled) : Boolean(raw.boosterAttached),
      activeStageIndex,
      activeStageName: raw.activeStageName || (activeStageIndex === 0 ? "芯级 / 第一级" : activeDesign.stageName || `第${activeStageIndex + 1}级`),
      fuelRemainingKg: (activeDesign.split || result.split).loadedFuelKg * remainingFraction,
      oxidizerRemainingKg: (activeDesign.split || result.split).loadedOxidizerKg * remainingFraction
    });
  }

  function updateTankFill(selector, fraction) {
    document.querySelectorAll(selector).forEach(function (rect) {
      const baseX = Number(rect.dataset.baseX);
      const baseWidth = Number(rect.dataset.baseWidth);
      const baseHeight = Number(rect.dataset.baseHeight);
      const width = Math.max(0.4, baseWidth * clampValue(fraction, 0, 1));
      rect.setAttribute("x", String(baseX));
      rect.setAttribute("width", String(width));
      rect.setAttribute("rx", String(Math.max(0.2, Math.min(baseHeight / 2, width / 2))));
    });
  }

  function updatePlumes(frame) {
    const pressureFraction = clampValue(frame.pressurePa / 101325, 0, 1);
    const altitudeExpansion = 1 + (1 - pressureFraction) * 1.3;
    const palette = flamePalette(state.result);
    const boosterPalette = state.result.parallel && state.result.parallel.enabled
      ? (Data.flamePalettes[state.result.parallel.propellant.key] || Data.flamePalettes.custom)
      : palette;
    const reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.querySelectorAll('[data-anim="plume"], [data-anim="plume-core"]').forEach(function (plume) {
      const isCore = plume.dataset.anim === "plume-core";
      const x = Number(plume.dataset.x);
      const y = Number(plume.dataset.y);
      const exitHeight = Number(plume.dataset.exitHeight);
      const baseLength = Number(plume.dataset.baseLength);
      const index = Number(plume.dataset.plumeIndex) || 0;
      const engineRole = plume.dataset.engineRole || "core";
      const serialRoleMatch = /^stage-(\d+)$/.exec(engineRole);
      const serialRoleIndex = serialRoleMatch ? Number(serialRoleMatch[1]) : null;
      const serialRoleDesign = serialRoleIndex == null ? null : serialFlightStageDesign(serialRoleIndex);
      const activePalette = engineRole === "booster" ? boosterPalette : serialRoleDesign ? flamePalette(serialRoleDesign) : palette;
      let roleThrustRatio = frame.thrustRatio;
      if (serialRoleDesign && frame.mode === "flight") {
        roleThrustRatio = Number(frame.activeStageIndex) === serialRoleIndex
          ? (Number(frame.stageThrustN) || 0) / Math.max(1, serialRoleDesign.performance.totalThrustN)
          : 0;
      } else if (state.result.parallel && state.result.parallel.enabled && frame.mode === "flight") {
        if (engineRole === "booster") {
          roleThrustRatio = frame.boosterAttached === false ? 0 : (Number(frame.boosterThrustN) || 0) / Math.max(1, state.result.parallel.booster.performance.totalThrustN * state.result.parallel.count);
        } else {
          roleThrustRatio = (Number(frame.coreThrustN) || 0) / Math.max(1, state.result.parallel.core.performance.totalThrustN);
        }
      }
      const thrust = clampValue(roleThrustRatio, 0, 1.1);
      const flicker = reducedMotion ? 1 : 1 + 0.045 * Math.sin(frame.timeS * 19 + index * 1.7);
      const length = baseLength * (0.16 + Math.sqrt(thrust) * (isCore ? 0.78 : 1.25)) * altitudeExpansion * flicker * activePalette.lengthFactor;
      const halfWidth = exitHeight * (0.10 + thrust * (isCore ? 0.22 : 0.46)) * (1 + (1 - pressureFraction) * (isCore ? 0.35 : 1.05)) * activePalette.widthFactor;
      const tipX = x - length;
      const shoulderX = x - length * 0.36;
      plume.setAttribute("d", `M ${x} ${y - halfWidth * 0.62} C ${shoulderX} ${y - halfWidth} ${tipX + length * 0.18} ${y - halfWidth * 0.42} ${tipX} ${y} C ${tipX + length * 0.18} ${y + halfWidth * 0.42} ${shoulderX} ${y + halfWidth} ${x} ${y + halfWidth * 0.62} Z`);
      plume.style.opacity = thrust < 0.012 ? "0" : String(isCore ? 0.84 : 0.72);
    });
  }

  function updateMotionArrow(lineSelector, labelSelector, value, maximum, prefix, digits, unit) {
    const line = els.rocketSvg.querySelector(lineSelector);
    const label = els.rocketSvg.querySelector(labelSelector);
    if (!line || !label) return;
    const startX = 450;
    const sign = value < 0 ? -1 : 1;
    const ratio = clampValue(Math.abs(value) / Math.max(1e-9, maximum), 0, 1);
    const length = Math.abs(value) < 0.001 ? 3 : 22 + 122 * Math.sqrt(ratio);
    line.setAttribute("x1", String(startX));
    line.setAttribute("x2", String(startX + sign * length));
    line.style.opacity = Math.abs(value) < 0.001 ? "0.28" : "1";
    label.setAttribute("x", "615");
    label.textContent = `${prefix} ${number(value, digits)} ${unit} ${value < -0.001 ? "←" : value > 0.001 ? "→" : ""}`;
  }

  function updateEnvironmentScene(frame) {
    const body = Data.celestialBodies[state.config.test.bodyKey] || Data.celestialBodies.earth;
    const altitudeM = frame ? Math.max(0, frame.altitudeM) : Math.max(0, state.config.vehicle.launchAltitudeM);
    const idleBlueprint = !frame && !state.config.test.previewAtmosphere;
    els.rocketStage.classList.toggle("is-blueprint", idleBlueprint);
    if (idleBlueprint) {
      els.rocketStage.style.setProperty("--stage-top", "#071116");
      els.rocketStage.style.setProperty("--stage-bottom", "#020609");
      els.rocketStage.style.setProperty("--stage-grid", "rgba(85, 214, 190, 0.045)");
      const blueprintGravity = body.gravityMs2 * Math.pow(body.radiusM / (body.radiusM + altitudeM), 2);
      els.animationEnvironment.textContent = `${body.name} · ${number(blueprintGravity / Core.G0, 2)} g · 编辑图纸`;
      return;
    }
    const environment = frame ? null : Core.environmentState(state.config, altitudeM);
    const pressurePa = frame ? Math.max(0, frame.pressurePa) : environment.pressurePa;
    const forcedVacuum = state.config.test.environment === "vacuum";
    let spaceMix;
    if (!forcedVacuum && body.surfacePressurePa > 0) {
      const pressureRatio = clampValue(pressurePa / body.surfacePressurePa, 0, 1);
      const pressureProgress = 1 - Math.sqrt(pressureRatio);
      const altitudeProgress = clampValue(altitudeM / Math.max(1, body.visualAtmosphereM), 0, 1);
      spaceMix = clampValue(Math.max(pressureProgress, altitudeProgress), 0, 1);
    } else {
      spaceMix = 0.72 + 0.28 * clampValue(altitudeM / Math.max(1, body.visualAtmosphereM), 0, 1);
    }
    els.rocketStage.style.setProperty("--stage-top", mixColor(body.sceneSurface, body.sceneSpace, spaceMix));
    els.rocketStage.style.setProperty("--stage-bottom", mixColor(body.sceneHorizon, body.sceneSpace, Math.min(1, spaceMix * 0.92)));
    els.rocketStage.style.setProperty("--stage-grid", colorAlpha(body.sceneSurface, 0.055 * (1 - spaceMix * 0.72)));
    const localGravity = body.gravityMs2 * Math.pow(body.radiusM / (body.radiusM + altitudeM), 2);
    const modeLabel = forcedVacuum ? "强制真空" : body.atmosphere;
    els.animationEnvironment.textContent = `${body.name} · ${number(localGravity / Core.G0, 2)} g · ${modeLabel}`;
  }

  function updateEngineMarkers(frame) {
    if (!state.result) return;
    const activeDesign = frame && state.result.serial && state.result.serial.enabled
      ? serialFlightStageDesign(frame.activeStageIndex)
      : state.result;
    const propellant = activeDesign.propellant;
    const ambientPressurePa = frame ? frame.pressurePa : Core.environmentState(state.config, state.config.vehicle.launchAltitudeM).pressurePa;
    const exitPressurePa = frame ? frame.exitPressurePa : 0;
    const currentThrustN = frame ? frame.currentThrustN : 0;
    const massFlowKgS = frame ? frame.massFlowKgS : 0;
    const fuelFlowKgS = frame ? frame.fuelMassFlowKgS : 0;
    const oxidizerFlowKgS = frame ? frame.oxidizerMassFlowKgS : 0;
    const exhaustVelocityMs = frame ? frame.exhaustVelocityMs : 0;
    const detailDigits = massFlowKgS >= 100 ? 1 : massFlowKgS >= 10 ? 2 : 3;
    els.engineAmbientPressure.textContent = formatPressure(ambientPressurePa);
    els.engineExitPressure.textContent = formatPressure(exitPressurePa);
    els.engineCurrentThrust.textContent = formatThrust(currentThrustN);
    els.engineMassFlow.textContent = formatMassFlow(massFlowKgS);
    const stagePrefix = frame && state.result.serial && state.result.serial.enabled ? `${frame.activeStageName} · ` : "";
    els.engineMassFlowDetail.textContent = propellant.mono
      ? `${stagePrefix}单组元 ${number(fuelFlowKgS, detailDigits)} kg/s`
      : `${stagePrefix}燃料 ${number(fuelFlowKgS, detailDigits)} · 氧化剂 ${number(oxidizerFlowKgS, detailDigits)} kg/s`;
    els.engineExhaustVelocity.textContent = `${number(exhaustVelocityMs, 0)} m/s`;
    els.engineLiveStrip.classList.toggle("is-active", massFlowKgS > 0.001);
  }

  function playbackRateText(mode, timeS) {
    if (state.animation.paused) return "0× · 暂停";
    if (mode && !state.animation.playing && state.animation.frame) return "0× · 结束";
    if (!mode) return els.playbackSpeed.value === "auto" ? "自动" : `${number(Number(els.playbackSpeed.value), 1)}×`;
    const rate = animationSpeed(mode, timeS);
    const digits = Math.abs(rate - Math.round(rate)) < 1e-9 ? 0 : 1;
    return `${number(rate, digits)}×${els.playbackSpeed.value === "auto" ? " · 自动" : ""}`;
  }

  function updateFlightLiveTelemetry(frame, mode) {
    const isFlight = mode === "flight";
    const altitudeM = frame ? frame.altitudeM : state.config.vehicle.launchAltitudeM;
    const velocityMs = frame ? frame.velocityMs : 0;
    const accelerationG = frame ? frame.accelerationG : 0;
    const qPa = frame ? frame.qPa || 0 : 0;
    els.flightLiveAltitude.textContent = formatAltitude(altitudeM);
    els.flightLiveVelocity.textContent = `${number(velocityMs, 0)} m/s`;
    els.flightLiveAcceleration.textContent = `${number(accelerationG, 2)} g`;
    els.flightLiveAccelerationDetail.textContent = `${number(accelerationG * Core.G0, 2)} m/s²`;
    els.flightLiveDynamicPressure.textContent = `${number(qPa / 1000, 2)} kPa`;
    els.flightLiveTimeScale.textContent = playbackRateText(mode, frame ? frame.timeS : 0);
    els.flightLiveStrip.classList.toggle("is-active", isFlight);
  }

  function updateLaunchStatus(frame, mode) {
    if (mode === "static") {
      els.animationLaunchState.textContent = `试车台固定 · 推力 ${number(frame.thrustRatio * 100, 0)}%`;
      return;
    }
    const instantTwr = Number.isFinite(frame.instantTwr) ? frame.instantTwr : 0;
    if (frame.timeS < 0) {
      const ratedTwr = Number(state.result.flight.initialTwr || state.result.performance.twr || 0);
      const combinedLabel = state.result.parallel && state.result.parallel.enabled ? "组合额定" : "额定";
      els.animationLaunchState.textContent = `发射系统待命 · 当前 T/W ${number(instantTwr, 2)} · ${combinedLabel} T/W ${number(ratedTwr, 2)}`;
    } else if (frame.heldDown) {
      els.animationLaunchState.textContent = `摇臂锁定 · T/W ${number(instantTwr, 2)} · 合格 ${number(frame.thrustQualifiedS || 0, 1)} / 1.0 s`;
    } else if (frame.groundSupported) {
      els.animationLaunchState.textContent = `野地接地 · T/W ${number(instantTwr, 2)} · 达到 1.00 即离地`;
    } else if (state.result.flight.liftoffTimeS != null && frame.timeS <= state.result.flight.liftoffTimeS + 1.2) {
      els.animationLaunchState.textContent = `${state.config.vehicle.launchMode === "pad" ? "摇臂已解锁" : "已离开地面"} · T/W ${number(instantTwr, 2)}`;
    } else {
      els.animationLaunchState.textContent = `${frame.currentThrustN > 1 ? "自由飞行" : "发动机关机"} · T/W ${number(instantTwr, 2)}`;
    }
  }

  function updateDynamicVisual(frame, mode) {
    if (!frame || !state.result) return;
    const serialFlight = mode === "flight" && state.result.serial && state.result.serial.enabled;
    if (serialFlight && Array.isArray(frame.stageRemainingFractions)) {
      frame.stageRemainingFractions.forEach(function (fraction, index) {
        updateTankFill(`[data-anim="stage-fuel-fill"][data-stage-index="${index}"]`, fraction);
        updateTankFill(`[data-anim="stage-oxidizer-fill"][data-stage-index="${index}"]`, fraction);
      });
      els.rocketSvg.querySelectorAll("[data-serial-preview-stage]").forEach(function (segment) {
        const index = Number(segment.dataset.serialPreviewStage) - 1;
        segment.classList.toggle("is-separated", index < Number(frame.separatedStageCount || 0));
        segment.classList.toggle("is-active-stage", index === Number(frame.activeStageIndex));
      });
      els.rocketSvg.querySelectorAll("[data-serial-interface-to]").forEach(function (interfaceGroup) {
        interfaceGroup.classList.toggle("is-separated", Number(interfaceGroup.dataset.serialInterfaceTo) <= Number(frame.separatedStageCount || 0));
      });
    } else {
      updateTankFill('[data-anim="fuel-fill"]', frame.coreRemainingFraction == null ? frame.remainingFraction : frame.coreRemainingFraction);
      updateTankFill('[data-anim="oxidizer-fill"]', frame.coreRemainingFraction == null ? frame.remainingFraction : frame.coreRemainingFraction);
    }
    updateTankFill('[data-anim="booster-fill"]', frame.boosterRemainingFraction == null ? frame.remainingFraction : frame.boosterRemainingFraction);
    els.rocketSvg.querySelectorAll("[data-booster-assembly]").forEach(function (assembly) {
      assembly.classList.toggle("is-separated", mode === "flight" && frame.boosterAttached === false);
    });
    updatePlumes(frame);
    updateMotionArrow('[data-anim="velocity-arrow"]', '[data-anim="velocity-label"]', frame.velocityMs, Math.max(1, state.result.flight.maxVelocityMs || 1), "v", 0, "m/s");
    updateMotionArrow('[data-anim="accel-arrow"]', '[data-anim="accel-label"]', frame.accelerationG, Math.max(1, state.result.flight.maxNetAccelG || Math.abs(frame.accelerationG) || 1), mode === "static" ? "a_eq" : "a净", 2, "g");
    const forceScaleG = Math.max(1, Math.abs(frame.gravityAccelG || 0), state.result.flight.maxDragAccelG || 0);
    updateMotionArrow('[data-anim="gravity-arrow"]', '[data-anim="gravity-label"]', frame.gravityAccelG || 0, forceScaleG, "a重力", 2, "g");
    updateMotionArrow('[data-anim="drag-arrow"]', '[data-anim="drag-label"]', frame.dragAccelG || 0, forceScaleG, "a阻力", 3, "g");
    els.rocketSvg.querySelectorAll("[data-flight-force]").forEach(function (element) {
      element.style.display = mode === "flight" ? "" : "none";
    });

    els.animationPhase.textContent = mode === "static" ? `试车 · ${frame.phase}` : `直飞 · ${frame.phase}`;
    els.animationClock.textContent = frame.timeS < 0 ? `T-${number(Math.abs(frame.timeS), 1)} s` : `T+${number(frame.timeS, 1)} s`;
    els.animationAltitude.textContent = `高度 ${formatAltitude(frame.altitudeM)}`;
    els.animationMotion.textContent = `v ${number(frame.velocityMs, 0)} m/s · a ${number(frame.accelerationG, 2)} g`;
    els.animationDynamicPressure.textContent = `Q ${number((frame.qPa || 0) / 1000, 2)} kPa`;
    els.animationThrottle.textContent = `节流 ${number((frame.throttle || 0) * 100, 1)}% · ${frame.throttleState || "关机"}`;
    els.fuelRemainBar.style.width = `${number(frame.remainingFraction * 100, 2)}%`;
    els.fuelRemainValue.textContent = `${number(frame.remainingFraction * 100, 1)}%`;
    els.oxidizerRemainBar.style.width = `${number(frame.remainingFraction * 100, 2)}%`;
    els.oxidizerRemainValue.textContent = `${number(frame.remainingFraction * 100, 1)}%`;
    const activeDesign = serialFlight ? serialFlightStageDesign(frame.activeStageIndex) : state.result;
    const activeStagePrefix = serialFlight ? `${frame.activeStageName} · ` : "";
    els.fuelRemainLabel.textContent = `${activeStagePrefix}${activeDesign.propellant.mono ? "推进剂" : "燃料"}`;
    els.oxidizerRemainRow.hidden = activeDesign.propellant.mono;
    const boosterFraction = frame.boosterRemainingFraction == null ? 1 : frame.boosterRemainingFraction;
    els.boosterRemainRow.hidden = !(state.result.parallel && state.result.parallel.enabled);
    els.boosterRemainBar.style.width = `${number(boosterFraction * 100, 2)}%`;
    els.boosterRemainValue.textContent = frame.boosterAttached === false ? "已分离" : `${number(boosterFraction * 100, 1)}%`;
    els.summaryAccelNote.textContent = `当前加速度 ${number(frame.accelerationG, 2)} g · 当前 T/W ${number(frame.instantTwr || 0, 2)} · 最大净加速度 ${number(state.result.flight.maxNetAccelG || 0, 2)} g`;
    updateFlightLiveTelemetry(frame, mode);
    updateEnvironmentScene(frame);
    els.rocketStage.classList.toggle("is-running", state.animation.playing);
    updateEngineMarkers(frame);
    updateLaunchStatus(frame, mode);
  }

  function resetDynamicReadout() {
    if (!state.result) return;
    els.animationPhase.textContent = "待机";
    els.animationClock.textContent = "T+0.0 s";
    els.animationAltitude.textContent = `高度 ${formatAltitude(state.config.vehicle.launchAltitudeM)}`;
    els.animationMotion.textContent = "v 0 m/s · a 0.00 g";
    els.animationDynamicPressure.textContent = "Q 0.00 kPa";
    els.animationThrottle.textContent = "节流 0.0% · 关机";
    els.animationLaunchState.textContent = `${state.config.vehicle.launchMode === "pad" ? "摇臂待命" : "野地待命"} · T/W 0.00`;
    els.fuelRemainBar.style.width = "100%";
    els.fuelRemainValue.textContent = "100%";
    els.oxidizerRemainBar.style.width = "100%";
    els.oxidizerRemainValue.textContent = "100%";
    updateTankFill('[data-anim="stage-fuel-fill"]', 1);
    updateTankFill('[data-anim="stage-oxidizer-fill"]', 1);
    updateTankFill('[data-anim="booster-fill"]', 1);
    els.rocketSvg.querySelectorAll("[data-booster-assembly]").forEach(function (assembly) { assembly.classList.remove("is-separated"); });
    els.rocketSvg.querySelectorAll("[data-serial-preview-stage], [data-serial-interface-to]").forEach(function (element) {
      element.classList.remove("is-separated", "is-active-stage");
    });
    els.fuelRemainLabel.textContent = state.result.propellant.mono ? "推进剂" : "燃料";
    els.oxidizerRemainRow.hidden = state.result.propellant.mono;
    els.boosterRemainRow.hidden = !(state.result.parallel && state.result.parallel.enabled);
    els.boosterRemainBar.style.width = "100%";
    els.boosterRemainValue.textContent = "100%";
    els.summaryAccelNote.textContent = `当前加速度 0.00 g · 最大净加速度 ${number(state.result.flight.maxNetAccelG || 0, 2)} g`;
    updateFlightLiveTelemetry(null, null);
    els.rocketSvg.querySelectorAll("[data-flight-force]").forEach(function (element) {
      element.style.display = "none";
    });
    updateEnvironmentScene(null);
    els.rocketStage.classList.remove("is-running");
    updateEngineMarkers(null);
    updateSoundMixStatus(null);
  }

  function createNoiseBuffer(context, seconds) {
    const frameCount = Math.max(1, Math.floor(context.sampleRate * seconds));
    const buffer = context.createBuffer(1, frameCount, context.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < frameCount; i += 1) channel[i] = Math.random() * 2 - 1;
    return buffer;
  }

  function ensureAudio() {
    if (!state.soundEnabled) return null;
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) {
      showToast("当前浏览器不支持 Web Audio，动态画面仍可播放。", true);
      state.soundEnabled = false;
      saveAudioSettings();
      updateSoundButton();
      return null;
    }
    if (!audioState.context) {
      audioState.context = new Context();
      audioState.master = audioState.context.createGain();
      audioState.ignitionBus = audioState.context.createGain();
      audioState.master.gain.value = state.audioSettings.masterVolume;
      audioState.ignitionBus.gain.value = state.audioSettings.ignitionVolume;
      audioState.ignitionBus.connect(audioState.master);
      audioState.master.connect(audioState.context.destination);
    }
    if (audioState.context.state === "suspended") audioState.context.resume().catch(function () {});
    return audioState.context;
  }

  function playIgnitionBoom() {
    const context = ensureAudio();
    if (!context || !audioState.ignitionBus) return;
    const now = context.currentTime;
    const source = context.createBufferSource();
    source.buffer = createNoiseBuffer(context, 0.9);
    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(750, now);
    filter.frequency.exponentialRampToValueAtTime(85, now + 0.85);
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.72, now + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.86);
    source.connect(filter).connect(gain).connect(audioState.ignitionBus);
    source.start(now);
    source.stop(now + 0.9);

    const boom = context.createOscillator();
    const boomGain = context.createGain();
    boom.type = "sine";
    boom.frequency.setValueAtTime(82, now);
    boom.frequency.exponentialRampToValueAtTime(32, now + 0.62);
    boomGain.gain.setValueAtTime(0.0001, now);
    boomGain.gain.exponentialRampToValueAtTime(0.48, now + 0.025);
    boomGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.68);
    boom.connect(boomGain).connect(audioState.ignitionBus);
    boom.start(now);
    boom.stop(now + 0.7);
  }

  function startRumble() {
    if (!state.soundEnabled || audioState.rumble) return;
    const context = ensureAudio();
    if (!context || !audioState.master) return;
    const now = context.currentTime;
    const lowNoise = context.createBufferSource();
    lowNoise.buffer = createNoiseBuffer(context, 2.0);
    lowNoise.loop = true;
    const lowNoiseGain = context.createGain();
    lowNoiseGain.gain.value = 0.72;
    const lowFilter = context.createBiquadFilter();
    lowFilter.type = "lowpass";
    lowFilter.frequency.value = 180;
    lowFilter.Q.value = 0.7;
    const lowOutput = context.createGain();
    lowOutput.gain.value = 0.0001;
    lowNoise.connect(lowNoiseGain).connect(lowFilter).connect(lowOutput);

    const jetNoise = context.createBufferSource();
    jetNoise.buffer = createNoiseBuffer(context, 2.4);
    jetNoise.loop = true;
    const jetNoiseGain = context.createGain();
    jetNoiseGain.gain.value = 0.42;
    const jetFilter = context.createBiquadFilter();
    jetFilter.type = "bandpass";
    jetFilter.frequency.value = 1050;
    jetFilter.Q.value = 0.55;
    const jetOutput = context.createGain();
    jetOutput.gain.value = 0.0001;
    jetNoise.connect(jetNoiseGain).connect(jetFilter).connect(jetOutput);

    const toneGain = context.createGain();
    toneGain.gain.value = 0.14;
    const toneA = context.createOscillator();
    const toneB = context.createOscillator();
    toneA.type = "sawtooth";
    toneB.type = "triangle";
    toneA.frequency.value = 37;
    toneB.frequency.value = 59;
    toneA.connect(toneGain);
    toneB.connect(toneGain);
    toneGain.connect(lowOutput);

    const turbine = context.createOscillator();
    turbine.type = "sawtooth";
    turbine.frequency.value = 140;
    const turbineFilter = context.createBiquadFilter();
    turbineFilter.type = "bandpass";
    turbineFilter.frequency.value = 520;
    turbineFilter.Q.value = 2.2;
    const turbineOutput = context.createGain();
    turbineOutput.gain.value = 0.0001;
    turbine.connect(turbineFilter).connect(turbineOutput);

    lowOutput.connect(audioState.master);
    jetOutput.connect(audioState.master);
    turbineOutput.connect(audioState.master);
    lowNoise.start(now);
    jetNoise.start(now);
    toneA.start(now);
    toneB.start(now);
    turbine.start(now);
    audioState.rumble = {
      lowNoise,
      jetNoise,
      toneA,
      toneB,
      turbine,
      lowFilter,
      jetFilter,
      turbineFilter,
      lowOutput,
      jetOutput,
      turbineOutput
    };
  }

  function setRumble(frame, mode) {
    if (!state.soundEnabled || !frame) return null;
    const thrustRatio = clampValue(frame.thrustRatio, 0, 1.1);
    if (thrustRatio > 0.01 && !audioState.rumble) startRumble();
    const rumble = audioState.rumble;
    const context = audioState.context;
    const engineStartTimeS = mode === "static" ? 2 : 0;
    const envelope = AudioModel.calculateSoundEnvelope({
      engineElapsedS: Math.max(0, frame.timeS - engineStartTimeS),
      pressurePa: frame.pressurePa,
      autoListeningFade: state.audioSettings.autoListeningFade,
      vacuumAttenuation: state.audioSettings.vacuumAttenuation
    });
    updateSoundMixStatus(envelope);
    if (!rumble || !context) return envelope;
    const thrustLevel = Math.sqrt(thrustRatio);
    const effective = envelope.effectiveFactor;
    const now = context.currentTime;
    const lowLevel = 0.0001 + 0.28 * thrustLevel * effective * state.audioSettings.rumbleVolume;
    const jetLevel = 0.0001 + 0.17 * thrustLevel * effective * state.audioSettings.jetVolume;
    const turbineLevel = 0.0001 + 0.038 * thrustLevel * effective * state.audioSettings.jetVolume;
    rumble.lowOutput.gain.setTargetAtTime(lowLevel, now, 0.045);
    rumble.jetOutput.gain.setTargetAtTime(jetLevel, now, 0.05);
    rumble.turbineOutput.gain.setTargetAtTime(turbineLevel, now, 0.055);
    rumble.lowFilter.frequency.setTargetAtTime(90 + 260 * thrustRatio * envelope.vacuumFactor, now, 0.06);
    rumble.jetFilter.frequency.setTargetAtTime(620 + 1800 * thrustRatio * envelope.vacuumFactor, now, 0.07);
    rumble.turbineFilter.frequency.setTargetAtTime(360 + 720 * thrustRatio, now, 0.07);
    rumble.turbine.frequency.setTargetAtTime(110 + 310 * thrustRatio, now, 0.07);
    return envelope;
  }

  function stopRumble() {
    const rumble = audioState.rumble;
    const context = audioState.context;
    audioState.rumble = null;
    if (!rumble || !context) return;
    const now = context.currentTime;
    [rumble.lowOutput, rumble.jetOutput, rumble.turbineOutput].forEach(function (output) {
      output.gain.cancelScheduledValues(now);
      output.gain.setTargetAtTime(0.0001, now, 0.035);
    });
    [rumble.lowNoise, rumble.jetNoise, rumble.toneA, rumble.toneB, rumble.turbine].forEach(function (node) {
      try { node.stop(now + 0.18); } catch (error) {}
    });
  }

  function updateSoundMixStatus(envelope) {
    if (!els.soundMixStatus) return;
    if (!state.soundEnabled) {
      els.soundMixStatus.textContent = `已静音 · 总音量 ${number(state.audioSettings.masterVolume * 100, 0)}%`;
      return;
    }
    if (!envelope || !state.animation.mode) {
      els.soundMixStatus.textContent = `待机 · 总音量 ${number(state.audioSettings.masterVolume * 100, 0)}%`;
      return;
    }
    const comfortLabel = state.audioSettings.autoListeningFade
      ? `护耳 ${number(envelope.listeningFactor * 100, 0)}%`
      : "护耳关闭";
    const vacuumLabel = state.audioSettings.vacuumAttenuation
      ? `环境 ${number(envelope.vacuumFactor * 100, 0)}%`
      : "真空模拟关闭";
    els.soundMixStatus.textContent = `声场 ${number(envelope.effectiveFactor * 100, 0)}% · ${comfortLabel} · ${vacuumLabel}`;
  }

  function syncAudioControls() {
    const settings = state.audioSettings;
    [
      ["soundMasterVolume", "soundMasterVolumeOut", settings.masterVolume],
      ["soundIgnitionVolume", "soundIgnitionVolumeOut", settings.ignitionVolume],
      ["soundRumbleVolume", "soundRumbleVolumeOut", settings.rumbleVolume],
      ["soundJetVolume", "soundJetVolumeOut", settings.jetVolume]
    ].forEach(function (entry) {
      els[entry[0]].value = String(Math.round(entry[2] * 100));
      els[entry[1]].value = `${Math.round(entry[2] * 100)}%`;
      els[entry[1]].textContent = `${Math.round(entry[2] * 100)}%`;
    });
    els.soundAutoFade.checked = settings.autoListeningFade;
    els.soundVacuumAttenuation.checked = settings.vacuumAttenuation;
    updateSoundButton();
    updateSoundMixStatus(null);
  }

  function applyAudioControls() {
    state.audioSettings.masterVolume = clampValue(Number(els.soundMasterVolume.value) / 100, 0, 1);
    state.audioSettings.ignitionVolume = clampValue(Number(els.soundIgnitionVolume.value) / 100, 0, 1);
    state.audioSettings.rumbleVolume = clampValue(Number(els.soundRumbleVolume.value) / 100, 0, 1);
    state.audioSettings.jetVolume = clampValue(Number(els.soundJetVolume.value) / 100, 0, 1);
    state.audioSettings.autoListeningFade = els.soundAutoFade.checked;
    state.audioSettings.vacuumAttenuation = els.soundVacuumAttenuation.checked;
    if (audioState.context && audioState.master) {
      const now = audioState.context.currentTime;
      audioState.master.gain.setTargetAtTime(state.soundEnabled ? state.audioSettings.masterVolume : 0.0001, now, 0.025);
      audioState.ignitionBus.gain.setTargetAtTime(state.audioSettings.ignitionVolume, now, 0.025);
    }
    syncAudioControls();
    saveAudioSettings();
    if (state.animation.frame && state.animation.mode) setRumble(state.animation.frame, state.animation.mode);
  }

  function updateSoundButton() {
    els.soundToggleBtn.textContent = state.soundEnabled ? "声音：开" : "声音：关";
    els.soundToggleBtn.setAttribute("aria-pressed", String(state.soundEnabled));
  }

  function cancelCountdownVoice(resetSpoken) {
    if (typeof window.speechSynthesis !== "undefined") window.speechSynthesis.cancel();
    if (resetSpoken) state.animation.lastCountdownSpoken = null;
  }

  function speakCountdownNumber(value) {
    if (!state.soundEnabled || typeof window.speechSynthesis === "undefined" || typeof window.SpeechSynthesisUtterance === "undefined") return;
    const spoken = I18n ? I18n.speechNumber(value) : ({ 10: "十", 9: "九", 8: "八", 7: "七", 6: "六", 5: "五", 4: "四", 3: "三", 2: "二", 1: "一" })[value];
    if (!spoken) return;
    const utterance = new window.SpeechSynthesisUtterance(spoken);
    utterance.lang = I18n ? I18n.speechLang() : "zh-CN";
    utterance.rate = 0.92;
    utterance.pitch = 0.86;
    utterance.volume = clampValue(state.audioSettings.masterVolume, 0, 1);
    const languagePrefix = utterance.lang.split("-")[0];
    const localizedVoice = window.speechSynthesis.getVoices().find(function (voice) {
      return new RegExp("^" + languagePrefix + "(?:-|_)", "i").test(voice.lang || "");
    });
    if (localizedVoice) utterance.voice = localizedVoice;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  function handleCountdownVoice(frame) {
    const vehicle = state.config.vehicle;
    if (!frame || state.animation.mode !== "flight" || !vehicle.countdownEnabled || !vehicle.immersiveLaunch || !state.soundEnabled || frame.timeS >= 0) return;
    const remaining = Math.ceil(-frame.timeS);
    if (remaining < 1 || remaining > 10 || remaining === state.animation.lastCountdownSpoken) return;
    state.animation.lastCountdownSpoken = remaining;
    speakCountdownNumber(remaining);
  }

  function animationSpeed(mode, timeS) {
    if (mode === "flight" && state.config.vehicle.immersiveLaunch) {
      const countdownStartS = state.config.vehicle.countdownEnabled ? -state.config.vehicle.countdownSeconds : 0;
      if (timeS >= countdownStartS && timeS <= 5) return 1;
    }
    if (els.playbackSpeed.value === "auto") return mode === "flight" ? 10 : 1;
    return clampValue(Number(els.playbackSpeed.value), 0.5, 20);
  }

  function updateAnimationButtons() {
    const animation = state.animation;
    els.animationPauseBtn.disabled = !animation.mode || (!animation.playing && !animation.paused);
    els.animationPauseBtn.textContent = animation.paused ? "继续" : "暂停";
    els.animationResetBtn.disabled = !animation.mode;
    els.staticRunBtn.setAttribute("aria-pressed", String(animation.mode === "static" && animation.playing));
    els.flightRunBtn.setAttribute("aria-pressed", String(animation.mode === "flight" && animation.playing));
    els.staticRunBtn.textContent = animation.mode === "static" && animation.playing ? "试车运行中" : "点火试车";
    els.flightRunBtn.textContent = animation.mode === "flight" && animation.playing ? "直飞运行中" : "直飞演示";
  }

  function animationTick(timestamp) {
    const animation = state.animation;
    if (!animation.playing || !animation.mode || !state.result) return;
    if (!animation.lastTimestamp) animation.lastTimestamp = timestamp;
    const realDelta = clampValue((timestamp - animation.lastTimestamp) / 1000, 0, 0.12);
    animation.lastTimestamp = timestamp;
    const points = animation.mode === "flight" ? state.result.flight.points : state.result.staticFire.points;
    const endTime = points.length ? points[points.length - 1].timeS : 0;
    const burnout = animation.mode === "flight" ? state.result.flight.burnoutSnapshot : null;
    const autoPauseTimeS = state.config.vehicle.pauseAfterBurnout && !animation.autoPauseHandled && burnout
      ? burnout.timeS + 1
      : Infinity;
    animation.simTimeS += realDelta * animationSpeed(animation.mode, animation.simTimeS);
    animation.simTimeS = Math.min(animation.simTimeS, endTime, autoPauseTimeS);
    const frame = animationFrameFor(animation.mode, animation.simTimeS);
    animation.frame = frame;
    if (frame) {
      handleCountdownVoice(frame);
      const serialIgnition = animation.mode === "flight" && state.result.serial && state.result.serial.enabled
        && frame.timeS >= 0 && frame.currentThrustN > 1
        && Number(frame.activeStageIndex) !== animation.lastIgnitedStageIndex;
      if (serialIgnition) {
        playIgnitionBoom();
        startRumble();
        animation.boomPlayed = true;
        animation.lastIgnitedStageIndex = Number(frame.activeStageIndex);
      } else if (!animation.boomPlayed && ((animation.mode === "static" && frame.timeS >= 2) || (animation.mode === "flight" && frame.timeS >= 0))) {
        playIgnitionBoom();
        startRumble();
        animation.boomPlayed = true;
      }
      updateDynamicVisual(frame, animation.mode);
      setRumble(frame, animation.mode);
    }
    if (autoPauseTimeS < endTime && animation.simTimeS >= autoPauseTimeS - 1e-9) {
      animation.autoPauseHandled = true;
      animation.playing = false;
      animation.paused = true;
      cancelCountdownVoice(false);
      stopRumble();
      els.soundMixStatus.textContent = `熄火后 1 秒自动暂停 · 总音量 ${number(state.audioSettings.masterVolume * 100, 0)}%`;
      els.rocketStage.classList.remove("is-running");
      if (animation.frame) updateFlightLiveTelemetry(animation.frame, animation.mode);
      updateAnimationButtons();
      return;
    }
    if (animation.simTimeS >= endTime) {
      animation.playing = false;
      animation.paused = false;
      cancelCountdownVoice(false);
      stopRumble();
      updateSoundMixStatus(null);
      if (animation.frame) updateFlightLiveTelemetry(animation.frame, animation.mode);
      updateAnimationButtons();
      els.rocketStage.classList.remove("is-running");
      return;
    }
    animation.rafId = requestAnimationFrame(animationTick);
  }

  function refreshFlightPlaybackGate() {
    const launchState = Core.liftoffState(state.config, state.result);
    if (state.result.flight && state.result.flight.status === "no-liftoff" && launchState.twr > 1) {
      state.result.flight = state.result.serial && state.result.serial.enabled
        ? Core.runSerialVerticalFlight(state.config, state.result)
        : Core.runVerticalFlight(state.config, state.result);
      renderFlight(state.result);
      renderSummary(state.result);
      console.info("Rocket SIM 已用芯级与助推器组合工况刷新直飞时间轴。", launchState);
    }
    return launchState;
  }

  function startAnimation(mode) {
    if (!state.result) return;
    const launchState = mode === "flight" ? refreshFlightPlaybackGate() : null;
    if (mode === "flight" && state.result.flight.status === "no-liftoff") {
      showToast(`当前全箭组合 T/W ${number(launchState ? launchState.twr : 0, 2)}，不足以离架；仍可播放地面试车。`, true);
      return;
    }
    const timeline = mode === "flight" ? state.result.flight : state.result.staticFire;
    if (!timeline || !Array.isArray(timeline.points) || timeline.points.length < 2) {
      showToast(mode === "flight" ? "直飞时间轴无效，请重新计算或恢复默认火箭。" : "试车时间轴无效，请重新计算。", true);
      return;
    }
    switchRocketWisdomForSimulation();
    resetAnimation(false);
    state.animation.mode = mode;
    state.animation.playing = true;
    state.animation.paused = false;
    const countdownSeconds = mode === "flight" && state.config.vehicle.countdownEnabled
      ? state.config.vehicle.countdownSeconds
      : 0;
    state.animation.simTimeS = -countdownSeconds;
    state.animation.lastTimestamp = 0;
    state.animation.frame = animationFrameFor(mode, state.animation.simTimeS);
    state.animation.boomPlayed = false;
    state.animation.lastCountdownSpoken = null;
    state.animation.autoPauseHandled = false;
    updateAnimationButtons();
    if (mode === "flight") {
      els.animationLaunchState.textContent = `直飞指令已接收 · ${launchState && launchState.parallel ? "芯级 + 助推器组合点火" : "芯级点火"} · 额定 T/W ${number(launchState ? launchState.twr : 0, 2)}`;
    }
    try {
      setResultTab(mode === "flight" ? "flight" : "static");
      renderRocket(state.result);
      if (state.animation.frame) {
        updateDynamicVisual(state.animation.frame, mode);
        handleCountdownVoice(state.animation.frame);
      }
      state.animation.rafId = requestAnimationFrame(animationTick);
    } catch (error) {
      console.error("Rocket SIM 动态演示初始化失败：", error);
      resetAnimation(false);
      showToast(`动态演示初始化失败：${error && error.message ? error.message : "未知错误"}`, true);
      return;
    }
    // 声音是附属通道；先启动画面，音频失败不应阻塞直飞。
    try { ensureAudio(); } catch (error) {
      console.warn("Rocket SIM 声音初始化失败，已继续静音播放：", error);
      state.soundEnabled = false;
      saveAudioSettings();
      updateSoundButton();
      showToast("声音初始化失败，直飞画面已改为静音播放。", true);
    }
  }

  function toggleAnimationPause() {
    const animation = state.animation;
    if (!animation.mode) return;
    if (animation.playing) {
      animation.playing = false;
      animation.paused = true;
      cancelAnimationFrame(animation.rafId);
      cancelCountdownVoice(false);
      stopRumble();
      els.soundMixStatus.textContent = `已暂停 · 总音量 ${number(state.audioSettings.masterVolume * 100, 0)}%`;
      els.rocketStage.classList.remove("is-running");
    } else if (animation.paused) {
      animation.playing = true;
      animation.paused = false;
      animation.lastTimestamp = 0;
      if (animation.frame && animation.frame.thrustRatio > 0.01) startRumble();
      animation.rafId = requestAnimationFrame(animationTick);
    }
    if (animation.frame) updateFlightLiveTelemetry(animation.frame, animation.mode);
    updateAnimationButtons();
  }

  function resetAnimation(renderVehicle) {
    cancelAnimationFrame(state.animation.rafId);
    cancelCountdownVoice(true);
    stopRumble();
    state.animation.mode = null;
    state.animation.playing = false;
    state.animation.paused = false;
    state.animation.simTimeS = 0;
    state.animation.lastTimestamp = 0;
    state.animation.rafId = 0;
    state.animation.frame = null;
    state.animation.boomPlayed = false;
    state.animation.lastIgnitedStageIndex = -1;
    state.animation.lastCountdownSpoken = null;
    state.animation.autoPauseHandled = false;
    if (renderVehicle !== false && state.result) renderRocket(state.result);
    resetDynamicReadout();
    updateAnimationButtons();
  }

  function toggleSound() {
    state.soundEnabled = !state.soundEnabled;
    if (audioState.context && audioState.master) {
      audioState.master.gain.setTargetAtTime(state.soundEnabled ? state.audioSettings.masterVolume : 0.0001, audioState.context.currentTime, 0.025);
    }
    if (!state.soundEnabled) {
      cancelCountdownVoice(false);
      stopRumble();
      updateSoundMixStatus(null);
    } else {
      ensureAudio();
      if (state.animation.playing && state.animation.frame && state.animation.frame.thrustRatio > 0.01) {
        startRumble();
        setRumble(state.animation.frame, state.animation.mode);
      } else updateSoundMixStatus(null);
    }
    saveAudioSettings();
    updateSoundButton();
    if (!state.animation.playing || !state.animation.frame) updateSoundMixStatus(null);
  }

  function renderLaneChart(svg, points, series, faultTime) {
    const width = 880;
    const height = 330;
    const margin = { left: 78, right: 82, top: 20, bottom: 34 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const laneHeight = plotHeight / series.length;
    const data = samplePoints(points, 260);
    const maxTime = Math.max(1, data.length ? data[data.length - 1].timeS : 1);
    const x = function (t) { return margin.left + (t / maxTime) * plotWidth; };
    let content = `<line class="axis-line" x1="${margin.left}" y1="${height - margin.bottom}" x2="${width - margin.right}" y2="${height - margin.bottom}"/>`;
    for (let tick = 0; tick <= 5; tick += 1) {
      const tx = margin.left + plotWidth * tick / 5;
      const time = maxTime * tick / 5;
      content += `<line class="grid-line" x1="${tx}" y1="${margin.top}" x2="${tx}" y2="${height - margin.bottom}"/>${svgText(tx, height - 12, `${number(time, 0)} s`, "tick-label", "middle")}`;
    }
    series.forEach(function (entry, index) {
      const top = margin.top + index * laneHeight;
      const bottom = top + laneHeight - 12;
      const values = data.map(function (point) { return Number(entry.value(point)) || 0; });
      const maxValue = Math.max(entry.floor || 0, ...values, 1e-9);
      const path = data.map(function (point, pointIndex) {
        const px = x(point.timeS);
        const py = bottom - (Number(entry.value(point)) || 0) / maxValue * (laneHeight - 26);
        return `${pointIndex ? "L" : "M"} ${px.toFixed(2)} ${py.toFixed(2)}`;
      }).join(" ");
      content += `<line class="grid-line" x1="${margin.left}" y1="${bottom}" x2="${width - margin.right}" y2="${bottom}"/>`;
      content += svgText(8, top + 18, entry.label, "series-label");
      content += svgText(width - 7, top + 18, entry.format(maxValue), "tick-label", "end");
      content += `<path class="line-${(index % 4) + 1}" d="${path}"/>`;
    });
    if (faultTime != null) {
      const fx = x(faultTime);
      content += `<line class="fault-line" x1="${fx}" y1="${margin.top}" x2="${fx}" y2="${height - margin.bottom}"/>${svgText(fx + 5, margin.top + 11, "故障关机", "series-label")}`;
    }
    svg.innerHTML = `<title>按同一时间轴对齐的模拟曲线</title><desc>每条横向泳道使用独立纵轴，右侧标注该序列最大值。</desc>${content}`;
  }

  function miniMetrics(rows) {
    return rows.map(function (row) {
      return `<div class="mini-metric"><span>${escapeHtml(row[0])}</span><strong>${escapeHtml(row[1])}</strong></div>`;
    }).join("");
  }

  function renderFlight(result) {
    const flight = result.flight;
    const rows = [
      [flight.status === "limit" ? "3600 s 积分高度" : "滑行顶点", formatAltitude(flight.status === "limit" ? (flight.finalAltitudeM || 0) : (flight.maxAltitudeM || 0))],
      ["最大速度", `${number(flight.maxVelocityMs || 0, 0)} m/s`],
      ["最大动压", `${number((flight.maxQPa || 0) / 1000, 1)} kPa`],
      ["最大净加速度 / 过载", `${number(flight.maxNetAccelG || 0, 2)} / ${number(flight.maxAccelG || 0, 2)} g`],
      ["离架方式", flight.launchMode === "field" ? "野地 · T/W > 1 即离地" : "发射场 · T/W > 1 持续 1 秒"],
      ["离架时刻 / 预耗推进剂", flight.liftoffTimeS == null ? "未离架" : `T+${number(flight.liftoffTimeS, 1)} s / ${formatMass(flight.prelaunchConsumedPropellantKg || 0)}`],
      ["实际燃时", `${number(flight.burnTimeS || 0, 1)} s`],
      ["重力损失", `${number(flight.gravityLossMs || 0, 0)} m/s`],
      ["阻力损失", `${number(flight.dragLossMs || 0, 0)} m/s`],
      ["状态", flight.message]
    ];
    if (flight.status === "limit" && flight.altitudeMilestones) {
      [600, 1800].forEach(function (timeS) {
        const milestone = flight.altitudeMilestones[timeS];
        if (milestone) {
          rows.splice(rows.length - 1, 0, [
            `T+${timeS} s 高度 / 上升距离`,
            `${formatAltitude(milestone.altitudeM)} / ${formatAltitude(milestone.distanceFromLaunchM)}`
          ]);
        }
      });
    }
    if (flight.boosterSeparationSnapshot) {
      const separation = flight.boosterSeparationSnapshot;
      rows.splice(rows.length - 1, 0,
        ["助推器燃尽 / 分离", `T+${number(flight.boosterBurnoutTimeS || 0, 1)} / T+${number(separation.timeS, 1)} s`],
        ["分离高度 / 速度", `${formatAltitude(separation.altitudeM)} / ${number(separation.velocityMs, 0)} m/s`],
        ["抛离质量 / 分离后 T/W", `${formatMass(separation.droppedMassKg)} / ${number(separation.postSeparationTwr, 2)}`]
      );
    }
    if (Array.isArray(flight.stageEvents)) {
      flight.stageEvents.filter(function (event) {
        return event.type === "ignition" && event.stageIndex > 0;
      }).forEach(function (ignition) {
        const separation = flight.stageEvents.find(function (event) {
          return event.type === "separation" && event.toStageIndex === ignition.stageIndex;
        });
        rows.splice(rows.length - 1, 0, [
          `${ignition.stageName}点火 / 前级分离`,
          `T+${number(ignition.timeS, 1)} s / ${separation ? `T+${number(separation.timeS, 1)} s` : "—"}`
        ], [
          `${ignition.stageName}点火高度 / 速度`,
          `${formatAltitude(ignition.altitudeM)} / ${number(ignition.velocityMs, 0)} m/s · ${ignition.hotStaging ? "热分离重叠点火" : "分离后点火"}`
        ]);
      });
    }
    els.flightMetrics.innerHTML = miniMetrics(rows);
    renderLaneChart(els.flightChart, flight.points || [], [
      { label: "高度", value: function (p) { return p.altitudeM; }, floor: 1, format: formatAltitude },
      { label: "速度", value: function (p) { return Math.max(0, p.velocityMs); }, floor: 1, format: function (v) { return `${number(v, 0)} m/s`; } },
      { label: "节流", value: function (p) { return p.throttle * 100; }, floor: 100, format: function (v) { return `${number(v, 0)}%`; } }
    ]);
  }

  function renderEnergyChart(svg, energy, unit) {
    const points = energy.points || [];
    if (!points.length) {
      svg.innerHTML = "<title>飞行器能量统计</title><desc>当前方案没有可绘制的飞行轨迹。</desc>";
      return;
    }
    const width = 880;
    const height = 390;
    const margin = { left: 82, right: 24, top: 68, bottom: 42 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const peak = energy.peakKinetic || points[0];
    let data = samplePoints(points, 320).slice();
    if (!data.some(function (point) { return point.timeS === peak.timeS; })) {
      data.push(peak);
      data.sort(function (a, b) { return a.timeS - b.timeS; });
    }
    const series = [
      { label: "飞行器剩余总能量", key: "totalEnergyJ", line: "line-1", dot: "dot-1" },
      { label: "化学能 / 内能", key: "chemicalEnergyJ", line: "line-2", dot: "dot-2" },
      { label: "重力势能", key: "potentialEnergyJ", line: "line-3", dot: "dot-3" },
      { label: "飞船动能", key: "kineticEnergyJ", line: "line-4", dot: "dot-4" }
    ];
    const maxTime = Math.max(1, points[points.length - 1].timeS || 0);
    const rawMaxEnergy = Math.max(1, ...points.map(function (point) {
      return Math.max(point.totalEnergyJ, point.chemicalEnergyJ, point.potentialEnergyJ, point.kineticEnergyJ);
    }));
    const maxEnergyJ = rawMaxEnergy * 1.06;
    const xScale = function (timeS) { return margin.left + Math.max(0, Math.min(1, timeS / maxTime)) * plotWidth; };
    const yScale = function (energyJ) { return margin.top + plotHeight - Math.max(0, Math.min(1, energyJ / maxEnergyJ)) * plotHeight; };
    let content = "";
    const cutoff = energy.cutoff || { mode: "apogee", burnoutTimeS: null };
    const postBurnDisplay = cutoff.mode === "post-burn" && cutoff.burnoutTimeS != null;
    if (postBurnDisplay) {
      const coastStartX = xScale(cutoff.burnoutTimeS);
      content += `<rect class="energy-coast-band" x="${coastStartX}" y="${margin.top}" width="${Math.max(0, width - margin.right - coastStartX)}" height="${plotHeight}"/>`;
    }
    for (let tick = 0; tick <= 5; tick += 1) {
      const tx = margin.left + plotWidth * tick / 5;
      const timeS = maxTime * tick / 5;
      content += `<line class="grid-line" x1="${tx}" y1="${margin.top}" x2="${tx}" y2="${height - margin.bottom}"/>`;
      content += svgText(tx, height - 14, `${number(timeS, 0)} s`, "tick-label", "middle");
    }
    for (let tick = 0; tick <= 5; tick += 1) {
      const valueJ = maxEnergyJ * tick / 5;
      const ty = yScale(valueJ);
      content += `<line class="grid-line" x1="${margin.left}" y1="${ty}" x2="${width - margin.right}" y2="${ty}"/>`;
      content += svgText(margin.left - 9, ty + 4, number(valueJ / unit.divisor, valueJ / unit.divisor >= 100 ? 0 : 1), "tick-label", "end");
    }
    content += svgText(8, margin.top - 16, `能量 (${unit.label})`, "axis-label");
    series.forEach(function (entry, index) {
      const legendX = margin.left + index * 188;
      content += `<line class="${entry.line}" x1="${legendX}" y1="25" x2="${legendX + 22}" y2="25"/>`;
      content += svgText(legendX + 29, 29, entry.label, "series-label");
      const path = data.map(function (point, pointIndex) {
        return `${pointIndex ? "L" : "M"} ${xScale(point.timeS).toFixed(2)} ${yScale(point[entry.key]).toFixed(2)}`;
      }).join(" ");
      content += `<path class="${entry.line}" d="${path}"/>`;
    });
    const peakX = xScale(peak.timeS);
    const labelOnLeft = peakX > width * 0.72;
    content += `<line class="energy-peak-line" x1="${peakX}" y1="${margin.top}" x2="${peakX}" y2="${height - margin.bottom}"/>`;
    content += svgText(peakX + (labelOnLeft ? -7 : 7), margin.top + 14, `动能峰值 T+${number(peak.timeS, 1)} s`, "peak-label", labelOnLeft ? "end" : "start");
    series.forEach(function (entry) {
      content += `<circle class="energy-peak-dot ${entry.dot}" cx="${peakX}" cy="${yScale(peak[entry.key])}" r="4"/>`;
    });
    const endPoint = energy.endPoint || points[points.length - 1];
    const endX = xScale(endPoint.timeS);
    if (postBurnDisplay) {
      const burnoutX = xScale(cutoff.burnoutTimeS);
      content += `<line class="energy-burnout-line" x1="${burnoutX}" y1="${margin.top}" x2="${burnoutX}" y2="${height - margin.bottom}"/>`;
      content += svgText(burnoutX + 5, height - margin.bottom - 8, "燃尽", "tick-label");
      content += `<line class="energy-cutoff-line" x1="${endX}" y1="${margin.top}" x2="${endX}" y2="${height - margin.bottom}"/>`;
      content += svgText(endX - 7, margin.top + 31, `追加滑行 ${number(cutoff.coastPercent, 1)}% 后截止`, "peak-label", "end");
    } else if (cutoff.mode === "post-burn") {
      content += `<line class="energy-cutoff-line" x1="${endX}" y1="${margin.top}" x2="${endX}" y2="${height - margin.bottom}"/>`;
      content += svgText(endX - 7, margin.top + 31, "未发生燃烧 / 轨迹终点", "peak-label", "end");
    } else {
      content += `<line class="energy-cutoff-line" x1="${endX}" y1="${margin.top}" x2="${endX}" y2="${height - margin.bottom}"/>`;
      content += svgText(endX - 7, margin.top + 31, "速度归零 / 滑行顶点", "peak-label", "end");
    }
    content += `<circle class="energy-end-dot" cx="${endX}" cy="${yScale(endPoint.kineticEnergyJ)}" r="4.5"/>`;
    const cutoffDescription = postBurnDisplay
      ? "燃尽后的着色区域表示按燃时比例追加的滑行窗口，实线为统计截止。"
      : cutoff.mode === "post-burn"
        ? "当前轨迹没有发生燃烧，实线标出唯一可用的轨迹终点。"
        : "统计持续到速度归零和滑行顶点，实线为完整轨迹终点。";
    svg.innerHTML = `<title>飞行器能量随时间变化</title><desc>总能量、剩余化学能与内能、重力势能和飞船动能使用同一纵轴；虚线标出动能峰值时刻。${cutoffDescription}</desc>${content}`;
  }

  function renderEnergy(result) {
    const energy = result.energy;
    if (!energy || !energy.points || !energy.points.length) {
      els.energyCutoffStatus.textContent = "当前方案没有可用的飞行能量数据";
      els.energyMetrics.innerHTML = miniMetrics([["状态", "没有可用的飞行能量数据"]]);
      els.energyPeakMetrics.innerHTML = "";
      els.energyAssumption.textContent = "当前方案没有可用于能量统计的飞行轨迹。";
      renderEnergyChart(els.energyChart, { points: [] }, ENERGY_UNITS.MJ);
      return;
    }
    const unit = resolveEnergyUnit(energy);
    const stats = energy.statistics;
    const peak = energy.peakKinetic;
    const cutoff = energy.cutoff;
    const endpoint = energy.endPoint;
    els.energyCutoffStatus.textContent = cutoff.mode === "post-burn"
      ? (cutoff.burnoutTimeS == null
        ? "当前轨迹没有发生有效燃烧，无法建立燃尽后滑行窗口"
        : `燃尽 T+${number(cutoff.burnoutTimeS, 1)} s · 追加 ${number(cutoff.coastPercent, 1)}% 燃时（${number(cutoff.coastDurationS, 1)} s）· 截止 T+${number(cutoff.actualTimeS, 1)} s`)
      : `完整滑行 · 速度归零 T+${number(cutoff.actualTimeS, 1)} s · 顶点 ${formatAltitude(endpoint.altitudeM)}`;
    els.energyMetrics.innerHTML = miniMetrics([
      ["初始化学能 / 内能", formatEnergy(energy.initialChemicalEnergyJ, unit)],
      ["统计终点", cutoff.mode === "post-burn" ? `T+${number(endpoint.timeS, 1)} s · ${formatAltitude(endpoint.altitudeM)}` : `速度 ${number(endpoint.velocityMs, 1)} m/s · ${formatAltitude(endpoint.altitudeM)}`],
      ["推进剂代表比能", `${number(stats.propellantSpecificEnergyMjKg, 2)} MJ/kg`],
      ["初始能量 / 起飞质量", `${number(stats.initialEnergyPerWetMassMjKg, 3)} MJ/kg`],
      ["峰值动能比能", `${number(stats.peakKineticSpecificEnergyMjKg, 3)} MJ/kg`],
      ["峰值势能比能", `${number(stats.peakPotentialSpecificEnergyMjKg, 3)} MJ/kg`],
      ["峰值机械比能", `${number(stats.peakMechanicalSpecificEnergyMjKg, 3)} MJ/kg`],
      ["化学能→机械能", `${number(stats.mechanicalConversionPctAtPeak, 2)}%`]
    ]);
    els.energyPeakMetrics.innerHTML = miniMetrics([
      ["峰值时刻", `T+${number(peak.timeS, 1)} s`],
      ["飞行器剩余总能量", formatEnergy(peak.totalEnergyJ, unit)],
      ["化学能 / 内能", formatEnergy(peak.chemicalEnergyJ, unit)],
      ["重力势能 / 高度", `${formatEnergy(peak.potentialEnergyJ, unit)} · ${formatAltitude(peak.altitudeM)}`],
      ["飞船动能 / 速度", `${formatEnergy(peak.kineticEnergyJ, unit)} · ${number(peak.velocityMs, 0)} m/s`],
      ["此刻飞船质量", formatMass(peak.massKg)]
    ]);
    els.energyAssumption.textContent = `${energy.bodyName} · ${energy.assumption}`;
    renderEnergyChart(els.energyChart, energy, unit);
  }

  function renderStatic(result) {
    const trial = result.staticFire;
    els.staticMetrics.innerHTML = miniMetrics([
      ["试车结果", trial.failed ? "越限关机" : "时序完成"],
      ["稳态时长", `${number(result.config.test.durationS, 1)} s`],
      ["额定推力", `${number(result.performance.totalThrustN / 1000, 1)} kN`],
      ["额定室压", `${number(result.config.engine.chamberPressureMpa, 2)} MPa`],
      ["总轴功率", `${number(result.pumps.totalShaftPowerKw, 0)} kW`],
      ["壁面温度", `${number(result.engine.nozzle.wallTempK, 0)} K`],
      ["冷却裕度", `${number(result.engine.coolingMargin, 2)}×`],
      ["状态说明", trial.failed ? trial.faultReason : trial.message]
    ]);
    renderLaneChart(els.staticChart, trial.points || [], [
      { label: "推力", value: function (p) { return p.thrustKn; }, floor: 1, format: function (v) { return `${number(v, 0)} kN`; } },
      { label: "室压", value: function (p) { return p.chamberPressureMpa; }, floor: 1, format: function (v) { return `${number(v, 1)} MPa`; } },
      { label: "泵功率", value: function (p) { return p.pumpPowerKw; }, floor: 1, format: function (v) { return `${number(v, 0)} kW`; } },
      { label: "壁温", value: function (p) { return p.wallTempK; }, floor: 293, format: function (v) { return `${number(v, 0)} K`; } }
    ], trial.faultTimeS);
  }

  function renderCost(result) {
    const bulkhead = result.tanks.commonBulkhead;
    const bulkheadCost = bulkhead && bulkhead.costing;
    const bulkheadCostBreakdown = bulkheadCost && bulkheadCost.breakdownCny;
    const bulkheadSummary = bulkheadCost
      ? `<span class="common-bulkhead-cost"><b>共底分项计价</b> 新增制造 ${formatMoney(bulkheadCost.grossAddedCostCny)} − 取消封头抵扣 ${formatMoney(bulkheadCost.removedDomeCreditCny)} = <em class="${bulkheadCost.netCostImpactCny <= 0 ? "cost-credit" : "cost-addition"}">${bulkheadCost.netCostImpactCny <= 0 ? `净节省 ${formatMoney(Math.abs(bulkheadCost.netCostImpactCny))}` : `净增加 ${formatMoney(bulkheadCost.netCostImpactCny)}`}</em>；毛增加质量仅作计价基准${bulkheadCostBreakdown ? `<small>面板 ${formatMoney(bulkheadCostBreakdown.fuelFace + bulkheadCostBreakdown.oxidizerFace)} · 芯层/热障 ${formatMoney(bulkheadCostBreakdown.coreAndBarrier)} · 环件/密封 ${formatMoney(bulkheadCostBreakdown.ringsSealsAndMonitoring)} · 工装/NDE ${formatMoney(bulkheadCostBreakdown.ndeAndTooling)}</small>` : ""}</span>`
      : "";
    els.costSummary.innerHTML = `<span>总成本概算</span><strong>${formatMoney(result.cost.totalCostCny)}</strong><span>制造 ${formatMoney(result.cost.manufacturingCostCny)}</span><span>推进剂 ${formatMoney(result.cost.propellantCostCny)}</span><span>制造部分相对 304L 焊接基准 <b>${number(result.cost.costIndex, 2)}×</b></span><span>不含研发、设施、试验与认证</span>${bulkheadSummary}`;
    const indirect = bulkhead && bulkhead.indirectAdvantages;
    if (indirect) {
      els.commonBulkheadAdvantages.hidden = false;
      els.commonBulkheadAdvantages.innerHTML = `
        <div class="common-bulkhead-advantages-heading"><strong>共底带来的重量削减的其他优势</strong><span>参考估算 · 不参与计算</span></div>
        <div class="common-bulkhead-advantages-metrics">
          <span><small>箭体缩短</small><b>${number(indirect.lengthSavingM, 2)} m</b></span>
          <span><small>外表面积减少</small><b>${number(indirect.externalAreaSavingM2, 2)} m²</b></span>
          <span><small>舰体蒙皮潜在节省</small><b>${formatMass(indirect.airframeSkinReferenceSavingKg)}</b></span>
          <span><small>表面系统潜在节省</small><b>${formatMass(indirect.surfaceSystemsReferenceSavingKg)}</b></span>
          <span><small>布线 / 支撑潜在节省</small><b>${formatMass(indirect.routingSupportReferenceSavingKg)}</b></span>
          <span class="common-bulkhead-reference-total"><small>其他优势参考合计</small><b>${formatMass(indirect.totalReferenceSavingKg)}</b></span>
        </div>
        <p>共底储箱本体仍只按净质量变化 ${formatMass(bulkhead.netMassDeltaKg)} 计入模型。以上缩短箭体的潜在节省未回写结构干重、起飞质量、Δv、飞行或成本。</p>`;
    } else {
      els.commonBulkheadAdvantages.hidden = true;
      els.commonBulkheadAdvantages.innerHTML = "";
    }
    els.bomBody.innerHTML = result.cost.bom.map(function (row) {
      const isCommonBulkheadNet = row.costRole === "common-bulkhead-net";
      const isNetCredit = isCommonBulkheadNet && row.costCny < 0;
      const costText = isCommonBulkheadNet
        ? (row.costCny < 0 ? `净节省 ${formatMoney(Math.abs(row.costCny))}` : `净增加 ${formatMoney(row.costCny)}`)
        : row.costRole === "credit"
        ? `抵扣 ${formatMoney(row.costCny)}`
        : row.costRole === "addition" ? `新增 ${formatMoney(row.costCny)}` : formatMoney(row.costCny);
      const costClass = isCommonBulkheadNet
        ? (isNetCredit ? "cost-credit" : "cost-addition")
        : row.costRole === "credit" ? "cost-credit" : row.costRole === "addition" ? "cost-addition" : "";
      const massText = isCommonBulkheadNet ? `净变化 ${formatMass(row.massKg)}` : formatMass(row.massKg);
      const unitText = isCommonBulkheadNet
        ? `分项计价<br><small>新增基准 ${escapeHtml(formatMass(row.pricingMassKg))}<br>抵扣基准 ${escapeHtml(formatMass(row.creditMassKg))}</small>`
        : `¥${number(row.unitPrice, 2)}/kg`;
      const multiplierText = isCommonBulkheadNet ? "毛增 − 抵扣" : `${number(row.multiplier, 2)}×`;
      return `<tr class="${isCommonBulkheadNet ? `common-bulkhead-net ${costClass}` : costClass}"><td><strong>${escapeHtml(row.label)}</strong><br><small>${escapeHtml(row.advantage)}</small></td><td>${escapeHtml(massText)}</td><td>${escapeHtml(row.material)}<br><small>${escapeHtml(row.process)}</small></td><td>${unitText}</td><td>${escapeHtml(multiplierText)}</td><td><span class="${costClass}">${escapeHtml(costText)}</span></td></tr>`;
    }).join("");
  }

  function renderMaterialLibrary() {
    const referenceYield = Data.materials["ss-304l"].yield;
    els.materialTableBody.innerHTML = Object.keys(Data.materials).map(function (key) {
      const material = Data.materials[key];
      const relative = material.yield / referenceYield;
      const specific = material.yield * 1e6 / material.density / 1000;
      return `<tr><td><strong>${escapeHtml(material.name)}</strong><small>${escapeHtml(material.category)}</small></td><td>${number(material.density, 0)} kg/m³</td><td>${number(material.yield, 0)} / ${number(material.ultimate, 0)} MPa</td><td>${number(relative, 2)}×</td><td>${number(specific, 1)} kN·m/kg</td><td>${number(material.modulus, 1)} GPa / ${number(Core.materialThermalExpansionPpmK(material), 1)} μm/m·K</td><td>${number(material.minTemp, 0)}–${number(material.maxTemp, 0)} K / ${number(material.hotFactor, 2)}</td><td>¥${number(material.price, 0)}/kg / ${number(material.scarcity, 2)}×</td></tr>`;
    }).join("");
  }

  function renderTankProcessLibrary() {
    const tankProcessKeys = ["sheet-weld", "spin-weld", "friction-stir-weld", "integral-grid", "flow-formed", "filament-wound", "sandwich-bonded", "common-bulkhead-honeycomb", "composite-layup", "polymer-molded"];
    els.tankProcessTableBody.innerHTML = tankProcessKeys.map(function (key) {
      const process = Data.processes[key];
      return `<tr><td><strong>${escapeHtml(process.name)}</strong></td><td>${escapeHtml(process.allowed.join(" / "))}</td><td>${number(process.strengthFactor, 2)}×</td><td>${number(process.weldEfficiency, 2)}×</td><td>${number(process.waste, 2)}×</td><td>${number(process.difficulty, 2)}×</td><td>${escapeHtml(process.advantage)}</td></tr>`;
    }).join("");
  }

  function renderFormulas(result) {
    els.formulaList.innerHTML = result.formulas.map(function (item, index) {
      return `<details class="formula-item" ${index === 0 ? "open" : ""}><summary><span>${escapeHtml(item.title)}</span><span>${escapeHtml(number(item.result, item.unit === "元" ? 0 : 3))} ${escapeHtml(item.unit)}</span></summary><div class="formula-body"><div class="formula-code">${escapeHtml(item.formula)}</div><span><strong>输入：</strong>${escapeHtml(item.inputs)}</span><span><strong>来源：</strong>${escapeHtml(item.source)}</span><span><strong>假设：</strong>${escapeHtml(item.assumption)}</span></div></details>`;
    }).join("");
  }

  function renderSources() {
    els.sourceList.innerHTML = Data.sources.map(function (source) {
      return `<a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(source.label)} ↗</a>`;
    }).join("");
  }

  function renderAll() {
    const result = state.result;
    renderSummary(result);
    renderReadouts(result);
    renderSerialStageNav();
    renderSerialStageReadouts();
    renderOverview(result);
    renderIssues(result);
    renderSnapshot(result);
    renderRocket(result);
    renderFlight(result);
    renderEnergy(result);
    renderStatic(result);
    renderCost(result);
    renderMaterialLibrary();
    renderTankProcessLibrary();
    renderFormulas(result);
    syncConditionalFields();
    syncEnergyControls();
    syncAutoNameControls();
    if (!state.animation.mode) resetDynamicReadout();
    updateAnimationButtons();
    updateSoundButton();
  }

  function setView(view) {
    state.view = view;
    document.querySelectorAll("[data-view]").forEach(function (button) {
      const active = button.dataset.view === view;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    syncConditionalFields();
    if (state.result) renderRocket(state.result);
  }

  function libraryOptions(select) {
    const previous = select.value;
    select.innerHTML = "";
    select.appendChild(createOption("__current", `当前方案 · ${state.config.name}`));
    state.saved.forEach(function (entry) {
      select.appendChild(createOption(entry.id, entry.name));
    });
    select.value = Array.from(select.options).some(function (option) { return option.value === previous; }) ? previous : "__current";
  }

  function designForChoice(value) {
    if (value === "__current") return state.result;
    const saved = state.saved.find(function (entry) { return entry.id === value; });
    return saved ? Core.calculateDesign(saved.config) : state.result;
  }

  function renderComparison() {
    const a = designForChoice(els.compareA.value);
    const b = designForChoice(els.compareB.value);
    const metrics = [
      { label: "推进剂", a: a.propellant.shortName, b: b.propellant.shortName, text: true },
      { label: "循环", a: a.engine.cycle.name, b: b.engine.cycle.name, text: true },
      { label: "集群架构", a: `${a.config.engine.engineCount} 台 · ${a.engine.cluster.architecture.name}`, b: `${b.config.engine.engineCount} 台 · ${b.engine.cluster.architecture.name}`, text: true },
      { label: "并联助推器", a: a.parallel && a.parallel.enabled ? `${a.parallel.count} 枚 · ${a.parallel.propellant.shortName}` : "无", b: b.parallel && b.parallel.enabled ? `${b.parallel.count} 枚 · ${b.parallel.propellant.shortName}` : "无", text: true },
      { label: "串联级数", a: a.serial && a.serial.enabled ? `${a.serial.totalStageCount} 级` : "单级", b: b.serial && b.serial.enabled ? `${b.serial.totalStageCount} 级` : "单级", text: true },
      { label: "理想 Δv", a: a.performance.idealDeltaV, b: b.performance.idealDeltaV, unit: "m/s", high: true },
      { label: "起飞质量", a: a.masses.wetMassKg, b: b.masses.wetMassKg, format: formatMass, high: false },
      { label: "有效载荷", a: a.masses.payloadKg, b: b.masses.payloadKg, format: formatMass, high: true },
      { label: "推重比", a: a.performance.twr, b: b.performance.twr, digits: 2, high: true },
      { label: "总推力", a: a.performance.totalThrustN / 1000, b: b.performance.totalThrustN / 1000, unit: "kN", high: true },
      { label: "推进任务可靠性", a: a.parallel && a.parallel.enabled ? a.parallel.missionReliabilityPct : a.engine.cluster.reliability.missionReliabilityPct, b: b.parallel && b.parallel.enabled ? b.parallel.missionReliabilityPct : b.engine.cluster.reliability.missionReliabilityPct, unit: "%", digits: 3, high: true },
      { label: "集群整合质量", a: a.masses.clusterIntegrationMassKg, b: b.masses.clusterIntegrationMassKg, format: formatMass, high: false },
      { label: "集群基座直径", a: a.geometry.baseDiameterM, b: b.geometry.baseDiameterM, unit: "m", high: false },
      { label: "全箭包络直径", a: a.geometry.attachedDiameterM || a.geometry.baseDiameterM, b: b.geometry.attachedDiameterM || b.geometry.baseDiameterM, unit: "m", high: false },
      { label: "级段长度", a: a.geometry.vehicleLengthM, b: b.geometry.vehicleLengthM, unit: "m", high: false },
      { label: "飞行顶点", a: a.flight.maxAltitudeM || 0, b: b.flight.maxAltitudeM || 0, format: formatAltitude, high: true },
      { label: "制造概算", a: a.cost.totalCostCny, b: b.cost.totalCostCny, format: formatMoney, high: false },
      { label: "硬性越限", a: a.issues.filter(function (i) { return i.severity === "error"; }).length, b: b.issues.filter(function (i) { return i.severity === "error"; }).length, unit: "项", high: false }
    ];
    const valueText = function (metric, value) {
      if (metric.text) return escapeHtml(value);
      if (metric.format) return escapeHtml(metric.format(value));
      return `${number(value, metric.digits == null ? 1 : metric.digits)}${metric.unit ? ` ${escapeHtml(metric.unit)}` : ""}`;
    };
    els.compareContent.innerHTML = `<table class="compare-table"><thead><tr><th>指标</th><th>${escapeHtml(a.config.name)}</th><th>${escapeHtml(b.config.name)}</th></tr></thead><tbody>${metrics.map(function (metric) {
      let classA = "";
      let classB = "";
      if (!metric.text && metric.a !== metric.b) {
        const aBetter = metric.high ? metric.a > metric.b : metric.a < metric.b;
        classA = aBetter ? "compare-better" : "";
        classB = aBetter ? "" : "compare-better";
      }
      return `<tr><td>${escapeHtml(metric.label)}</td><td class="${classA}">${valueText(metric, metric.a)}</td><td class="${classB}">${valueText(metric, metric.b)}</td></tr>`;
    }).join("")}</tbody></table>`;
    renderSavedLibrary();
  }

  function renderSavedLibrary() {
    if (!state.saved.length) {
      els.savedDesignList.innerHTML = `<div class="issue-empty">尚无已保存方案。先保存当前配置，再进行对比。</div>`;
      return;
    }
    els.savedDesignList.innerHTML = state.saved.map(function (entry) {
      return `<div class="saved-design-row"><div><span>${escapeHtml(entry.name)}</span><small>${escapeHtml(new Date(entry.savedAt).toLocaleString("zh-CN"))}</small></div><div class="saved-design-actions"><button type="button" data-load-saved="${escapeHtml(entry.id)}">载入</button><button type="button" data-delete-saved="${escapeHtml(entry.id)}">删除</button></div></div>`;
    }).join("");
  }

  function openSaveDialog() {
    els.saveNameInput.value = state.config.name;
    els.saveNameInput.disabled = Boolean(state.config.autoName);
    if (typeof els.saveDialog.showModal === "function") els.saveDialog.showModal();
    else els.saveDialog.setAttribute("open", "");
  }

  function saveDesign() {
    const name = els.saveNameInput.value.trim() || state.config.name || "未命名方案";
    state.config.name = name;
    const entry = {
      id: `design-${Date.now()}`,
      name,
      savedAt: new Date().toISOString(),
      schemaVersion: Data.schemaVersion,
      config: Core.normalizeConfig(state.config)
    };
    state.saved.unshift(entry);
    state.saved = state.saved.slice(0, 30);
    writeStorage(STORAGE_LIBRARY, state.saved);
    const nameControl = document.querySelector('[data-bind="name"]');
    if (nameControl) nameControl.value = name;
    calculateAndRender();
    els.saveDialog.close();
    showToast(`已保存“${name}”到本机方案库。`);
  }

  function openCompareDialog() {
    libraryOptions(els.compareA);
    libraryOptions(els.compareB);
    if (state.saved.length) els.compareB.value = state.saved[0].id;
    renderComparison();
    if (typeof els.compareDialog.showModal === "function") els.compareDialog.showModal();
    else els.compareDialog.setAttribute("open", "");
  }

  function exportDesign() {
    const json = Core.serializeConfig(state.config);
    const blob = new Blob([json], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeName = (state.config.name || "rocket-design").replace(/[\\/:*?"<>|]+/g, "-");
    link.href = url;
    link.download = `${safeName}.rocket-sim.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    showToast("方案 JSON 已生成。所含数据仅为配置，不含本地方案库。 ");
  }

  function importDesign(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function () {
      try {
        resetAnimation(false);
        state.config = Core.deserializeConfig(String(reader.result));
        fillControls();
        calculateAndRender();
        showToast(`已导入“${state.config.name}”。`);
      } catch (error) {
        showToast(error.message || "导入失败。", true);
      }
    };
    reader.onerror = function () { showToast("无法读取所选文件。", true); };
    reader.readAsText(file, "utf-8");
  }

  function bindEvents() {
    if (els.languageSelect && I18n) {
      els.languageSelect.addEventListener("change", function () {
        I18n.setLocale(els.languageSelect.value);
      });
    }
    els.designForm.addEventListener("input", onBoundControl);
    els.designForm.addEventListener("change", onBoundControl);
    els.historicalPresetSelect.addEventListener("change", renderHistoricalPresetReadout);
    els.loadHistoricalPresetBtn.addEventListener("click", loadHistoricalPreset);
    els.designForm.addEventListener("input", onStageBoundControl);
    els.designForm.addEventListener("change", onStageBoundControl);
    document.querySelectorAll("[data-step-button]").forEach(function (button) {
      button.addEventListener("click", function () { setStep(Number(button.dataset.stepButton)); });
    });
    els.designSectionNav.addEventListener("click", function (event) {
      if (event.target.closest("#addSerialStageBtn")) {
        addSerialStage();
        return;
      }
      const button = event.target.closest("[data-design-section-button]");
      if (!button) return;
      if (button.dataset.designSectionButton.indexOf("stage-") === 0 && state.designSection !== button.dataset.designSectionButton) state.stageStep = 0;
      setDesignSection(button.dataset.designSectionButton);
    });
    document.querySelectorAll("[data-stage-step-button]").forEach(function (button) {
      button.addEventListener("click", function () { setSerialStageStep(Number(button.dataset.stageStepButton)); });
    });
    els.designForm.addEventListener("click", function (event) {
      const previousButton = event.target.closest("[data-stage-copy-previous]");
      const copyButton = event.target.closest("[data-stage-copy]");
      const pasteButton = event.target.closest("[data-stage-paste]");
      if (previousButton) copyPreviousSerialStageGroup(previousButton.dataset.stageCopyPrevious);
      else if (copyButton) copySerialStageGroup(copyButton.dataset.stageCopy);
      else if (pasteButton) pasteSerialStageGroup(pasteButton.dataset.stagePaste);
    });
    els.deleteSerialStageBtn.addEventListener("click", deleteActiveSerialStage);
    els.prevStepBtn.addEventListener("click", function () {
      if (state.designSection.indexOf("stage-") === 0) {
        if (state.stageStep > 0) setSerialStageStep(state.stageStep - 1);
        else setDesignSection("core", { silent: true });
      } else if (state.designSection !== "core") setDesignSection("core", { silent: true });
      else setStep(state.step - 1);
    });
    els.nextStepBtn.addEventListener("click", function () {
      if (state.designSection.indexOf("stage-") === 0) {
        if (state.stageStep < 4) setSerialStageStep(state.stageStep + 1);
        else if (state.activeStageIndex < state.config.stages.length - 1) {
          state.stageStep = 0;
          setDesignSection(`stage-${state.activeStageIndex + 1}`, { silent: true });
        } else setDesignSection("core", { silent: true });
      } else if (state.designSection !== "core") setDesignSection("core", { silent: true });
      else setStep(state.step === 4 ? 0 : state.step + 1);
    });
    document.querySelectorAll("[data-view]").forEach(function (button) {
      button.addEventListener("click", function () { setView(button.dataset.view); });
    });
    els.scaleZoom.addEventListener("input", function () {
      state.zoom = Number(els.scaleZoom.value) / 100;
      els.scaleZoomOut.value = `${els.scaleZoom.value}%`;
      els.scaleZoomOut.textContent = `${els.scaleZoom.value}%`;
      if (state.result && state.view === "scale") renderRocket(state.result);
    });
    document.querySelectorAll("[data-result-tab]").forEach(function (button) {
      button.addEventListener("click", function () { setResultTab(button.dataset.resultTab); });
    });
    els.playbackSpeed.addEventListener("change", function () {
      updateFlightLiveTelemetry(state.animation.frame, state.animation.mode);
    });
    els.energyUnitSelect.addEventListener("change", function () {
      if (state.result) renderEnergy(state.result);
    });
    els.energyCutoffMode.addEventListener("change", applyEnergyControls);
    els.energyCoastPercent.addEventListener("input", applyEnergyControls);
    els.resetStructuralFactorBtn.addEventListener("click", resetStructuralFactor);
    els.resetPriceTuningBtn.addEventListener("click", resetPriceTuning);
    els.restoreDefaultBtn.addEventListener("click", restoreDefaultDesign);
    els.includePayloadInDryBreakdown.addEventListener("change", function () {
      state.config.vehicle.includePayloadInDryBreakdown = els.includePayloadInDryBreakdown.checked;
      state.config = Core.normalizeConfig(state.config);
      scheduleCalculate();
    });
    els.staticRunBtn.addEventListener("click", function () { startAnimation("static"); });
    els.flightRunBtn.addEventListener("click", function () { startAnimation("flight"); });
    els.animationPauseBtn.addEventListener("click", toggleAnimationPause);
    els.animationResetBtn.addEventListener("click", function () { resetAnimation(true); });
    els.environmentScenarioSelect.addEventListener("change", function () {
      if (state.animation.mode) resetAnimation(false);
      state.config.test.bodyKey = els.environmentScenarioSelect.value;
      syncEnvironmentControls();
      scheduleCalculate();
    });
    [els.countdownEnabled, els.immersiveLaunch, els.autoPauseAfterBurnout, els.countdownSeconds, els.launchModeSelect].forEach(function (control) {
      control.addEventListener("change", applyLaunchControls);
    });
    els.engineStartupSeconds.addEventListener("input", applyLaunchControls);
    els.soundToggleBtn.addEventListener("click", toggleSound);
    [els.soundMasterVolume, els.soundIgnitionVolume, els.soundRumbleVolume, els.soundJetVolume].forEach(function (control) {
      control.addEventListener("input", applyAudioControls);
    });
    [els.soundAutoFade, els.soundVacuumAttenuation].forEach(function (control) {
      control.addEventListener("change", applyAudioControls);
    });
    els.saveDesignBtn.addEventListener("click", openSaveDialog);
    els.confirmSaveBtn.addEventListener("click", saveDesign);
    els.compareBtn.addEventListener("click", openCompareDialog);
    els.compareA.addEventListener("change", renderComparison);
    els.compareB.addEventListener("change", renderComparison);
    els.exportBtn.addEventListener("click", exportDesign);
    els.importInput.addEventListener("change", function () {
      importDesign(els.importInput.files && els.importInput.files[0]);
      els.importInput.value = "";
    });
    els.savedDesignList.addEventListener("click", function (event) {
      const loadButton = event.target.closest("[data-load-saved]");
      const deleteButton = event.target.closest("[data-delete-saved]");
      if (loadButton) {
        const entry = state.saved.find(function (item) { return item.id === loadButton.dataset.loadSaved; });
        if (entry) {
          resetAnimation(false);
          state.config = Core.normalizeConfig(entry.config);
          fillControls();
          calculateAndRender();
          els.compareDialog.close();
          showToast(`已载入“${entry.name}”。`);
        }
      }
      if (deleteButton) {
        state.saved = state.saved.filter(function (item) { return item.id !== deleteButton.dataset.deleteSaved; });
        writeStorage(STORAGE_LIBRARY, state.saved);
        libraryOptions(els.compareA);
        libraryOptions(els.compareB);
        renderComparison();
      }
    });
  }

  function cacheElements() {
    [
      "toast", "controlTooltip", "controlTooltipTitle", "controlTooltipDescription", "controlTooltipParameters", "controlTooltipOption", "languageSelect", "historicalPresetSelect", "historicalPresetReadout", "loadHistoricalPresetBtn", "propellantSelect", "boosterPropellantSelect", "cycleSelect", "boosterCycleSelect", "coolingSelect", "stagePropellantSelect", "stageCycleSelect", "stageCoolingSelect", "designForm", "designSectionNav", "addSerialStageBtn", "coreStepNav", "stepCount", "prevStepBtn", "nextStepBtn", "restoreDefaultBtn", "resetStructuralFactorBtn", "resetPriceTuningBtn", "priceDebugDetails",
      "statusDot", "statusText", "designNameHeader", "designNameInput", "autoNameToggle", "autoNamePreview", "rocketWisdom", "rocketWisdomKind", "rocketWisdomText", "rocketWisdomAttribution", "summaryDv", "summaryDvNote", "summaryCost", "summaryCostNote", "summaryCostShares", "summaryMass", "summaryMassNote", "summaryMassShares", "summaryDryMassShares", "includePayloadInDryBreakdown", "summaryThrust", "summaryThrustNote", "summaryAccelNote",
      "propellantReadout", "boosterReadout", "tankMaterialReadout", "cycleReadout", "clusterArchitectureSelect", "clusterReadout", "batterySelect", "batteryReadout", "customPropDetails", "serialStageKicker", "serialStageHeading", "serialStageCarryNote", "deleteSerialStageBtn", "serialStageReadout", "serialStagePropellantReadout", "serialStageSeparationReadout", "stagePropellantCopySource", "stageTankCopySource", "stageEngineCopySource", "rocketSvg", "rocketStage", "visualCaption", "scaleZoom", "scaleZoomOut",
      "staticRunBtn", "flightRunBtn", "animationPauseBtn", "animationResetBtn", "playbackSpeed", "environmentScenarioSelect", "launchSequenceSettings", "launchSequenceStatus", "countdownEnabled", "immersiveLaunch", "autoPauseAfterBurnout", "countdownSeconds", "launchModeSelect", "engineStartupSeconds", "soundToggleBtn", "soundMixer", "soundMixStatus", "soundMasterVolume", "soundMasterVolumeOut", "soundIgnitionVolume", "soundIgnitionVolumeOut", "soundRumbleVolume", "soundRumbleVolumeOut", "soundJetVolume", "soundJetVolumeOut", "soundAutoFade", "soundVacuumAttenuation", "dynamicTelemetry", "animationPhase", "animationEnvironment", "animationClock", "animationAltitude", "animationMotion", "animationDynamicPressure", "animationThrottle", "animationLaunchState", "fuelRemainLabel", "fuelRemainBar", "fuelRemainValue", "oxidizerRemainRow", "oxidizerRemainBar", "oxidizerRemainValue", "boosterRemainRow", "boosterRemainBar", "boosterRemainValue", "flightLiveStrip", "flightLiveAltitude", "flightLiveVelocity", "flightLiveAcceleration", "flightLiveAccelerationDetail", "flightLiveDynamicPressure", "flightLiveTimeScale", "engineLiveStrip", "engineAmbientPressure", "engineExitPressure", "engineCurrentThrust", "engineMassFlow", "engineMassFlowDetail", "engineExhaustVelocity",
      "massTable", "performanceTable", "pumpTable", "issueCount", "issueList", "componentSnapshot", "sourceList", "flightMetrics", "flightChart", "energyUnitSelect", "energyCutoffMode", "energyCoastPercent", "energyCoastField", "energyCutoffStatus", "energyMetrics", "energyPeakMetrics", "energyChart", "energyAssumption",
      "staticMetrics", "staticChart", "costSummary", "commonBulkheadAdvantages", "bomBody", "materialTableBody", "tankProcessTableBody", "formulaList", "saveDesignBtn", "compareBtn", "exportBtn", "importInput",
      "saveDialog", "saveNameInput", "confirmSaveBtn", "compareDialog", "compareA", "compareB", "compareContent", "savedDesignList"
    ].forEach(function (id) { els[id] = byId(id); });
  }

  function init() {
    cacheElements();
    if (I18n) {
      els.languageSelect.value = I18n.getLocale();
      I18n.onChange(function (locale) {
        I18n.applyData(Data);
        els.languageSelect.value = locale;
        cancelCountdownVoice(false);
        state.result = Core.calculateDesign(state.config);
        if (state.config.autoName) {
          state.config.name = state.result.config.name;
          els.designNameInput.value = state.config.name;
          saveCurrentConfig();
        }
        renderSources();
        renderAll();
        I18n.translateDom(document);
      });
      I18n.observe(document);
    }
    initializeStickySummary();
    initializeRocketWisdom();
    syncAudioControls();
    populateStaticSelects();
    fillControls();
    initializeControlTooltips();
    initializeStepScaleControls();
    bindEvents();
    renderSources();
    setStep(0);
    setResultTab("overview");
    setView("scale");
    calculateAndRender();
    if (I18n) I18n.translateDom(document);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
