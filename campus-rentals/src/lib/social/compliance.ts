/**
 * Caption compliance for @campusrentalsllc.
 *
 * Rental advertising is regulated speech. The Fair Housing Act (42 U.S.C.
 * §3604(c)) makes it unlawful to publish any advertisement for a dwelling that
 * "indicates any preference, limitation, or discrimination" based on a
 * protected class — and it binds the advertisement itself, regardless of intent
 * and regardless of who the landlord would actually rent to. An Instagram
 * caption for an available unit is such an advertisement.
 *
 * So this module is the equivalent of a payments guardrail, not a style linter:
 * `validateCaption` FAILS CLOSED. A caption that trips a rule is blocked
 * entirely rather than softened, because a caption nobody posts costs one post
 * and a discriminatory caption costs a HUD complaint.
 *
 * Protected classes covered: federal (race, color, national origin, religion,
 * sex including sexual orientation and gender identity, familial status,
 * disability) plus the classes the New Orleans ordinance adds (age, creed,
 * marital status, source of income).
 *
 * This is a guardrail against the obvious failures, NOT legal advice and NOT a
 * substitute for the human review step. Every draft is still read by a person.
 */

export type ComplianceCode =
  | 'FAIR_HOUSING'
  | 'ENGAGEMENT_BAIT'
  | 'TOO_LONG'
  | 'TOO_SHORT'
  | 'TOO_MANY_HASHTAGS'
  | 'UNSUBSTITUTED_TEMPLATE'

export interface ComplianceViolation {
  code: ComplianceCode
  /** The exact text that tripped the rule, where there is one. */
  match?: string
  message: string
}

export interface ComplianceResult {
  ok: boolean
  violations: ComplianceViolation[]
}

/** Instagram's hard caption ceiling. */
export const MAX_CAPTION_LENGTH = 2200
export const MIN_CAPTION_LENGTH = 40
/** Instagram's hard limit is 30; well short of it is the useful range. */
export const MAX_HASHTAGS = 10

/**
 * Phrases that express a preference, limitation or discrimination on a
 * protected class. Drawn from HUD's advertising guidance and the standard
 * fair-housing "words to avoid" lists used in rental marketing.
 *
 * Each entry is matched case-insensitively on a word boundary. Deliberately
 * targeted at PHRASES rather than bare words: "family" is fine ("family room"),
 * "perfect for families" is not.
 */
const FAIR_HOUSING_PATTERNS: Array<{ re: RegExp; message: string }> = [
  // Familial status
  { re: /\bno (?:kids|children)\b/i, message: 'excludes families with children (familial status)' },
  { re: /\b(?:adults?[- ]only|adult community)\b/i, message: 'excludes families with children (familial status)' },
  { re: /\bchildless\b/i, message: 'excludes families with children (familial status)' },
  { re: /\bperfect for (?:a )?(?:single|couple|bachelor|professional)s?\b/i, message: 'states a preference for a household type (familial/marital status)' },
  { re: /\bideal for (?:a )?(?:single|couple|bachelor)s?\b/i, message: 'states a preference for a household type (familial/marital status)' },
  { re: /\bmature (?:person|individual|tenant|couple)\b/i, message: 'states an age preference' },
  { re: /\b(?:empty[- ]nester|retiree)s? (?:only|preferred|welcome)\b/i, message: 'states an age preference' },

  // Disability
  { re: /\b(?:able[- ]bodied|physically fit|healthy tenant)\b/i, message: 'states a preference on physical ability (disability)' },
  { re: /\bno (?:wheelchairs?|disabled|handicapped)\b/i, message: 'excludes people with disabilities' },
  { re: /\bnot suitable for (?:the )?(?:disabled|handicapped|elderly)\b/i, message: 'excludes people with disabilities or by age' },

  // Race, color, national origin, religion, creed
  { re: /\b(?:christian|catholic|jewish|muslim|hindu|buddhist)s? (?:only|preferred|community|tenants?)\b/i, message: 'states a religious preference' },
  { re: /\bnear (?:a )?(?:church|synagogue|mosque|temple)\b/i, message: 'may signal a religious preference — describe distance to campus instead' },
  { re: /\b(?:english|native) speakers? (?:only|preferred)\b/i, message: 'states a national-origin preference' },
  { re: /\b(?:exclusive|restricted|private|integrated|traditional) (?:neighborhood|community|area)\b/i, message: 'historically coded language on race or national origin' },
  { re: /\bno (?:foreigners?|immigrants?)\b/i, message: 'excludes on national origin' },

  // Sex, sexual orientation, gender identity
  { re: /\b(?:males?|females?|men|women|girls?|boys?) (?:only|preferred)\b/i, message: 'states a sex preference' },
  { re: /\b(?:straight|gay) (?:only|preferred)\b/i, message: 'states a preference on sexual orientation' },

  // Source of income
  { re: /\bno (?:section ?8|housing vouchers?|hud)\b/i, message: 'excludes on source of income' },
  { re: /\b(?:section ?8|vouchers?) not accepted\b/i, message: 'excludes on source of income' },
]

/**
 * Engagement bait. Instagram's own guidance demotes content that instructs
 * people to interact in order to boost distribution, so these phrases cost
 * reach rather than earning it. The soft form ("worth a save") is allowed;
 * the imperative is not.
 */
const ENGAGEMENT_BAIT_PATTERNS: RegExp[] = [
  /\b(?:save|bookmark) this\b/i,
  /\b(?:send|share) (?:this )?(?:to|with) (?:a friend|your roommate|someone)\b/i,
  /\btag (?:a|your|someone)\b/i,
  /\b(?:double|two)[- ]tap\b/i,
  /\bcomment (?:below|"|')/i,
  /\b(?:like|follow) (?:and|&) share\b/i,
  /\bfollow for more\b/i,
  /\bdrop a (?:❤️|heart|comment|like)\b/i,
]

/** An unfilled template placeholder must never reach a public caption. */
const TEMPLATE_PLACEHOLDER = /\{\{?\s*[a-zA-Z_][a-zA-Z0-9_]*\s*\}?\}|\bundefined\b|\bNaN\b|\bnull\b/

/**
 * Validate a caption body plus its hashtags.
 *
 * Fails closed: any violation makes the whole result not-ok, and the caller
 * must not publish. Returns every violation rather than the first, so a
 * reviewer fixing copy sees the full list in one pass.
 */
export function validateCaption(caption: string, hashtags: string[] = []): ComplianceResult {
  const violations: ComplianceViolation[] = []
  const body = caption ?? ''
  // Hashtags are part of the published advertisement, so they are screened too.
  const fullText = `${body} ${hashtags.join(' ')}`

  for (const { re, message } of FAIR_HOUSING_PATTERNS) {
    const m = fullText.match(re)
    if (m) {
      violations.push({ code: 'FAIR_HOUSING', match: m[0], message: `Fair housing: ${message}.` })
    }
  }

  for (const re of ENGAGEMENT_BAIT_PATTERNS) {
    const m = fullText.match(re)
    if (m) {
      violations.push({
        code: 'ENGAGEMENT_BAIT',
        match: m[0],
        message: 'Engagement bait: Instagram demotes captions that instruct people to interact.',
      })
    }
  }

  const placeholder = body.match(TEMPLATE_PLACEHOLDER)
  if (placeholder) {
    violations.push({
      code: 'UNSUBSTITUTED_TEMPLATE',
      match: placeholder[0],
      message: 'Caption contains an unfilled placeholder or a missing value.',
    })
  }

  const rendered = renderCaption(body, hashtags)
  if (rendered.length > MAX_CAPTION_LENGTH) {
    violations.push({
      code: 'TOO_LONG',
      message: `Caption is ${rendered.length} characters; Instagram's limit is ${MAX_CAPTION_LENGTH}.`,
    })
  }
  if (body.trim().length < MIN_CAPTION_LENGTH) {
    violations.push({
      code: 'TOO_SHORT',
      message: `Caption body is ${body.trim().length} characters; minimum is ${MIN_CAPTION_LENGTH}.`,
    })
  }
  if (hashtags.length > MAX_HASHTAGS) {
    violations.push({
      code: 'TOO_MANY_HASHTAGS',
      message: `${hashtags.length} hashtags; the cap is ${MAX_HASHTAGS}.`,
    })
  }

  return { ok: violations.length === 0, violations }
}

/**
 * The equal-housing line that goes on any caption advertising an available
 * dwelling. Kept as a constant so the caption builder and the reviewer UI
 * cannot drift apart on its wording.
 */
export const EQUAL_HOUSING_NOTICE = 'Campus Rentals LLC is an equal housing opportunity provider.'

/** Assemble the published caption: body, notice where required, then hashtags. */
export function renderCaption(body: string, hashtags: string[] = [], includeNotice = false): string {
  const parts = [body.trim()]
  if (includeNotice) parts.push(EQUAL_HOUSING_NOTICE)
  if (hashtags.length > 0) parts.push(hashtags.map((t) => (t.startsWith('#') ? t : `#${t}`)).join(' '))
  return parts.filter(Boolean).join('\n\n')
}
