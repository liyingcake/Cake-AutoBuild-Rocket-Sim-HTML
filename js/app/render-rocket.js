// SVG rocket rendering functions.
// Dependencies: AppCtx (els, state.zoom), __UIFormat (number, formatMass, svgText, etc.)
(function (root, factory) {
  root.__RocketRender = factory(root);
})(typeof globalThis !== "undefined" ? globalThis : this, function (root) {
  "use strict";

  var FMT = root.__UIFormat;
  var AppCtx = root.AppCtx || {};

  function flamePalette(result) {
    var key = result && result.propellant ? result.propellant.key : (AppCtx.state ? AppCtx.state.config.propellantKey : "custom");
    var Data = root.RocketSimData;
    return Data.flamePalettes[key] || Data.flamePalettes.custom;
  }

  function serialFlightStageDesign(index) {
    if (!AppCtx.state || !AppCtx.state.result || !AppCtx.state.result.serial || !AppCtx.state.result.serial.enabled) return AppCtx.state ? AppCtx.state.result : null;
    if (index <= 0) {
      var base = AppCtx.state.result.serial.base;
      return base.parallel && base.parallel.enabled ? base.parallel.core : base;
    }
    return AppCtx.state.result.serial.stages[index - 1] || AppCtx.state.result.serial.stages[AppCtx.state.result.serial.stages.length - 1];
  }

  function flameStyleForDesign(design) {
    var palette = flamePalette(design);
    return "--plume-outer:" + palette.outer + ";--plume-outer-fill:" + FMT.colorAlpha(palette.outer, 0.31) + ";--plume-core:" + palette.core + ";--plume-core-fill:" + FMT.colorAlpha(palette.core, 0.46) + ";--plume-glow:" + FMT.colorAlpha(palette.glow, 0.58);
  }

  function applyFlamePalette(result) {
    if (!AppCtx.els || !AppCtx.els.rocketStage) return;
    var palette = flamePalette(result);
    var stage = AppCtx.els.rocketStage;
    stage.style.setProperty("--plume-outer", palette.outer);
    stage.style.setProperty("--plume-outer-fill", FMT.colorAlpha(palette.outer, 0.31));
    stage.style.setProperty("--plume-core", palette.core);
    stage.style.setProperty("--plume-core-fill", FMT.colorAlpha(palette.core, 0.46));
    stage.style.setProperty("--plume-glow", FMT.colorAlpha(palette.glow, 0.58));
    stage.dataset.flameStyle = palette.name;
  }

  function boosterFlameStyle(result) {
    if (!result.parallel || !result.parallel.enabled) return "";
    var key = result.parallel.propellant && result.parallel.propellant.key;
    var Data = root.RocketSimData;
    var palette = Data.flamePalettes[key] || Data.flamePalettes.custom;
    return "--plume-outer:" + palette.outer + ";--plume-outer-fill:" + FMT.colorAlpha(palette.outer, 0.31) + ";--plume-core:" + palette.core + ";--plume-core-fill:" + FMT.colorAlpha(palette.core, 0.46) + ";--plume-glow:" + FMT.colorAlpha(palette.glow, 0.58);
  }

  function nozzleGroup(x, centerY, length, exitHeight, throatHeight, count, scaleMode, engineRole) {
    var visible = Math.min(3, count);
    var role = engineRole || "core";
    var spread = visible === 1 ? 0 : Math.min(exitHeight * 0.7, 28);
    var plumes = "";
    var hardware = "";
    for (var i = 0; i < visible; i += 1) {
      var offset = (i - (visible - 1) / 2) * spread;
      var y = centerY + offset;
      var basePlumeLength = Math.max(34, length * 0.55);
      plumes += '<path class="thrust-plume" data-anim="plume" data-engine-role="' + role + '" data-plume-index="' + i + '" data-x="' + x + '" data-y="' + y + '" data-exit-height="' + exitHeight + '" data-base-length="' + basePlumeLength + '" d="M ' + x + ' ' + y + ' L ' + x + ' ' + y + ' Z"/>';
      plumes += '<path class="thrust-plume-core" data-anim="plume-core" data-engine-role="' + role + '" data-plume-index="' + i + '" data-x="' + x + '" data-y="' + y + '" data-exit-height="' + exitHeight + '" data-base-length="' + basePlumeLength + '" d="M ' + x + ' ' + y + ' L ' + x + ' ' + y + ' Z"/>';
      hardware += '<path class="rocket-hot" d="M ' + (x + length) + ' ' + (y - throatHeight / 2) + ' L ' + x + ' ' + (y - exitHeight / 2) + ' L ' + x + ' ' + (y + exitHeight / 2) + ' L ' + (x + length) + ' ' + (y + throatHeight / 2) + ' Z"/>';
    }
    if (count > 3 || scaleMode) hardware += FMT.svgText(x + length * 0.45, centerY + exitHeight + 25, "\u53d1\u52a8\u673a \u00d7 " + count, "rocket-value", "middle");
    return plumes + hardware;
  }

  function motionOverlay() {
    return '\n      <defs>\n        <marker id="velocityArrowHead" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="var(--info)"/></marker>\n        <marker id="accelArrowHead" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="var(--warning)"/></marker>\n        <marker id="gravityArrowHead" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="var(--danger)"/></marker>\n        <marker id="dragArrowHead" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="var(--series-4)"/></marker>\n      </defs>\n      <line class="motion-velocity" data-anim="velocity-arrow" x1="450" y1="32" x2="453" y2="32" marker-end="url(#velocityArrowHead)" opacity="0.28"/>\n      <text class="motion-label" data-anim="velocity-label" x="615" y="27">v 0 m/s</text>\n      <line class="motion-acceleration" data-anim="accel-arrow" x1="450" y1="56" x2="453" y2="56" marker-end="url(#accelArrowHead)" opacity="0.28"/>\n      <text class="motion-label" data-anim="accel-label" x="615" y="51">a\u51c0 0.00 g</text>\n      <line class="motion-gravity" data-anim="gravity-arrow" data-flight-force x1="450" y1="80" x2="447" y2="80" marker-end="url(#gravityArrowHead)" opacity="0.28"/>\n      <text class="motion-label" data-anim="gravity-label" data-flight-force x="615" y="75">a\u91cd\u529b 0.00 g</text>\n      <line class="motion-drag" data-anim="drag-arrow" data-flight-force x1="450" y1="104" x2="447" y2="104" marker-end="url(#dragArrowHead)" opacity="0.28"/>\n      <text class="motion-label" data-anim="drag-label" data-flight-force x="615" y="99">a\u963b\u529b 0.00 g</text>\n      <text class="forward-label" x="615" y="118">\u2192 \u7bad\u4f53\u524d\u8fdb\u65b9\u5411</text>';
  }

  function renderCartoonRocket(result) {
    if (!AppCtx.els || !AppCtx.els.rocketSvg) return;
    var els = AppCtx.els;
    var prop = result.propellant;
    var mono = prop.mono;
    var count = result.config.engine.engineCount;
    var fuelMassPct = result.split.loadedFuelKg / result.split.loadedTotalKg;
    var fuelWidth = mono ? 320 : 170 + fuelMassPct * 80;
    var oxWidth = mono ? 0 : 335 - fuelWidth;
    var tankY = 138;
    var tankH = 154;
    var engineX = 110;
    var engineLength = 90;
    var tankStart = 220;
    var fuelX = tankStart;
    var oxX = fuelX + fuelWidth + 12;
    var payloadX = mono ? fuelX + fuelWidth + 14 : oxX + oxWidth + 14;
    var cartoonBoosters = result.parallel && result.parallel.enabled
      ? [104, 326].slice(0, result.parallel.count === 1 ? 1 : 2).map(function (boosterY, index) {
          var boosterX = 150;
          var boosterEndX = 720;
          var boosterH = 54;
          return '<g class="booster-assembly" data-booster-assembly="' + (index + 1) + '" style="' + boosterFlameStyle(result) + '">'
            + nozzleGroup(boosterX, boosterY, 54, 22, 8, result.parallel.booster.config.engine.engineCount, false, "booster")
            + '<path class="booster-body" d="M ' + (boosterX + 48) + ' ' + (boosterY - boosterH / 2) + ' L ' + (boosterEndX - 32) + ' ' + (boosterY - boosterH / 2) + ' Q ' + boosterEndX + ' ' + boosterY + ' ' + (boosterEndX - 32) + ' ' + (boosterY + boosterH / 2) + ' L ' + (boosterX + 48) + ' ' + (boosterY + boosterH / 2) + ' Z"/>'
            + '<rect class="booster-fluid" data-anim="booster-fill" data-base-x="' + (boosterX + 88) + '" data-base-width="430" data-base-height="36" x="' + (boosterX + 88) + '" y="' + (boosterY - 18) + '" width="430" height="36" rx="18"/>'
            + '<line class="booster-attachment" x1="470" y1="' + (boosterY + (boosterY < 215 ? boosterH / 2 : -boosterH / 2)) + '" x2="470" y2="' + (boosterY < 215 ? 120 : 310) + '"/>'
            + (index === 0 ? FMT.svgText(480, boosterY - 34, result.parallel.count + " \u679a\u5e76\u8054\u52a9\u63a8\u5668", "booster-label", "middle") : "")
            + '</g>';
        }).join("")
      : "";
    var svg = '\n      <line class="centerline" x1="45" y1="215" x2="860" y2="215"/>\n      ' + cartoonBoosters + '\n      <path class="rocket-body" d="M 190 120 L 760 120 Q 820 145 850 215 Q 820 285 760 310 L 190 310 Z"/>\n      ' + nozzleGroup(engineX, 215, engineLength, 42, 13, count, false) + '\n      <rect class="rocket-hot" x="190" y="171" width="50" height="88" rx="12"/>\n      <circle class="pump-node" cx="228" cy="155" r="13"/>\n      <circle class="pump-node" cx="228" cy="275" r="13"/>\n      ' + FMT.svgText(194, 105, result.engine.cycle.name + " \u00b7 " + FMT.number(result.performance.totalThrustN / 1000, 0) + " kN", "rocket-value") + '\n      <rect class="tank-shell" x="' + fuelX + '" y="' + tankY + '" width="' + fuelWidth + '" height="' + tankH + '" rx="' + (tankH / 2) + '"/>\n      <rect class="tank-fluid-fuel" data-anim="fuel-fill" data-base-x="' + fuelX + '" data-base-width="' + fuelWidth + '" data-base-height="' + tankH + '" x="' + fuelX + '" y="' + tankY + '" width="' + fuelWidth + '" height="' + tankH + '" rx="' + (tankH / 2) + '"/>\n      ' + FMT.svgText(fuelX + fuelWidth / 2, 205, mono ? "\u63a8\u8fdb\u5242\u7bb1" : "\u71c3\u6599\u7bb1", "rocket-value", "middle") + '\n      ' + FMT.svgText(fuelX + fuelWidth / 2, 226, FMT.number(result.tanks.fuel.totalVolumeM3, 2) + " m\u00b3", "", "middle") + '\n      ' + (mono ? "" : '<rect class="tank-shell" x="' + oxX + '" y="' + tankY + '" width="' + oxWidth + '" height="' + tankH + '" rx="' + (tankH / 2) + '"/>\n      <rect class="tank-fluid-oxidizer" data-anim="oxidizer-fill" data-base-x="' + oxX + '" data-base-width="' + oxWidth + '" data-base-height="' + tankH + '" x="' + oxX + '" y="' + tankY + '" width="' + oxWidth + '" height="' + tankH + '" rx="' + (tankH / 2) + '"/>\n      ' + FMT.svgText(oxX + oxWidth / 2, 205, "\u6c27\u5316\u5242\u7bb1", "rocket-value", "middle") + '\n      ' + FMT.svgText(oxX + oxWidth / 2, 226, FMT.number(result.tanks.oxidizer.totalVolumeM3, 2) + " m\u00b3", "", "middle")) + '\n      <circle class="pressurant-node" cx="' + (payloadX + 27) + '" cy="170" r="22"/>\n      ' + FMT.svgText(payloadX + 27, 174, result.config.tanks.pressurization === "helium" ? "He" : "AUTO", "rocket-value", "middle") + '\n      <path class="rocket-body" d="M ' + (payloadX + 58) + ' 142 L 760 142 Q 805 162 828 215 Q 805 268 760 288 L ' + (payloadX + 58) + ' 288 Z"/>\n      ' + FMT.svgText((payloadX + 58 + 760) / 2, 205, "\u822a\u7535 / \u6709\u6548\u8f7d\u8377", "rocket-value", "middle") + '\n      ' + FMT.svgText((payloadX + 58 + 760) / 2, 226, FMT.formatMass(result.masses.payloadKg), "", "middle") + '\n      <path class="rocket-line" d="M 228 168 L 228 202 L ' + (fuelX + 25) + ' 202 M 228 262 L 228 238 L ' + (mono ? fuelX + 25 : oxX + 25) + ' 238"/>\n      ' + FMT.svgText(450, 348, "Q \u7248\u56fa\u5b9a\u5e03\u5c40\uff1a\u90e8\u4ef6\u6e05\u6670\u53ef\u8bfb\uff0c\u5c3a\u5bf8\u4e0d\u4ee3\u8868\u6bd4\u4f8b", "", "middle") + '\n      <line class="dimension" x1="190" y1="330" x2="850" y2="330"/>\n      <line class="dimension" x1="190" y1="324" x2="190" y2="336"/><line class="dimension" x1="850" y1="324" x2="850" y2="336"/>\n      ' + FMT.svgText(520, 326, "\u771f\u5b9e\u603b\u957f " + FMT.number(result.geometry.vehicleLengthM, 2) + " m \u00b7 \u76f4\u5f84 " + FMT.number(result.geometry.diameterM, 2) + " m", "dim-text", "middle");
    els.rocketSvg.innerHTML = '<title>\u706b\u7bad Q \u7248\u793a\u610f\u56fe</title><desc>\u56fa\u5b9a\u6bd4\u4f8b\u663e\u793a\u53d1\u52a8\u673a\u3001\u6cf5\u3001\u50a8\u7bb1\u3001\u589e\u538b\u3001\u822a\u7535\u548c\u8f7d\u8377\uff1b\u64ad\u653e\u65f6\u663e\u793a\u6db2\u4f4d\u3001\u5c3e\u7130\u3001\u901f\u5ea6\u3001\u51c0\u52a0\u901f\u5ea6\u3001\u91cd\u529b\u52a0\u901f\u5ea6\u548c\u963b\u529b\u52a0\u901f\u5ea6\u3002</desc>' + svg + motionOverlay();
    els.rocketSvg.setAttribute("viewBox", "0 0 900 430");
  }

  function clusterLayoutInset(result, centerX, centerY, radiusPx) {
    var cluster = result.engine.cluster;
    var baseRadiusM = Math.max(0.001, cluster.baseDiameterM / 2);
    var scale = radiusPx / baseRadiusM;
    var bodyRadiusPx = cluster.bodyDiameterM / 2 * scale;
    var nozzleRadiusPx = Math.max(1.5, cluster.nozzleDiameterM / 2 * scale);
    var nozzleCircles = cluster.positions.map(function (point) {
      return '<circle class="cluster-nozzle" cx="' + (centerX + point.xM * scale) + '" cy="' + (centerY + point.yM * scale) + '" r="' + nozzleRadiusPx + '" data-cluster-nozzle=""/>';
    }).join("");
    return '<g class="cluster-layout-inset" role="img" aria-label="' + result.config.engine.engineCount + ' \u53f0\u53d1\u52a8\u673a\u55b7\u53e3\u4fef\u89c6\u6392\u5e03\uff0c\u6240\u9700\u57fa\u5ea7 ' + FMT.number(cluster.requiredDiameterM, 2) + ' \u7c73\uff0c\u7bad\u4f53 ' + FMT.number(cluster.bodyDiameterM, 2) + ' \u7c73">\n      <circle class="cluster-base-envelope" cx="' + centerX + '" cy="' + centerY + '" r="' + radiusPx + '"/>\n      <circle class="cluster-body-envelope" cx="' + centerX + '" cy="' + centerY + '" r="' + bodyRadiusPx + '"/>\n      ' + nozzleCircles + '\n      ' + FMT.svgText(centerX, centerY - radiusPx - 10, "\u55b7\u53e3\u4fef\u89c6\u5305\u7edc", "cluster-inset-label", "middle") + '\n      ' + FMT.svgText(centerX, centerY + radiusPx + 16, "\u57fa\u5ea7 " + FMT.number(cluster.baseDiameterM, 2) + " m", "cluster-inset-value", "middle") + '\n    </g>';
  }

  function scaleBoosterSideGroups(result, xStart, centerY, pxPerM, coreBodyH) {
    if (!result.parallel || !result.parallel.enabled) return "";
    var parallel = result.parallel;
    var booster = parallel.booster;
    var boosterH = Math.max(8, booster.geometry.diameterM * pxPerM);
    var boosterL = Math.max(28, booster.geometry.vehicleLengthM * pxPerM);
    var engineL = Math.max(8, booster.geometry.engineLengthM * pxPerM);
    var bodyStartX = xStart + engineL * 0.72;
    var noseX = xStart + boosterL;
    var tankX = bodyStartX + engineL * 0.25;
    var tankWidth = Math.max(12, noseX - tankX - boosterH * 0.72);
    var nozzleExitH = Math.max(5, booster.engine.nozzle.exitDiameterM * pxPerM);
    var throatH = Math.max(2, booster.engine.nozzle.throatDiameterM * pxPerM);
    var offset = coreBodyH / 2 + boosterH / 2 + Math.max(6, boosterH * 0.12);
    var visibleCenters = parallel.count === 1 ? [centerY + offset] : [centerY - offset, centerY + offset];
    return visibleCenters.map(function (boosterY, index) {
      var top = boosterY - boosterH / 2;
      var body = '<path class="booster-body" d="M ' + bodyStartX + ' ' + top + ' L ' + (noseX - boosterH * 0.45) + ' ' + top + ' Q ' + noseX + ' ' + boosterY + ' ' + (noseX - boosterH * 0.45) + ' ' + (top + boosterH) + ' L ' + bodyStartX + ' ' + (top + boosterH) + ' Z"/>';
      var nozzle = nozzleGroup(xStart, boosterY, engineL, nozzleExitH, throatH, booster.config.engine.engineCount, true, "booster");
      var label = index === 0 ? FMT.svgText(tankX + tankWidth / 2, top - 7, parallel.count + " \u679a\u52a9\u63a8\u5668 \u00b7 " + FMT.number(booster.geometry.diameterM, 2) + " m", "booster-label", "middle") : "";
      return '<g class="booster-assembly" data-booster-assembly="' + (index + 1) + '" style="' + boosterFlameStyle(result) + '">'
        + body + nozzle
        + '<rect class="booster-tank" x="' + tankX + '" y="' + (top + boosterH * 0.12) + '" width="' + tankWidth + '" height="' + (boosterH * 0.76) + '" rx="' + (boosterH * 0.38) + '"/>'
        + '<rect class="booster-fluid" data-anim="booster-fill" data-base-x="' + tankX + '" data-base-width="' + tankWidth + '" data-base-height="' + (boosterH * 0.76) + '" x="' + tankX + '" y="' + (top + boosterH * 0.12) + '" width="' + tankWidth + '" height="' + (boosterH * 0.76) + '" rx="' + (boosterH * 0.38) + '"/>'
        + '<line class="booster-attachment" x1="' + (tankX + tankWidth * 0.52) + '" y1="' + (boosterY + (boosterY < centerY ? boosterH / 2 : -boosterH / 2)) + '" x2="' + (tankX + tankWidth * 0.52) + '" y2="' + (centerY + (boosterY < centerY ? -coreBodyH / 2 : coreBodyH / 2)) + '"/>'
        + label
        + '</g>';
    }).join("");
  }

  function renderSerialScaleRocket(result) {
    if (!AppCtx.els || !AppCtx.els.rocketSvg) return;
    var els = AppCtx.els;
    var zoom = AppCtx.state ? AppCtx.state.zoom : 1;
    var core = result.serial.base;
    var segments = [{ name: "\u82af\u7ea7 / \u7b2c\u4e00\u7ea7", design: core, separation: null }].concat(result.serial.stages.map(function (stageResult) {
      return { name: stageResult.stageName, design: stageResult, separation: stageResult.separation };
    }));
    var totalLengthM = segments.reduce(function (sum, segment) {
      return sum + segment.design.geometry.vehicleLengthM + (segment.separation ? segment.separation.interstageLengthM : 0);
    }, 0);
    var maximumDiameterM = Math.max.apply(Math, segments.map(function (segment) {
      return Math.max(segment.design.geometry.baseDiameterM || 0, segment.design.geometry.diameterM || 0, segment.design.geometry.attachedDiameterM || 0);
    }));
    var pxPerM = Math.min(735 / Math.max(1, totalLengthM), 185 / Math.max(0.1, maximumDiameterM)) * zoom;
    var totalPx = totalLengthM * pxPerM;
    var xStart = Math.max(38, (900 - totalPx) / 2);
    var centerY = 216;
    var coreBodyH = core.geometry.diameterM * pxPerM;
    var boosterGroups = scaleBoosterSideGroups(core, xStart, centerY, pxPerM, coreBodyH);
    var x = xStart;
    var stageMarkup = "";
    var boundaries = [];
    segments.forEach(function (segment, index) {
      var design = segment.design;
      var separationLengthPx = segment.separation ? segment.separation.interstageLengthM * pxPerM : 0;
      if (segment.separation) {
        var interfaceX = x;
        stageMarkup += '<g class="serial-interface-group" data-serial-interface-to="' + index + '">\n          <rect class="serial-interface" x="' + interfaceX + '" y="' + (centerY - Math.max(8, design.geometry.diameterM * pxPerM * 0.54)) + '" width="' + Math.max(3, separationLengthPx) + '" height="' + Math.max(16, design.geometry.diameterM * pxPerM * 1.08) + '"/>\n          ' + FMT.svgText(interfaceX + Math.max(3, separationLengthPx) / 2, centerY + Math.max(22, design.geometry.diameterM * pxPerM * 0.72), segment.separation.name.replace(/ \xb7.*/, ""), "serial-interface-label", "middle") + '\n        </g>';
        x += separationLengthPx;
      }
      var lengthPx = design.geometry.vehicleLengthM * pxPerM;
      var diameterPx = Math.max(7, design.geometry.diameterM * pxPerM);
      var top = centerY - diameterPx / 2;
      var endX = x + lengthPx;
      var engineLengthPx = Math.min(lengthPx * 0.24, Math.max(8, design.geometry.engineLengthM * pxPerM));
      var bodyStartX = x + engineLengthPx * 0.62;
      var isLast = index === segments.length - 1;
      var engineCount = design.config && design.config.engine
        ? design.config.engine.engineCount
        : design.engine && design.engine.cluster ? design.engine.cluster.engineCount : 1;
      var nozzle = design.engine && design.engine.nozzle
        ? '<g class="serial-stage-engine" data-serial-engine-stage="' + index + '" style="' + flameStyleForDesign(design) + '">' + nozzleGroup(x, centerY, engineLengthPx, Math.max(5, design.engine.nozzle.exitDiameterM * pxPerM), Math.max(2, design.engine.nozzle.throatDiameterM * pxPerM), engineCount, true, "stage-" + index) + '</g>'
        : '<path class="rocket-hot serial-upper-nozzle" d="M ' + (x + engineLengthPx) + ' ' + (centerY - diameterPx * 0.12) + ' L ' + x + ' ' + (centerY - diameterPx * 0.33) + ' L ' + x + ' ' + (centerY + diameterPx * 0.33) + ' L ' + (x + engineLengthPx) + ' ' + (centerY + diameterPx * 0.12) + ' Z"/>';
      var bodyPath = isLast
        ? 'M ' + bodyStartX + ' ' + top + ' L ' + (endX - diameterPx * 0.46) + ' ' + top + ' Q ' + endX + ' ' + centerY + ' ' + (endX - diameterPx * 0.46) + ' ' + (top + diameterPx) + ' L ' + bodyStartX + ' ' + (top + diameterPx) + ' Z'
        : 'M ' + bodyStartX + ' ' + top + ' L ' + endX + ' ' + top + ' L ' + endX + ' ' + (top + diameterPx) + ' L ' + bodyStartX + ' ' + (top + diameterPx) + ' Z';
      var tankStartX = bodyStartX + Math.max(2, diameterPx * 0.10);
      var tankAvailablePx = Math.max(6, endX - tankStartX - (isLast ? diameterPx * 0.55 : diameterPx * 0.10));
      var fuelShare = design.propellant.mono ? 1 : (design.split || result.split).loadedFuelKg / Math.max(1, (design.split || result.split).loadedTotalKg);
      var fuelWidth = design.propellant.mono ? tankAvailablePx : Math.max(4, tankAvailablePx * fuelShare);
      var oxWidth = design.propellant.mono ? 0 : Math.max(4, tankAvailablePx - fuelWidth - 2);
      stageMarkup += '<g class="serial-stage-segment" data-serial-preview-stage="' + (index + 1) + '">\n        <path class="rocket-body serial-stage-body" d="' + bodyPath + '"/>\n        ' + nozzle + '\n        <rect class="tank-fluid-fuel serial-stage-fluid" data-anim="stage-fuel-fill" data-stage-index="' + index + '" data-base-x="' + tankStartX + '" data-base-width="' + fuelWidth + '" data-base-height="' + (diameterPx * 0.72) + '" x="' + tankStartX + '" y="' + (centerY - diameterPx * 0.36) + '" width="' + fuelWidth + '" height="' + (diameterPx * 0.72) + '" rx="' + Math.min(diameterPx * 0.36, fuelWidth / 2) + '"/>\n        ' + (design.propellant.mono ? "" : '<rect class="tank-fluid-oxidizer serial-stage-fluid" data-anim="stage-oxidizer-fill" data-stage-index="' + index + '" data-base-x="' + (tankStartX + fuelWidth + 2) + '" data-base-width="' + oxWidth + '" data-base-height="' + (diameterPx * 0.72) + '" x="' + (tankStartX + fuelWidth + 2) + '" y="' + (centerY - diameterPx * 0.36) + '" width="' + oxWidth + '" height="' + (diameterPx * 0.72) + '" rx="' + Math.min(diameterPx * 0.36, oxWidth / 2) + '"/>') + '\n        ' + FMT.svgText((bodyStartX + endX) / 2, index % 2 === 0 ? top - 12 : top + diameterPx + 20, segment.name + " \u00b7 " + design.propellant.shortName + " \u00b7 \u0394v " + FMT.number(design.performance.idealDeltaV, 0) + " m/s", "serial-stage-label", "middle") + '\n      </g>';
      boundaries.push({ x: endX, stageNumber: index + 1 });
      x = endX;
    });
    var endX = x;
    var meterStep = totalLengthM > 80 ? 10 : totalLengthM > 35 ? 5 : totalLengthM > 18 ? 2 : 1;
    var ruler = '<line class="dimension" x1="' + xStart + '" y1="382" x2="' + endX + '" y2="382"/>';
    for (var meter = 0; meter <= Math.ceil(totalLengthM); meter += meterStep) {
      var tickX = xStart + meter * pxPerM;
      if (tickX > 882) break;
      ruler += '<line class="meter-tick" x1="' + tickX + '" y1="377" x2="' + tickX + '" y2="387"/>' + FMT.svgText(tickX, 402, meter + " m", "", "middle");
    }
    var svg = '<line class="centerline" x1="20" y1="' + centerY + '" x2="885" y2="' + centerY + '"/>\n      ' + boosterGroups + stageMarkup + '\n      <line class="dimension" x1="' + xStart + '" y1="52" x2="' + endX + '" y2="52"/>\n      <line class="dimension" x1="' + xStart + '" y1="46" x2="' + xStart + '" y2="58"/><line class="dimension" x1="' + endX + '" y1="46" x2="' + endX + '" y2="58"/>\n      ' + FMT.svgText((xStart + endX) / 2, 44, "\u4e32\u8054\u603b\u957f " + FMT.number(totalLengthM, 2) + " m \u00b7 " + segments.length + " \u7ea7", "dim-text", "middle") + '\n      ' + FMT.svgText(20, 84, "\u6700\u5927\u76f4\u5f84 " + FMT.number(maximumDiameterM, 2) + " m", "dim-text") + '\n      ' + FMT.svgText(20, 102, "\u7ea7\u95f4\u7cfb\u7edf " + FMT.formatMass(result.serial.interfaceMassKg) + " \u00b7 \u5206\u79bb\u53ef\u9760\u6027 " + FMT.number(result.serial.missionSeparationReliabilityPct, 3) + "%", "") + '\n      ' + (result.parallel && result.parallel.enabled ? FMT.svgText(20, 120, "\u5e76\u8054\u52a9\u63a8\u5668 " + result.parallel.count + " \u679a \u00b7 \u8d77\u98de\u5305\u7edc " + FMT.number(result.parallel.attachedDiameterM, 2) + " m", "booster-label") : "") + '\n      ' + ruler;
    els.rocketSvg.innerHTML = '<title>\u4e32\u8054\u591a\u7ea7\u706b\u7bad\u771f\u5b9e\u6bd4\u4f8b\u4fa7\u89c6\u56fe</title><desc>\u82af\u7ea7\u3001\u5e76\u8054\u52a9\u63a8\u5668\u3001\u4e0a\u9762\u7ea7\u548c\u7ea7\u95f4\u5206\u79bb\u7cfb\u7edf\u6309\u540c\u4e00\u7c73\u5236\u6bd4\u4f8b\u7ed8\u5236\uff1b\u6bcf\u7ea7\u6807\u7b7e\u663e\u793a\u63a8\u8fdb\u5242\u548c\u672c\u7ea7\u7406\u60f3\u901f\u5ea6\u589e\u91cf\u3002</desc>' + svg + motionOverlay();
    els.rocketSvg.setAttribute("viewBox", "0 0 900 430");
  }

  function renderScaleRocket(result) {
    if (!AppCtx.els || !AppCtx.els.rocketSvg) return;
    var els = AppCtx.els;
    var zoom = AppCtx.state ? AppCtx.state.zoom : 1;
    if (result.serial && result.serial.enabled) {
      renderSerialScaleRocket(result);
      return;
    }
    var nozzle = result.engine.nozzle;
    var layeredTank = ["dual", "load-sharing", "copv"].includes(result.tanks.structureMode);
    var tankThicknessLabel = layeredTank
      ? "\u50a8\u7bb1\u603b\u58c1\u539a " + FMT.number(result.tanks.fuel.cylinderThicknessM * 1000, 2) + " mm\uff08\u5185 " + FMT.number(result.tanks.fuel.linerLayer.cylinderThicknessM * 1000, 2) + " + \u5916 " + FMT.number(result.tanks.fuel.structuralLayer.cylinderThicknessM * 1000, 2) + "\uff09"
      : "\u50a8\u7bb1\u58c1\u539a " + FMT.number(result.tanks.fuel.cylinderThicknessM * 1000, 2) + " mm\uff08\u4e9a\u50cf\u7d20\uff0c\u4ec5\u6807\u6ce8\uff09";
    var maxDiameter = Math.max(result.geometry.baseDiameterM, result.geometry.attachedDiameterM || 0);
    var baseScale = Math.min(680 / result.geometry.vehicleLengthM, 220 / Math.max(0.1, maxDiameter));
    var pxPerM = baseScale * zoom;
    var totalPx = result.geometry.vehicleLengthM * pxPerM;
    var xStart = Math.max(55, (900 - totalPx) / 2);
    var centerY = 205;
    var bodyH = result.geometry.diameterM * pxPerM;
    var baseH = result.geometry.baseDiameterM * pxPerM;
    var engineL = result.geometry.engineLengthM * pxPerM;
    var baseSkirtL = result.geometry.baseSkirtLengthM * pxPerM;
    var commonSavingPx = result.tanks.commonBulkhead ? result.tanks.commonBulkhead.lengthSavingM * pxPerM : 0;
    var fuelL = Math.max(bodyH * 0.55, result.tanks.fuel.geometry.totalLengthM * pxPerM - commonSavingPx / 2);
    var oxL = result.tanks.oxidizer ? Math.max(bodyH * 0.55, result.tanks.oxidizer.geometry.totalLengthM * pxPerM - commonSavingPx / 2) : 0;
    var gap = result.tanks.commonBulkhead ? 0 : result.geometry.diameterM * 0.18 * pxPerM;
    var fairingL = result.geometry.fairingLengthM * pxPerM;
    var x = xStart;
    var nozzleExitH = Math.max(8, nozzle.exitDiameterM * pxPerM);
    var throatH = Math.max(3, nozzle.throatDiameterM * pxPerM);
    var nozzles = nozzleGroup(x, centerY, engineL, nozzleExitH, throatH, result.config.engine.engineCount, true);
    x += engineL;
    var baseX = xStart + engineL * 0.62;
    x += baseSkirtL;
    var fuelX = x;
    x += fuelL;
    var gapX = x;
    x += result.tanks.oxidizer ? gap : 0;
    var oxX = x;
    x += oxL;
    var fairX = x;
    var endX = fairX + fairingL;
    var tankY = centerY - bodyH / 2;
    var bodyTop = tankY - 6;
    var bodyBottom = centerY + bodyH / 2 + 6;
    var meterStep = result.geometry.vehicleLengthM > 40 ? 5 : result.geometry.vehicleLengthM > 18 ? 2 : 1;
    var ruler = '<line class="dimension" x1="' + xStart + '" y1="382" x2="' + endX + '" y2="382"/>';
    for (var m = 0; m <= Math.ceil(result.geometry.vehicleLengthM); m += meterStep) {
      var tx = xStart + m * pxPerM;
      if (tx > 875) break;
      ruler += '<line class="meter-tick" x1="' + tx + '" y1="377" x2="' + tx + '" y2="387"/>' + FMT.svgText(tx, 402, m + " m", "", "middle");
    }
    var bodyPath = '<path class="rocket-body" d="M ' + baseX + ' ' + (centerY - baseH / 2 - 6) + ' L ' + fuelX + ' ' + bodyTop + ' L ' + fairX + ' ' + bodyTop + ' Q ' + (endX - fairingL * 0.25) + ' ' + (bodyTop + bodyH * 0.05) + ' ' + endX + ' ' + centerY + ' Q ' + (endX - fairingL * 0.25) + ' ' + (bodyBottom - bodyH * 0.05) + ' ' + fairX + ' ' + bodyBottom + ' L ' + fuelX + ' ' + bodyBottom + ' L ' + baseX + ' ' + (centerY + baseH / 2 + 6) + ' Z"/>';
    var payloadMid = fairX + fairingL * 0.45;
    var boosterGroups = scaleBoosterSideGroups(result, xStart, centerY, pxPerM, bodyH);
    var svg = '\n      <line class="centerline" x1="25" y1="' + centerY + '" x2="880" y2="' + centerY + '"/>\n      ' + boosterGroups + '\n      ' + bodyPath + '\n      ' + nozzles + '\n      <rect class="rocket-hot" x="' + (fuelX - engineL * 0.18) + '" y="' + (centerY - Math.max(8, bodyH * 0.22)) + '" width="' + (engineL * 0.32) + '" height="' + Math.max(16, bodyH * 0.44) + '" rx="4"/>\n      <rect class="tank-shell" x="' + fuelX + '" y="' + tankY + '" width="' + Math.max(1, fuelL) + '" height="' + bodyH + '" rx="' + Math.min(bodyH / 2, fuelL / 2) + '"/>\n      <rect class="tank-fluid-fuel" data-anim="fuel-fill" data-base-x="' + fuelX + '" data-base-width="' + Math.max(1, fuelL) + '" data-base-height="' + bodyH + '" x="' + fuelX + '" y="' + tankY + '" width="' + Math.max(1, fuelL) + '" height="' + bodyH + '" rx="' + Math.min(bodyH / 2, fuelL / 2) + '"/>\n      ' + (result.tanks.oxidizer ? '<rect class="tank-shell" x="' + oxX + '" y="' + tankY + '" width="' + Math.max(1, oxL) + '" height="' + bodyH + '" rx="' + Math.min(bodyH / 2, oxL / 2) + '"/>\n      <rect class="tank-fluid-oxidizer" data-anim="oxidizer-fill" data-base-x="' + oxX + '" data-base-width="' + Math.max(1, oxL) + '" data-base-height="' + bodyH + '" x="' + oxX + '" y="' + tankY + '" width="' + Math.max(1, oxL) + '" height="' + bodyH + '" rx="' + Math.min(bodyH / 2, oxL / 2) + '"/>' : "") + '\n      ' + (result.tanks.oxidizer ? (result.tanks.commonBulkhead
        ? '<path class="common-bulkhead" d="M ' + oxX + ' ' + tankY + ' Q ' + (oxX - bodyH * 0.16) + ' ' + centerY + ' ' + oxX + ' ' + bodyBottom + '"/>'
        : '<rect class="rocket-body" x="' + gapX + '" y="' + tankY + '" width="' + gap + '" height="' + bodyH + '"/>') : "") + '\n      <circle class="pressurant-node" cx="' + (fairX + fairingL * 0.16) + '" cy="' + centerY + '" r="' + Math.max(3, Math.min(13, bodyH * 0.17)) + '"/>\n      ' + FMT.svgText(fuelX + fuelL / 2, tankY - 13, (result.propellant.mono ? "\u63a8\u8fdb\u5242" : "\u71c3\u6599") + " " + FMT.number(result.tanks.fuel.totalVolumeM3, 2) + " m\u00b3", "rocket-value", "middle") + '\n      ' + (result.tanks.oxidizer ? FMT.svgText(oxX + oxL / 2, bodyBottom + 22, "\u6c27\u5316\u5242 " + FMT.number(result.tanks.oxidizer.totalVolumeM3, 2) + " m\u00b3", "rocket-value", "middle") : "") + '\n      ' + FMT.svgText(payloadMid + fairingL * 0.18, centerY - 5, "\u8f7d\u8377", "rocket-value", "middle") + '\n      ' + FMT.svgText(payloadMid + fairingL * 0.18, centerY + 13, FMT.formatMass(result.masses.payloadKg), "", "middle") + '\n      <line class="dimension" x1="' + xStart + '" y1="53" x2="' + endX + '" y2="53"/>\n      <line class="dimension" x1="' + xStart + '" y1="47" x2="' + xStart + '" y2="59"/><line class="dimension" x1="' + endX + '" y1="47" x2="' + endX + '" y2="59"/>\n      ' + FMT.svgText((xStart + endX) / 2, 45, "\u603b\u957f " + FMT.number(result.geometry.vehicleLengthM, 2) + " m", "dim-text", "middle") + '\n      ' + FMT.svgText(20, 88, "\u5171\u540c\u76f4\u5f84 " + FMT.number(result.geometry.diameterM, 2) + " m", "dim-text") + '\n      ' + FMT.svgText(20, 106, tankThicknessLabel, "") + '\n      ' + FMT.svgText(20, 124, "\u55b7\u53e3 " + FMT.number(nozzle.exitDiameterM, 3) + " m / \u53f0", "") + '\n      ' + FMT.svgText(20, 142, "\u96c6\u7fa4\u57fa\u5ea7 " + FMT.number(result.geometry.baseDiameterM, 2) + " m \u00b7 " + (result.engine.cluster.requiresExpansion ? "\u9700\u8981\u6269\u5f84" : "\u5305\u7edc\u901a\u8fc7"), result.engine.cluster.requiresExpansion ? "cluster-warning-label" : "") + '\n      ' + (result.parallel && result.parallel.enabled ? FMT.svgText(20, 160, "\u5e76\u8054\u5305\u7edc " + FMT.number(result.parallel.attachedDiameterM, 2) + " m \u00b7 \u52a9\u63a8\u5668 " + result.parallel.count + " \u679a", "booster-label") : "") + '\n      ' + (result.tanks.commonBulkhead ? FMT.svgText(20, result.parallel && result.parallel.enabled ? 178 : 160, "\u5171\u5e95 " + result.tanks.commonBulkhead.typeName + " \u00b7 \u7f29\u77ed " + FMT.number(result.tanks.commonBulkhead.lengthSavingM, 2) + " m", "common-bulkhead-label") : "") + '\n      ' + clusterLayoutInset(result, 810, 315, 42) + '\n      ' + ruler;
    els.rocketSvg.innerHTML = '<title>\u706b\u7bad\u771f\u5b9e\u6bd4\u4f8b\u4fa7\u89c6\u56fe</title><desc>\u8f74\u5411\u957f\u5ea6\u3001\u7bad\u4f53\u76f4\u5f84\u3001\u50a8\u7bb1\u548c\u53d1\u52a8\u673a\u55b7\u53e3\u6309\u540c\u4e00\u7c73\u5236\u6bd4\u4f8b\u7ed8\u5236\uff1b\u64ad\u653e\u65f6\u663e\u793a\u6db2\u4f4d\u3001\u5c3e\u7130\u3001\u901f\u5ea6\u3001\u51c0\u52a0\u901f\u5ea6\u3001\u91cd\u529b\u52a0\u901f\u5ea6\u548c\u963b\u529b\u52a0\u901f\u5ea6\u3002</desc>' + svg + motionOverlay();
    els.rocketSvg.setAttribute("viewBox", "0 0 900 430");
  }

  return {
    flamePalette: flamePalette,
    serialFlightStageDesign: serialFlightStageDesign,
    flameStyleForDesign: flameStyleForDesign,
    applyFlamePalette: applyFlamePalette,
    boosterFlameStyle: boosterFlameStyle,
    nozzleGroup: nozzleGroup,
    motionOverlay: motionOverlay,
    renderCartoonRocket: renderCartoonRocket,
    clusterLayoutInset: clusterLayoutInset,
    scaleBoosterSideGroups: scaleBoosterSideGroups,
    renderSerialScaleRocket: renderSerialScaleRocket,
    renderScaleRocket: renderScaleRocket
  };
});
