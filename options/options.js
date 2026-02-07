(() => {
  const api = typeof browser !== "undefined" ? browser : chrome;
  const { ProxyCatStorage } = window;

  const elements = {
    profileList: document.getElementById("profileList"),
    profileCount: document.getElementById("profileCount"),
    profileForm: document.getElementById("profileForm"),
    profileName: document.getElementById("profileName"),
    profileScheme: document.getElementById("profileScheme"),
    profileHost: document.getElementById("profileHost"),
    profilePort: document.getElementById("profilePort"),
    profileUsername: document.getElementById("profileUsername"),
    profilePassword: document.getElementById("profilePassword"),
    saveProfile: document.getElementById("saveProfile"),
    cancelEdit: document.getElementById("cancelEdit"),
    profileHint: document.getElementById("profileHint"),
    ruleList: document.getElementById("ruleList"),
    ruleCount: document.getElementById("ruleCount"),
    ruleForm: document.getElementById("ruleForm"),
    rulePattern: document.getElementById("rulePatternInput"),
    ruleProfile: document.getElementById("ruleProfileSelect"),
    ruleEnabled: document.getElementById("ruleEnabled"),
    saveRule: document.getElementById("saveRule"),
    cancelRuleEdit: document.getElementById("cancelRuleEdit"),
    ruleHint: document.getElementById("ruleHint"),
    exportData: document.getElementById("exportData"),
    importData: document.getElementById("importData"),
    importFile: document.getElementById("importFile"),
    importMode: document.getElementById("importMode"),
    importHint: document.getElementById("importHint")
  };

  let editProfileId = null;
  let editRuleId = null;

  const clearHints = () => {
    elements.profileHint.textContent = "";
    elements.ruleHint.textContent = "";
    elements.importHint.textContent = "";
    elements.importHint.style.color = "";
  };

  const setProfileHint = (message) => {
    elements.profileHint.textContent = message || "";
  };

  const setRuleHint = (message) => {
    elements.ruleHint.textContent = message || "";
  };

  const setImportHint = (message, isError) => {
    elements.importHint.textContent = message || "";
    elements.importHint.style.color = isError ? "#b6451f" : "";
  };

  const updateProfileFields = () => {
    const scheme = elements.profileScheme.value;
    const isDirect = scheme === "direct";
    elements.profileHost.disabled = isDirect;
    elements.profilePort.disabled = isDirect;
    elements.profileUsername.disabled = isDirect;
    elements.profilePassword.disabled = isDirect;
  };

  const fillRuleProfiles = (profiles) => {
    elements.ruleProfile.innerHTML = "";
    Object.values(profiles).forEach((profile) => {
      const option = document.createElement("option");
      option.value = profile.id;
      option.textContent = profile.name;
      elements.ruleProfile.appendChild(option);
    });
  };

  const renderProfiles = (state) => {
    const profiles = Object.values(state.profiles);
    elements.profileCount.textContent = String(profiles.length);
    elements.profileList.innerHTML = "";

    if (!profiles.length) {
      const empty = document.createElement("div");
      empty.className = "row";
      empty.innerHTML = "<strong>No profiles yet.</strong><span>Add one below.</span>";
      elements.profileList.appendChild(empty);
      return;
    }

    profiles.forEach((profile) => {
      const row = document.createElement("div");
      row.className = "row";

      const info = document.createElement("div");
      const name = document.createElement("strong");
      name.textContent = profile.name;
      const meta = document.createElement("span");
      const hostInfo = profile.scheme === "direct"
        ? "Direct"
        : `${profile.scheme}://${profile.host}:${profile.port}`;
      meta.textContent = hostInfo;
      info.appendChild(name);
      info.appendChild(meta);

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

      row.appendChild(info);
      row.appendChild(actions);
      elements.profileList.appendChild(row);
    });
  };

  const renderRules = (state) => {
    const profiles = ProxyCatStorage.getProfilesWithBuiltin(state.profiles);
    elements.ruleCount.textContent = String(state.rules.length);
    elements.ruleList.innerHTML = "";

    if (!state.rules.length) {
      const empty = document.createElement("div");
      empty.className = "row rule-row";
      empty.innerHTML = "<strong>No rules yet.</strong><span>Add one below.</span>";
      elements.ruleList.appendChild(empty);
      return;
    }

    state.rules.forEach((rule) => {
      const row = document.createElement("div");
      row.className = "row rule-row";

      const info = document.createElement("div");
      const name = document.createElement("strong");
      name.textContent = rule.pattern;
      const meta = document.createElement("span");
      meta.textContent = profiles[rule.profileId]
        ? profiles[rule.profileId].name
        : "Missing profile";
      info.appendChild(name);
      info.appendChild(meta);

      const status = document.createElement("span");
      status.textContent = rule.enabled ? "Enabled" : "Disabled";

      const actions = document.createElement("div");
      actions.className = "actions";

      const edit = document.createElement("button");
      edit.className = "btn ghost";
      edit.textContent = "Edit";
      edit.dataset.action = "edit";
      edit.dataset.id = rule.id;

      const toggle = document.createElement("button");
      toggle.className = "btn ghost";
      toggle.textContent = rule.enabled ? "Disable" : "Enable";
      toggle.dataset.action = "toggle";
      toggle.dataset.id = rule.id;

      const remove = document.createElement("button");
      remove.className = "btn ghost";
      remove.textContent = "Delete";
      remove.dataset.action = "delete";
      remove.dataset.id = rule.id;

      actions.appendChild(edit);
      actions.appendChild(toggle);
      actions.appendChild(remove);

      row.appendChild(info);
      row.appendChild(status);
      row.appendChild(actions);
      elements.ruleList.appendChild(row);
    });
  };

  const resetProfileForm = () => {
    elements.profileForm.reset();
    editProfileId = null;
    elements.saveProfile.textContent = "Save profile";
    updateProfileFields();
  };

  const resetRuleForm = () => {
    elements.ruleForm.reset();
    editRuleId = null;
    elements.saveRule.textContent = "Add rule";
  };

  const populateProfileForm = (profile) => {
    elements.profileName.value = profile.name;
    elements.profileScheme.value = profile.scheme || "http";
    elements.profileHost.value = profile.host || "";
    elements.profilePort.value = profile.port || "";
    elements.profileUsername.value = profile.username || "";
    elements.profilePassword.value = profile.password || "";
    elements.saveProfile.textContent = "Update profile";
    updateProfileFields();
  };

  const populateRuleForm = (rule) => {
    elements.rulePattern.value = rule.pattern || "";
    elements.ruleProfile.value = rule.profileId || "direct";
    elements.ruleEnabled.checked = rule.enabled !== false;
    elements.saveRule.textContent = "Update rule";
  };

  const refresh = async () => {
    const state = await ProxyCatStorage.getState();
    const profiles = ProxyCatStorage.getProfilesWithBuiltin(state.profiles);
    renderProfiles(state);
    renderRules(state);
    fillRuleProfiles(profiles);
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
    setImportHint("Exported profiles and rules.");
  };

  const importData = async (file) => {
    const text = await file.text();
    let payload = null;

    try {
      payload = JSON.parse(text);
    } catch (error) {
      setImportHint("Import failed: invalid JSON file.", true);
      return;
    }

    if (!payload || typeof payload !== "object") {
      setImportHint("Import failed: unsupported file format.", true);
      return;
    }

    const rawProfiles = Array.isArray(payload.profiles) ? payload.profiles : [];
    const rawRules = Array.isArray(payload.rules) ? payload.rules : [];
    const mode = elements.importMode.value;
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
      setImportHint(`${importMessage} Skipped ${errors.length} item${errors.length === 1 ? "" : "s"}.`, true);
    } else {
      setImportHint(importMessage);
    }
  };

  elements.profileScheme.addEventListener("change", updateProfileFields);

  elements.profileForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearHints();

    const payload = {
      name: elements.profileName.value,
      scheme: elements.profileScheme.value,
      host: elements.profileHost.value,
      port: elements.profilePort.value,
      username: elements.profileUsername.value,
      password: elements.profilePassword.value
    };

    try {
      if (editProfileId) {
        await ProxyCatStorage.updateProfile(editProfileId, payload);
      } else {
        await ProxyCatStorage.addProfile(payload);
      }
      resetProfileForm();
      await refresh();
    } catch (error) {
      setProfileHint(error.message || "Could not save profile.");
    }
  });

  elements.cancelEdit.addEventListener("click", () => {
    resetProfileForm();
  });

  elements.cancelRuleEdit.addEventListener("click", () => {
    resetRuleForm();
  });

  elements.profileList.addEventListener("click", async (event) => {
    const action = event.target.dataset.action;
    const id = event.target.dataset.id;
    if (!action || !id) {
      return;
    }

    clearHints();

    if (action === "edit") {
      const state = await ProxyCatStorage.getState();
      const profile = state.profiles[id];
      if (!profile) {
        return;
      }
      editProfileId = id;
      populateProfileForm(profile);
      return;
    }

    if (action === "delete") {
      await ProxyCatStorage.deleteProfile(id);
      await refresh();
    }
  });

  elements.ruleForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearHints();

    try {
      const payload = {
        pattern: elements.rulePattern.value,
        profileId: elements.ruleProfile.value,
        enabled: elements.ruleEnabled.checked
      };
      if (editRuleId) {
        await ProxyCatStorage.updateRule(editRuleId, payload);
      } else {
        await ProxyCatStorage.addRule(payload);
      }
      resetRuleForm();
      await refresh();
    } catch (error) {
      setRuleHint(error.message || "Could not save rule.");
    }
  });

  elements.ruleList.addEventListener("click", async (event) => {
    const action = event.target.dataset.action;
    const id = event.target.dataset.id;
    if (!action || !id) {
      return;
    }

    clearHints();
    const state = await ProxyCatStorage.getState();
    const rule = state.rules.find((item) => item.id === id);
    if (!rule) {
      return;
    }

    if (action === "toggle") {
      await ProxyCatStorage.updateRule(id, { enabled: !rule.enabled });
      await refresh();
      return;
    }

    if (action === "edit") {
      editRuleId = id;
      populateRuleForm(rule);
      return;
    }

    if (action === "delete") {
      await ProxyCatStorage.deleteRule(id);
      if (editRuleId === id) {
        resetRuleForm();
      }
      await refresh();
    }
  });

  elements.exportData.addEventListener("click", () => {
    clearHints();
    exportData().catch(() => {
      setImportHint("Export failed.", true);
    });
  });

  elements.importData.addEventListener("click", () => {
    clearHints();
    elements.importFile.click();
  });

  elements.importFile.addEventListener("change", async (event) => {
    const file = event.target.files && event.target.files[0];
    elements.importFile.value = "";
    if (!file) {
      return;
    }

    clearHints();
    try {
      await importData(file);
    } catch (error) {
      setImportHint("Import failed.", true);
    }
  });

  refresh().catch(() => {
    setProfileHint("Failed to load settings.");
  });
})();
