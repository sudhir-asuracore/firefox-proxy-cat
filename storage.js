(() => {
  const api = typeof browser !== "undefined" ? browser : chrome;

  const SCHEMA_VERSION = 1;
  const BUILTIN_PROFILES = {
    direct: {
      id: "direct",
      name: "Direct (no proxy)",
      scheme: "direct",
      host: "",
      port: 0
    }
  };

  const DEFAULT_STATE = {
    schemaVersion: SCHEMA_VERSION,
    profiles: {},
    rules: [],
    tabOverrides: {},
    groupOverrides: {}
  };

  const allowedSchemes = new Set(["http", "https", "socks", "socks4", "socks5", "direct"]);

  const normalizeState = (stored) => {
    const state = {
      ...DEFAULT_STATE,
      ...stored
    };

    state.schemaVersion = SCHEMA_VERSION;
    state.profiles = state.profiles && typeof state.profiles === "object" ? state.profiles : {};
    state.rules = Array.isArray(state.rules) ? state.rules : [];
    state.tabOverrides = state.tabOverrides && typeof state.tabOverrides === "object" ? state.tabOverrides : {};
    state.groupOverrides = state.groupOverrides && typeof state.groupOverrides === "object" ? state.groupOverrides : {};

    return state;
  };

  const getState = async () => {
    const stored = await api.storage.local.get();
    return normalizeState(stored);
  };

  const saveState = async (state) => {
    const normalized = normalizeState(state);
    await api.storage.local.set(normalized);
    return normalized;
  };

  const validateProfile = (profile) => {
    if (!profile || typeof profile !== "object") {
      return "Profile is required.";
    }

    const name = (profile.name || "").trim();
    if (!name) {
      return "Profile name is required.";
    }

    const scheme = profile.scheme || "http";
    if (!allowedSchemes.has(scheme)) {
      return "Unsupported proxy scheme.";
    }

    if (scheme !== "direct") {
      const host = (profile.host || "").trim();
      if (!host) {
        return "Proxy host is required.";
      }

      const port = Number(profile.port);
      if (!Number.isInteger(port) || port <= 0 || port > 65535) {
        return "Proxy port must be between 1 and 65535.";
      }
    }

    return null;
  };

  const validateRule = (rule, profiles) => {
    if (!rule || typeof rule !== "object") {
      return "Rule is required.";
    }

    const pattern = (rule.pattern || "").trim();
    if (!pattern) {
      return "Rule pattern is required.";
    }

    const profileId = rule.profileId;
    const hasProfile = profileId === "direct" || (profiles && profiles[profileId]);
    if (!hasProfile) {
      return "Rule profile is missing.";
    }

    return null;
  };

  const getProfilesWithBuiltin = (profiles) => {
    return {
      ...BUILTIN_PROFILES,
      ...(profiles || {})
    };
  };

  const addProfile = async (profile) => {
    const state = await getState();
    const error = validateProfile(profile);
    if (error) {
      throw new Error(error);
    }

    const id = profile.id || `p_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
    state.profiles[id] = {
      id,
      name: profile.name.trim(),
      scheme: profile.scheme || "http",
      host: (profile.host || "").trim(),
      port: Number(profile.port || 0),
      username: (profile.username || "").trim(),
      password: (profile.password || "").trim()
    };

    await saveState(state);
    return state;
  };

  const updateProfile = async (id, updates) => {
    const state = await getState();
    if (!state.profiles[id]) {
      throw new Error("Profile not found.");
    }

    const next = {
      ...state.profiles[id],
      ...updates,
      id
    };

    const error = validateProfile(next);
    if (error) {
      throw new Error(error);
    }

    state.profiles[id] = {
      ...next,
      name: next.name.trim(),
      host: (next.host || "").trim(),
      port: Number(next.port || 0),
      username: (next.username || "").trim(),
      password: (next.password || "").trim()
    };

    await saveState(state);
    return state;
  };

  const deleteProfile = async (id) => {
    const state = await getState();
    if (!state.profiles[id]) {
      return state;
    }

    delete state.profiles[id];
    state.rules = state.rules.filter((rule) => rule.profileId !== id);

    const removeOverride = (map) => {
      Object.keys(map).forEach((key) => {
        if (map[key] && map[key].profileId === id) {
          delete map[key];
        }
      });
    };

    removeOverride(state.tabOverrides);
    removeOverride(state.groupOverrides);

    await saveState(state);
    return state;
  };

  const addRule = async (rule) => {
    const state = await getState();
    const profiles = getProfilesWithBuiltin(state.profiles);
    const error = validateRule(rule, profiles);
    if (error) {
      throw new Error(error);
    }

    const id = rule.id || `r_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
    state.rules.push({
      id,
      pattern: rule.pattern.trim(),
      profileId: rule.profileId,
      enabled: rule.enabled !== false
    });

    await saveState(state);
    return state;
  };

  const updateRule = async (id, updates) => {
    const state = await getState();
    const index = state.rules.findIndex((rule) => rule.id === id);
    if (index === -1) {
      throw new Error("Rule not found.");
    }

    const next = {
      ...state.rules[index],
      ...updates,
      id
    };

    const profiles = getProfilesWithBuiltin(state.profiles);
    const error = validateRule(next, profiles);
    if (error) {
      throw new Error(error);
    }

    state.rules[index] = {
      ...next,
      pattern: next.pattern.trim(),
      enabled: next.enabled !== false
    };

    await saveState(state);
    return state;
  };

  const deleteRule = async (id) => {
    const state = await getState();
    state.rules = state.rules.filter((rule) => rule.id !== id);
    await saveState(state);
    return state;
  };

  const setTabOverride = async (tabId, override) => {
    const state = await getState();
    const key = String(tabId);
    if (!override) {
      delete state.tabOverrides[key];
    } else {
      state.tabOverrides[key] = override;
    }
    await saveState(state);
    return state;
  };

  const clearTabOverride = (tabId) => setTabOverride(tabId, null);

  const setGroupOverride = async (groupId, override) => {
    const state = await getState();
    const key = String(groupId);
    if (!override) {
      delete state.groupOverrides[key];
    } else {
      state.groupOverrides[key] = override;
    }
    await saveState(state);
    return state;
  };

  const clearGroupOverride = (groupId) => setGroupOverride(groupId, null);

  window.ProxyCatStorage = {
    SCHEMA_VERSION,
    BUILTIN_PROFILES,
    allowedSchemes,
    normalizeState,
    getState,
    saveState,
    validateProfile,
    validateRule,
    getProfilesWithBuiltin,
    addProfile,
    updateProfile,
    deleteProfile,
    addRule,
    updateRule,
    deleteRule,
    setTabOverride,
    clearTabOverride,
    setGroupOverride,
    clearGroupOverride
  };
})();
