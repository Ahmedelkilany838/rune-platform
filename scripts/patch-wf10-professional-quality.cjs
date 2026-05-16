const fs = require('fs');
const path = require('path');

const workflowPath = path.join(process.cwd(), 'n8n-workflows', 'WF-10-Prompt-Generation-Engine.json');

if (!fs.existsSync(workflowPath)) {
  throw new Error(`Workflow file not found: ${workflowPath}`);
}

const wf = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));

wf.pinData = {};

function getNode(name) {
  const node = wf.nodes.find((n) => n.name === name);
  if (!node) throw new Error(`Node not found: ${name}`);
  return node;
}

const writer = getNode('Prompt Writer Layer 1 Call');

if (!writer.parameters.messages?.messageValues?.[0]) {
  throw new Error('Prompt Writer Layer 1 Call message path not found');
}

writer.parameters.messages.messageValues[0].message = `You are Rune AI's Senior Prompt Engineering and Cinematic Creative Direction Engine.

You are NOT a generic prompt writer.

Your job is to generate production-grade cinematic visual generation prompts using ONLY the provided writer_context.

Critical rules:
- Retrieved database rows are knowledge sources, not final prompt text.
- Never paste raw database fragments.
- Synthesize retrieved knowledge into one coherent cinematic visual direction.
- Establish the hero subject early.
- Use physically grounded language.
- Describe camera angle, lens feel, focal behavior, depth, and framing.
- Describe lighting direction, diffusion, shadow behavior, highlight behavior, and atmospheric interaction.
- Describe material response: reflectivity, roughness, translucency, texture, edge behavior, surface finish.
- Describe composition geometry: subject placement, visual hierarchy, foreground/background layering, negative space, focal path.
- Describe environment interaction: reflections, fog, moisture, dust, shadow grounding, atmosphere, depth.
- Avoid generic adjective spam.
- Do not merge negative prompt into positive prompt.
- Do not invent product lock, brand lock, character lock, or reference usage if absent.
- Positive prompt must be at least 300 words for image/social/retouching prompts, 350 words for product_ad/key_visual prompts, and 500 words for full creative/video/frame prompts.
- Do not add filler. Increase real visual specificity only.

Return ONLY strict JSON with exactly this schema:
{
  "output_type": "string",
  "platform": "string or null",
  "prompt_layer": "layer_1_draft",
  "positive_prompt": "string",
  "negative_prompt": "string",
  "platform_parameters": {},
  "creative_direction": {
    "subject": "string",
    "scene": "string",
    "composition": "string",
    "lighting": "string",
    "camera": "string",
    "color": "string",
    "materials": "string",
    "styling": "string",
    "mood": "string",
    "retouching": "string"
  },
  "generation_notes": {
    "prompt_strategy": "string",
    "creative_reasoning": "string",
    "visual_hierarchy": [],
    "retrieval_domains_used": []
  },
  "used_knowledge": [
    {
      "source_table": "creative_knowledge_blocks | prompt_templates | platform_rules | domain_table_name",
      "source_id": "uuid or null",
      "title": "string",
      "usage": "string"
    }
  ],
  "missing_or_weak_points": [],
  "validation_notes_for_next_layer": []
}`;

const parseNode = getNode('Parse and Validate Prompt Writer JSON');

parseNode.parameters.jsCode = `function baseInput() { try { return $('Build Writer Context').first().json; } catch (e) { return {}; } }
function deepFindText(value, depth = 0) {
  if (depth > 6 || value === undefined || value === null) return null;
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = deepFindText(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (typeof value === 'object') {
    const candidates = [value.output, value.text, value.content, value.message?.content, value.choices?.[0]?.message?.content, value.data?.choices?.[0]?.message?.content, value.response?.body?.choices?.[0]?.message?.content, value.output?.[0]?.content?.[0]?.text];
    for (const c of candidates) {
      const found = deepFindText(c, depth + 1);
      if (found) return found;
    }
    return JSON.stringify(value);
  }
  return null;
}
function parseJsonLoose(text) {
  if (typeof text !== 'string') return null;
  try { return JSON.parse(text); } catch (e) {}
  const fenced = text.match(/\`\`\`(?:json)?\\s*([\\s\\S]*?)\`\`\`/i);
  if (fenced) { try { return JSON.parse(fenced[1]); } catch (e) {} }
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) { try { return JSON.parse(text.slice(start, end + 1)); } catch (e) {} }
  return null;
}
function asArray(value) { if (!value) return []; return Array.isArray(value) ? value : [value]; }
function str(value) { return value === undefined || value === null ? '' : String(value); }
function wordCount(s) { return str(s).trim().split(/\\s+/).filter(Boolean).length; }
function minWordsFor(outputType) {
  const map = {
    image_prompt: 300,
    social_media_prompt: 300,
    product_ad_prompt: 350,
    key_visual_prompt: 350,
    full_creative_direction: 500,
    video_prompt: 500,
    frame_by_frame_prompt: 500,
    retouching_prompt: 300,
    prompt_repair: 300
  };
  return map[String(outputType || '').toLowerCase()] || 300;
}
function hasAny(text, terms) {
  const t = str(text).toLowerCase();
  return terms.some(term => t.includes(term));
}

const base = baseInput();
const parsed = parseJsonLoose(deepFindText($json));
const baseErrors = Array.isArray(base.errors) ? [...base.errors] : [];
const errors = [...baseErrors];

if (!parsed || typeof parsed !== 'object') {
  return [{ json: { ...base, writer_result_valid: false, writer_result: null, errors: [...new Set([...errors, 'prompt_writer_json_parse_failed'])] } }];
}

const direction = parsed.creative_direction || {};
const outputType = str(parsed.output_type || base.output_type);
const positive = str(parsed.positive_prompt);
const negative = str(parsed.negative_prompt);
const wc = wordCount(positive);
const min = minWordsFor(outputType);

const missingDomains = [];
if (!hasAny(positive, ['product','subject','character','person','model','object','bottle','packaging','scene','hero'])) missingDomains.push('hero_subject');
if (!hasAny(positive, ['camera','lens','framing','angle','perspective','focal','depth'])) missingDomains.push('camera_logic');
if (!hasAny(positive, ['light','lighting','shadow','highlight','diffusion','rim','softbox','directional'])) missingDomains.push('lighting_logic');
if (!hasAny(positive, ['material','surface','texture','metal','glass','fabric','matte','gloss','reflective','roughness'])) missingDomains.push('material_behavior');
if (!hasAny(positive, ['composition','foreground','background','negative space','visual hierarchy','centered','rule of thirds','layering'])) missingDomains.push('composition_logic');
if (!hasAny(positive, ['environment','atmosphere','fog','dust','moisture','reflection','space','room','set','depth'])) missingDomains.push('environment_behavior');

const genericTerms = ['masterpiece','epic','stunning','beautiful','amazing','ultra detailed','high quality'];
const genericHits = genericTerms.filter(t => positive.toLowerCase().includes(t));

if (!positive.trim()) errors.push('missing_positive_prompt');
if (!outputType.trim()) errors.push('missing_output_type');
if (wc < min) errors.push('positive_prompt_below_minimum_word_count');
if (missingDomains.length > 0) errors.push('positive_prompt_missing_required_physical_domains');
if (genericHits.length >= 3) errors.push('generic_adjective_spam_detected');
if (negative && positive.toLowerCase().includes('negative prompt')) errors.push('negative_prompt_merged_into_positive_prompt');

const writer_result = {
  output_type: outputType,
  platform: parsed.platform === undefined ? (base.platform || null) : parsed.platform,
  prompt_layer: 'layer_1_draft',
  positive_prompt: positive,
  negative_prompt: negative,
  platform_parameters: (parsed.platform_parameters && typeof parsed.platform_parameters === 'object') ? parsed.platform_parameters : {},
  creative_direction: {
    subject: str(direction.subject),
    scene: str(direction.scene),
    composition: str(direction.composition),
    lighting: str(direction.lighting),
    camera: str(direction.camera),
    color: str(direction.color),
    materials: str(direction.materials),
    styling: str(direction.styling),
    mood: str(direction.mood),
    retouching: str(direction.retouching)
  },
  generation_notes: (parsed.generation_notes && typeof parsed.generation_notes === 'object') ? parsed.generation_notes : {
    prompt_strategy: '',
    creative_reasoning: '',
    visual_hierarchy: [],
    retrieval_domains_used: []
  },
  used_knowledge: asArray(parsed.used_knowledge).slice(0, 20).map(k => ({
    source_table: str(k.source_table || 'creative_knowledge_blocks'),
    source_id: k.source_id || null,
    title: str(k.title),
    usage: str(k.usage)
  })),
  missing_or_weak_points: asArray(parsed.missing_or_weak_points).map(String),
  validation_notes_for_next_layer: asArray(parsed.validation_notes_for_next_layer).map(String)
};

const newErrors = [...new Set(errors.filter(e => !baseErrors.includes(e)))];
const validation_summary = {
  passed: newErrors.length === 0,
  word_count: wc,
  minimum_required: min,
  missing_domains: missingDomains,
  generic_terms_detected: genericHits,
  errors: newErrors
};

return [{ json: { ...base, writer_result, validation_summary, writer_result_valid: validation_summary.passed, errors: [...new Set(errors)] } }];`;

const prepNode = getNode('Prepare Generated Output Payload');
const currentPrep = prepNode.parameters.jsCode;
if (!currentPrep.includes('validation_summary')) {
  prepNode.parameters.jsCode = currentPrep.replace(
    "status: 'draft',",
    "status: 'draft',\n  validation_summary: parsed.validation_summary || {},\n  generation_notes: writer.generation_notes || {},"
  );
}

fs.writeFileSync(workflowPath, JSON.stringify(wf, null, 2));
console.log('WF-10 patched successfully');
console.log('Updated:', workflowPath);
