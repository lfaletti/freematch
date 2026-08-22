// Auto-conversion of text emoticons to emoji.
// Used in ChatScreen to replace :) / :( etc. both as you type and
// when rendering incoming messages so both sides see the same emoji.

const EMOTICON_RULES: { pattern: RegExp; replacement: string }[] = [
  // Note: order matters. More specific/longer tokens first so they win
  // over shorter ones (e.g. ':D' handled before ':'-only rules).
  { pattern: /(?<![\w])xD(?![a-z])/gi, replacement: '😆' },
  { pattern: /(?<![\w]):-?\){3,}/g, replacement: '😂' }, // :))) / :)))
  { pattern: /(?<![\w]):-?D(?![a-z])/gi, replacement: '😄' },
  { pattern: /\B\(Y\)\B/gi, replacement: '👍' },
  { pattern: /\B\(y\)\B/gi, replacement: '👍' },
  { pattern: /\B\(n\)\B/gi, replacement: '👎' },
  { pattern: /(?<![\w]):-?\)/g, replacement: '🙂' }, // :) :-)
  { pattern: /(?<![\w]):-?\(/g, replacement: '🙁' }, // :( :-(
  { pattern: /(?<![\w]):-?P(?![a-z])/gi, replacement: '😛' }, // :P :-P
  { pattern: /(?<![\w]):-?\*(?![a-z])/gi, replacement: '😘' }, // :* kiss
  { pattern: /(?<![\w]):-?\/|(?<![\w]):-?\\/g, replacement: '😕' }, // :/ :\
  { pattern: /(?<![\w]);-?\)/g, replacement: '😉' }, // ;) ;-)
  { pattern: /(?<![\w]);-?D/gi, replacement: '😜' }, // ;D ;-D
  { pattern: /(?<![\w]):-?O|(?<![\w]):-?o/gi, replacement: '😮' }, // :O :-O
  { pattern: /(?<![\w])<3/g, replacement: '❤️' },
  { pattern: /(?<![\w])<\/3/gi, replacement: '💔' },
  { pattern: /(?<![\w])o\(\)o|(?<![\w])0\(\)0/g, replacement: '😯' },
  { pattern: /(?<![\w]):'\(/g, replacement: '😢' },
  { pattern: /(?<![\w])>:|(?<![\w])>:D/gi, replacement: '😈' }, // >:) evil
  { pattern: /(?<![\w]):-?\]/g, replacement: '😁' }, // :] :]
  { pattern: /(?<![\w]):-?\[/g, replacement: '😞' }, // :[
];

/**
 * Replace common text emoticons with emoji in a given string.
 * Non-word-boundary lookbehinds avoid matching inside words (e.g. "xd" in "xd").
 */
export function replaceEmoticons(text: string): string {
  let out = text;
  for (const rule of EMOTICON_RULES) {
    out = out.replace(rule.pattern, rule.replacement);
  }
  return out;
}
