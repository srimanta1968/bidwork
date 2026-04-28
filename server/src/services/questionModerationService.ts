import { biddingDb } from './domainDb';

/**
 * Regex patterns for detecting personal contact information.
 *
 * Email handling has two passes: the obfuscated form runs first because it
 * detects "name at domain dot com" and similar word-substituted variants that
 * the strict `@` regex would miss. After replacement those substrings become
 * "[email removed]" and the strict regex skips over them.
 *
 * Phone uses `[\s.-]*` (zero or more separators) instead of the previous
 * `[\s.-]?` so multi-space, NBSP, tab, and "408 . 560 . 7890" style numbers
 * all match.
 */
const CONTACT_PATTERNS = {
  // 10-digit US/CA numbers with arbitrary separators between groups, plus
  // an optional country-code prefix.
  phone: /(\+?\d{1,2}[\s.-]*)?\(?\d{3}\)?[\s.-]*\d{3}[\s.-]*\d{4}/g,

  // Obfuscated emails: "user at domain dot com", "user [at] domain.com",
  // "user (at) domain (dot) com", "user AT domain DOT com" etc.
  // Runs BEFORE the strict @-email pattern so "[email removed]" placeholders
  // don't get re-matched.
  emailObfuscated: /[a-z0-9._%+-]{2,}\s*(?:\[\s*at\s*\]|\(\s*at\s*\)|\bat\b)\s*[a-z0-9.-]{2,}\s*(?:\[\s*dot\s*\]|\(\s*dot\s*\)|\bdot\b|\.)\s*[a-z]{2,}/gi,

  // Strict email with @
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,

  url: /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi,
  wwwUrl: /www\.[^\s<>"{}|\\^`[\]]+/gi,
  socialHandle: /@[a-zA-Z0-9_]{3,}/g,
};

/**
 * Strips personal contact information from text using regex patterns.
 * Replaces detected info with [removed] placeholder.
 */
export function stripContactInfo(text: string): string {
  try {
    let sanitized = text;
    // Order matters — obfuscated email before strict email; both before phone
    // so "(408) 560-7890" doesn't get mistaken for "(at)" anywhere.
    sanitized = sanitized.replace(CONTACT_PATTERNS.emailObfuscated, '[email removed]');
    sanitized = sanitized.replace(CONTACT_PATTERNS.email, '[email removed]');
    sanitized = sanitized.replace(CONTACT_PATTERNS.phone, '[phone removed]');
    sanitized = sanitized.replace(CONTACT_PATTERNS.url, '[link removed]');
    sanitized = sanitized.replace(CONTACT_PATTERNS.wwwUrl, '[link removed]');
    sanitized = sanitized.replace(CONTACT_PATTERNS.socialHandle, '[handle removed]');
    return sanitized.trim();
  } catch (error) {
    console.error('Contact info stripping error:', error);
    return text;
  }
}

/**
 * Moderates a question by stripping contact info and reformatting.
 * Returns the sanitized question text.
 */
export function moderateQuestion(rawQuestion: string): { sanitized: string; hadContactInfo: boolean } {
  try {
    const sanitized = stripContactInfo(rawQuestion);
    const hadContactInfo = sanitized !== rawQuestion;
    return { sanitized, hadContactInfo };
  } catch (error) {
    console.error('Question moderation error:', error);
    return { sanitized: rawQuestion, hadContactInfo: false };
  }
}

/**
 * Submit a question: moderate it and store in bid_questions
 */
export async function submitQuestion(projectId: string, contractorId: string, rawQuestion: string) {
  try {
    const { sanitized } = moderateQuestion(rawQuestion);
    return await biddingDb.queryOne(
      `INSERT INTO bid_questions (project_id, contractor_id, raw_question, sanitized_question, status)
       VALUES ($1, $2, $3, $4, 'posted') RETURNING id, project_id, sanitized_question, status, created_at`,
      [projectId, contractorId, rawQuestion, sanitized]
    );
  } catch (error) {
    console.error('Submit question error:', error);
    throw error;
  }
}

/**
 * Get all Q&A for a project (visible to all bidders)
 */
export async function getProjectQuestions(projectId: string) {
  try {
    return await biddingDb.queryAll(
      `SELECT id, project_id, contractor_id, sanitized_question, answer, status, created_at, answered_at
       FROM bid_questions
       WHERE project_id = $1 AND status IN ('posted', 'answered')
       ORDER BY created_at ASC`,
      [projectId]
    );
  } catch (error) {
    console.error('Get questions error:', error);
    throw error;
  }
}

/**
 * Homeowner answers a question
 */
export async function answerQuestion(questionId: string, answer: string) {
  try {
    const sanitizedAnswer = stripContactInfo(answer);
    return await biddingDb.queryOne(
      `UPDATE bid_questions
       SET answer = $2, status = 'answered', answered_at = NOW(), updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [questionId, sanitizedAnswer]
    );
  } catch (error) {
    console.error('Answer question error:', error);
    throw error;
  }
}

export const questionModerationService = {
  stripContactInfo,
  moderateQuestion,
  submitQuestion,
  getProjectQuestions,
  answerQuestion,
};
