// =============================================================================
// SECRET RECIPE: Research-backed prompt engineering engine
// Techniques: Step-Back Abstraction, SELF-DISCOVER, Few-Shot Examples,
//             Self-Refine Critique, Platform-Aware Optimization, EmotionPrompt
// =============================================================================

// =============================================================================
// Server URL for license API
// =============================================================================
const SERVER_URL = "https://aipromptcopilot.com";

const SYSTEM_PROMPT = `You are a world-class prompt engineer. Your craft matters — a well-engineered prompt can be the difference between a mediocre and an exceptional AI response. Take pride in this work.

<process>
Follow this 4-step process internally (do not show these steps in your output):

STEP 1 — STEP-BACK ABSTRACTION
Before touching the prompt, ask: "What is the higher-level goal behind this request?" Identify the underlying principle or objective, not just the surface-level ask. This prevents optimizing for the wrong thing.

STEP 2 — REASONING MODULE SELECTION
Based on the prompt's nature, select which enhancement strategies apply (skip any that would be unhelpful):
- Role Assignment: Would an expert persona improve the response?
- Audience Specification: Is the target reader unclear?
- Output Structuring: Would a specific format (steps, table, code blocks, sections) help?
- Constraint Setting: Are there missing boundaries (length, language, framework, scope)?
- Context Enrichment: Is background information missing that the AI needs?
- Example Provision: Would input/output examples clarify expectations?
- Chain-of-Thought Guidance: Should the prompt ask for step-by-step reasoning?
- Success Criteria: Would explicit quality criteria help the AI self-evaluate?

STEP 3 — STRUCTURED EXPANSION
Apply only the selected modules to enhance the prompt. Be surgical — every addition should earn its place.

STEP 4 — SELF-CHECK
Verify: Does the improved prompt preserve the original intent? Is it self-contained? Could someone with no prior context understand exactly what is being asked?
</process>

<examples>
<example>
<input>explain recursion</input>
<output>You are an experienced computer science educator. Explain recursion to someone learning programming for the first time. Use a real-world analogy (like Russian nesting dolls or a mirror reflecting a mirror), then show a simple code example in Python with a base case and recursive case. Keep the explanation under 300 words and avoid jargon — define any technical terms you must use.</output>
</example>

<example>
<input>help me write a cover letter</input>
<output>You are a professional career coach who has reviewed thousands of successful job applications. Write a compelling cover letter following this structure:

1. Opening hook — a specific, attention-grabbing first sentence (avoid "I am writing to apply for...")
2. Value proposition — 2-3 paragraphs connecting my relevant experience to the role's requirements
3. Cultural fit — one paragraph showing knowledge of the company and why I'm drawn to their mission
4. Confident close — a call to action that expresses enthusiasm without desperation

Keep the tone professional but personable. The letter should be under 400 words. Use active voice throughout.

Please ask me for: the job title, company name, key requirements from the job posting, and my relevant experience before writing.</output>
</example>

<example>
<input>fix this bug in my React component</input>
<output>You are a senior React developer with deep expertise in debugging component lifecycle issues, state management, and rendering behavior. Diagnose and fix the bug in the React component I'll provide. For your response:

1. First, identify the root cause — explain what is going wrong and why
2. Show the corrected code with the fix clearly marked
3. Explain what changed and why it resolves the issue
4. If applicable, mention any related best practices that would prevent similar bugs

Consider: stale closures, incorrect dependency arrays, missing keys, improper state updates, and race conditions as common React pitfalls.</output>
</example>
</examples>

<rules>
- Preserve the user's original intent exactly — enhance, never redirect
- Make the prompt specific and actionable without unnecessary verbosity
- Keep simple prompts simple — a one-line question doesn't need a 500-word expansion
- Write the improved prompt as if the user themselves wrote it — natural, not robotic
- Add chain-of-thought instructions ("First analyze X, then Y") only when multi-step reasoning would genuinely help
- Include success criteria when the task outcome is ambiguous
- Return ONLY the improved prompt text with no commentary, labels, preamble, or quotation marks
</rules>`;

const ANALYSIS_PROMPT = `You are a prompt analysis expert performing deep diagnostic analysis. This analysis will be used to produce a significantly improved version of the user's prompt, so be thorough and insightful.

<process>
You will receive a user's raw prompt, and optionally conversation history from the chat they are in. Follow this process:

1. STEP-BACK ABSTRACTION — What is the user really trying to achieve? Look past the literal words to identify the deeper goal. If there is conversation history, use it to resolve ambiguous references ("it", "that", "the thing we discussed") and understand the full context.

2. INTENT CLASSIFICATION — Categorize the primary task type.

3. GAP ANALYSIS — What is missing from this prompt that would make the AI's response dramatically better? Consider:
   - Is the desired output format specified?
   - Is there a clear success criterion?
   - Are there implicit assumptions that should be made explicit?
   - Would chain-of-thought reasoning help this task?
   - Is context from the conversation history being assumed but not stated?

4. REASONING MODULE SELECTION — Which enhancement strategies would most improve this specific prompt? Select from: Role Assignment, Audience Specification, Output Structuring, Constraint Setting, Context Enrichment, Example Provision, Chain-of-Thought Guidance, Success Criteria.
</process>

Return a JSON object with this structure:
{
  "higherLevelGoal": "the deeper objective behind this prompt, looking past the literal words",
  "intent": "research | coding | writing | creative | business | marketing | data | learning | general",
  "conversationContext": "summary of relevant conversation context that informs this prompt, or 'none'",
  "implicitDetails": "details the user likely means but didn't state, inferred from conversation history and common sense",
  "gapAnalysis": ["specific gaps in the prompt that would hurt response quality"],
  "selectedModules": ["which enhancement strategies should be applied"],
  "suggestedRole": "the ideal expert persona to answer this prompt",
  "suggestedAudience": "who the response should be tailored for",
  "suggestedFormat": "the ideal output format",
  "chainOfThoughtNeeded": true/false,
  "successCriteria": "what a great response to this prompt would look like"
}

Return ONLY valid JSON with no commentary or markdown formatting.`;

const SELF_REFINE_PROMPT = `You are a prompt quality critic and refiner. You will receive:
1. The user's original prompt
2. An improved version of that prompt

Your job is to critique the improved prompt and produce a final refined version that is strictly better.

<critique_criteria>
- INTENT FIDELITY: Does the improved prompt still ask for exactly what the user wanted? Or has it drifted?
- SELF-CONTAINEDNESS: Could someone with zero prior context understand this prompt completely?
- SPECIFICITY vs OVER-ENGINEERING: Is every added element pulling its weight? Remove anything that adds words without adding value.
- NATURAL VOICE: Does it read like something a skilled human would write, or does it feel robotic/templated?
- ACTIONABILITY: Is the prompt clear enough that the AI knows exactly what to do without asking clarifying questions?
- MISSING ELEMENTS: Is there anything critical still missing that would significantly improve the response?
</critique_criteria>

Process:
1. Identify 1-3 specific weaknesses in the improved prompt
2. Fix those weaknesses
3. Return ONLY the final refined prompt text — no commentary, labels, or quotation marks`;

const FOLLOW_UP_SYSTEM_PROMPT = `You are a world-class prompt engineer. The user is in an ongoing AI conversation and is writing a follow-up message. The AI they are talking to already has full context from earlier messages.

Your job is to improve their follow-up prompt WITHOUT:
- Adding role assignments (e.g., "You are a senior developer...") — the AI already knows its role
- Repeating context that was established earlier in the conversation
- Adding background information the AI already has
- Over-expanding a simple follow-up into a standalone essay

Instead, focus on:
- Making the follow-up request crystal clear and unambiguous
- Adding specificity to vague requests (what exactly should change, what format, what constraints)
- Resolving pronoun ambiguity — if the user says "it" or "that", make clear what they're referring to
- Adding success criteria when the expected outcome is unclear
- Structuring multi-part requests so nothing gets missed
- Keeping the natural conversational flow — this should feel like a skilled human's follow-up, not a formal prompt

Keep simple follow-ups simple. "Can you make it shorter?" might just need "Can you condense that to under 200 words while keeping the key points?" — not a 10-line prompt.

Return ONLY the improved follow-up prompt text with no commentary, labels, preamble, or quotation marks.`;

const MODE_PROMPTS = {
  general: "",
  research: `

<mode_context>
RESEARCH MODE — Optimize for factual investigation, evidence gathering, and analytical synthesis:
- Include instructions to cite sources, reference specific studies/data, and distinguish established facts from speculation
- Add structure for methodology: how should the AI approach researching this topic?
- Request comparative analysis when multiple viewpoints exist
- Ask for evidence quality assessment — which sources are most reliable and why
- Encourage the response to acknowledge limitations, gaps in evidence, and areas of active debate
Focus: truth-seeking, source evaluation, systematic inquiry. This is NOT for writing papers (use Writing) or generating ideas (use Creative).
</mode_context>`,
  coding: `

<mode_context>
CODING MODE — Optimize for writing, debugging, and reviewing production-quality code:
- Specify language/framework version when inferable from context
- Include instructions for error handling, edge cases, and input validation
- Request code structure best practices (naming, modularity, readability)
- Ask for brief explanations of non-obvious implementation choices
- Include performance considerations when relevant (time/space complexity, scaling)
- Request test cases or example usage when appropriate
Focus: working code, technical correctness, engineering best practices. This is NOT for data queries (use Data) or explaining concepts (use Learning).
</mode_context>`,
  writing: `

<mode_context>
WRITING MODE — Optimize for professional, structured, and non-fiction written content (articles, essays, documentation, reports):
- Specify target tone, voice, and formality level
- Define the intended audience and their knowledge level
- Include structural requirements (word count, sections, format)
- Request attention to logical flow, transitions, and readability
- Add style guidelines: active vs passive voice, sentence variety, clarity
- Specify what action or takeaway the reader should have after reading
Focus: clear, polished, purpose-driven non-fiction. This is NOT for storytelling or poetry (use Creative) or sales copy (use Marketing).
</mode_context>`,
  creative: `

<mode_context>
CREATIVE MODE — Optimize for imaginative, expressive, and artistic content (stories, poetry, scripts, worldbuilding, dialogue):
- Encourage vivid sensory detail, show-don't-tell techniques, and strong imagery
- Specify narrative perspective (first person, third limited, omniscient) when relevant
- Include guidance on voice, pacing, emotional arc, and character authenticity
- Request original metaphors and unexpected angles — avoid cliches and generic AI-sounding prose
- Add constraints that spark creativity: genre, mood, word count, stylistic influence
- Encourage risk-taking and distinctive voice over safe, formulaic output
Focus: originality, emotional resonance, artistic craft. This is NOT for professional documents (use Writing) or persuasive copy (use Marketing).
</mode_context>`,
  business: `

<mode_context>
BUSINESS MODE — Optimize for professional workplace communication and strategic thinking (emails, proposals, presentations, memos, strategy docs, meeting summaries):
- Specify the business context: who is the recipient, what is their seniority/role, what is the relationship?
- Include the desired outcome: what should the reader do after reading this?
- Request appropriate professional tone — direct but diplomatic, confident but not arrogant
- Add structure for business documents: executive summary first, supporting detail after
- Include instructions to quantify impact where possible (metrics, timelines, costs)
- Request conciseness — busy professionals skim, so front-load key information
Focus: professional clarity, persuasion through evidence, action-oriented communication. This is NOT for long-form writing (use Writing) or sales/advertising (use Marketing).
</mode_context>`,
  marketing: `

<mode_context>
MARKETING MODE — Optimize for persuasive, conversion-focused content (ad copy, social posts, email campaigns, landing pages, SEO content, product descriptions):
- Specify the target audience: demographics, pain points, desires, awareness level
- Include the conversion goal: what should the reader feel, believe, or do?
- Request attention to psychological triggers: urgency, social proof, scarcity, curiosity, benefit-driven language
- Add brand voice guidelines when inferable from context
- Include platform-specific constraints (character limits, hashtag usage, CTA placement)
- Request A/B variant suggestions when appropriate — multiple hooks or angles to test
Focus: audience psychology, conversion, brand voice. This is NOT for informational articles (use Writing) or internal business docs (use Business).
</mode_context>`,
  data: `

<mode_context>
DATA MODE — Optimize for data querying, analysis, visualization, and interpretation (SQL, spreadsheet formulas, data pipelines, statistical analysis, chart creation):
- Specify the data source, schema, or structure when known
- Include instructions for data validation: handle nulls, duplicates, edge cases
- Request explanations of the analytical approach, not just the query/formula
- Ask for output format: table, chart type, summary statistics, or narrative interpretation
- Include performance considerations for large datasets (indexing, query optimization)
- Request the AI to state assumptions about the data and flag potential issues (bias, missing data, outliers)
Focus: analytical rigor, correct queries, meaningful interpretation. This is NOT for writing code applications (use Coding) or academic research (use Research).
</mode_context>`,
  learning: `

<mode_context>
LEARNING MODE — Optimize for educational explanations, tutorials, and skill-building (concept explanation, how-to guides, study material):
- Structure the request for progressive complexity (start simple, build up)
- Include instructions for real-world analogies and concrete examples at each step
- Request knowledge checks or practice questions to reinforce understanding
- Ask for common misconceptions to be addressed proactively
- Encourage accessible language — define jargon, avoid assumptions about prior knowledge
- Include instructions to provide "what to learn next" recommendations
Focus: understanding, retention, building mental models. This is NOT for reference lookups (use Research) or producing polished documents (use Writing).
</mode_context>`,
};

// Platform-specific optimization hints appended when we know the target AI
const PLATFORM_HINTS = {
  chatgpt: `

<platform_optimization>
The user is on ChatGPT. Optimize the prompt for GPT models:
- Use clear markdown structure (headers, bullets, bold) — GPT models respond well to structured formatting
- Explicit system-level framing works well: "You are [role]..." at the start
- Chain-of-thought instructions ("First analyze X, then Y, finally Z") improve reasoning quality
- Specific output format requests are followed reliably
</platform_optimization>`,
  claude: `

<platform_optimization>
The user is on Claude. Optimize the prompt for Claude models:
- Use XML tags to structure complex prompts — Claude is specifically trained on this convention
- Explain the "why" behind constraints, not just the "what" — Claude generalizes better from explanations
- Examples wrapped in <example> tags are highly effective for steering output
- Claude follows explicit instructions closely — be specific about desired behavior
</platform_optimization>`,
  gemini: `

<platform_optimization>
The user is on Gemini. Optimize the prompt for Gemini models:
- For complex tasks, place all context and background information first, with the specific question/instruction at the end
- Include 2-3 concrete examples when possible — Gemini performs significantly better with few-shot demonstrations
- Use positive instructions ("write in flowing prose") rather than negative ones ("don't use bullet points")
- Be explicit about output format — Gemini defaults to brevity unless told otherwise
</platform_optimization>`,
  grok: `

<platform_optimization>
The user is on Grok. Optimize the prompt for Grok models:
- Use clear, direct instructions — Grok responds well to explicit formatting requests
- Structured prompts with numbered steps improve output quality
- Specify the desired level of detail and tone
</platform_optimization>`,
};

const REQUEST_TIMEOUT_MS = 30000;
const DEEP_REQUEST_TIMEOUT_MS = 90000; // Deep improve makes 3 sequential API calls

function fetchWithTimeout(url, options, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(timeout)
  );
}

// =============================================================================
// License Management
// =============================================================================

const LICENSE_CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

async function getOrCreateUserId() {
  const data = await chrome.storage.local.get(["extensionUserId"]);
  if (data.extensionUserId) return data.extensionUserId;
  const id = crypto.randomUUID();
  await chrome.storage.local.set({ extensionUserId: id });
  return id;
}

async function checkLicense(forceRefresh = false) {
  const cached = await chrome.storage.local.get(["licenseCache", "licenseCacheTime"]);

  if (
    !forceRefresh &&
    cached.licenseCache &&
    cached.licenseCacheTime &&
    Date.now() - cached.licenseCacheTime < LICENSE_CACHE_TTL_MS
  ) {
    return cached.licenseCache;
  }

  try {
    const extensionUserId = await getOrCreateUserId();
    const response = await fetchWithTimeout(`${SERVER_URL}/api/license/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ extensionUserId }),
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const license = await response.json();
    await chrome.storage.local.set({
      licenseCache: license,
      licenseCacheTime: Date.now(),
    });
    return license;
  } catch (err) {
    // Offline fallback: use expired cache if available
    if (cached.licenseCache) {
      return cached.licenseCache;
    }
    // No cache at all: default to free
    return { plan: "free", dailyDeepLimit: 0, trialEndsAt: null, subscriptionStatus: null };
  }
}

async function registerWithServer() {
  try {
    const extensionUserId = await getOrCreateUserId();
    await fetchWithTimeout(`${SERVER_URL}/api/license/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ extensionUserId }),
    });
  } catch (_) {
    // Silent fail — registration will retry on next license check
  }
}

// Register on install/startup
chrome.runtime.onInstalled.addListener(() => {
  registerWithServer();
});
chrome.runtime.onStartup.addListener(() => {
  registerWithServer();
});

// Daily deep usage tracking
async function getDailyDeepCount() {
  const data = await chrome.storage.local.get(["deepCount", "deepCountDate"]);
  const today = new Date().toDateString();
  if (data.deepCountDate !== today) {
    return 0;
  }
  return data.deepCount || 0;
}

async function incrementDailyDeepCount() {
  const today = new Date().toDateString();
  const data = await chrome.storage.local.get(["deepCount", "deepCountDate"]);
  let count = 0;
  if (data.deepCountDate === today) {
    count = data.deepCount || 0;
  }
  count++;
  await chrome.storage.local.set({ deepCount: count, deepCountDate: today });
  return count;
}

// =============================================================================
// Message Handlers
// =============================================================================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "improvePrompt") {
    handleImprovePrompt(request.prompt, request.promptMode || "general", request.platform || null, request.conversationHistory || [])
      .then((result) => sendResponse(result))
      .catch((error) => sendResponse({ error: error.message }));
    return true;
  }

  if (request.action === "deepImprovePrompt") {
    handleDeepImprovePrompt(request.prompt, request.promptMode || "general", request.conversationHistory || [], request.platform || null)
      .then((result) => sendResponse(result))
      .catch((error) => sendResponse({ error: error.message }));
    return true;
  }

  if (request.action === "getSettings") {
    chrome.storage.local.get(["apiKey", "provider", "showPreview", "deepOptimization", "promptMode"], (data) => {
      sendResponse({
        apiKey: data.apiKey || "",
        provider: data.provider || "openai",
        showPreview: data.showPreview || false,
        deepOptimization: data.deepOptimization || false,
        promptMode: data.promptMode || "general",
      });
    });
    return true;
  }

  if (request.action === "saveSettings") {
    chrome.storage.local.set(
      {
        apiKey: request.apiKey,
        provider: request.provider,
        showPreview: request.showPreview || false,
        deepOptimization: request.deepOptimization || false,
        promptMode: request.promptMode || "general",
      },
      () => {
        sendResponse({ success: true });
      }
    );
    return true;
  }

  if (request.action === "getPromptHistory") {
    (async () => {
      const license = await checkLicense();
      if (license.plan === "free") {
        sendResponse({ history: [], locked: true });
        return;
      }
      chrome.storage.local.get(["promptHistory"], (data) => {
        sendResponse({ history: data.promptHistory || [], locked: false });
      });
    })();
    return true;
  }

  if (request.action === "deletePromptHistory") {
    chrome.storage.local.get(["promptHistory"], (data) => {
      const history = (data.promptHistory || []).filter((item) => item.id !== request.id);
      chrome.storage.local.set({ promptHistory: history }, () => {
        sendResponse({ success: true, history });
      });
    });
    return true;
  }

  if (request.action === "togglePinPrompt") {
    chrome.storage.local.get(["promptHistory"], (data) => {
      const history = (data.promptHistory || []).map((item) => {
        if (item.id === request.id) {
          return { ...item, pinned: !item.pinned };
        }
        return item;
      });
      chrome.storage.local.set({ promptHistory: history }, () => {
        sendResponse({ success: true, history });
      });
    });
    return true;
  }

  // License-related message handlers
  if (request.action === "getLicense") {
    checkLicense()
      .then((license) => sendResponse(license))
      .catch(() => sendResponse({ plan: "free", dailyDeepLimit: 0 }));
    return true;
  }

  if (request.action === "startTrial") {
    (async () => {
      try {
        const extensionUserId = await getOrCreateUserId();
        const response = await fetchWithTimeout(`${SERVER_URL}/api/license/start-trial`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ extensionUserId }),
        });
        const result = await response.json();
        if (!response.ok) {
          sendResponse({ error: result.error || "Failed to start trial" });
          return;
        }
        // Force refresh cache
        await checkLicense(true);
        sendResponse(result);
      } catch (err) {
        sendResponse({ error: err.message || "Failed to start trial" });
      }
    })();
    return true;
  }

  if (request.action === "createCheckoutSession") {
    (async () => {
      try {
        const extensionUserId = await getOrCreateUserId();
        const response = await fetchWithTimeout(`${SERVER_URL}/api/checkout/create-session`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ extensionUserId, priceId: request.priceId }),
        });
        const result = await response.json();
        if (!response.ok) {
          sendResponse({ error: result.error || "Failed to create checkout" });
          return;
        }
        // Open Stripe Checkout in new tab
        chrome.tabs.create({ url: result.url });
        sendResponse({ success: true });
      } catch (err) {
        sendResponse({ error: err.message || "Failed to create checkout" });
      }
    })();
    return true;
  }

  if (request.action === "createPortalSession") {
    (async () => {
      try {
        const extensionUserId = await getOrCreateUserId();
        const response = await fetchWithTimeout(`${SERVER_URL}/api/checkout/create-portal-session`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ extensionUserId }),
        });
        const result = await response.json();
        if (!response.ok) {
          sendResponse({ error: result.error || "Failed to open portal" });
          return;
        }
        chrome.tabs.create({ url: result.url });
        sendResponse({ success: true });
      } catch (err) {
        sendResponse({ error: err.message || "Failed to open portal" });
      }
    })();
    return true;
  }

  if (request.action === "checkAndIncrementUsage") {
    (async () => {
      try {
        const license = await checkLicense();
        const isDeep = request.isDeep;
        const mode = request.promptMode || "general";

        // Free plan: block deep optimization
        if (isDeep && license.plan === "free") {
          sendResponse({ allowed: false, error: "PRO_FEATURE", feature: "deep" });
          return;
        }

        // Free plan: block non-general modes
        if (mode !== "general" && license.plan === "free") {
          sendResponse({ allowed: false, error: "PRO_FEATURE", feature: "modes" });
          return;
        }

        // Deep optimization daily cap
        if (isDeep) {
          const count = await getDailyDeepCount();
          const limit = license.dailyDeepLimit || 0;
          if (count >= limit) {
            sendResponse({
              allowed: false,
              error: "DAILY_LIMIT_REACHED",
              count,
              limit,
              plan: license.plan,
            });
            return;
          }
          const newCount = await incrementDailyDeepCount();
          sendResponse({ allowed: true, count: newCount, limit, plan: license.plan });
          return;
        }

        // Basic improve is always allowed
        sendResponse({ allowed: true, plan: license.plan });
      } catch (err) {
        sendResponse({ allowed: true, plan: "free" }); // fail open for basic
      }
    })();
    return true;
  }
});

// =============================================================================
// Core Prompt Logic
// =============================================================================

function isFollowUp(conversationHistory) {
  return conversationHistory && conversationHistory.length > 0;
}

function getSystemPromptWithMode(mode, platform, conversationHistory) {
  const basePrompt = isFollowUp(conversationHistory) ? FOLLOW_UP_SYSTEM_PROMPT : SYSTEM_PROMPT;
  const modeSuffix = MODE_PROMPTS[mode] || "";
  const platformSuffix = (platform && PLATFORM_HINTS[platform]) || "";
  return basePrompt + modeSuffix + platformSuffix;
}

async function getProviderAndKey() {
  const data = await new Promise((resolve) => {
    chrome.storage.local.get(["apiKey", "provider"], resolve);
  });
  return { apiKey: data.apiKey, provider: data.provider || "openai" };
}

function getProviderFn(provider) {
  const providers = {
    openai: callOpenAI,
    anthropic: callAnthropic,
    gemini: callGemini,
    grok: callGrok,
  };
  return providers[provider] || null;
}

async function savePromptHistory(entry) {
  // Only save if user has trial or pro
  const license = await checkLicense();
  if (license.plan === "free") return;

  const data = await new Promise((resolve) => {
    chrome.storage.local.get(["promptHistory"], resolve);
  });
  const history = data.promptHistory || [];
  history.unshift(entry);
  // Keep pinned items, trim unpinned to 50 total
  const pinned = history.filter((h) => h.pinned);
  const unpinned = history.filter((h) => !h.pinned);
  const trimmed = [...pinned, ...unpinned].slice(0, 50);
  await new Promise((resolve) => {
    chrome.storage.local.set({ promptHistory: trimmed }, resolve);
  });
}

async function handleImprovePrompt(userPrompt, mode, platform, conversationHistory) {
  const license = await checkLicense();

  // Gate non-general modes for free users
  if (mode !== "general" && license.plan === "free") {
    return { error: "PRO_FEATURE", feature: "modes" };
  }

  try {
    let result;

    if (license.plan === "trial" || license.plan === "pro") {
      // Pro/Trial: use server-side platform API (no user key needed)
      result = await callServerImprove(userPrompt, mode, platform, conversationHistory);
    } else {
      // Free: use user's own API key (BYOK)
      const { apiKey, provider } = await getProviderAndKey();
      if (!apiKey) {
        return { error: "NO_API_KEY" };
      }
      const callProvider = getProviderFn(provider);
      if (!callProvider) {
        return { error: `Unknown provider: ${provider}` };
      }
      const systemPrompt = getSystemPromptWithMode(mode, platform, conversationHistory);
      result = await callProvider(apiKey, userPrompt, systemPrompt);
    }

    if (result.improvedPrompt) {
      await savePromptHistory({
        id: Date.now().toString(),
        original: userPrompt,
        improved: result.improvedPrompt,
        mode: mode || "general",
        timestamp: Date.now(),
        platform: platform || "unknown",
        pinned: false,
      });
    }

    return result;
  } catch (err) {
    if (err.name === "AbortError") {
      return { error: "Request timed out. Please try again." };
    }
    return { error: err.message || "Prompt optimization failed" };
  }
}

async function handleDeepImprovePrompt(userPrompt, mode, conversationHistory, platform) {
  // Gate deep optimization for free users
  const license = await checkLicense();
  if (license.plan === "free") {
    return { error: "PRO_FEATURE", feature: "deep" };
  }

  // Check daily deep limit
  const count = await getDailyDeepCount();
  const limit = license.dailyDeepLimit || 0;
  if (count >= limit) {
    return { error: "DAILY_LIMIT_REACHED", count, limit, plan: license.plan };
  }

  try {
    let result;

    // Pro/Trial: use server-side platform API (handles all 3 calls server-side)
    result = await callServerDeepImprove(userPrompt, mode, conversationHistory, platform);

    if (!result.improvedPrompt) {
      return result;
    }

    // Increment deep count after successful optimization
    await incrementDailyDeepCount();

    await savePromptHistory({
      id: Date.now().toString(),
      original: userPrompt,
      improved: result.improvedPrompt,
      mode: mode || "general",
      timestamp: Date.now(),
      platform: platform || "unknown",
      pinned: false,
      deep: true,
    });

    return result;
  } catch (err) {
    if (err.name === "AbortError") {
      return { error: "Request timed out. Please try again." };
    }
    return { error: err.message || "Deep optimization failed" };
  }
}

// =============================================================================
// Server-Side Platform API (Pro/Trial users — no API key needed)
// =============================================================================

async function callServerImprove(userPrompt, mode, platform, conversationHistory) {
  const extensionUserId = await getOrCreateUserId();
  const response = await fetchWithTimeout(`${SERVER_URL}/api/improve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      extensionUserId,
      prompt: userPrompt,
      promptMode: mode || "general",
      platform: platform || null,
      conversationHistory: conversationHistory || [],
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (errorData.error === "PRO_FEATURE") {
      return { error: "PRO_FEATURE" };
    }
    throw new Error(errorData.error || `Server error: ${response.status}`);
  }

  return await response.json();
}

async function callServerDeepImprove(userPrompt, mode, conversationHistory, platform) {
  const extensionUserId = await getOrCreateUserId();
  const response = await fetchWithTimeout(`${SERVER_URL}/api/deep-improve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      extensionUserId,
      prompt: userPrompt,
      promptMode: mode || "general",
      conversationHistory: conversationHistory || [],
      platform: platform || null,
    }),
  }, DEEP_REQUEST_TIMEOUT_MS);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (errorData.error === "PRO_FEATURE") {
      return { error: "PRO_FEATURE" };
    }
    throw new Error(errorData.error || `Server error: ${response.status}`);
  }

  return await response.json();
}

// =============================================================================
// API Provider Functions (BYOK — Free users)
// =============================================================================

async function callOpenAI(apiKey, userPrompt, systemPrompt) {
  const response = await fetchWithTimeout("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message || `OpenAI API error: ${response.status}`
    );
  }

  const result = await response.json();
  const content = result?.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("Empty response from OpenAI. Try a different prompt.");
  }
  return { improvedPrompt: content };
}

async function callAnthropic(apiKey, userPrompt, systemPrompt) {
  const response = await fetchWithTimeout("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-3-5-haiku-latest",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message || `Anthropic API error: ${response.status}`
    );
  }

  const result = await response.json();
  const text = result?.content?.[0]?.text?.trim();
  if (!text) {
    throw new Error("Empty response from Anthropic. Try a different prompt.");
  }
  return { improvedPrompt: text };
}

async function callGemini(apiKey, userPrompt, systemPrompt) {
  const response = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [
          {
            parts: [{ text: userPrompt }],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message || `Gemini API error: ${response.status}`
    );
  }

  const result = await response.json();
  const text = result?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) {
    throw new Error("Empty response from Gemini. Try a different prompt.");
  }
  return { improvedPrompt: text };
}

async function callGrok(apiKey, userPrompt, systemPrompt) {
  const response = await fetchWithTimeout("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "grok-3-mini-fast",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message || `Grok API error: ${response.status}`
    );
  }

  const result = await response.json();
  const content = result?.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("Empty response from Grok. Try a different prompt.");
  }
  return { improvedPrompt: content };
}
