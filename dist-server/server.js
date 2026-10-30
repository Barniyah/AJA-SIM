// server.ts
import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
dotenv.config();
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var app = express();
var PORT = Number(process.env.PORT) || 3e3;
app.use(express.json({ limit: "1mb" }));
var RULES_MODEL = "typesafe/jev-1.13";
var CLASSIFIER_MODEL = process.env.AI_CLASSIFIER_MODEL || "qwen/qwen-2.5-72b-instruct";
var REASONER_MODEL = process.env.AI_REASONER_MODEL || "qwen/qwen-2.5-72b-instruct";
function getOpenRouterKey() {
  const key = (process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KE || "").trim();
  if (!key || key === "MY_OPENROUTER_KEY") {
    return "";
  }
  return key;
}
app.get("/api/sim/capabilities", (_req, res) => {
  const openRouterKey = getOpenRouterKey();
  const isLiveAvailable = Boolean(openRouterKey);
  res.json({
    dataMode: "medplum-mock-client",
    rulesEngine: "typesafe-jev",
    rulesEngineModel: RULES_MODEL,
    classifierModel: CLASSIFIER_MODEL,
    reasonerModel: REASONER_MODEL,
    provider: "OpenRouter Exclusively (Zero Google API Usage)",
    isLiveAvailable,
    hasOpenRouterKey: isLiveAvailable,
    hasGeminiKey: false,
    // Explicitly disabled to protect Google quota
    systemNoticeAr: isLiveAvailable ? "\u0627\u0644\u0648\u0636\u0639 \u0627\u0644\u062D\u064A \u064A\u0639\u0645\u0644 \u0628\u0646\u0633\u0628\u0629 100% \u0639\u0628\u0631 OpenRouter (\u0645\u062D\u0631\u0643 \u0627\u0644\u0642\u0648\u0627\u0639\u062F: typesafe/jev-1.13\u060C \u0648\u0627\u0644\u0627\u0633\u062A\u062F\u0644\u0627\u0644: Qwen 2.5 72B). \u062A\u0645 \u062A\u0639\u0637\u064A\u0644 \u0623\u064A \u0627\u0633\u062A\u0647\u0644\u0627\u0643 \u0644\u062E\u062F\u0645\u0627\u062A Google \u0646\u0647\u0627\u0626\u064A\u0627\u064B." : "\u0627\u0644\u0648\u0636\u0639 \u0627\u0644\u062B\u0627\u0628\u062A (\u0645\u062D\u0627\u0643\u0627\u0629) \u0646\u0634\u0637 \u0627\u0641\u062A\u0631\u0627\u0636\u064A\u0627\u064B \u062F\u0648\u0646 \u0627\u0644\u062D\u0627\u062C\u0629 \u0644\u0623\u064A \u0645\u0641\u0627\u062A\u064A\u062D \u0628\u0631\u0645\u062C\u064A\u0629 \u062E\u0627\u0631\u062C\u064A\u0629."
  });
});
async function callOpenRouterDecisions(apiKey, payload) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45e3);
  try {
    const response = await fetch("https://openrouter.ai/api/alpha/decisions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": process.env.APP_URL || "https://aja-sim.sa",
        "X-Title": "AJA RCM Simulator"
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenRouter Decisions error (${response.status}): ${errText.slice(0, 200)}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}
async function callOpenRouterChat(apiKey, model, systemPrompt, userPrompt) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45e3);
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": process.env.APP_URL || "https://aja-sim.sa",
        "X-Title": "AJA RCM Simulator"
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.1,
        max_tokens: 1500,
        response_format: { type: "json_object" }
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenRouter Chat error (${response.status}): ${errText.slice(0, 200)}`);
    }
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);
    return {
      result: parsed,
      usage: data.usage,
      costUsd: data.usage?.total_cost || "\u063A\u064A\u0631 \u0645\u062A\u0627\u062D\u0629"
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
app.post("/api/sim/rules/evaluate", async (req, res) => {
  const apiKey = getOpenRouterKey();
  if (!apiKey) {
    return res.status(503).json({ error: "OpenRouter API key is required for live rules evaluation" });
  }
  const { claimId, serviceCode, amount, memberId, hasSupportingDoc, docText, priorDenialCode, isAppeal, activeLearnedRule } = req.body;
  const decisionsPayload = {
    model: RULES_MODEL,
    state: {
      claim_id: claimId,
      service_code: serviceCode,
      amount: Number(amount) || 0,
      member_id: (memberId || "").trim(),
      has_supporting_doc: Boolean(hasSupportingDoc),
      clinical_note: (docText || "").slice(0, 800),
      prior_denial: priorDenialCode || "none",
      is_appeal: Boolean(isAppeal),
      has_learned_rule: Boolean(activeLearnedRule && activeLearnedRule.status === "active")
    },
    questions: {
      has_member_id: {
        type: "noul",
        instructions: "Does this healthcare claim provide a valid, non-empty insurance member ID?",
        criteria: {
          false: "Member ID is missing, blank, or whitespace.",
          true: "Member ID is present and valid."
        }
      },
      has_documentation_conflict: {
        type: "noul",
        instructions: "Does the clinical note state that the billed procedure was NOT performed (or consultation only)?",
        criteria: {
          false: "No conflict, procedure was performed or matches service.",
          true: "Note explicitly states procedure was not performed or only consultation took place."
        }
      },
      route: {
        type: "choice",
        instructions: "Determine the operational workflow route for this claim:",
        criteria: {
          "human-review": "Clean claim ready for human review and approval.",
          "needs-correction": "Missing mandatory member ID or non-positive amount.",
          "ai-evidence": "Conflict between clinical documentation and billed service code.",
          "denial-review": "Prior denial requires appeal and attachment review.",
          reconciliation: "Financial settlement ledger reconciliation."
        }
      }
    }
  };
  try {
    const startTime = Date.now();
    const data = await callOpenRouterDecisions(apiKey, decisionsPayload);
    const latencyMs = Date.now() - startTime;
    const answers = data.answers || {};
    const hasMemberId = answers.has_member_id ? answers.has_member_id.noul >= 0.5 : Boolean(memberId);
    const hasDocConflict = answers.has_documentation_conflict ? answers.has_documentation_conflict.noul >= 0.5 : false;
    let chosenRoute = answers.route?.choice || "human-review";
    if (activeLearnedRule && activeLearnedRule.status === "active" && serviceCode === "DEMO-SVC-03" && !hasSupportingDoc) {
      chosenRoute = "needs-correction";
    }
    const violations = [];
    if (!hasMemberId) {
      violations.push({
        ruleId: "DEMO-REQ-001",
        field: "memberId",
        severity: "block",
        messageAr: "\u062A\u0642\u064A\u064A\u0645 typesafe/jev-1.13: \u0631\u0642\u0645 \u0627\u0644\u0639\u0636\u0648\u064A\u0629 \u0627\u0644\u062A\u0623\u0645\u064A\u0646\u064A\u0629 \u0645\u0641\u0642\u0648\u062F\u061B \u064A\u062C\u0628 \u0627\u0633\u062A\u0643\u0645\u0627\u0644 \u0631\u0642\u0645 \u0627\u0644\u0639\u0636\u0648\u064A\u0629"
      });
      chosenRoute = "needs-correction";
    }
    if (amount <= 0) {
      violations.push({
        ruleId: "DEMO-REQ-002",
        field: "amount",
        severity: "block",
        messageAr: "\u0645\u0628\u0644\u063A \u0627\u0644\u0645\u0637\u0627\u0644\u0628\u0629 \u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 \u0642\u064A\u0645\u0629 \u0645\u0648\u062C\u0628\u0629 \u0635\u062D\u064A\u062D\u0629"
      });
      chosenRoute = "needs-correction";
    }
    if (hasDocConflict && serviceCode === "DEMO-SVC-02") {
      violations.push({
        ruleId: "DEMO-REQ-003",
        field: "serviceCode",
        severity: "review",
        messageAr: "\u062A\u0642\u064A\u064A\u0645 typesafe/jev-1.13: \u062A\u0639\u0627\u0631\u0636 \u0645\u0631\u0635\u0648\u062F \u0628\u064A\u0646 \u0643\u0648\u062F \u0627\u0644\u0625\u062C\u0631\u0627\u0621 \u0648\u0627\u0644\u0645\u0644\u0627\u062D\u0638\u0629 \u0627\u0644\u0633\u0631\u064A\u0631\u064A\u0629 (\u0644\u0645 \u064A\u0646\u0641\u0630 \u0627\u0644\u0625\u062C\u0631\u0627\u0621)"
      });
      chosenRoute = "ai-evidence";
    }
    if (activeLearnedRule && activeLearnedRule.status === "active" && serviceCode === "DEMO-SVC-03" && !hasSupportingDoc) {
      violations.push({
        ruleId: "DEMO-REQ-004",
        field: "hasSupportingDoc",
        severity: "block",
        messageAr: "\u0642\u0627\u0639\u062F\u0629 \u0627\u062D\u062A\u0631\u0627\u0632\u064A\u0629 \u0646\u0634\u0637\u0629: \u0627\u0644\u062E\u062F\u0645\u0629 DEMO-SVC-03 \u062A\u062A\u0637\u0644\u0628 \u0625\u0631\u0641\u0627\u0642 \u062A\u0642\u0631\u064A\u0631 \u0627\u0644\u0641\u062D\u0635 \u0627\u0644\u0645\u0639\u062A\u0645\u062F \u0628\u0627\u0644\u062D\u0632\u0645\u0629 \u0642\u0628\u0644 \u0627\u0644\u0625\u0631\u0633\u0627\u0644"
      });
    }
    if (priorDenialCode && !isAppeal) {
      chosenRoute = "denial-review";
    } else if (serviceCode === "DEMO-SVC-05") {
      chosenRoute = "reconciliation";
    }
    const passed = violations.length === 0;
    return res.json({
      engine: "typesafe-jev",
      ruleVersion: "2026.10-jev1.13",
      passed,
      violations,
      route: chosenRoute,
      metadata: {
        model: RULES_MODEL,
        latencyMs,
        costUsd: data.usage?.cost || 2e-5,
        provider: "TypeSafe via OpenRouter Decisions",
        decisionConfidence: answers.route?.confidence
      }
    });
  } catch (err) {
    console.error("Rules evaluation error:", err);
    return res.status(500).json({ error: err.message || "Error evaluating rules via OpenRouter" });
  }
});
app.post("/api/sim/ai/classify", async (req, res) => {
  const apiKey = getOpenRouterKey();
  if (!apiKey) {
    return res.status(503).json({ error: "OpenRouter API key is required" });
  }
  const { scenarioId, serviceCode, clinicalExcerpt } = req.body;
  if (!clinicalExcerpt || typeof clinicalExcerpt !== "string") {
    return res.status(400).json({ error: "clinicalExcerpt is required" });
  }
  if (clinicalExcerpt.length > 12e3) {
    return res.status(400).json({ error: "Payload exceeds maximum allowed length of 12000 characters" });
  }
  const systemPrompt = `You are an AI Clinical Claims Classifier for the AJA Healthcare RCM simulation.
Classify the clinical claim case into a category, priority ('normal' | 'review' | 'urgent'), and a short Arabic reason.
Return JSON ONLY strictly adhering to:
{
  "category": "string in Arabic",
  "priority": "normal" | "review" | "urgent",
  "reasonAr": "string in Arabic explaining classification reason",
  "needsHumanReview": true
}`;
  const userPrompt = `Scenario: ${scenarioId}
Service Code: ${serviceCode}
Clinical Excerpt:
${clinicalExcerpt}`;
  try {
    const startTime = Date.now();
    const resChat = await callOpenRouterChat(apiKey, CLASSIFIER_MODEL, systemPrompt, userPrompt);
    const latencyMs = Date.now() - startTime;
    const result = resChat.result;
    return res.json({
      category: result.category || "\u062A\u0635\u0646\u064A\u0641 \u0633\u0631\u064A\u0631\u064A",
      priority: result.priority || "review",
      reasonAr: result.reasonAr || "\u062A\u0645 \u062A\u0635\u0646\u064A\u0641 \u0627\u0644\u062D\u0627\u0644\u0629 \u0644\u0644\u0645\u0631\u0627\u062C\u0639\u0629",
      needsHumanReview: true,
      metadata: {
        model: CLASSIFIER_MODEL,
        latencyMs,
        costUsd: resChat.costUsd,
        isLive: true
      }
    });
  } catch (err) {
    console.error("Classification error:", err);
    return res.status(500).json({ error: err.message || "Internal OpenRouter error" });
  }
});
app.post("/api/sim/ai/reason", async (req, res) => {
  const apiKey = getOpenRouterKey();
  if (!apiKey) {
    return res.status(503).json({ error: "OpenRouter API key is required" });
  }
  const { scenarioId, serviceCode, clinicalExcerpt, isAppeal, priorDenialCode } = req.body;
  if (!clinicalExcerpt || typeof clinicalExcerpt !== "string") {
    return res.status(400).json({ error: "clinicalExcerpt is required" });
  }
  if (clinicalExcerpt.length > 12e3) {
    return res.status(400).json({ error: "Payload exceeds maximum allowed length of 12000 characters" });
  }
  const systemPrompt = `You are an AI Clinical Claims Reasoning Engine for the AJA Healthcare RCM simulation.
Analyze the clinical excerpt and claim requirements.
CRITICAL EVIDENCE RULE: Every finding MUST have an evidence array with an EXACT verbatim quote that exists word-for-word in the clinicalExcerpt. Do NOT invent or fabricate any text.
Return JSON ONLY strictly adhering to:
{
  "schemaVersion": "1.0",
  "status": "suggestion" | "insufficient_evidence",
  "findings": [
    {
      "type": "documentation_gap" | "service_discrepancy" | "missing_attachment" | "general_observation",
      "summaryAr": "summary in Arabic",
      "evidence": [
        {
          "sourceId": "DOC-${scenarioId}-1",
          "sourceVersion": "1.0",
          "quote": "EXACT verbatim quote from text"
        }
      ],
      "suggestedActionAr": "suggested actionable step in Arabic"
    }
  ],
  "draftAppealAr": string or null,
  "needsHumanReview": true
}`;
  const userPrompt = `Scenario: ${scenarioId}
Service Code: ${serviceCode}
Is Appeal: ${isAppeal}
Prior Denial Code: ${priorDenialCode || "none"}

Clinical Excerpt:
${clinicalExcerpt}`;
  try {
    const startTime = Date.now();
    const resChat = await callOpenRouterChat(apiKey, REASONER_MODEL, systemPrompt, userPrompt);
    const latencyMs = Date.now() - startTime;
    const result = resChat.result;
    return res.json({
      schemaVersion: "1.0",
      status: result.status || "suggestion",
      findings: result.findings || [],
      draftAppealAr: result.draftAppealAr || null,
      needsHumanReview: true,
      metadata: {
        model: REASONER_MODEL,
        latencyMs,
        costUsd: resChat.costUsd,
        isLive: true
      }
    });
  } catch (err) {
    console.error("Reasoning error:", err);
    return res.status(500).json({ error: err.message || "Internal OpenRouter error" });
  }
});
async function startServer() {
  if (process.env.NODE_ENV === "production") {
    app.use(express.static(path.resolve(__dirname, "dist")));
    app.get("*", (_req, res) => {
      res.sendFile(path.resolve(__dirname, "dist", "index.html"));
    });
  } else {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[AJA Simulator] Full-stack server running on port ${PORT} (OpenRouter Exclusively)`);
  });
}
startServer();
