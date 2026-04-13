import { config } from '../config/env';

interface AiCallResult {
  content: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

/**
 * Call Together API chat completion
 */
async function callTogether(model: string, messages: any[], maxTokens: number = 800): Promise<AiCallResult> {
  const response = await fetch(`${config.together.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.together.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Together API ${response.status}: ${(err as any)?.error?.message || response.statusText}`);
  }

  const data = await response.json() as any;
  const choice = data.choices?.[0];
  if (!choice) throw new Error('Together API returned no choices');

  return {
    content: choice.message.content || '',
    model: data.model || model,
    inputTokens: data.usage?.prompt_tokens || 0,
    outputTokens: data.usage?.completion_tokens || 0,
  };
}

/**
 * Extract JSON from AI response (may be wrapped in markdown)
 */
function extractJson(text: string): any {
  // Try direct parse first
  try { return JSON.parse(text); } catch { /* continue */ }

  // Extract from markdown code blocks
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match) {
    try { return JSON.parse(match[1].trim()); } catch { /* continue */ }
  }

  // Find first { ... } block
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end > start) {
    try { return JSON.parse(text.slice(start, end + 1)); } catch { /* continue */ }
  }

  throw new Error('Could not extract JSON from AI response');
}

/**
 * Stage 1: Classify project from one photo + description
 */
export async function classifyProject(imageUrl: string, description: string): Promise<{
  category: string; complexity: string; confidence: number;
  model: string; inputTokens: number; outputTokens: number;
}> {
  const result = await callTogether(config.together.visionModel, [{
    role: 'user',
    content: [
      { type: 'text', text: `/no_think\nYou are a home project classifier. Analyze this photo and the homeowner's description. Return ONLY valid JSON (no markdown, no explanation):\n{"category": "one of: kitchen|bathroom|bedroom|living_room|exterior|roofing|landscaping|painting|flooring|plumbing|electrical|general_repair|deck_patio|garage|basement|other", "complexity": "simple|medium|complex", "confidence": 0.0 to 1.0}\n\nHomeowner says: "${description}"` },
      { type: 'image_url', image_url: { url: imageUrl } },
    ],
  }], 150);

  const parsed = extractJson(result.content);
  return {
    category: parsed.category || 'other',
    complexity: parsed.complexity || 'medium',
    confidence: parsed.confidence || 0.5,
    model: result.model,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
  };
}

/**
 * Stage 2: Generate scope of work from all project photos
 */
export async function generateScope(imageUrls: string[], category: string, description: string, qualityTier: string): Promise<{
  tasks: any[]; model: string; inputTokens: number; outputTokens: number;
}> {
  const imageContent = imageUrls.slice(0, 6).map(url => ({
    type: 'image_url' as const,
    image_url: { url },
  }));

  const result = await callTogether(config.together.visionModel, [{
    role: 'user',
    content: [
      { type: 'text', text: `/no_think\nYou are an expert home renovation estimator. Analyze ALL the photos of this ${category} project (${qualityTier} quality tier). Homeowner says: "${description}"\n\nGenerate a detailed scope of work. Return ONLY valid JSON (no markdown):\n{"tasks": [{"title": "...", "description": "...", "quantity": number, "unit": "sq_ft|linear_ft|each|hour", "materials": [{"name": "...", "estimated_cost": number}], "labor_hours_min": number, "labor_hours_max": number, "cost_min": number, "cost_max": number, "confidence": 0.0 to 1.0}]}\n\nBe thorough — identify ALL visible work needed. Include realistic USD costs for the ${qualityTier} tier. Minimum 3 tasks.` },
      ...imageContent,
    ],
  }], 2000);

  const parsed = extractJson(result.content);
  return {
    tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
    model: result.model,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
  };
}

/**
 * Stage 3: Calculate bid range from task list
 */
export async function calculateBidRange(tasks: any[], location: string, qualityTier: string): Promise<{
  bid_floor: number; bid_ceiling: number; estimated_days_min: number; estimated_days_max: number;
  per_task_costs: any[]; confidence: number;
  model: string; inputTokens: number; outputTokens: number;
}> {
  const taskSummary = tasks.map((t: any, i: number) =>
    `${i + 1}. ${t.title} — qty: ${t.quantity || 1} ${t.unit || 'each'}, cost range: $${t.cost_min || 0}-$${t.cost_max || 0}`
  ).join('\n');

  const result = await callTogether(config.together.textModel, [
    { role: 'user', content: `You are a home renovation bid calculator. Given this task list for a ${qualityTier} quality project in ${location || 'US average'}:\n\n${taskSummary}\n\nCalculate the total bid range. Return ONLY valid JSON (no markdown):\n{"bid_floor": number, "bid_ceiling": number, "estimated_days_min": number, "estimated_days_max": number, "confidence": 0.0 to 1.0, "per_task_costs": [{"title": "...", "cost_min": number, "cost_max": number}]}` },
  ], 600);

  const parsed = extractJson(result.content);
  return {
    bid_floor: parsed.bid_floor || 0,
    bid_ceiling: parsed.bid_ceiling || 0,
    estimated_days_min: parsed.estimated_days_min || 1,
    estimated_days_max: parsed.estimated_days_max || 30,
    per_task_costs: parsed.per_task_costs || [],
    confidence: parsed.confidence || 0.5,
    model: result.model,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
  };
}

/**
 * Fallback: Classify from description only (no image — e.g., video-only uploads)
 */
export async function classifyFromDescription(description: string): Promise<{
  category: string; complexity: string; confidence: number;
  model: string; inputTokens: number; outputTokens: number;
}> {
  const result = await callTogether(config.together.textModel, [
    { role: 'user', content: `You are a home project classifier. Based on this description, classify the project. Return ONLY valid JSON (no markdown):\n{"category": "one of: kitchen|bathroom|bedroom|living_room|exterior|roofing|landscaping|painting|flooring|plumbing|electrical|general_repair|deck_patio|garage|basement|other", "complexity": "simple|medium|complex", "confidence": 0.0 to 1.0}\n\nDescription: "${description}"` },
  ], 150);

  const parsed = extractJson(result.content);
  return {
    category: parsed.category || 'other',
    complexity: parsed.complexity || 'medium',
    confidence: Math.min(parsed.confidence || 0.4, 0.7), // lower confidence without photo
    model: result.model,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
  };
}

/**
 * Fallback: Generate scope from description only (no images)
 */
export async function generateScopeFromDescription(description: string, category: string, qualityTier: string): Promise<{
  tasks: any[]; model: string; inputTokens: number; outputTokens: number;
}> {
  const result = await callTogether(config.together.textModel, [
    { role: 'user', content: `You are an expert home renovation estimator. Generate a scope of work for this ${category} project (${qualityTier} quality tier). Description: "${description}"\n\nReturn ONLY valid JSON (no markdown):\n{"tasks": [{"title": "...", "description": "...", "quantity": number, "unit": "sq_ft|linear_ft|each|hour", "materials": [{"name": "...", "estimated_cost": number}], "labor_hours_min": number, "labor_hours_max": number, "cost_min": number, "cost_max": number, "confidence": 0.0 to 1.0}]}\n\nBe thorough. Include realistic USD costs. Minimum 3 tasks.` },
  ], 2000);

  const parsed = extractJson(result.content);
  return {
    tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
    model: result.model,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
  };
}

export const togetherApi = { classifyProject, classifyFromDescription, generateScope, generateScopeFromDescription, calculateBidRange };
