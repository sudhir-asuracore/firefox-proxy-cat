(() => {
  const patternCache = new Map();

  const escapeRegex = (input) => input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const wildcardToRegex = (pattern) => {
    const escaped = escapeRegex(pattern)
      .replace(/\\\*/g, ".*")
      .replace(/\\\?/g, ".");
    return new RegExp(`^${escaped}$`, "i");
  };

  const compilePattern = (pattern) => {
    if (patternCache.has(pattern)) {
      return patternCache.get(pattern);
    }

    let compiled;
    if (pattern.startsWith("re:")) {
      const raw = pattern.slice(3);
      compiled = new RegExp(raw, "i");
      compiled.meta = { type: "regex" };
    } else {
      compiled = wildcardToRegex(pattern);
      compiled.meta = { type: "wildcard" };
    }

    patternCache.set(pattern, compiled);
    return compiled;
  };

  const normalizeUrl = (url) => {
    try {
      return new URL(url);
    } catch (error) {
      return null;
    }
  };

  const matchPattern = (pattern, urlObj) => {
    if (!urlObj) {
      return false;
    }

    const text = pattern.trim();
    if (!text) {
      return false;
    }

    const compiled = compilePattern(text);
    if (compiled.meta.type === "regex") {
      return compiled.test(urlObj.href);
    }

    const target = text.includes("://") || text.includes("/")
      ? urlObj.href
      : urlObj.hostname;

    return compiled.test(target);
  };

  const findMatchingRule = (rules, url) => {
    const urlObj = normalizeUrl(url);
    if (!urlObj || !Array.isArray(rules)) {
      return null;
    }

    for (const rule of rules) {
      if (rule.enabled === false) {
        continue;
      }
      if (matchPattern(rule.pattern, urlObj)) {
        return rule;
      }
    }

    return null;
  };

  const resolveOverride = (override) => {
    if (!override) {
      return null;
    }

    if (override.type === "disabled" || override.disabled) {
      return { type: "direct" };
    }

    if (override.profileId) {
      return { type: "profile", profileId: override.profileId };
    }

    return null;
  };

  const evaluateProxy = ({ state, tabId, groupId, url }) => {
    if (!state) {
      return { type: "direct" };
    }

    const tabOverride = state.tabOverrides[String(tabId)];
    const resolvedTab = resolveOverride(tabOverride);
    if (resolvedTab) {
      return resolvedTab;
    }

    const groupOverride = state.groupOverrides[String(groupId)];
    const resolvedGroup = resolveOverride(groupOverride);
    if (resolvedGroup) {
      return resolvedGroup;
    }

    const rule = findMatchingRule(state.rules, url);
    if (rule) {
      return { type: "profile", profileId: rule.profileId };
    }

    return { type: "direct" };
  };

  window.ProxyCatMatcher = {
    compilePattern,
    matchPattern,
    findMatchingRule,
    evaluateProxy
  };
})();
