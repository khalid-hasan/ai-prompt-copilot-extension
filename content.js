(function () {
  "use strict";

  const BUTTON_ID = "prompt-copilot-improve-btn";
  const CONTAINER_ID = "prompt-copilot-container";

  let currentPlatform = null;
  let isProcessing = false;
  const PROCESSING_TIMEOUT_MS = 90000; // 90s to accommodate 3-call deep optimization

  function detectPlatform() {
    const host = window.location.hostname;
    const path = window.location.pathname;

    if (host.includes("chat.openai.com") || host.includes("chatgpt.com")) {
      return "chatgpt";
    }
    if (host.includes("claude.ai")) {
      return "claude";
    }
    if (host.includes("gemini.google.com")) {
      return "gemini";
    }
    if (host.includes("grok.com")) {
      return "grok";
    }
    if (host.includes("x.com") && path.includes("/i/grok")) {
      return "grok";
    }
    return null;
  }

  function findChatInput() {
    if (currentPlatform === "chatgpt") {
      const proseMirror = document.querySelector(
        "#prompt-textarea, div[contenteditable='true'][id='prompt-textarea']"
      );
      if (proseMirror) return proseMirror;

      const contentEditable = document.querySelector(
        'form div[contenteditable="true"]'
      );
      if (contentEditable) return contentEditable;

      const textarea = document.querySelector("form textarea");
      if (textarea) return textarea;
    }

    if (currentPlatform === "claude") {
      const contentEditable = document.querySelector(
        'div[contenteditable="true"].ProseMirror'
      );
      if (contentEditable) return contentEditable;

      const fieldset = document.querySelector("fieldset");
      if (fieldset) {
        const ce = fieldset.querySelector('div[contenteditable="true"]');
        if (ce) return ce;
      }

      const allCE = document.querySelectorAll('div[contenteditable="true"]');
      for (const el of allCE) {
        if (el.closest("form") || el.closest("fieldset") || el.closest('[class*="composer"]')) {
          return el;
        }
      }
    }

    if (currentPlatform === "gemini") {
      const richTextarea = document.querySelector(
        '.ql-editor[contenteditable="true"]'
      );
      if (richTextarea) return richTextarea;

      const geminiInput = document.querySelector(
        'div[contenteditable="true"][role="textbox"]'
      );
      if (geminiInput) return geminiInput;

      const textareaEl = document.querySelector(
        '.text-input-field textarea, .input-area textarea'
      );
      if (textareaEl) return textareaEl;

      const allCE = document.querySelectorAll('div[contenteditable="true"]');
      for (const el of allCE) {
        if (
          el.getAttribute("role") === "textbox" ||
          el.closest('[class*="input"]') ||
          el.closest('[class*="prompt"]') ||
          el.closest('[class*="query"]')
        ) {
          return el;
        }
      }
    }

    if (currentPlatform === "grok") {
      const grokTextarea = document.querySelector(
        'textarea[placeholder], textarea[class*="chat"], textarea[class*="input"]'
      );
      if (grokTextarea) return grokTextarea;

      const grokCE = document.querySelector(
        'div[contenteditable="true"][role="textbox"]'
      );
      if (grokCE) return grokCE;

      const allTextareas = document.querySelectorAll("textarea");
      for (const el of allTextareas) {
        const parent = el.closest("form") || el.closest('[class*="chat"]') || el.closest('[class*="input"]');
        if (parent) return el;
      }

      const allCE = document.querySelectorAll('div[contenteditable="true"]');
      for (const el of allCE) {
        if (
          el.closest("form") ||
          el.closest('[class*="chat"]') ||
          el.closest('[class*="input"]') ||
          el.closest('[class*="composer"]')
        ) {
          return el;
        }
      }
    }

    const textarea = document.querySelector("textarea");
    if (textarea) return textarea;

    const contentEditable = document.querySelector(
      'div[contenteditable="true"]'
    );
    if (contentEditable) return contentEditable;

    return null;
  }

  function getPromptText(inputEl) {
    if (!inputEl) return "";

    if (
      inputEl.tagName === "TEXTAREA" ||
      inputEl.tagName === "INPUT"
    ) {
      return inputEl.value.trim();
    }

    return (inputEl.innerText || inputEl.textContent || "").trim();
  }

  function setPromptText(inputEl, text) {
    if (!inputEl) return;

    if (
      inputEl.tagName === "TEXTAREA" ||
      inputEl.tagName === "INPUT"
    ) {
      const nativeSet = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        "value"
      )?.set || Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value"
      )?.set;

      if (nativeSet) {
        nativeSet.call(inputEl, text);
      } else {
        inputEl.value = text;
      }

      inputEl.dispatchEvent(new Event("input", { bubbles: true }));
      inputEl.dispatchEvent(new Event("change", { bubbles: true }));
      return;
    }

    if (inputEl.getAttribute("contenteditable") === "true") {
      inputEl.focus();

      const paragraphs = text.split("\n").filter((line) => line.length > 0);
      const html = paragraphs
        .map((p) => `<p>${escapeHtml(p)}</p>`)
        .join("");
      inputEl.innerHTML = html || `<p>${escapeHtml(text)}</p>`;

      inputEl.dispatchEvent(new Event("input", { bubbles: true }));
      inputEl.dispatchEvent(new Event("change", { bubbles: true }));

      try {
        const range = document.createRange();
        const sel = window.getSelection();
        range.selectNodeContents(inputEl);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
      } catch (_) {
        // Selection positioning is non-critical; ignore failures
      }
    }
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  // ---------------------------------------------------------------------------
  // Conversation History Extraction (per-platform DOM scraping)
  // ---------------------------------------------------------------------------

  function extractConversationHistory() {
    try {
      if (currentPlatform === "chatgpt") return extractChatGPTHistory();
      if (currentPlatform === "claude") return extractClaudeHistory();
      if (currentPlatform === "gemini") return extractGeminiHistory();
      if (currentPlatform === "grok") return extractGrokHistory();
    } catch (_) {
      // Silently fail — context is a nice-to-have, not critical
    }
    return [];
  }

  function truncateText(text, maxLen) {
    if (!text) return "";
    text = text.trim();
    if (text.length <= maxLen) return text;
    return text.slice(0, maxLen) + "...";
  }

  // --- ChatGPT ---
  // Messages live in <article data-testid="conversation-turn-N"> elements.
  // Inside each, a <div data-message-author-role="user|assistant"> holds content.
  function extractChatGPTHistory() {
    const messages = [];
    const turns = document.querySelectorAll('article[data-testid^="conversation-turn-"]');

    for (const turn of turns) {
      const userDiv = turn.querySelector('div[data-message-author-role="user"]');
      const assistantDiv = turn.querySelector('div[data-message-author-role="assistant"]');

      if (userDiv) {
        const text = (userDiv.innerText || "").trim();
        if (text) messages.push({ role: "user", content: truncateText(text, 500) });
      }
      if (assistantDiv) {
        const text = (assistantDiv.innerText || "").trim();
        if (text) messages.push({ role: "assistant", content: truncateText(text, 800) });
      }
    }

    return limitHistory(messages);
  }

  // --- Claude ---
  // User messages: [data-testid="user-message"] or .font-user-message
  // Assistant messages: .font-claude-message or .font-claude-response
  // Turns are wrapped in div[data-test-render-count] containers.
  function extractClaudeHistory() {
    const messages = [];

    // Strategy: walk through the main conversation area and find message blocks.
    // Claude uses grid layout with col-start-2 for message content.
    const userMsgEls = document.querySelectorAll('[data-testid="user-message"]');
    const claudeMsgEls = document.querySelectorAll('.font-claude-message');

    // If dedicated selectors work, pair them in DOM order
    if (userMsgEls.length > 0 || claudeMsgEls.length > 0) {
      // Collect all message elements with their DOM position for ordering
      const allMsgs = [];

      userMsgEls.forEach((el) => {
        allMsgs.push({ role: "user", el });
      });
      claudeMsgEls.forEach((el) => {
        allMsgs.push({ role: "assistant", el });
      });

      // Sort by DOM position (compareDocumentPosition)
      allMsgs.sort((a, b) => {
        const pos = a.el.compareDocumentPosition(b.el);
        if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
        if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
        return 0;
      });

      for (const msg of allMsgs) {
        const text = (msg.el.innerText || "").trim();
        if (text) {
          messages.push({
            role: msg.role,
            content: truncateText(text, msg.role === "user" ? 500 : 800),
          });
        }
      }

      return limitHistory(messages);
    }

    // Fallback: try .font-claude-response for assistant
    const fallbackAssistant = document.querySelectorAll('.font-claude-response');
    if (fallbackAssistant.length > 0) {
      // We can't easily distinguish order without user messages, so just grab assistant context
      fallbackAssistant.forEach((el) => {
        const text = (el.innerText || "").trim();
        if (text) messages.push({ role: "assistant", content: truncateText(text, 800) });
      });
    }

    return limitHistory(messages);
  }

  // --- Gemini ---
  // Uses Angular custom elements: <user-query> and <model-response>.
  // User text: user-query .query-text
  // Assistant text: model-response .markdown
  function extractGeminiHistory() {
    const messages = [];
    const containers = document.querySelectorAll('#chat-history .conversation-container');

    if (containers.length > 0) {
      for (const container of containers) {
        const userQuery = container.querySelector('user-query');
        const modelResponse = container.querySelector('model-response');

        if (userQuery) {
          const textEl = userQuery.querySelector('.query-text') || userQuery.querySelector('div.query-content');
          const text = textEl ? (textEl.innerText || "").trim() : "";
          if (text) messages.push({ role: "user", content: truncateText(text, 500) });
        }
        if (modelResponse) {
          const textEl = modelResponse.querySelector('.markdown') || modelResponse.querySelector('message-content');
          const text = textEl ? (textEl.innerText || "").trim() : "";
          if (text) messages.push({ role: "assistant", content: truncateText(text, 800) });
        }
      }

      return limitHistory(messages);
    }

    // Fallback: query custom elements directly (no container wrapper)
    const userQueries = document.querySelectorAll('user-query');
    const modelResponses = document.querySelectorAll('model-response');

    const allMsgs = [];
    userQueries.forEach((el) => allMsgs.push({ role: "user", el }));
    modelResponses.forEach((el) => allMsgs.push({ role: "assistant", el }));

    allMsgs.sort((a, b) => {
      const pos = a.el.compareDocumentPosition(b.el);
      if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
      if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
      return 0;
    });

    for (const msg of allMsgs) {
      let text = "";
      if (msg.role === "user") {
        const textEl = msg.el.querySelector('.query-text') || msg.el;
        text = (textEl.innerText || "").trim();
      } else {
        const textEl = msg.el.querySelector('.markdown') || msg.el;
        text = (textEl.innerText || "").trim();
      }
      if (text) {
        messages.push({
          role: msg.role,
          content: truncateText(text, msg.role === "user" ? 500 : 800),
        });
      }
    }

    return limitHistory(messages);
  }

  // --- Grok ---
  // Uses Tailwind classes. Key semantic classes:
  // .message-row.items-end = user message (right-aligned)
  // .message-row.items-start = assistant message (left-aligned)
  // .message-bubble = content wrapper
  // Fallback: detect via [class*="bg-surface-l1"] for assistant messages
  function extractGrokHistory() {
    const messages = [];

    // Primary: .message-row alignment detection
    const messageRows = document.querySelectorAll('.message-row');
    if (messageRows.length > 0) {
      for (const row of messageRows) {
        const bubble = row.querySelector('.message-bubble');
        const text = bubble ? (bubble.innerText || "").trim() : (row.innerText || "").trim();
        if (!text) continue;

        const isUser = row.classList.contains('items-end');
        const isAssistant = row.classList.contains('items-start');

        if (isUser) {
          messages.push({ role: "user", content: truncateText(text, 500) });
        } else if (isAssistant) {
          messages.push({ role: "assistant", content: truncateText(text, 800) });
        }
      }

      return limitHistory(messages);
    }

    // Fallback: find .message-bubble elements, detect role by bg-surface-l1
    const bubbles = document.querySelectorAll('.message-bubble');
    for (const bubble of bubbles) {
      const text = (bubble.innerText || "").trim();
      if (!text) continue;

      // Check if this bubble or a parent has the assistant background class
      const isAssistant = bubble.closest('[class*="bg-surface-l1"]') !== null;
      messages.push({
        role: isAssistant ? "assistant" : "user",
        content: truncateText(text, isAssistant ? 800 : 500),
      });
    }

    if (messages.length > 0) return limitHistory(messages);

    // Last resort: look for response-content-markdown for assistant blocks
    const markdownBlocks = document.querySelectorAll('.response-content-markdown');
    for (const block of markdownBlocks) {
      const text = (block.innerText || "").trim();
      if (text) messages.push({ role: "assistant", content: truncateText(text, 800) });
    }

    return limitHistory(messages);
  }

  // Keep only the last N messages to avoid exceeding token limits.
  // Prioritize recent context — last 10 messages (~5 turns).
  function limitHistory(messages) {
    const MAX_MESSAGES = 10;
    if (messages.length <= MAX_MESSAGES) return messages;
    return messages.slice(-MAX_MESSAGES);
  }

  function createButton() {
    if (document.getElementById(BUTTON_ID)) return null;

    const container = document.createElement("div");
    container.id = CONTAINER_ID;

    const btn = document.createElement("button");
    btn.id = BUTTON_ID;
    btn.type = "button";
    btn.innerHTML = `
      <span class="prompt-copilot-icon">&#10024;</span>
      <span class="prompt-copilot-label">Improve Prompt</span>
      <span class="prompt-copilot-spinner" style="display:none;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-dasharray="31.4 31.4" stroke-dashoffset="0">
            <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite"/>
          </circle>
        </svg>
      </span>
    `;

    btn.addEventListener("click", handleImproveClick);
    container.appendChild(btn);
    return container;
  }

  function setButtonLoading(loading, customText) {
    const btn = document.getElementById(BUTTON_ID);
    if (!btn) return;

    const label = btn.querySelector(".prompt-copilot-label");
    const spinner = btn.querySelector(".prompt-copilot-spinner");
    const icon = btn.querySelector(".prompt-copilot-icon");

    if (loading) {
      label.textContent = customText || "Improving...";
      spinner.style.display = "inline-flex";
      icon.style.display = "none";
      btn.disabled = true;
      btn.classList.add("prompt-copilot-loading");
    } else {
      label.textContent = "Improve Prompt";
      spinner.style.display = "none";
      icon.style.display = "inline";
      btn.disabled = false;
      btn.classList.remove("prompt-copilot-loading");
    }
  }

  function showToast(message, type) {
    const existing = document.querySelector(".prompt-copilot-toast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.className = `prompt-copilot-toast prompt-copilot-toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add("prompt-copilot-toast-visible");
    });

    setTimeout(() => {
      toast.classList.remove("prompt-copilot-toast-visible");
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  async function checkUsageBeforeImprove(isDeep, promptMode) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { action: "checkAndIncrementUsage", isDeep, promptMode },
        (response) => resolve(response || { allowed: true })
      );
    });
  }

  function showPreviewOverlay(originalText, improvedText, inputEl, usageMsg) {
    const backdrop = document.createElement("div");
    backdrop.className = "prompt-copilot-preview-backdrop";

    const panel = document.createElement("div");
    panel.className = "prompt-copilot-preview-panel";

    panel.innerHTML = `
      <div class="prompt-copilot-preview-header">
        <span class="prompt-copilot-preview-icon">&#10024;</span>
        <span>Prompt Preview</span>
      </div>
      <div class="prompt-copilot-preview-section">
        <div class="prompt-copilot-preview-label">Original</div>
        <div class="prompt-copilot-preview-text">${escapeHtml(originalText)}</div>
      </div>
      <div class="prompt-copilot-preview-section">
        <div class="prompt-copilot-preview-label prompt-copilot-preview-label-improved">Improved</div>
        <div class="prompt-copilot-preview-text prompt-copilot-preview-text-improved">${escapeHtml(improvedText)}</div>
      </div>
      <div class="prompt-copilot-preview-actions">
        <button class="prompt-copilot-preview-btn prompt-copilot-preview-cancel">Cancel</button>
        <button class="prompt-copilot-preview-btn prompt-copilot-preview-edit">Edit</button>
        <button class="prompt-copilot-preview-btn prompt-copilot-preview-apply">Apply</button>
      </div>
    `;

    backdrop.appendChild(panel);
    document.body.appendChild(backdrop);

    requestAnimationFrame(() => {
      backdrop.classList.add("prompt-copilot-preview-visible");
    });

    function close() {
      backdrop.classList.remove("prompt-copilot-preview-visible");
      setTimeout(() => backdrop.remove(), 200);
    }

    panel.querySelector(".prompt-copilot-preview-cancel").addEventListener("click", close);

    const editBtn = panel.querySelector(".prompt-copilot-preview-edit");
    const improvedTextEl = panel.querySelector(".prompt-copilot-preview-text-improved");
    let isEditing = false;

    editBtn.addEventListener("click", () => {
      if (!isEditing) {
        isEditing = true;
        improvedTextEl.setAttribute("contenteditable", "true");
        improvedTextEl.classList.add("prompt-copilot-preview-text-editing");
        improvedTextEl.focus();
        editBtn.textContent = "Done Editing";
      } else {
        isEditing = false;
        improvedTextEl.setAttribute("contenteditable", "false");
        improvedTextEl.classList.remove("prompt-copilot-preview-text-editing");
        editBtn.textContent = "Edit";
      }
    });

    panel.querySelector(".prompt-copilot-preview-apply").addEventListener("click", () => {
      const finalText = (improvedTextEl.innerText || improvedTextEl.textContent || "").trim();
      setPromptText(inputEl, finalText);
      close();
      showToast(`Prompt improved! ${usageMsg || ""}`, "success");
    });

    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) close();
    });

    document.addEventListener("keydown", function onEsc(e) {
      if (e.key === "Escape") {
        close();
        document.removeEventListener("keydown", onEsc);
      }
    });
  }

  async function handleImproveClick(e) {
    e.preventDefault();
    e.stopPropagation();

    if (isProcessing) return;

    const inputEl = findChatInput();
    if (!inputEl) {
      showToast("Could not find the chat input field.", "error");
      return;
    }

    const promptText = getPromptText(inputEl);
    if (!promptText) {
      showToast("Please type a prompt first.", "error");
      return;
    }

    isProcessing = true;

    const settings = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: "getSettings" }, resolve);
    });

    const isDeep = settings && settings.deepOptimization;
    const promptMode = (settings && settings.promptMode) || "general";

    // Check license/usage before proceeding
    const usageCheck = await checkUsageBeforeImprove(isDeep, promptMode);
    if (!usageCheck.allowed) {
      isProcessing = false;
      if (usageCheck.error === "PRO_FEATURE") {
        const featureName = usageCheck.feature === "deep" ? "Deep Optimization" : "Prompt Modes";
        showToast(`${featureName} is a Pro feature. Start a free trial or upgrade!`, "error");
      } else if (usageCheck.error === "DAILY_LIMIT_REACHED") {
        showToast(`Daily deep limit reached (${usageCheck.count}/${usageCheck.limit}). Upgrade to Pro for 30/day!`, "error");
      }
      return;
    }

    setButtonLoading(true, isDeep ? "Deep Analyzing..." : null);

    const safetyTimeout = setTimeout(() => {
      isProcessing = false;
      setButtonLoading(false);
      showToast("Request timed out. Please try again.", "error");
    }, PROCESSING_TIMEOUT_MS);

    try {
      // Extract conversation context for follow-up detection and deep optimization
      const conversationHistory = extractConversationHistory();

      const response = await chrome.runtime.sendMessage({
        action: isDeep ? "deepImprovePrompt" : "improvePrompt",
        prompt: promptText,
        promptMode: promptMode,
        conversationHistory: conversationHistory,
        platform: currentPlatform,
      });

      if (response.error) {
        if (response.error === "NO_API_KEY") {
          showToast(
            "Please add an API key in extension settings (click the extension icon).",
            "error"
          );
        } else if (response.error === "PRO_FEATURE") {
          const featureName = response.feature === "deep" ? "Deep Optimization" : "Prompt Modes";
          showToast(`${featureName} is a Pro feature. Start a free trial or upgrade!`, "error");
        } else if (response.error === "DAILY_LIMIT_REACHED") {
          showToast(`Daily deep limit reached (${response.count}/${response.limit}). Upgrade to Pro for 30/day!`, "error");
        } else {
          showToast(response.error, "error");
        }
        return;
      }

      if (response.improvedPrompt) {
        const usageMsg = usageCheck.plan === "trial"
          ? `(${usageCheck.count || 0}/${usageCheck.limit || 10} deep today)`
          : usageCheck.plan === "pro"
            ? `(${usageCheck.count || 0}/${usageCheck.limit || 30} deep today)`
            : "";

        if (settings && settings.showPreview) {
          showPreviewOverlay(promptText, response.improvedPrompt, inputEl, usageMsg);
        } else {
          setPromptText(inputEl, response.improvedPrompt);
          showToast(`Prompt improved! ${usageMsg}`, "success");
        }
      }
    } catch (err) {
      showToast("Prompt optimization failed. Please try again.", "error");
    } finally {
      clearTimeout(safetyTimeout);
      isProcessing = false;
      setButtonLoading(false);
    }
  }

  function injectButton() {
    if (document.getElementById(BUTTON_ID)) return;

    const inputEl = findChatInput();
    if (!inputEl) return;

    const container = createButton();
    if (!container) return;

    const form =
      inputEl.closest("form") ||
      inputEl.closest("fieldset") ||
      inputEl.closest('[class*="input-area"]') ||
      inputEl.closest('[class*="composer"]') ||
      inputEl.closest('[class*="chat-input"]') ||
      inputEl.parentElement;
    if (!form) return;

    form.style.position = form.style.position || "relative";
    form.appendChild(container);
  }

  function init() {
    currentPlatform = detectPlatform();
    if (!currentPlatform) return;

    injectButton();

    const observer = new MutationObserver(() => {
      if (!document.getElementById(BUTTON_ID)) {
        injectButton();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
