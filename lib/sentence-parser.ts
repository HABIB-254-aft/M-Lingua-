// Grammar-aware sentence parser for sign language sequences
// Converts English sentences to proper ASL sign sequences

export interface ParsedSentence {
  sentences: string[];
  phrases: string[];
  words: string[];
  punctuation: string[];
}

export interface SignSequence {
  units: string[];
  transitions: number[]; // Duration of transitions between units (ms)
  emphasis: boolean[]; // Whether each unit should be emphasized
}

// Common function words that are often omitted or reduced in ASL
const FUNCTION_WORDS = new Set([
  'a', 'an', 'the', // Articles
  'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being', // Forms of "be"
  'have', 'has', 'had', 'having', // Forms of "have"
  'do', 'does', 'did', 'doing', 'done', // Forms of "do"
  'will', 'would', 'could', 'should', 'may', 'might', 'must', // Modals (excluding 'can' which is important)
  'to', 'of', 'in', 'on', 'at', 'by', 'for', 'with', 'from', // Prepositions
  'and', 'or', 'but', 'so', 'because', 'if', 'then', // Conjunctions
  'this', 'that', 'these', 'those', // Demonstratives
  'it', 'its', // Pronouns (some)
]);

// Question words that should be signed at the end in ASL
const QUESTION_WORDS = new Set([
  'what', 'where', 'when', 'why', 'how', 'who', 'which', 'whose'
]);

// Time expressions that should come first in ASL
const TIME_EXPRESSIONS = new Set([
  'now', 'today', 'tomorrow', 'yesterday', 'yesterday', 'later', 'soon',
  'morning', 'afternoon', 'evening', 'night', 'midnight', 'noon',
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
  'january', 'february', 'march', 'april', 'may', 'june', 'july',
  'august', 'september', 'october', 'november', 'december'
]);

// Common phrases that should be signed as single units
const COMMON_PHRASES = [
  'good morning', 'good afternoon', 'good evening', 'good night', 'goodbye',
  'thank you', 'thanks', 'you\'re welcome', 'excuse me', 'i\'m sorry',
  'how are you', 'what\'s up', 'what is your name', 'where are you from',
  'nice to meet you', 'see you later', 'take care', 'have a good day',
  'i love you', 'i miss you', 'i understand', 'i don\'t understand',
  'can you help me', 'please help', 'i need help', 'what time is it',
  'how much', 'how many', 'what is this', 'where is', 'how do you say'
];

/**
 * Split text into sentences while preserving punctuation
 */
export function splitIntoSentences(text: string): ParsedSentence {
  // Normalize whitespace
  let normalized = text.trim().replace(/\s+/g, ' ');
  
  // Split by sentence boundaries (., !, ?, ;, but preserve them)
  const sentencePattern = /([^.!?;]+)([.!?;]+)/g;
  const sentences: string[] = [];
  const punctuation: string[] = [];
  
  let lastIndex = 0;
  let match;
  
  while ((match = sentencePattern.exec(normalized)) !== null) {
    sentences.push(match[1].trim());
    punctuation.push(match[2]);
    lastIndex = match.index + match[0].length;
  }
  
  // Handle remaining text without punctuation
  if (lastIndex < normalized.length) {
    const remaining = normalized.substring(lastIndex).trim();
    if (remaining) {
      sentences.push(remaining);
      punctuation.push('');
    }
  }
  
  // If no sentences found, treat entire text as one sentence
  if (sentences.length === 0) {
    sentences.push(normalized);
    punctuation.push('');
  }
  
  // Remove empty sentences
  const filteredSentences: string[] = [];
  const filteredPunctuation: string[] = [];
  for (let i = 0; i < sentences.length; i++) {
    if (sentences[i].trim()) {
      filteredSentences.push(sentences[i]);
      filteredPunctuation.push(punctuation[i] || '');
    }
  }
  
  return {
    sentences: filteredSentences.length > 0 ? filteredSentences : [normalized],
    phrases: [],
    words: [],
    punctuation: filteredPunctuation.length > 0 ? filteredPunctuation : ['']
  };
  
  return {
    sentences,
    phrases: [],
    words: [],
    punctuation
  };
}

/**
 * Extract phrases from a sentence
 */
export function extractPhrases(sentence: string): string[] {
  const lowerSentence = sentence.toLowerCase().trim();
  const phrases: string[] = [];
  const words = lowerSentence.split(/\s+/).filter(w => w.length > 0);
  
  if (words.length === 0) return [];
  
  let i = 0;
  while (i < words.length) {
    let matched = false;
    
    // Try to match phrases of decreasing length (longest first, up to 5 words)
    for (let phraseLength = Math.min(5, words.length - i); phraseLength >= 2; phraseLength--) {
      const phraseWords = words.slice(i, i + phraseLength);
      const phrase = phraseWords.join(' ');
      
      // Check if it's a common phrase
      if (COMMON_PHRASES.some(p => phrase.includes(p) || p.includes(phrase))) {
        phrases.push(phrase);
        i += phraseLength;
        matched = true;
        break;
      }
    }
    
    // If no phrase matched, add single word
    if (!matched) {
      phrases.push(words[i]);
      i++;
    }
  }
  
  return phrases;
}

/**
 * Reorder words/phrases according to ASL grammar rules
 * ASL typically follows: Time -> Topic -> Comment structure
 */
export function reorderForASL(units: string[]): string[] {
  if (units.length <= 1) return units;
  
  const reordered: string[] = [];
  const timeUnits: string[] = [];
  const topicUnits: string[] = [];
  const commentUnits: string[] = [];
  const questionUnits: string[] = [];
  const otherUnits: string[] = [];
  
  // Classify units
  for (const unit of units) {
    const lowerUnit = unit.toLowerCase();
    const firstWord = lowerUnit.split(/\s+/)[0];
    
    if (TIME_EXPRESSIONS.has(firstWord) || TIME_EXPRESSIONS.has(lowerUnit)) {
      timeUnits.push(unit);
    } else if (QUESTION_WORDS.has(firstWord) || QUESTION_WORDS.has(lowerUnit)) {
      questionUnits.push(unit);
    } else if (isTopicMarker(lowerUnit)) {
      topicUnits.push(unit);
    } else if (isComment(lowerUnit)) {
      commentUnits.push(unit);
    } else {
      otherUnits.push(unit);
    }
  }
  
  // ASL order: Time -> Topic -> Comment -> Question words (at end)
  reordered.push(...timeUnits);
  reordered.push(...topicUnits);
  reordered.push(...commentUnits);
  reordered.push(...otherUnits);
  reordered.push(...questionUnits);
  
  return reordered.length > 0 ? reordered : units;
}

/**
 * Check if a unit is a topic marker
 */
function isTopicMarker(unit: string): boolean {
  // Topics are often nouns or noun phrases at the beginning
  const topicMarkers = ['about', 'regarding', 'concerning', 'as for', 'as to'];
  return topicMarkers.some(marker => unit.includes(marker));
}

/**
 * Check if a unit is a comment (verb or action)
 */
function isComment(unit: string): boolean {
  // Comments are typically verbs or actions
  const actionWords = ['go', 'come', 'see', 'hear', 'speak', 'say', 'tell', 'ask',
    'give', 'take', 'make', 'do', 'get', 'put', 'find', 'look', 'watch',
    'help', 'need', 'want', 'like', 'love', 'know', 'think', 'feel'];
  
  const firstWord = unit.split(/\s+/)[0];
  return actionWords.includes(firstWord);
}

/**
 * Remove or reduce function words according to ASL grammar
 */
export function reduceFunctionWords(units: string[]): string[] {
  const reduced: string[] = [];
  
  for (const unit of units) {
    const words = unit.split(/\s+/);
    
    // If it's a single function word, skip it (unless it's important)
    if (words.length === 1 && FUNCTION_WORDS.has(words[0].toLowerCase())) {
      // Keep important function words like modals
      const importantWords = ['can', 'will', 'must', 'should', 'may', 'might'];
      if (importantWords.includes(words[0].toLowerCase())) {
        reduced.push(unit);
      }
      // Skip other function words
      continue;
    }
    
    // For multi-word units, remove function words from the middle
    const filteredWords = words.filter(w => {
      const lower = w.toLowerCase();
      // Keep first and last words, filter function words from middle
      return !FUNCTION_WORDS.has(lower) || words.indexOf(w) === 0 || words.indexOf(w) === words.length - 1;
    });
    
    if (filteredWords.length > 0) {
      reduced.push(filteredWords.join(' '));
    }
  }
  
  return reduced.length > 0 ? reduced : units;
}

/**
 * Add emphasis markers for important words
 */
export function addEmphasis(units: string[]): boolean[] {
  const emphasis: boolean[] = [];
  
  for (const unit of units) {
    const lowerUnit = unit.toLowerCase();
    
    // Emphasize: question words, negatives, important verbs, time expressions
    const isEmphasized = 
      QUESTION_WORDS.has(lowerUnit) ||
      lowerUnit.startsWith('not ') || lowerUnit.startsWith('no ') || lowerUnit === 'no' ||
      lowerUnit.startsWith('never ') || lowerUnit === 'never' ||
      lowerUnit.startsWith('always ') || lowerUnit === 'always' ||
      TIME_EXPRESSIONS.has(lowerUnit) ||
      isComment(lowerUnit);
    
    emphasis.push(isEmphasized);
  }
  
  return emphasis;
}

/**
 * Calculate transition durations between signs
 * Longer pauses for sentence boundaries, shorter for phrases
 */
export function calculateTransitions(units: string[], isSentenceBoundary: boolean[]): number[] {
  const transitions: number[] = [];
  
  for (let i = 0; i < units.length - 1; i++) {
    const currentUnit = units[i].toLowerCase();
    const nextUnit = units[i + 1].toLowerCase();
    
    let duration = 400; // Default transition
    
    // Longer pause at sentence boundaries
    if (isSentenceBoundary[i]) {
      duration = 800;
    }
    // Longer pause between phrases vs words
    else if (currentUnit.split(/\s+/).length > 1 || nextUnit.split(/\s+/).length > 1) {
      duration = 500;
    }
    // Shorter pause between related words
    else if (areRelated(currentUnit, nextUnit)) {
      duration = 300;
    }
    
    transitions.push(duration);
  }
  
  return transitions;
}

/**
 * Check if two units are semantically related
 */
function areRelated(unit1: string, unit2: string): boolean {
  // Related pairs: adjective-noun, verb-object, etc.
  const relatedPatterns = [
    ['good', 'morning'], ['good', 'afternoon'], ['good', 'evening'],
    ['thank', 'you'], ['excuse', 'me'], ['how', 'are'], ['what', 'is'],
    ['where', 'is'], ['how', 'much'], ['how', 'many']
  ];
  
  const words1 = unit1.split(/\s+/);
  const words2 = unit2.split(/\s+/);
  
  for (const pattern of relatedPatterns) {
    if ((words1.includes(pattern[0]) && words2.includes(pattern[1])) ||
        (words2.includes(pattern[0]) && words1.includes(pattern[1]))) {
      return true;
    }
  }
  
  return false;
}

/**
 * Main function: Parse text into grammar-aware sign sequences
 */
export function parseTextToSignSequence(text: string): SignSequence {
  if (!text || !text.trim()) {
    return {
      units: [],
      transitions: [],
      emphasis: []
    };
  }
  
  // Step 1: Split into sentences
  const parsed = splitIntoSentences(text);
  const allUnits: string[] = [];
  const sentenceBoundaries: boolean[] = [];
  
  // Step 2: Process each sentence
  for (let i = 0; i < parsed.sentences.length; i++) {
    const sentence = parsed.sentences[i];
    
    // Extract phrases from sentence
    const phrases = extractPhrases(sentence);
    
    // Reduce function words
    const reduced = reduceFunctionWords(phrases);
    
    // Reorder for ASL grammar
    const reordered = reorderForASL(reduced);
    
    // Add to all units
    allUnits.push(...reordered);
    
    // Mark sentence boundaries (last unit of each sentence)
    for (let j = 0; j < reordered.length; j++) {
      const isLastInSentence = (j === reordered.length - 1);
      sentenceBoundaries.push(isLastInSentence && i < parsed.sentences.length - 1);
    }
  }
  
  // Step 3: Add emphasis markers
  const emphasis = addEmphasis(allUnits);
  
  // Step 4: Calculate transitions
  const transitions = calculateTransitions(allUnits, sentenceBoundaries);
  
  return {
    units: allUnits,
    transitions,
    emphasis
  };
}

