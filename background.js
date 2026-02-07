(() => {
  const api = typeof browser !== "undefined" ? browser : chrome;
  const { ProxyCatStorage, ProxyCatMatcher } = window;

  let cachedState = null;

  const loadState = async () => {
    cachedState = await ProxyCatStorage.getState();
    return cachedState;
  };

  const getState = async () => {
    if (!cachedState) {
      await loadState();
    }
    return cachedState;
  };

  const mapProxyType = (scheme) => {
    if (scheme === "socks5") {
      return "socks";
    }
    if (scheme === "direct") {
      return "direct";
    }
    return scheme || "http";
  };

  const toProxyInfo = (profile) => {
    if (!profile || profile.scheme === "direct") {
      return { type: "direct" };
    }

    const type = mapProxyType(profile.scheme);
    const proxyInfo = {
      type,
      host: profile.host,
      port: Number(profile.port || 0),
      proxyDNS: type === "socks"
    };

    if (profile.username) {
      proxyInfo.username = profile.username;
    }

    if (profile.password) {
      proxyInfo.password = profile.password;
    }

    return proxyInfo;
  };

  const resolveProfile = (state, profileId) => {
    if (profileId === "direct") {
      return ProxyCatStorage.BUILTIN_PROFILES.direct;
    }
    return state.profiles[profileId];
  };

  const handleProxyRequest = async (details) => {
    const state = await getState();
    const tabId = details.tabId;
    let groupId = null;

    if (tabId >= 0) {
      try {
        const tab = await api.tabs.get(tabId);
        groupId = tab.groupId;
      } catch (error) {
        groupId = null;
      }
    }

    const decision = ProxyCatMatcher.evaluateProxy({
      state,
      tabId,
      groupId,
      url: details.url
    });

    if (decision.type === "direct") {
      return { type: "direct" };
    }

    const profile = resolveProfile(state, decision.profileId);
    return toProxyInfo(profile);
  };

  api.proxy.onRequest.addListener(
    handleProxyRequest,
    { urls: ["<all_urls>"] }
  );

  api.storage.onChanged.addListener(async (changes, areaName) => {
    if (areaName === "local") {
      await loadState();
      await rebuildMenus();
    }
  });

  api.runtime.onInstalled.addListener(async () => {
    await loadState();
    await rebuildMenus();
  });

  api.runtime.onStartup.addListener(async () => {
    if (api.storage && api.storage.session) {
      return;
    }
    try {
      await api.storage.local.remove("popupCollapsedState");
    } catch (error) {
      // Ignore cleanup failures.
    }
  });

  api.tabs.onRemoved.addListener(async (tabId) => {
    try {
      await ProxyCatStorage.clearTabOverride(tabId);
    } catch (error) {
      // Ignore cleanup failures.
    }
  });

  const MENU_IDS = {
    tabRoot: "proxycat-tab-root",
    groupRoot: "proxycat-group-root",
    tabDisable: "proxycat-tab-disable",
    tabClear: "proxycat-tab-clear",
    groupDisable: "proxycat-group-disable",
    groupClear: "proxycat-group-clear"
  };

  const rebuildMenus = async () => {
    const state = await getState();
    const profiles = ProxyCatStorage.getProfilesWithBuiltin(state.profiles);

    await api.contextMenus.removeAll();

    api.contextMenus.create({
      id: MENU_IDS.tabRoot,
      title: "Proxy Cat: Assign to tab",
      contexts: ["tab"]
    });

    api.contextMenus.create({
      id: MENU_IDS.groupRoot,
      title: "Proxy Cat: Assign to tab group",
      contexts: ["tab"]
    });

    Object.values(profiles).forEach((profile) => {
      if (profile.id === "direct") {
        return;
      }

      api.contextMenus.create({
        id: `proxycat-tab-profile-${profile.id}`,
        parentId: MENU_IDS.tabRoot,
        title: profile.name,
        contexts: ["tab"]
      });

      api.contextMenus.create({
        id: `proxycat-group-profile-${profile.id}`,
        parentId: MENU_IDS.groupRoot,
        title: profile.name,
        contexts: ["tab"]
      });
    });

    api.contextMenus.create({
      id: MENU_IDS.tabDisable,
      parentId: MENU_IDS.tabRoot,
      title: "Disable proxy",
      contexts: ["tab"]
    });

    api.contextMenus.create({
      id: MENU_IDS.tabClear,
      parentId: MENU_IDS.tabRoot,
      title: "Clear tab override",
      contexts: ["tab"]
    });

    api.contextMenus.create({
      id: MENU_IDS.groupDisable,
      parentId: MENU_IDS.groupRoot,
      title: "Disable proxy",
      contexts: ["tab"]
    });

    api.contextMenus.create({
      id: MENU_IDS.groupClear,
      parentId: MENU_IDS.groupRoot,
      title: "Clear group override",
      contexts: ["tab"]
    });
  };

  api.contextMenus.onClicked.addListener(async (info, tab) => {
    if (!tab) {
      return;
    }

    const tabId = tab.id;
    const groupId = tab.groupId;

    if (info.menuItemId === MENU_IDS.tabDisable) {
      await ProxyCatStorage.setTabOverride(tabId, { type: "disabled" });
      return;
    }

    if (info.menuItemId === MENU_IDS.tabClear) {
      await ProxyCatStorage.clearTabOverride(tabId);
      return;
    }

    if (info.menuItemId === MENU_IDS.groupDisable) {
      if (groupId === undefined || groupId === -1) {
        return;
      }
      await ProxyCatStorage.setGroupOverride(groupId, { type: "disabled" });
      return;
    }

    if (info.menuItemId === MENU_IDS.groupClear) {
      if (groupId === undefined || groupId === -1) {
        return;
      }
      await ProxyCatStorage.clearGroupOverride(groupId);
      return;
    }

    if (info.menuItemId.startsWith("proxycat-tab-profile-")) {
      const profileId = info.menuItemId.replace("proxycat-tab-profile-", "");
      await ProxyCatStorage.setTabOverride(tabId, { type: "profile", profileId });
      return;
    }

    if (info.menuItemId.startsWith("proxycat-group-profile-")) {
      if (groupId === undefined || groupId === -1) {
        return;
      }
      const profileId = info.menuItemId.replace("proxycat-group-profile-", "");
      await ProxyCatStorage.setGroupOverride(groupId, { type: "profile", profileId });
    }
  });

  loadState().then(rebuildMenus).catch(() => {});
})();
