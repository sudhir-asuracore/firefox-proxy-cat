(() => {
  const api = typeof browser !== "undefined" ? browser : chrome;
  const {
    ProxyCatStorage,
    ProxyCatMatcher
  } = window;

  const elements = {
    activeStatus: document.getElementById("activeStatus"),
    tabDomain: document.getElementById("tabDomain"),
    tabUrl: document.getElementById("tabUrl"),
    tabProfile: document.getElementById("tabProfile"),
    applyTab: document.getElementById("applyTab"),
    disableTab: document.getElementById("disableTab"),
    clearTab: document.getElementById("clearTab"),
    rulePattern: document.getElementById("rulePattern"),
    ruleProfile: document.getElementById("ruleProfile"),
    addRule: document.getElementById("addRule"),
    cancelRuleEdit: document.getElementById("cancelRuleEdit"),
    ruleHint: document.getElementById("ruleHint"),
    ruleList: document.getElementById("ruleList"),
    ruleCount: document.getElementById("ruleCount"),
    profileCount: document.getElementById("profileCount"),
    profileList: document.getElementById("profileList"),
    profileName: document.getElementById("profileName"),
    profileScheme: document.getElementById("profileScheme"),
    profileHost: document.getElementById("profileHost"),
    profilePort: document.getElementById("profilePort"),
    profileUsername: document.getElementById("profileUsername"),
    profilePassword: document.getElementById("profilePassword"),
    saveProfile: document.getElementById("saveProfile"),
    cancelProfileEdit: document.getElementById("cancelProfileEdit"),
    profileHint: document.getElementById("profileHint"),
    tabMainButton: document.getElementById("tabMainButton"),
    tabOptionsButton: document.getElementById("tabOptionsButton"),
    tabMainPanel: document.getElementById("tabMainPanel"),
    tabOptionsPanel: document.getElementById("tabOptionsPanel"),
    footerVersion: document.getElementById("footerVersion"),
    popupExportData: document.getElementById("popupExportData"),
    popupImportData: document.getElementById("popupImportData"),
    popupImportFile: document.getElementById("popupImportFile"),
    popupImportUrl: document.getElementById("popupImportUrl"),
    popupImportFromUrl: document.getElementById("popupImportFromUrl"),
    popupImportMode: document.getElementById("popupImportMode"),
    popupImportHint: document.getElementById("popupImportHint")
  };

  let currentTab = null;
  let editingProfileId = null;
  let editingRuleId = null;
  const COLLAPSE_KEY = "popupCollapsedState";
  const collapseStore = api.storage && api.storage.session ? api.storage.session : api.storage.local;

  const getCurrentTab = async () => {
    const tabs = await api.tabs.query({ active: true, currentWindow: true });
    return tabs[0] || null;
  };

  const fillProfiles = (select, profiles) => {
    select.innerHTML = "";
    Object.values(profiles).forEach((profile) => {
      const option = document.createElement("option");
      option.value = profile.id;
      option.textContent = profile.name;
      select.appendChild(option);
    });
  };

  const summarizeDecision = (decision, profiles, state) => {
    if (decision.type === "direct") {
      return "Direct";
    }

    const profile = profiles[decision.profileId];
    return profile ? profile.name : "Unknown";
  };

  const truncateMiddle = (value, maxLength) => {
    if (!value || value.length <= maxLength) {
      return value;
    }

    const ellipsis = "...";
    const remaining = Math.max(maxLength - ellipsis.length, 2);
    const head = Math.ceil(remaining / 2);
    const tail = Math.floor(remaining / 2);
    return `${value.slice(0, head)}${ellipsis}${value.slice(-tail)}`;
  };

  const renderRules = (state, profiles) => {
    const rules = state.rules.slice(0, 5);
    elements.ruleList.innerHTML = "";
    elements.ruleCount.textContent = String(state.rules.length);

    if (!rules.length) {
      const empty = document.createElement("li");
      empty.className = "rule-item";
      empty.textContent = "No rules yet.";
      elements.ruleList.appendChild(empty);
      return;
    }

    rules.forEach((rule) => {
      const item = document.createElement("li");
      item.className = "rule-item";
      const label = document.createElement("strong");
      label.textContent = rule.pattern;
      const meta = document.createElement("span");
      meta.textContent = profiles[rule.profileId]
        ? profiles[rule.profileId].name
        : "Missing profile";

      const actions = document.createElement("div");
      actions.className = "actions";

      const edit = document.createElement("button");
      edit.className = "btn ghost";
      edit.textContent = "Edit";
      edit.dataset.action = "edit";
      edit.dataset.id = rule.id;

      const remove = document.createElement("button");
      remove.className = "btn ghost";
      remove.textContent = "Delete";
      remove.dataset.action = "delete";
      remove.dataset.id = rule.id;

      actions.appendChild(edit);
      actions.appendChild(remove);

      item.appendChild(label);
      item.appendChild(meta);
      item.appendChild(actions);
      elements.ruleList.appendChild(item);
    });
  };

  const renderProfiles = (state) => {
    const profiles = Object.values(state.profiles);
    elements.profileCount.textContent = String(profiles.length);
    elements.profileList.innerHTML = "";

    if (!profiles.length) {
      const empty = document.createElement("li");
      empty.className = "rule-item";
      empty.textContent = "No profiles yet.";
      elements.profileList.appendChild(empty);
      return;
    }

    profiles.forEach((profile) => {
      const item = document.createElement("li");
      item.className = "rule-item";

      const label = document.createElement("strong");
      label.textContent = profile.name;

      const meta = document.createElement("span");
      meta.className = "truncate";
      meta.textContent = profile.scheme === "direct"
        ? "Direct"
        : `${profile.scheme}://${profile.host}:${profile.port}`;

      const actions = document.createElement("div");
      actions.className = "actions";

      const edit = document.createElement("button");
      edit.className = "btn ghost";
      edit.textContent = "Edit";
      edit.dataset.action = "edit";
      edit.dataset.id = profile.id;

      const remove = document.createElement("button");
      remove.className = "btn ghost";
      remove.textContent = "Delete";
      remove.dataset.action = "delete";
      remove.dataset.id = profile.id;

      actions.appendChild(edit);
      actions.appendChild(remove);

      item.appendChild(label);
      item.appendChild(meta);
      item.appendChild(actions);
      elements.profileList.appendChild(item);
    });
  };

  const resetProfileForm = () => {
    elements.profileName.value = "";
    elements.profileScheme.value = "http";
    elements.profileHost.value = "";
    elements.profilePort.value = "";
    elements.profileUsername.value = "";
    elements.profilePassword.value = "";
    editingProfileId = null;
    elements.saveProfile.textContent = "Save profile";
    elements.profileHint.textContent = "";
    updateProfileFields();
  };

  const resetRuleForm = () => {
    elements.rulePattern.value = "";
    elements.ruleProfile.value = "direct";
    elements.addRule.textContent = "Add rule";
    editingRuleId = null;
  };

  const updateProfileFields = () => {
    const isDirect = elements.profileScheme.value === "direct";
    elements.profileHost.disabled = isDirect;
    elements.profilePort.disabled = isDirect;
    elements.profileUsername.disabled = isDirect;
    elements.profilePassword.disabled = isDirect;
  };

  const refresh = async () => {
    const state = await ProxyCatStorage.getState();
    const profiles = ProxyCatStorage.getProfilesWithBuiltin(state.profiles);

    currentTab = await getCurrentTab();
    if (!currentTab) {
      return;
    }

    const urlObj = (() => {
      try {
        return new URL(currentTab.url);
      } catch (error) {
        return null;
      }
    })();

    elements.tabDomain.textContent = urlObj ? urlObj.hostname : "Unknown";
    elements.tabUrl.textContent = truncateMiddle(currentTab.url || "", 52);
    elements.tabUrl.title = currentTab.url || "";
    elements.rulePattern.value = urlObj ? urlObj.hostname : "";

    fillProfiles(elements.tabProfile, profiles);
    fillProfiles(elements.ruleProfile, profiles);

    const decision = ProxyCatMatcher.evaluateProxy({
      state,
      tabId: currentTab.id,
      url: currentTab.url
    });

    elements.activeStatus.textContent = summarizeDecision(decision, profiles, state);
    elements.tabProfile.value = decision.profileId || "direct";

    renderRules(state, profiles);
    renderProfiles(state);
    updateProfileFields();
  };

  const updateCollapsibleState = (card, isExpanded) => {
    card.classList.toggle("collapsed", !isExpanded);
    const title = card.querySelector(".card__title");
    if (title) {
      title.setAttribute("aria-expanded", isExpanded ? "true" : "false");
    }
  };

  const readCollapseState = async () => {
    try {
      const stored = await collapseStore.get(COLLAPSE_KEY);
      return stored && stored[COLLAPSE_KEY] ? stored[COLLAPSE_KEY] : {};
    } catch (error) {
      return {};
    }
  };

  const writeCollapseState = async (state) => {
    try {
      await collapseStore.set({ [COLLAPSE_KEY]: state });
    } catch (error) {
      // Ignore persistence failures.
    }
  };

  const setupCollapsibles = async () => {
    const savedState = await readCollapseState();
    document.querySelectorAll("[data-collapsible]").forEach((card) => {
      const title = card.querySelector(".card__title");
      if (!title) {
        return;
      }

      if (card.id && typeof savedState[card.id] === "boolean") {
        updateCollapsibleState(card, savedState[card.id]);
      }

      const toggle = () => {
        const expanded = !card.classList.contains("collapsed");
        updateCollapsibleState(card, !expanded);
        if (card.id) {
          savedState[card.id] = !expanded;
          writeCollapseState(savedState);
        }
      };

      title.addEventListener("click", toggle);
      title.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          toggle();
        }
      });
    });
  };

  const showRuleError = (message) => {
    elements.ruleHint.textContent = message;
    elements.ruleHint.style.color = "#b6451f";
    setTimeout(() => {
      elements.ruleHint.textContent = "Tip: Prefix with re: for regex.";
      elements.ruleHint.style.color = "";
    }, 2400);
  };

  const populateRuleForm = (rule) => {
    elements.rulePattern.value = rule.pattern || "";
    elements.ruleProfile.value = rule.profileId || "direct";
    elements.addRule.textContent = "Update rule";
  };

  const setPopupImportHint = (message, isError) => {
    elements.popupImportHint.textContent = message || "";
    elements.popupImportHint.style.color = isError ? "#b6451f" : "";
  };

  const setActiveTab = (tab) => {
    const showOptions = tab === "options";
    console.log(tab, showOptions);
    elements.tabMainPanel.hidden = showOptions;
    elements.tabOptionsPanel.hidden = !showOptions;
    elements.tabMainButton.classList.toggle("active", !showOptions);
    elements.tabOptionsButton.classList.toggle("active", showOptions);
  };

  const createId = (prefix, existing) => {
    let id = "";
    do {
      id = `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
    } while (existing[id] || (existing.has && existing.has(id)));
    return id;
  };

  const prepareProfiles = (rawProfiles, baseProfiles) => {
    const profiles = { ...baseProfiles };
    const idMap = {};
    const errors = [];
    let importedCount = 0;

    rawProfiles.forEach((profile, index) => {
      if (!profile || typeof profile !== "object") {
        errors.push(`Profile ${index + 1} is invalid.`);
        return;
      }

      const originalId = profile.id;
      if (originalId === "direct") {
        return;
      }

      const candidate = {
        id: originalId,
        name: profile.name,
        scheme: profile.scheme || "http",
        host: profile.host || "",
        port: profile.port || 0,
        username: profile.username || "",
        password: profile.password || ""
      };

      const validation = ProxyCatStorage.validateProfile(candidate);
      if (validation) {
        errors.push(`Profile ${candidate.name || index + 1}: ${validation}`);
        return;
      }

      let nextId = candidate.id;
      if (!nextId || profiles[nextId]) {
        nextId = createId("p", profiles);
      }

      if (originalId) {
        idMap[originalId] = nextId;
      }

      profiles[nextId] = {
        ...candidate,
        id: nextId,
        name: candidate.name.trim(),
        host: (candidate.host || "").trim(),
        port: Number(candidate.port || 0),
        username: (candidate.username || "").trim(),
        password: (candidate.password || "").trim()
      };
      importedCount += 1;
    });

    return {
      profiles,
      idMap,
      errors,
      importedCount
    };
  };

  const prepareRules = (rawRules, profiles, baseRules, idMap) => {
    const rules = baseRules.slice();
    const ruleIds = new Set(rules.map((rule) => rule.id));
    const availableProfiles = ProxyCatStorage.getProfilesWithBuiltin(profiles);
    const errors = [];
    let importedCount = 0;

    rawRules.forEach((rule, index) => {
      if (!rule || typeof rule !== "object") {
        errors.push(`Rule ${index + 1} is invalid.`);
        return;
      }

      let profileId = rule.profileId;
      if (idMap[profileId]) {
        profileId = idMap[profileId];
      }

      const candidate = {
        id: rule.id,
        pattern: rule.pattern,
        profileId,
        enabled: rule.enabled !== false
      };

      const validation = ProxyCatStorage.validateRule(candidate, availableProfiles);
      if (validation) {
        errors.push(`Rule ${index + 1}: ${validation}`);
        return;
      }

      let nextId = candidate.id;
      if (!nextId || ruleIds.has(nextId)) {
        nextId = createId("r", ruleIds);
      }

      ruleIds.add(nextId);
      rules.push({
        ...candidate,
        id: nextId,
        pattern: candidate.pattern.trim(),
        enabled: candidate.enabled !== false
      });
      importedCount += 1;
    });

    return {
      rules,
      errors,
      importedCount
    };
  };

  const exportData = async () => {
    const state = await ProxyCatStorage.getState();
    const payload = {
      schemaVersion: ProxyCatStorage.SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      profiles: Object.values(state.profiles),
      rules: state.rules
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateTag = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `proxycat-backup-${dateTag}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setPopupImportHint("Exported profiles and rules.");
  };

  const importPayload = async (payload) => {
    const rawProfiles = Array.isArray(payload.profiles) ? payload.profiles : [];
    const rawRules = Array.isArray(payload.rules) ? payload.rules : [];
    const mode = elements.popupImportMode.value;
    const state = await ProxyCatStorage.getState();

    const baseProfiles = mode === "merge" ? state.profiles : {};
    const baseRules = mode === "merge" ? state.rules : [];

    const preparedProfiles = prepareProfiles(rawProfiles, baseProfiles);
    const preparedRules = prepareRules(rawRules, preparedProfiles.profiles, baseRules, preparedProfiles.idMap);

    const errors = [...preparedProfiles.errors, ...preparedRules.errors];

    const nextState = {
      ...state,
      profiles: preparedProfiles.profiles,
      rules: preparedRules.rules
    };

    if (mode === "replace") {
      nextState.tabOverrides = {};
      nextState.groupOverrides = {};
    }

    await ProxyCatStorage.saveState(nextState);
    await refresh();

    const importMessage = `Imported ${preparedProfiles.importedCount} profiles and ${preparedRules.importedCount} rules.`;
    if (errors.length) {
      setPopupImportHint(`${importMessage} Skipped ${errors.length} item${errors.length === 1 ? "" : "s"}.`, true);
    } else {
      setPopupImportHint(importMessage);
    }
  };

  const importText = async (text) => {
    let payload = null;

    try {
      payload = JSON.parse(text);
    } catch (error) {
      setPopupImportHint("Import failed: invalid JSON.", true);
      return;
    }

    if (!payload || typeof payload !== "object") {
      setPopupImportHint("Import failed: unsupported file format.", true);
      return;
    }

    await importPayload(payload);
  };

  const importData = async (file) => {
    const text = await file.text();
    await importText(text);
  };

  const importFromUrl = async () => {
    const rawUrl = elements.popupImportUrl.value.trim();
    if (!rawUrl) {
      setPopupImportHint("Import failed: enter a URL.", true);
      return;
    }

    let parsedUrl = null;
    try {
      parsedUrl = new URL(rawUrl);
    } catch (error) {
      setPopupImportHint("Import failed: invalid URL.", true);
      return;
    }

    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      setPopupImportHint("Import failed: URL must be http or https.", true);
      return;
    }

    let response = null;
    try {
      response = await fetch(parsedUrl.toString(), { credentials: "omit" });
    } catch (error) {
      setPopupImportHint("Import failed: could not fetch URL.", true);
      return;
    }

    if (!response.ok) {
      setPopupImportHint(`Import failed: ${response.status} ${response.statusText}.`, true);
      return;
    }

    const text = await response.text();
    await importText(text);
  };

  elements.applyTab.addEventListener("click", async () => {
    if (!currentTab) {
      return;
    }
    const profileId = elements.tabProfile.value;
    await ProxyCatStorage.setTabOverride(currentTab.id, {
      type: "profile",
      profileId
    });
    await refresh();
  });

  elements.disableTab.addEventListener("click", async () => {
    if (!currentTab) {
      return;
    }
    await ProxyCatStorage.setTabOverride(currentTab.id, { type: "disabled" });
    await refresh();
  });

  elements.clearTab.addEventListener("click", async () => {
    if (!currentTab) {
      return;
    }
    await ProxyCatStorage.clearTabOverride(currentTab.id);
    await refresh();
  });

  elements.addRule.addEventListener("click", async () => {
    try {
      if (editingRuleId) {
        await ProxyCatStorage.updateRule(editingRuleId, {
          pattern: elements.rulePattern.value,
          profileId: elements.ruleProfile.value
        });
      } else {
        await ProxyCatStorage.addRule({
          pattern: elements.rulePattern.value,
          profileId: elements.ruleProfile.value,
          enabled: true
        });
      }
      resetRuleForm();
      await refresh();
    } catch (error) {
      showRuleError(error.message || "Could not add rule.");
    }
  });

  elements.cancelRuleEdit.addEventListener("click", () => {
    resetRuleForm();
  });

  elements.profileScheme.addEventListener("change", updateProfileFields);

  elements.saveProfile.addEventListener("click", async () => {
    try {
      const payload = {
        name: elements.profileName.value,
        scheme: elements.profileScheme.value,
        host: elements.profileHost.value,
        port: elements.profilePort.value,
        username: elements.profileUsername.value,
        password: elements.profilePassword.value
      };

      if (editingProfileId) {
        await ProxyCatStorage.updateProfile(editingProfileId, payload);
      } else {
        await ProxyCatStorage.addProfile(payload);
      }

      resetProfileForm();
      await refresh();
    } catch (error) {
      elements.profileHint.textContent = error.message || "Could not save profile.";
    }
  });

  elements.cancelProfileEdit.addEventListener("click", () => {
    resetProfileForm();
  });

  elements.profileList.addEventListener("click", async (event) => {
    const action = event.target.dataset.action;
    const id = event.target.dataset.id;
    if (!action || !id) {
      return;
    }

    if (action === "delete") {
      await ProxyCatStorage.deleteProfile(id);
      await refresh();
      return;
    }

    if (action === "edit") {
      const state = await ProxyCatStorage.getState();
      const profile = state.profiles[id];
      if (!profile) {
        return;
      }
      editingProfileId = id;
      elements.profileName.value = profile.name;
      elements.profileScheme.value = profile.scheme || "http";
      elements.profileHost.value = profile.host || "";
      elements.profilePort.value = profile.port || "";
      elements.profileUsername.value = profile.username || "";
      elements.profilePassword.value = profile.password || "";
      elements.saveProfile.textContent = "Update profile";
      elements.profileHint.textContent = "";
      updateProfileFields();
    }
  });

  elements.ruleList.addEventListener("click", async (event) => {
    const action = event.target.dataset.action;
    const id = event.target.dataset.id;
    if (!action || !id) {
      return;
    }

    const state = await ProxyCatStorage.getState();
    const rule = state.rules.find((item) => item.id === id);
    if (!rule) {
      return;
    }

    if (action === "delete") {
      await ProxyCatStorage.deleteRule(id);
      if (editingRuleId === id) {
        resetRuleForm();
      }
      await refresh();
      return;
    }

    if (action === "edit") {
      editingRuleId = id;
      populateRuleForm(rule);
    }
  });

  elements.tabMainButton.addEventListener("click", () => {
    setActiveTab("main");
  });

  elements.tabOptionsButton.addEventListener("click", () => {
    setActiveTab("options");
  });

  elements.popupExportData.addEventListener("click", () => {
    setPopupImportHint("");
    exportData().catch(() => {
      setPopupImportHint("Export failed.", true);
    });
  });

  elements.popupImportData.addEventListener("click", () => {
    setPopupImportHint("");
    elements.popupImportFile.click();
  });

  elements.popupImportFromUrl.addEventListener("click", () => {
    setPopupImportHint("");
    importFromUrl().catch(() => {
      setPopupImportHint("Import failed.", true);
    });
  });

  elements.popupImportFile.addEventListener("change", async (event) => {
    const file = event.target.files && event.target.files[0];
    elements.popupImportFile.value = "";
    if (!file) {
      return;
    }

    setPopupImportHint("");
    try {
      await importData(file);
    } catch (error) {
      setPopupImportHint("Import failed.", true);
    }
  });

  refresh().catch(() => {
    elements.activeStatus.textContent = "Unavailable";
  });
  setupCollapsibles();
  setActiveTab("main");

  if (elements.footerVersion && api.runtime && api.runtime.getManifest) {
    const manifest = api.runtime.getManifest();
    elements.footerVersion.textContent = `v${manifest.version}`;
  }
})();
