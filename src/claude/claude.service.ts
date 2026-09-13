import { Injectable, Logger } from '@nestjs/common';
import { Anthropic } from '@anthropic-ai/sdk';

export class TruncationError extends Error {
  constructor(message = 'Anthropic Claude model response was truncated due to max_tokens limit.') {
    super(message);
    this.name = 'TruncationError';
  }
}

export interface TelemetryData {
  model: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  estimated_cost_usd: number;
  duration_ms: number;
  stop_reason: string;
  truncated: boolean;
}

export interface GeneratedProposal {
  title: string;
  has_gaps: boolean;
  gaps: any[];
  sections: Record<string, string>;
  telemetry: TelemetryData;
}

export interface RegeneratedSection {
  revised_content: string;
  telemetry: TelemetryData;
}

@Injectable()
export class ClaudeService {
  private readonly logger = new Logger(ClaudeService.name);
  private anthropic: Anthropic;
  private defaultModel: string;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      this.logger.warn('ANTHROPIC_API_KEY is not set in environment variables.');
    }

    this.anthropic = new Anthropic({
      apiKey: apiKey || 'dummy-key',
      timeout: 120000,
      maxRetries: 0
    });

    this.defaultModel = process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001';
  }

  async callWithRetry<T>(fn: () => Promise<T>, { retries = 3, base = 500 } = {}): Promise<T> {
    let lastError: any;
    for (let i = 0; i <= retries; i++) {
      try {
        return await fn();
      } catch (err: any) {
        lastError = err;
        const status = err.status || err.statusCode;
        const errMsg = (err.message || '').toLowerCase();
        const errName = err.name || '';
        const retryable =
          [429, 500, 502, 503, 529].includes(status) ||
          errName === 'AbortError' ||
          errName === 'APIConnectionTimeoutError' ||
          errName === 'APIConnectionError' ||
          err.code === 'ETIMEDOUT' ||
          errMsg.includes('etimedout') ||
          errMsg.includes('timeout') ||
          errMsg.includes('timed out');

        if (!retryable || i === retries) {
          throw err;
        }

        const delay = base * Math.pow(2, i) + Math.random() * 250;
        this.logger.warn(
          `Transient error (${status || err.code || err.message}). Retrying ${i + 1}/${retries} in ${Math.round(delay)}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    throw lastError;
  }

  analyzeInputGaps(intake: Record<string, any>) {
    const gaps: any[] = [];
    const isEmpty = (v: any) =>
      !v ||
      String(v).trim() === '' ||
      ['tbd', 'to be decided', 'n/a', 'unknown', 'pending', 'flexible', 'tbc', 'to be confirmed'].includes(
        String(v).trim().toLowerCase()
      );

    const pricing = intake.estimated_pricing || intake.pricing || intake.budget || intake.estimated_budget;
    if (isEmpty(pricing)) {
      gaps.push({
        field: 'estimated_pricing',
        severity: 'high',
        issue: 'Pricing or commercial structure is not specified.',
        recommendation:
          'Mark pricing with explicit placeholder [TO BE CONFIRMED] rather than inventing budget.'
      });
    }

    const timeline = intake.proposed_timeline || intake.timeline || intake.duration;
    if (isEmpty(timeline)) {
      gaps.push({
        field: 'proposed_timeline',
        severity: 'medium',
        issue: 'Project duration or milestones are missing.',
        recommendation:
          'Provide an estimated phased timeline draft with a discovery milestone disclaimer.'
      });
    }

    const scope = intake.project_scope || intake.client_needs_summary || intake.scope || intake.needs_summary;
    if (isEmpty(scope)) {
      gaps.push({
        field: 'project_scope',
        severity: 'critical',
        issue: 'Core problem and scope requirements are unspecified.',
        recommendation: 'Request a follow-up discovery call before finalizing scope.'
      });
    }

    return gaps;
  }

  calculateCost(inputTokens: number, outputTokens: number): number {
    // Claude Haiku 4.5 pricing: $1.00 / MTok input, $5.00 / MTok output
    const cost = (inputTokens / 1000000) * 1.0 + (outputTokens / 1000000) * 5.0;
    return Math.round(cost * 10000) / 10000;
  }

  async generateProposal(
    intakeData: Record<string, any>,
    supportingMaterial = '',
    options: { injectFault?: string } = {}
  ): Promise<GeneratedProposal> {
    if (options.injectFault) {
      this.handleFaultInjection(options.injectFault);
    }

    const gaps = this.analyzeInputGaps(intakeData);
    const hasGaps = gaps.length > 0;

    const systemPrompt = `You are a Principal Enterprise Solutions Architect at Koya Talent.
Generate a structured, rigorous 7-section professional proposal aligned with Koya Talent's proposal template.
Strict adherence to truthfulness: DO NOT invent fake budget figures, SLAs, or timelines.
If pricing, budget, or timeline data is missing from the intake, insert "[TO BE CONFIRMED]" as explicit placeholders so the human reviewer can finalize them.
CRITICAL MANDATE: If pricing, timeline, or scope ARE provided in the intake requirements, you MUST use the exact provided values (e.g. the exact fee amount and duration) and you are STRICTLY FORBIDDEN from inserting "[TO BE CONFIRMED]" or "[TBC]" in those sections.

Supporting Documentation Integration:
If supporting background documentation, discovery notes, or call transcripts are provided, you MUST actively analyze and extract their concrete details (client technical stack, existing bottlenecks, specific integration requirements, past incident data, or stated milestones) and meaningfully incorporate them into the relevant sections (especially Project Scope, Recommended Approach, Deliverables, and Timeline). Do not produce generic boilerplate when real supporting material is provided.

You must format your response as a valid JSON object with EXACTLY these 7 section keys:
{
  "title": "String title",
  "introduction": "Executive summary and objective...",
  "project_scope": "Concrete boundaries, challenges, and requirements...",
  "recommended_approach": "Proposed solution, methodologies, architecture...",
  "deliverables": "Itemized deliverables, roles, and concrete outputs...",
  "timeline": "Phases, sprints, milestones, and testing windows...",
  "pricing": "Transparent commercial structure, rates, or [TO BE CONFIRMED]...",
  "next_steps": "Actionable onboarding steps, agreement signing, contact info..."
}
CRITICAL: Do NOT include the section number or title (e.g. do NOT write '1. Introduction' or '5. Timeline') at the start of each section's value, as the UI presentation layer renders the section numbers and titles automatically. Begin directly with the section's actual narrative and substance.
Return ONLY pure JSON without markdown codeblock ticks. Inside JSON string values, never use raw unescaped double quotes (use single quotes or escape them as \").`;

    const userPrompt = `Client Details:
Company Name: ${intakeData.company_name || 'Target Client'}
Client Contact: ${intakeData.client_name || 'Client Lead'} (${intakeData.client_email || 'client@company.com'})
Sales Representative: ${intakeData.salesperson_name || 'Sarah Chen'}
Date of Discovery Call: ${intakeData.date_of_call || new Date().toISOString().split('T')[0]}

Intake Requirements:
Needs Summary: ${intakeData.client_needs_summary || intakeData.needs_summary || 'Not provided'}
Project Scope: ${intakeData.project_scope || intakeData.scope || 'Not provided'}
Target Roles / Deliverables: ${intakeData.target_roles || (Array.isArray(intakeData.deliverables) ? intakeData.deliverables.join(', ') : intakeData.deliverables) || 'Not provided'}
Proposed Timeline: ${intakeData.proposed_timeline || intakeData.timeline || intakeData.duration || 'Not provided'}
Commercial Pricing / Budget: ${intakeData.estimated_pricing || intakeData.pricing || intakeData.budget || intakeData.estimated_budget || 'Not provided'}
Known Constraints / Tech Stack: ${intakeData.constraints || 'Standard enterprise guidelines'}

Supporting Background Documentation:
${supportingMaterial ? supportingMaterial.slice(0, 40000) : 'None provided.'}

Detected Intake Gaps:
${gaps.map((g) => `- [${g.field}] ${g.issue} Recommendation: ${g.recommendation}`).join('\n') || 'None'}

Generate all 7 sections adhering to the strict JSON schema.`;

    const startTime = Date.now();

    const response = await this.callWithRetry(() =>
      this.anthropic.messages.create({
        model: this.defaultModel,
        max_tokens: 8192,
        temperature: 0.2,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      })
    );

    const duration = Date.now() - startTime;
    const textBlock = response.content.find((b) => b.type === 'text') as Anthropic.TextBlock | undefined;
    const rawText = textBlock?.text || '';
    const inputTokens = response.usage?.input_tokens || 0;
    const outputTokens = response.usage?.output_tokens || 0;
    const stopReason = response.stop_reason || 'end_turn';

    if (stopReason === 'max_tokens') {
      throw new TruncationError(
        `Anthropic Claude model response was truncated due to max_tokens limit (${outputTokens} tokens).`
      );
    }

    let parsed: any;
    // 1. Direct JSON parsing
    try {
      let cleanJson = rawText.trim();
      const codeBlockMatch = cleanJson.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
      if (codeBlockMatch) {
        cleanJson = codeBlockMatch[1].trim();
      } else {
        cleanJson = cleanJson.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
      }
      parsed = JSON.parse(cleanJson);
    } catch {
      // 2. Attempt JSON repair: fix unescaped control chars and bad newlines
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const sanitized = jsonMatch[0].replace(/[\u0000-\u001F]+/g, (match) => 
            match === '\n' || match === '\r' || match === '\t' ? match : ''
          );
          parsed = JSON.parse(sanitized);
        } catch {
          // Fall through to regex section extractor
        }
      }
    }

    // 3. Fallback: Robust Regex Section Extractor
    // If JSON parsing failed because Claude included unescaped quotes inside a section value,
    // we extract every section individually using bounded key lookaheads.
    if (!parsed || typeof parsed !== 'object') {
      const extractField = (key: string, nextKeys: string[]): string => {
        const nextKeysPattern = nextKeys.map((k) => `"${k}"\\s*:`).join('|');
        const pattern = nextKeys.length > 0
          ? new RegExp(`"${key}"\\s*:\\s*"([\\s\\S]*?)"(?=\\s*,\\s*(?:${nextKeysPattern}))`, 'i')
          : new RegExp(`"${key}"\\s*:\\s*"([\\s\\S]*?)"(?=\\s*\\})`, 'i');
        const match = rawText.match(pattern);
        if (match && match[1]) {
          return match[1]
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '')
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, '\\')
            .trim();
        }
        return '';
      };

      const keysOrder = [
        'title',
        'introduction',
        'project_scope',
        'recommended_approach',
        'deliverables',
        'timeline',
        'pricing',
        'next_steps'
      ];

      const extractedTitle = extractField('title', keysOrder.slice(1));
      const extractedIntro = extractField('introduction', keysOrder.slice(2));
      const extractedScope = extractField('project_scope', keysOrder.slice(3));
      const extractedApproach = extractField('recommended_approach', keysOrder.slice(4));
      const extractedDeliverables = extractField('deliverables', keysOrder.slice(5));
      const extractedTimeline = extractField('timeline', keysOrder.slice(6));
      const extractedPricing = extractField('pricing', keysOrder.slice(7));
      const extractedNextSteps = extractField('next_steps', []);

      if (extractedIntro || extractedScope) {
        parsed = {
          title: extractedTitle || `Proposal for ${intakeData.company_name || 'Client'}`,
          introduction: extractedIntro,
          project_scope: extractedScope || intakeData.project_scope || 'Detailed in discovery transcript.',
          recommended_approach: extractedApproach || 'Comprehensive phased implementation tailored to client architecture.',
          deliverables: extractedDeliverables || intakeData.target_roles || 'Staffing, architecture blueprint, delivery milestones.',
          timeline: extractedTimeline || intakeData.proposed_timeline || '[TO BE CONFIRMED]',
          pricing: extractedPricing || intakeData.estimated_pricing || '[TO BE CONFIRMED]',
          next_steps: extractedNextSteps || 'Formalize agreement and schedule technical kick-off.'
        };
      } else {
        // Strip markdown and JSON brackets so raw code never leaks to UI
        const strippedRaw = rawText
          .replace(/^```(?:json)?\s*/i, '')
          .replace(/\s*```$/i, '')
          .replace(/^\{[\s\S]*?"introduction"\s*:\s*"/i, '')
          .replace(/"[\s\S]*\}$/i, '')
          .trim();

        parsed = {
          title: `Proposal for ${intakeData.company_name || 'Client'}`,
          introduction: strippedRaw || 'Executive greeting, problem context, and business alignment.',
          project_scope: intakeData.project_scope || 'Detailed in discovery transcript.',
          recommended_approach: 'Comprehensive phased implementation tailored to client architecture.',
          deliverables: intakeData.target_roles || 'Staffing, architecture blueprint, delivery milestones.',
          timeline: intakeData.proposed_timeline || '[TO BE CONFIRMED]',
          pricing: intakeData.estimated_pricing || '[TO BE CONFIRMED]',
          next_steps: 'Formalize agreement and schedule technical kick-off.'
        };
      }
    }

    const sections: Record<string, string> = {
      introduction: parsed.introduction || parsed.executive_summary || '',
      project_scope: parsed.project_scope || parsed.client_needs || '',
      recommended_approach: parsed.recommended_approach || parsed.technical_approach || '',
      deliverables: parsed.deliverables || '',
      timeline: parsed.timeline || parsed.milestones || '',
      pricing: parsed.pricing || '',
      next_steps: parsed.next_steps || parsed.terms || ''
    };

    const telemetry: TelemetryData = {
      model: this.defaultModel,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      total_tokens: inputTokens + outputTokens,
      estimated_cost_usd: this.calculateCost(inputTokens, outputTokens),
      duration_ms: duration,
      stop_reason: stopReason,
      truncated: false
    };

    return {
      title: parsed.title || `Enterprise Solutions Proposal - ${intakeData.company_name || 'Client'}`,
      has_gaps: hasGaps,
      gaps,
      sections,
      telemetry
    };
  }

  async regenerateSection(
    proposal: any,
    sectionKey: string,
    instruction: string,
    options: { injectFault?: string } = {}
  ): Promise<RegeneratedSection> {
    if (options.injectFault) {
      this.handleFaultInjection(options.injectFault);
    }

    const sectionTitles: Record<string, string> = {
      introduction: '1. Introduction',
      project_scope: '2. Project Scope',
      recommended_approach: '3. Recommended Approach',
      deliverables: '4. Deliverables',
      timeline: '5. Timeline',
      pricing: '6. Pricing',
      next_steps: '7. Next Steps'
    };

    const currentContent = proposal.sections[sectionKey] || '';
    const sectionTitle = sectionTitles[sectionKey] || sectionKey;

    const systemPrompt = `You are revising ONLY a single isolated section of an enterprise proposal for Koya Talent.
Target Section: "${sectionTitle}" (Key: ${sectionKey}).
CRITICAL: Do NOT include the section number or title (e.g., do NOT start with "${sectionTitle}"), as the UI card header already provides it. Provide only the section's actual narrative and substance.
You must return ONLY the revised Markdown text for this single section. Do not include markdown code block tags, JSON formatting, or commentary.`;

    const userPrompt = `Proposal Context:
Client: ${proposal.client_name} (${proposal.company_name})
Proposal Title: ${proposal.title}

Current Content of Section "${sectionTitle}":
${currentContent}

User Revision Instruction:
${instruction || 'Improve tone, clarity, and ensure full compliance.'}

Provide the complete updated content for this section now:`;

    const startTime = Date.now();

    const response = await this.callWithRetry(() =>
      this.anthropic.messages.create({
        model: this.defaultModel,
        max_tokens: 2000,
        temperature: 0.3,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      })
    );

    const duration = Date.now() - startTime;
    const textBlock = response.content.find((b) => b.type === 'text') as Anthropic.TextBlock | undefined;
    const rawText = textBlock?.text?.trim() || '';
    const inputTokens = response.usage?.input_tokens || 0;
    const outputTokens = response.usage?.output_tokens || 0;

    const telemetry: TelemetryData = {
      model: this.defaultModel,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      total_tokens: inputTokens + outputTokens,
      estimated_cost_usd: this.calculateCost(inputTokens, outputTokens),
      duration_ms: duration,
      stop_reason: response.stop_reason || 'end_turn',
      truncated: response.stop_reason === 'max_tokens'
    };

    return {
      revised_content: rawText,
      telemetry
    };
  }

  formatClientEmail(proposal: any, clientPortalUrl: string) {
    const clientName = proposal.client_name || 'Client';
    const companyName = proposal.company_name || 'Valued Partner';
    const salesperson = proposal.salesperson_name || 'Sarah Chen';
    const title = proposal.title || `Solutions Proposal for ${companyName}`;

    const subject = `Solutions Proposal: ${companyName} x Koya Talent`;
    const body = `Dear ${clientName},

Thank you for taking the time to speak with us regarding ${companyName}'s strategic initiatives.

Following our discovery discussion, we have assembled our comprehensive solutions proposal:
"${title}"

You can review the full, interactive proposal and milestones on our secure client portal:
${clientPortalUrl}

Summary of Proposed Scope:
- Tailored talent and enterprise solutions designed specifically for ${companyName}
- Phased milestones with transparent governance and SLA commitments
- Complete commercial terms validated by our leadership team

Please let me know if you would like to arrange a follow-up call to review any specific section or adjust the project phasing.

Warm regards,

${salesperson}
Senior Account Executive
Koya Talent
proposals@koyatalent.com`;

    return { subject, body };
  }

  private handleFaultInjection(faultType: string) {
    const type = faultType.toLowerCase().trim();

    if (type === 'claude_timeout' || type === 'timeout') {
      const err: any = new Error('Anthropic Claude API request timed out after 60000ms');
      err.code = 'ETIMEDOUT';
      err.status = 504;
      throw err;
    }

    if (type === 'rate_limit_429' || type === '429') {
      const err: any = new Error('Rate limit exceeded: Org quota reached 1000 RPM');
      err.code = 'RATE_LIMIT';
      err.status = 429;
      throw err;
    }

    if (type === 'auth_error_401' || type === '401') {
      const err: any = new Error('Invalid Anthropic API Key provided');
      err.code = 'AUTHENTICATION_ERROR';
      err.status = 401;
      throw err;
    }

    if (type === 'context_length_400' || type === '400') {
      const err: any = new Error('Context length exceeded maximum allowed tokens for model');
      err.code = 'INVALID_REQUEST';
      err.status = 400;
      throw err;
    }

    if (type === 'server_error_500' || type === '500') {
      const err: any = new Error('Internal Claude API upstream server error');
      err.code = 'INTERNAL_SERVER_ERROR';
      err.status = 500;
      throw err;
    }
  }
}
