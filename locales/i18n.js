(function (root, factory) {
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.RocketSimI18n = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (root) {
  "use strict";

  const DEFAULT_LOCALE = "zh-CN";
  const STORAGE_KEY = "rocket-sim-locale-v1";
  const catalogs = Object.create(null);
  const listeners = new Set();
  const missingWarnings = new Set();
  const textState = typeof WeakMap === "function" ? new WeakMap() : null;
  const attributeState = typeof WeakMap === "function" ? new WeakMap() : null;
  const dataBaseValues = Object.create(null);
  let observer = null;
  let observedRoot = null;

  function normalizeLocale(locale) {
    const value = String(locale || "").replace(/_/g, "-").toLowerCase();
    if (value === "zh-hans-x-classical" || value === "zh-classical") return "zh-Hans-x-classical";
    if (value === "zh" || value.indexOf("zh-") === 0) return "zh-CN";
    if (value === "en" || value.indexOf("en-") === 0) return "en-US";
    return locale && catalogs[locale] ? locale : DEFAULT_LOCALE;
  }

  function readStoredLocale() {
    try {
      return root.localStorage ? root.localStorage.getItem(STORAGE_KEY) : "";
    } catch (error) {
      return "";
    }
  }

  function browserLocale() {
    const navigator = root.navigator;
    const languages = navigator && Array.isArray(navigator.languages) && navigator.languages.length
      ? navigator.languages
      : [navigator && navigator.language];
    return normalizeLocale((languages || []).find(Boolean) || DEFAULT_LOCALE);
  }

  let currentLocale = normalizeLocale(readStoredLocale() || browserLocale());

  function register(locale, catalog) {
    const code = normalizeLocale(locale);
    catalogs[code] = Object.freeze(Object.assign({
      code: code,
      label: code,
      htmlLang: code,
      ui: {},
      messages: {},
      entities: {},
      staticText: {},
      replacements: [],
      speech: {}
    }, catalog || {}));
    return catalogs[code];
  }

  function catalogFor(locale) {
    return catalogs[normalizeLocale(locale)] || catalogs[DEFAULT_LOCALE] || null;
  }

  function pathValue(object, path) {
    return String(path || "").split(".").reduce(function (value, key) {
      return value == null ? undefined : value[key];
    }, object);
  }

  function interpolate(template, params) {
    const values = params || {};
    return String(template == null ? "" : template).replace(/\{([A-Za-z0-9_.-]+)\}/g, function (match, key) {
      const value = pathValue(values, key);
      return value == null ? match : String(value);
    });
  }

  function warnMissing(key) {
    if (!key || currentLocale === DEFAULT_LOCALE || missingWarnings.has(key)) return;
    missingWarnings.add(key);
    if (root.console && typeof root.console.warn === "function") {
      root.console.warn("[Rocket SIM i18n] Missing " + currentLocale + " translation: " + key);
    }
  }

  function lookup(key) {
    const active = catalogFor(currentLocale);
    const fallback = catalogFor(DEFAULT_LOCALE);
    const activeValue = active && (pathValue(active.messages, key) != null
      ? pathValue(active.messages, key)
      : pathValue(active.ui, key));
    if (activeValue != null) return activeValue;
    const fallbackValue = fallback && (pathValue(fallback.messages, key) != null
      ? pathValue(fallback.messages, key)
      : pathValue(fallback.ui, key));
    return fallbackValue;
  }

  function translateText(value) {
    const text = String(value == null ? "" : value);
    if (!text || currentLocale === DEFAULT_LOCALE || !/[\u3400-\u9fff]/.test(text)) return text;
    const active = catalogFor(currentLocale);
    if (!active) return text;
    const trimmed = text.trim();
    const exact = active.staticText && active.staticText[trimmed];
    let translated = exact == null ? trimmed : exact;
    if (/[\u3400-\u9fff]/.test(translated) && Array.isArray(active.replacements)) {
      active.replacements
        .slice()
        .sort(function (left, right) {
          return String(right && right[0] || "").length - String(left && left[0] || "").length;
        })
        .forEach(function (entry) {
        if (!entry || entry.length < 2) return;
        translated = translated.split(entry[0]).join(entry[1]);
        });
    }
    if (translated === trimmed) return text;
    return text.slice(0, text.indexOf(trimmed)) + translated + text.slice(text.indexOf(trimmed) + trimmed.length);
  }

  function t(key, params, fallback) {
    const value = lookup(key);
    if (value == null) {
      warnMissing(key);
      return interpolate(translateText(fallback == null ? key : fallback), params);
    }
    return interpolate(value, params);
  }

  function entity(group, id, field, fallback) {
    const active = catalogFor(currentLocale);
    const localized = active && pathValue(active.entities, [group, id, field].join("."));
    return localized == null ? translateText(fallback) : localized;
  }

  function getPath(object, path) {
    return pathValue(object, path);
  }

  function setPath(object, path, value) {
    const keys = String(path).split(".");
    let target = object;
    for (let index = 0; index < keys.length - 1; index += 1) {
      if (!target || typeof target !== "object") return;
      target = target[keys[index]];
    }
    if (target && typeof target === "object") target[keys[keys.length - 1]] = value;
  }

  function collectStringPaths(value, prefix, output, depth) {
    if (depth > 8 || value == null) return;
    if (typeof value === "string") {
      if (/[\u3400-\u9fff]/.test(value)) output.add(prefix);
      return;
    }
    if (typeof value !== "object") return;
    Object.keys(value).forEach(function (key) {
      collectStringPaths(value[key], prefix ? prefix + "." + key : key, output, depth + 1);
    });
  }

  function applyData(data) {
    if (!data) return data;
    const groups = [
      "celestialBodies", "flamePalettes", "propellants", "materials", "processes",
      "cycles", "batteries", "cooling", "stageSeparationModes",
      "historicalRocketPresets", "modernRocketPresets", "rocketWisdom", "sources"
    ];
    groups.forEach(function (group) {
      const collection = data[group];
      if (!collection) return;
      const ids = Array.isArray(collection) ? collection.map(function (_, index) { return String(index); }) : Object.keys(collection);
      ids.forEach(function (id) {
        const item = collection[id];
        if (!item || typeof item !== "object") return;
        const active = catalogFor(currentLocale);
        const fields = active && pathValue(active.entities, group + "." + id);
        const knownFields = new Set(Object.keys(fields || {}));
        collectStringPaths(item, "", knownFields, 0);
        const prefix = group + "." + id + ".";
        Object.keys(dataBaseValues).forEach(function (baseKey) {
          if (baseKey.indexOf(prefix) === 0) knownFields.add(baseKey.slice(prefix.length));
        });
        Object.keys(catalogs).forEach(function (locale) {
          const localeFields = pathValue(catalogs[locale].entities, group + "." + id);
          Object.keys(localeFields || {}).forEach(function (field) { knownFields.add(field); });
        });
        knownFields.forEach(function (field) {
          const baseKey = group + "." + id + "." + field;
          if (!Object.prototype.hasOwnProperty.call(dataBaseValues, baseKey)) {
            dataBaseValues[baseKey] = getPath(item, field);
          }
          const localized = fields && fields[field];
          const baseValue = dataBaseValues[baseKey];
          setPath(item, field, localized == null
            ? (currentLocale === DEFAULT_LOCALE ? baseValue : translateText(baseValue))
            : localized);
        });
      });
    });
    return data;
  }

  function isIgnored(node) {
    const element = node && (node.nodeType === 1 ? node : node.parentElement);
    return !!(element && element.closest && element.closest("[data-i18n-ignore]"));
  }

  function translateTextNode(node) {
    if (!node || node.nodeType !== 3 || isIgnored(node)) return;
    const current = node.nodeValue;
    let state = textState && textState.get(node);
    if (!state) state = { source: current, rendered: current };
    else if (current !== state.rendered) state.source = current;
    const rendered = currentLocale === DEFAULT_LOCALE ? state.source : translateText(state.source);
    state.rendered = rendered;
    if (textState) textState.set(node, state);
    if (node.nodeValue !== rendered) node.nodeValue = rendered;
  }

  function translateAttributes(element) {
    if (!element || element.nodeType !== 1 || isIgnored(element)) return;
    let states = attributeState && attributeState.get(element);
    if (!states) states = Object.create(null);
    ["title", "placeholder", "aria-label", "alt", "content"].forEach(function (name) {
      if (!element.hasAttribute(name)) return;
      if (name === "content" && element.tagName !== "META" && !element.hasAttribute("data-i18n-content")) return;
      const current = element.getAttribute(name);
      let state = states[name] || { source: current, rendered: current };
      if (current !== state.rendered) state.source = current;
      const rendered = currentLocale === DEFAULT_LOCALE ? state.source : translateText(state.source);
      state.rendered = rendered;
      states[name] = state;
      if (current !== rendered) element.setAttribute(name, rendered);
    });
    if (attributeState) attributeState.set(element, states);

    const key = element.getAttribute("data-i18n");
    if (key) {
      const renderedText = t(key, null, element.textContent);
      if (element.textContent !== renderedText) element.textContent = renderedText;
    }
    ["title", "placeholder", "aria-label", "content"].forEach(function (name) {
      const attributeKey = element.getAttribute("data-i18n-" + name);
      if (!attributeKey) return;
      const renderedValue = t(attributeKey, null, element.getAttribute(name));
      if (element.getAttribute(name) !== renderedValue) element.setAttribute(name, renderedValue);
    });
  }

  function translateDom(scope) {
    if (!scope || typeof scope !== "object") return;
    if (scope.nodeType === 1) translateAttributes(scope);
    const document = scope.nodeType === 9 ? scope : scope.ownerDocument;
    if (!document || typeof document.createTreeWalker !== "function") return;
    const walker = document.createTreeWalker(scope, 1 | 4);
    let node = walker.currentNode;
    while (node) {
      if (node.nodeType === 1) translateAttributes(node);
      else translateTextNode(node);
      node = walker.nextNode();
    }
    if (document.documentElement) {
      const active = catalogFor(currentLocale);
      document.documentElement.lang = active && active.htmlLang ? active.htmlLang : currentLocale;
    }
  }

  function observe(scope) {
    if (!root.MutationObserver || !scope) return;
    if (observer) observer.disconnect();
    observedRoot = scope;
    observer = new root.MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        if (mutation.type === "characterData") translateTextNode(mutation.target);
        else if (mutation.type === "attributes") translateAttributes(mutation.target);
        else Array.prototype.forEach.call(mutation.addedNodes || [], function (node) {
          if (node.nodeType === 3) translateTextNode(node);
          else translateDom(node);
        });
      });
    });
    observer.observe(scope, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["title", "placeholder", "aria-label", "alt", "content"]
    });
    translateDom(scope);
  }

  function setLocale(locale, options) {
    const requested = normalizeLocale(locale);
    currentLocale = catalogs[requested] ? requested : DEFAULT_LOCALE;
    if (!options || options.persist !== false) {
      try {
        if (root.localStorage) root.localStorage.setItem(STORAGE_KEY, currentLocale);
      } catch (error) {
        // Storage is optional; language switching must remain available.
      }
    }
    if (observedRoot) translateDom(observedRoot);
    listeners.forEach(function (listener) {
      try { listener(currentLocale); } catch (error) {
        if (root.console && root.console.error) root.console.error(error);
      }
    });
    return currentLocale;
  }

  function getLocale() {
    return currentLocale;
  }

  function onChange(listener) {
    if (typeof listener !== "function") return function () {};
    listeners.add(listener);
    return function () { listeners.delete(listener); };
  }

  function speechNumber(value) {
    const active = catalogFor(currentLocale);
    const speech = active && active.speech || {};
    return speech.numbers && speech.numbers[value] || String(value);
  }

  function speechLang() {
    const active = catalogFor(currentLocale);
    return active && active.speech && active.speech.lang || currentLocale;
  }

  return Object.freeze({
    DEFAULT_LOCALE: DEFAULT_LOCALE,
    STORAGE_KEY: STORAGE_KEY,
    register: register,
    setLocale: setLocale,
    getLocale: getLocale,
    t: t,
    entity: entity,
    translateText: translateText,
    translateDom: translateDom,
    observe: observe,
    applyData: applyData,
    onChange: onChange,
    speechNumber: speechNumber,
    speechLang: speechLang,
    catalogs: catalogs
  });
});
