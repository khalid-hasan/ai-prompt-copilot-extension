document.addEventListener("DOMContentLoaded", () => {
  const providerSelect = document.getElementById("provider");
  const apiKeyInput = document.getElementById("apiKey");
  const showPreviewCheckbox = document.getElementById("showPreview");
  const deepOptimizationCheckbox = document.getElementById("deepOptimization");
  const promptModeSelect = document.getElementById("promptMode");
  const saveBtn = document.getElementById("saveBtn");
  const statusEl = document.getElementById("status");

  // Plan UI elements
  const trialBanner = document.getElementById("trialBanner");
  const trialBannerText = document.getElementById("trialBannerText");
  const proBanner = document.getElementById("proBanner");
  const planText = document.getElementById("planText");
  const planActions = document.getElementById("planActions");
  const startTrialBtn = document.getElementById("startTrialBtn");
  const upgradeBtn = document.getElementById("upgradeBtn");
  const pricingToggle = document.getElementById("pricingToggle");
  const deepToggleRow = document.getElementById("deepToggleRow");
  const promptModeField = document.getElementById("promptModeField");
  const byokFields = document.getElementById("byokFields");
  const platformApiNotice = document.getElementById("platformApiNotice");

  // Stripe price IDs (configured in Stripe Dashboard)
  const PRICE_IDS = {
    monthly: "price_1T7cpPB3BoObwzKaBD76cIGq",
    annual: "price_1T7cpOB3BoObwzKahYsdNPbB",
  };

  let selectedBilling = "monthly";

  // Tab switching
  const tabBtns = document.querySelectorAll(".tab-btn");
  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabBtns.forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach((t) => t.classList.remove("active"));
      btn.classList.add("active");
      const tab = document.getElementById(`tab-${btn.dataset.tab}`);
      if (tab) tab.classList.add("active");

      if (btn.dataset.tab === "history") {
        loadHistory();
      }
    });
  });

  // Load settings
  chrome.runtime.sendMessage({ action: "getSettings" }, (response) => {
    if (response) {
      providerSelect.value = response.provider || "openai";
      apiKeyInput.value = response.apiKey || "";
      showPreviewCheckbox.checked = response.showPreview || false;
      deepOptimizationCheckbox.checked = response.deepOptimization || false;
      promptModeSelect.value = response.promptMode || "general";
    }
  });

  // Load license and update UI
  chrome.runtime.sendMessage({ action: "getLicense" }, (license) => {
    updateUIForPlan(license || { plan: "free" });
  });

  function updateUIForPlan(license) {
    const plan = license.plan || "free";

    // Hide all banners first
    trialBanner.classList.remove("visible");
    proBanner.classList.remove("visible");

    if (plan === "free") {
      planText.textContent = "Free Plan";
      startTrialBtn.style.display = "";
      upgradeBtn.style.display = "";
      upgradeBtn.textContent = "Upgrade to Pro";
      pricingToggle.classList.add("visible");

      // Lock deep optimization and modes
      deepToggleRow.classList.add("locked");
      deepOptimizationCheckbox.disabled = true;
      disableProModes(true);

      // Show BYOK fields, hide platform notice
      byokFields.style.display = "";
      platformApiNotice.style.display = "none";

      removeManagebtn();
    } else if (plan === "trial") {
      // Calculate days remaining
      const trialEndsAt = license.trialEndsAt ? new Date(license.trialEndsAt) : null;
      let daysLeft = 0;
      if (trialEndsAt) {
        daysLeft = Math.max(0, Math.ceil((trialEndsAt - Date.now()) / (1000 * 60 * 60 * 24)));
      }

      trialBanner.classList.add("visible");
      trialBannerText.textContent = `Trial: ${daysLeft} day${daysLeft !== 1 ? "s" : ""} remaining`;

      planText.textContent = `Trial - ${daysLeft} day${daysLeft !== 1 ? "s" : ""} left`;
      startTrialBtn.style.display = "none";
      upgradeBtn.style.display = "";
      upgradeBtn.textContent = "Upgrade to Keep Pro";
      pricingToggle.classList.add("visible");

      // Unlock everything
      deepToggleRow.classList.remove("locked");
      deepOptimizationCheckbox.disabled = false;
      disableProModes(false);

      // Hide BYOK fields, show platform notice
      byokFields.style.display = "none";
      platformApiNotice.style.display = "";

      removeManagebtn();
    } else if (plan === "pro") {
      proBanner.classList.add("visible");

      planText.textContent = "Pro Plan";
      startTrialBtn.style.display = "none";
      upgradeBtn.style.display = "none";
      pricingToggle.classList.remove("visible");

      // Unlock everything
      deepToggleRow.classList.remove("locked");
      deepOptimizationCheckbox.disabled = false;
      disableProModes(false);

      // Hide BYOK fields, show platform notice
      byokFields.style.display = "none";
      platformApiNotice.style.display = "";

      // Show manage subscription
      addManageBtn();
    }
  }

  function disableProModes(disabled) {
    const options = promptModeSelect.querySelectorAll("option");
    options.forEach((opt) => {
      if (opt.value !== "general") {
        opt.disabled = disabled;
      }
    });
    if (disabled && promptModeSelect.value !== "general") {
      promptModeSelect.value = "general";
    }
  }

  function addManageBtn() {
    removeManagebtn();
    const btn = document.createElement("button");
    btn.className = "plan-btn plan-btn-manage";
    btn.id = "manageSubBtn";
    btn.textContent = "Manage Subscription";
    btn.addEventListener("click", () => {
      chrome.runtime.sendMessage({ action: "createPortalSession" }, (response) => {
        if (response && response.error) {
          showStatus(response.error, "error");
        }
      });
    });
    planActions.appendChild(btn);
  }

  function removeManagebtn() {
    const existing = document.getElementById("manageSubBtn");
    if (existing) existing.remove();
  }

  // Pricing toggle
  pricingToggle.querySelectorAll(".pricing-option").forEach((btn) => {
    btn.addEventListener("click", () => {
      pricingToggle.querySelectorAll(".pricing-option").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      selectedBilling = btn.dataset.billing;
    });
  });

  // Start Trial
  startTrialBtn.addEventListener("click", () => {
    startTrialBtn.disabled = true;
    startTrialBtn.textContent = "Starting...";
    chrome.runtime.sendMessage({ action: "startTrial" }, (response) => {
      startTrialBtn.disabled = false;
      if (response && response.error) {
        startTrialBtn.textContent = "Start 7-Day Free Trial";
        showStatus(response.error, "error");
      } else {
        showStatus("Trial started! All Pro features unlocked for 7 days.", "success");
        // Refresh UI
        chrome.runtime.sendMessage({ action: "getLicense" }, (license) => {
          updateUIForPlan(license || { plan: "free" });
        });
      }
    });
  });

  // Upgrade to Pro
  upgradeBtn.addEventListener("click", () => {
    const priceId = selectedBilling === "annual" ? PRICE_IDS.annual : PRICE_IDS.monthly;
    upgradeBtn.disabled = true;
    upgradeBtn.textContent = "Opening checkout...";
    chrome.runtime.sendMessage({ action: "createCheckoutSession", priceId }, (response) => {
      upgradeBtn.disabled = false;
      upgradeBtn.textContent = "Upgrade to Pro";
      if (response && response.error) {
        showStatus(response.error, "error");
      }
    });
  });

  // Save settings
  saveBtn.addEventListener("click", () => {
    const provider = providerSelect.value;
    const apiKey = apiKeyInput.value.trim();

    // Only require API key for free users (BYOK fields visible)
    if (byokFields.style.display !== "none") {
      if (!apiKey) {
        showStatus("Please enter an API key.", "error");
        return;
      }
      const warning = validateKeyFormat(provider, apiKey);
      if (warning) {
        showStatus(warning, "error");
        return;
      }
    }

    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";

    chrome.runtime.sendMessage(
      {
        action: "saveSettings",
        provider: provider,
        apiKey: apiKey,
        showPreview: showPreviewCheckbox.checked,
        deepOptimization: deepOptimizationCheckbox.checked,
        promptMode: promptModeSelect.value,
      },
      (response) => {
        saveBtn.disabled = false;
        saveBtn.textContent = "Save Settings";

        if (response && response.success) {
          showStatus("Settings saved!", "success");
        } else {
          showStatus("Failed to save settings.", "error");
        }
      }
    );
  });

  // History
  function loadHistory() {
    chrome.runtime.sendMessage({ action: "getPromptHistory" }, (response) => {
      const container = document.getElementById("historyContainer");

      if (response && response.locked) {
        container.innerHTML = `
          <div class="history-locked">
            <span class="lock-icon-large">&#128274;</span>
            <p>History is a Pro feature</p>
            <p style="margin-top: 6px; font-size: 11px;">Start a free trial or upgrade to access prompt history</p>
          </div>`;
        return;
      }

      const history = (response && response.history) || [];

      if (history.length === 0) {
        container.innerHTML = '<div class="history-empty">No prompt history yet. Improve a prompt to get started!</div>';
        return;
      }

      container.innerHTML = '<div class="history-list"></div>';
      const list = container.querySelector(".history-list");

      history.forEach((item) => {
        const el = document.createElement("div");
        el.className = "history-item";

        const date = new Date(item.timestamp);
        const timeStr = date.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + " " + date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

        el.innerHTML = `
          <div class="history-item-header">
            <div class="history-item-meta">
              <span>${timeStr}</span>
              ${item.mode && item.mode !== "general" ? `<span class="history-item-mode">${escapeHtml(item.mode)}</span>` : ""}
              ${item.deep ? '<span class="history-item-mode">DEEP</span>' : ""}
            </div>
            <div class="history-item-actions">
              <button class="history-action-btn pin-btn ${item.pinned ? "pinned" : ""}" data-id="${item.id}" title="${item.pinned ? "Unpin" : "Pin"}">&#9733;</button>
              <button class="history-action-btn delete-btn" data-id="${item.id}" title="Delete">&#10005;</button>
            </div>
          </div>
          <div class="history-item-original">${escapeHtml(item.original)}</div>
          <div class="history-item-improved">${escapeHtml(item.improved)}</div>
        `;

        // Click to copy
        el.addEventListener("click", (e) => {
          if (e.target.closest(".history-action-btn")) return;
          navigator.clipboard.writeText(item.improved).then(() => {
            showStatus("Copied to clipboard!", "success");
          });
        });

        list.appendChild(el);
      });

      // Pin/delete handlers
      list.querySelectorAll(".pin-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          chrome.runtime.sendMessage({ action: "togglePinPrompt", id: btn.dataset.id }, () => {
            loadHistory();
          });
        });
      });

      list.querySelectorAll(".delete-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          chrome.runtime.sendMessage({ action: "deletePromptHistory", id: btn.dataset.id }, () => {
            loadHistory();
          });
        });
      });
    });
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.appendChild(document.createTextNode(str || ""));
    return div.innerHTML;
  }

  function validateKeyFormat(provider, key) {
    if (provider === "openai" && !key.startsWith("sk-")) {
      return 'OpenAI keys usually start with "sk-". Please check your key.';
    }
    if (provider === "anthropic" && !key.startsWith("sk-ant-")) {
      return 'Anthropic keys usually start with "sk-ant-". Please check your key.';
    }
    return null;
  }

  function showStatus(message, type) {
    statusEl.textContent = message;
    statusEl.className = `status status-${type}`;
    setTimeout(() => {
      statusEl.textContent = "";
      statusEl.className = "status";
    }, 3000);
  }
});
