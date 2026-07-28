(function (root, factory) {
  const i18n = typeof module === "object" && module.exports ? require("./i18n.js") : root.RocketSimI18n;
  const catalog = factory();
  i18n.register("zh-CN", catalog);
  if (typeof module === "object" && module.exports) module.exports = catalog;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  return {
    code: "zh-CN",
    label: "简体中文",
    htmlLang: "zh-CN",
    ui: {
      meta: {
        description: "Cake Rocket SIM：用于火箭方案设计、性能估算与飞行模拟的浏览器应用。"
      },
      brand: {
        eyebrow: "推进概念实验室",
        title: "Rocket SIM"
      },
      language: { label: "语言", chinese: "简体中文", english: "English" }
    },
    messages: {
      design: {
        generatedName: "{diameter}米级-{propellant}-{cycle}{boosters}{stages}火箭",
        boosters: "-{count}助推并联",
        stages: "-{count}级"
      },
      locale: { changed: "界面语言已切换为简体中文。" }
    },
    entities: {},
    staticText: {},
    replacements: [],
    speech: {
      lang: "zh-CN",
      numbers: { 1: "一", 2: "二", 3: "三", 4: "四", 5: "五", 6: "六", 7: "七", 8: "八", 9: "九", 10: "十" }
    }
  };
});
