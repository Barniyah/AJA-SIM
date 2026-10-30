/**
 * AJA Revenue Cycle Simulator Backend Server
 * Express Server mounted with Vite middleware
 * Exclusively powered by OpenRouter (Zero Google Cloud / Gemini API usage)
 * Reference: AJA_SIM_TECH.md Section 8 & User Request
 */

import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'node:fs';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '1mb' }));

// Dedicated models on OpenRouter
const RULES_MODEL = 'typesafe/jev-1.13';
const CLASSIFIER_MODEL = process.env.AI_CLASSIFIER_MODEL || 'qwen/qwen-2.5-72b-instruct';
const REASONER_MODEL = process.env.AI_REASONER_MODEL || 'qwen/qwen-2.5-72b-instruct';

// Helper to get OpenRouter Key dynamically
function getOpenRouterKey(): string {
  const key = (process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KE || '').trim();
  if (!key || key === 'MY_OPENROUTER_KEY') {
    return '';
  }
  return key;
}

// 1. GET /api/sim/capabilities
app.get('/api/sim/capabilities', (_req, res) => {
  const openRouterKey = getOpenRouterKey();
  const isLiveAvailable = Boolean(openRouterKey);

  res.json({
    dataMode: 'medplum-mock-client',
    rulesEngine: 'typesafe-jev',
    rulesEngineModel: RULES_MODEL,
    classifierModel: CLASSIFIER_MODEL,
    reasonerModel: REASONER_MODEL,
    provider: 'OpenRouter Exclusively (Zero Google API Usage)',
    isLiveAvailable,
    hasOpenRouterKey: isLiveAvailable,
    hasGeminiKey: false, // Explicitly disabled to protect Google quota
    systemNoticeAr: isLiveAvailable
      ? 'الوضع الحي يعمل بنسبة 100% عبر OpenRouter (محرك القواعد: typesafe/jev-1.13، والاستدلال: Qwen 2.5 72B). تم تعطيل أي استهلاك لخدمات Google نهائياً.'
      : 'الوضع الثابت (محاكاة) نشط افتراضياً دون الحاجة لأي مفاتيح برمجية خارجية.',
  });
});

// Helper for OpenRouter Decisions API (Used for Rules Engine: typesafe/jev-1.13)
async function callOpenRouterDecisions(apiKey: string, payload: Record<string, unknown>) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000);

  try {
    const response = await fetch('https://openrouter.ai/api/alpha/decisions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.APP_URL || 'https://aja-sim.sa',
        'X-Title': 'AJA RCM Simulator',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
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

// Helper for OpenRouter Chat Completions API (Used for Qwen Reasoner and Classifier)
async function callOpenRouterChat(apiKey: string, model: string, systemPrompt: string, userPrompt: string) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000);

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.APP_URL || 'https://aja-sim.sa',
        'X-Title': 'AJA RCM Simulator',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.1,
        max_tokens: 1500,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenRouter Chat error (${response.status}): ${errText.slice(0, 200)}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);
    return {
      result: parsed,
      usage: data.usage,
      costUsd: data.usage?.total_cost || 'غير متاحة',
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

// 2. POST /api/sim/rules/evaluate (Powered by typesafe/jev-1.13 via OpenRouter)
app.post('/api/sim/rules/evaluate', async (req, res) => {
  const apiKey = getOpenRouterKey();
  if (!apiKey) {
    return res.status(503).json({ error: 'OpenRouter API key is required for live rules evaluation' });
  }

  const { claimId, serviceCode, amount, memberId, hasSupportingDoc, docText, priorDenialCode, isAppeal, activeLearnedRule } = req.body;

  const decisionsPayload = {
    model: RULES_MODEL,
    state: {
      claim_id: claimId,
      service_code: serviceCode,
      amount: Number(amount) || 0,
      member_id: (memberId || '').trim(),
      has_supporting_doc: Boolean(hasSupportingDoc),
      clinical_note: (docText || '').slice(0, 800),
      prior_denial: priorDenialCode || 'none',
      is_appeal: Boolean(isAppeal),
      has_learned_rule: Boolean(activeLearnedRule && activeLearnedRule.status === 'active'),
    },
    questions: {
      has_member_id: {
        type: 'noul',
        instructions: 'Does this healthcare claim provide a valid, non-empty insurance member ID?',
        criteria: {
          false: 'Member ID is missing, blank, or whitespace.',
          true: 'Member ID is present and valid.',
        },
      },
      has_documentation_conflict: {
        type: 'noul',
        instructions: 'Does the clinical note state that the billed procedure was NOT performed (or consultation only)?',
        criteria: {
          false: 'No conflict, procedure was performed or matches service.',
          true: 'Note explicitly states procedure was not performed or only consultation took place.',
        },
      },
      route: {
        type: 'choice',
        instructions: 'Determine the operational workflow route for this claim:',
        criteria: {
          'human-review': 'Clean claim ready for human review and approval.',
          'needs-correction': 'Missing mandatory member ID or non-positive amount.',
          'ai-evidence': 'Conflict between clinical documentation and billed service code.',
          'denial-review': 'Prior denial requires appeal and attachment review.',
          reconciliation: 'Financial settlement ledger reconciliation.',
        },
      },
    },
  };

  try {
    const startTime = Date.now();
    const data = await callOpenRouterDecisions(apiKey, decisionsPayload);
    const latencyMs = Date.now() - startTime;

    const answers = data.answers || {};
    const hasMemberId = answers.has_member_id ? answers.has_member_id.noul >= 0.5 : Boolean(memberId);
    const hasDocConflict = answers.has_documentation_conflict ? answers.has_documentation_conflict.noul >= 0.5 : false;
    let chosenRoute = answers.route?.choice || 'human-review';

    // Handle Active Learned Rule (DEMO-REQ-004) for DEMO-SVC-03
    if (activeLearnedRule && activeLearnedRule.status === 'active' && serviceCode === 'DEMO-SVC-03' && !hasSupportingDoc) {
      chosenRoute = 'needs-correction';
    }

    // Build violations array
    const violations = [];
    if (!hasMemberId) {
      violations.push({
        ruleId: 'DEMO-REQ-001',
        field: 'memberId',
        severity: 'block' as const,
        messageAr: 'تقييم typesafe/jev-1.13: رقم العضوية التأمينية مفقود؛ يجب استكمال رقم العضوية',
      });
      chosenRoute = 'needs-correction';
    }

    if (amount <= 0) {
      violations.push({
        ruleId: 'DEMO-REQ-002',
        field: 'amount',
        severity: 'block' as const,
        messageAr: 'مبلغ المطالبة يجب أن يكون قيمة موجبة صحيحة',
      });
      chosenRoute = 'needs-correction';
    }

    if (hasDocConflict && serviceCode === 'DEMO-SVC-02') {
      violations.push({
        ruleId: 'DEMO-REQ-003',
        field: 'serviceCode',
        severity: 'review' as const,
        messageAr: 'تقييم typesafe/jev-1.13: تعارض مرصود بين كود الإجراء والملاحظة السريرية (لم ينفذ الإجراء)',
      });
      chosenRoute = 'ai-evidence';
    }

    if (activeLearnedRule && activeLearnedRule.status === 'active' && serviceCode === 'DEMO-SVC-03' && !hasSupportingDoc) {
      violations.push({
        ruleId: 'DEMO-REQ-004',
        field: 'hasSupportingDoc',
        severity: 'block' as const,
        messageAr: 'قاعدة احترازية نشطة: الخدمة DEMO-SVC-03 تتطلب إرفاق تقرير الفحص المعتمد بالحزمة قبل الإرسال',
      });
    }

    if (priorDenialCode && !isAppeal) {
      chosenRoute = 'denial-review';
    } else if (serviceCode === 'DEMO-SVC-05') {
      chosenRoute = 'reconciliation';
    }

    const passed = violations.length === 0;

    return res.json({
      engine: 'typesafe-jev',
      ruleVersion: '2026.10-jev1.13',
      passed,
      violations,
      route: chosenRoute,
      metadata: {
        model: RULES_MODEL,
        latencyMs,
        costUsd: data.usage?.cost || 0.00002,
        provider: 'TypeSafe via OpenRouter Decisions',
        decisionConfidence: answers.route?.confidence,
      },
    });
  } catch (err: any) {
    console.error('Rules evaluation error:', err);
    return res.status(500).json({ error: err.message || 'Error evaluating rules via OpenRouter' });
  }
});

// 3. POST /api/sim/ai/classify (Powered by Qwen 2.5 72B via OpenRouter)
app.post('/api/sim/ai/classify', async (req, res) => {
  const apiKey = getOpenRouterKey();
  if (!apiKey) {
    return res.status(503).json({ error: 'OpenRouter API key is required' });
  }

  const { scenarioId, serviceCode, clinicalExcerpt } = req.body;

  if (!clinicalExcerpt || typeof clinicalExcerpt !== 'string') {
    return res.status(400).json({ error: 'clinicalExcerpt is required' });
  }

  if (clinicalExcerpt.length > 12000) {
    return res.status(400).json({ error: 'Payload exceeds maximum allowed length of 12000 characters' });
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

  const userPrompt = `Scenario: ${scenarioId}\nService Code: ${serviceCode}\nClinical Excerpt:\n${clinicalExcerpt}`;

  try {
    const startTime = Date.now();
    const resChat = await callOpenRouterChat(apiKey, CLASSIFIER_MODEL, systemPrompt, userPrompt);
    const latencyMs = Date.now() - startTime;
    const result = resChat.result;

    return res.json({
      category: result.category || 'تصنيف سريري',
      priority: result.priority || 'review',
      reasonAr: result.reasonAr || 'تم تصنيف الحالة للمراجعة',
      needsHumanReview: true,
      metadata: {
        model: CLASSIFIER_MODEL,
        latencyMs,
        costUsd: resChat.costUsd,
        isLive: true,
      },
    });
  } catch (err: any) {
    console.error('Classification error:', err);
    return res.status(500).json({ error: err.message || 'Internal OpenRouter error' });
  }
});

// 4. POST /api/sim/ai/reason (Powered by Qwen 2.5 72B via OpenRouter)
app.post('/api/sim/ai/reason', async (req, res) => {
  const apiKey = getOpenRouterKey();
  if (!apiKey) {
    return res.status(503).json({ error: 'OpenRouter API key is required' });
  }

  const { scenarioId, serviceCode, clinicalExcerpt, isAppeal, priorDenialCode } = req.body;

  if (!clinicalExcerpt || typeof clinicalExcerpt !== 'string') {
    return res.status(400).json({ error: 'clinicalExcerpt is required' });
  }

  if (clinicalExcerpt.length > 12000) {
    return res.status(400).json({ error: 'Payload exceeds maximum allowed length of 12000 characters' });
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

  const userPrompt = `Scenario: ${scenarioId}\nService Code: ${serviceCode}\nIs Appeal: ${isAppeal}\nPrior Denial Code: ${priorDenialCode || 'none'}\n\nClinical Excerpt:\n${clinicalExcerpt}`;

  try {
    const startTime = Date.now();
    const resChat = await callOpenRouterChat(apiKey, REASONER_MODEL, systemPrompt, userPrompt);
    const latencyMs = Date.now() - startTime;
    const result = resChat.result;

    return res.json({
      schemaVersion: '1.0',
      status: result.status || 'suggestion',
      findings: result.findings || [],
      draftAppealAr: result.draftAppealAr || null,
      needsHumanReview: true,
      metadata: {
        model: REASONER_MODEL,
        latencyMs,
        costUsd: resChat.costUsd,
        isLive: true,
      },
    });
  } catch (err: any) {
    console.error('Reasoning error:', err);
    return res.status(500).json({ error: err.message || 'Internal OpenRouter error' });
  }
});

// Setup Vite middleware in dev or static serving in production
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    const candidatePaths = [
      path.resolve(process.cwd(), 'dist'),
      path.resolve(__dirname, 'dist'),
      path.resolve(__dirname, '..', 'dist'),
    ];
    const distPath = candidatePaths.find((p) => fs.existsSync(p)) || candidatePaths[0];
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[AJA Simulator] Full-stack server running on port ${PORT} (OpenRouter Exclusively)`);
  });
}

startServer();
