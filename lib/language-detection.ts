/**
 * Language Detection Service
 * 
 * Detects the language of input text using multiple methods:
 * 1. Google Translate API auto-detection (if API key available)
 * 2. Pattern-based detection (heuristics)
 * 3. Character set analysis
 */

export interface LanguageDetectionResult {
  language: string;
  confidence: number;
  method: 'google' | 'pattern' | 'fallback';
}

// Extended language list with 20+ languages
export const SUPPORTED_LANGUAGES = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "it", label: "Italian" },
  { value: "pt", label: "Portuguese" },
  { value: "ru", label: "Russian" },
  { value: "zh", label: "Chinese" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
  { value: "ar", label: "Arabic" },
  { value: "hi", label: "Hindi" },
  { value: "nl", label: "Dutch" },
  { value: "pl", label: "Polish" },
  { value: "tr", label: "Turkish" },
  { value: "sv", label: "Swedish" },
  { value: "da", label: "Danish" },
  { value: "no", label: "Norwegian" },
  { value: "fi", label: "Finnish" },
  { value: "cs", label: "Czech" },
  { value: "el", label: "Greek" },
  { value: "he", label: "Hebrew" },
  { value: "th", label: "Thai" },
  { value: "vi", label: "Vietnamese" },
  { value: "id", label: "Indonesian" },
  { value: "uk", label: "Ukrainian" },
  { value: "ro", label: "Romanian" },
  { value: "hu", label: "Hungarian" },
  { value: "bg", label: "Bulgarian" },
  { value: "sk", label: "Slovak" },
];

/**
 * Detect language of input text
 * @param text - Text to detect language for
 * @returns Language detection result
 */
export async function detectLanguage(text: string): Promise<LanguageDetectionResult> {
  if (!text || text.trim().length < 3) {
    return {
      language: 'en',
      confidence: 0,
      method: 'fallback',
    };
  }

  const trimmedText = text.trim();

  // Try Google Translate API auto-detection first (if available)
  const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_TRANSLATE_API_KEY;
  if (googleApiKey) {
    try {
      const result = await detectWithGoogle(trimmedText, googleApiKey);
      if (result) {
        return result;
      }
    } catch (error) {
      console.warn('Google language detection failed:', error);
      // Fall through to pattern detection
    }
  }

  // Fallback to pattern-based detection
  return detectWithPatterns(trimmedText);
}

/**
 * Detect language using Google Translate API
 */
async function detectWithGoogle(
  text: string,
  apiKey: string
): Promise<LanguageDetectionResult | null> {
  try {
    const params = new URLSearchParams({
      key: apiKey,
      q: text,
    });

    const url = `https://translation.googleapis.com/language/translate/v2/detect?${params.toString()}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Google detection API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.data?.detections?.[0]?.[0]) {
      const detection = data.data.detections[0][0];
      return {
        language: detection.language,
        confidence: detection.confidence || 0.8,
        method: 'google',
      };
    }

    return null;
  } catch (error) {
    throw error;
  }
}

/**
 * Pattern-based language detection using heuristics
 */
function detectWithPatterns(text: string): LanguageDetectionResult {
  // Character set patterns
  const patterns: Record<string, { regex: RegExp; weight: number }[]> = {
    // Chinese, Japanese, Korean (CJK)
    zh: [
      { regex: /[\u4e00-\u9fff]/, weight: 1.0 },
      { regex: /[\u3400-\u4dbf]/, weight: 0.8 },
    ],
    ja: [
      { regex: /[\u3040-\u309f]/, weight: 0.6 }, // Hiragana
      { regex: /[\u30a0-\u30ff]/, weight: 0.6 }, // Katakana
      { regex: /[\u4e00-\u9fff]/, weight: 0.4 }, // Kanji
    ],
    ko: [
      { regex: /[\uac00-\ud7a3]/, weight: 1.0 }, // Hangul
    ],
    ar: [
      { regex: /[\u0600-\u06ff]/, weight: 1.0 },
      { regex: /[\u0750-\u077f]/, weight: 0.8 },
    ],
    he: [
      { regex: /[\u0590-\u05ff]/, weight: 1.0 },
    ],
    th: [
      { regex: /[\u0e00-\u0e7f]/, weight: 1.0 },
    ],
    hi: [
      { regex: /[\u0900-\u097f]/, weight: 1.0 },
    ],
    ru: [
      { regex: /[а-яё]/i, weight: 0.9 },
      { regex: /\b(и|в|на|с|что|это|как|для|от|по|из|к|так|же|или|но|если|бы|был|была|было|были|есть|этот|эта|это|эти)\b/i, weight: 0.7 },
    ],
    uk: [
      { regex: /[а-яёіїєґ]/i, weight: 0.9 },
      { regex: /\b(і|та|що|для|від|про|як|так|або|але|якщо|був|була|було|були|є|цей|ця|це|ці)\b/i, weight: 0.7 },
    ],
    el: [
      { regex: /[α-ωάέήίόύώ]/i, weight: 0.9 },
    ],
    // Latin-based languages - use common words
    en: [
      { regex: /\b(the|and|is|are|was|were|this|that|with|from|have|has|had|will|would|could|should)\b/i, weight: 0.8 },
      { regex: /\b(hello|world|good|bad|yes|no|please|thank|you|me|we|they|them|their|there|where|what|when|why|how)\b/i, weight: 0.7 },
    ],
    es: [
      { regex: /\b(el|la|los|las|de|del|en|con|por|para|que|es|son|era|eran|fue|fueron|tiene|tienen|había|habían)\b/i, weight: 0.8 },
      { regex: /\b(hola|mundo|bueno|malo|sí|no|por favor|gracias|tú|yo|nosotros|ellos|ellas|dónde|qué|cuándo|por qué|cómo)\b/i, weight: 0.7 },
      { regex: /[áéíóúñü]/i, weight: 0.5 },
    ],
    fr: [
      { regex: /\b(le|la|les|de|du|des|en|avec|pour|par|que|est|sont|était|étaient|fut|furent|a|ont|avait|avaient)\b/i, weight: 0.8 },
      { regex: /\b(bonjour|monde|bon|mauvais|oui|non|s'il vous plaît|merci|tu|je|nous|ils|elles|où|quoi|quand|pourquoi|comment)\b/i, weight: 0.7 },
      { regex: /[àâäéèêëïîôùûüÿç]/i, weight: 0.5 },
    ],
    de: [
      { regex: /\b(der|die|das|den|dem|des|und|oder|ist|sind|war|waren|hat|haben|hatte|hatten|wird|würde|könnte|sollte)\b/i, weight: 0.8 },
      { regex: /\b(hallo|welt|gut|schlecht|ja|nein|bitte|danke|du|ich|wir|sie|ihnen|wo|was|wann|warum|wie)\b/i, weight: 0.7 },
      { regex: /[äöüß]/i, weight: 0.5 },
    ],
    it: [
      { regex: /\b(il|la|lo|gli|le|di|del|della|dei|delle|in|con|per|da|che|è|sono|era|erano|fu|furono|ha|hanno|aveva|avevano)\b/i, weight: 0.8 },
      { regex: /\b(ciao|mondo|buono|cattivo|sì|no|per favore|grazie|tu|io|noi|loro|dove|cosa|quando|perché|come)\b/i, weight: 0.7 },
    ],
    pt: [
      { regex: /\b(o|a|os|as|de|do|da|dos|das|em|com|por|para|que|é|são|era|eram|foi|foram|tem|têm|tinha|tinham)\b/i, weight: 0.8 },
      { regex: /\b(olá|mundo|bom|ruim|sim|não|por favor|obrigado|obrigada|você|eu|nós|eles|elas|onde|o que|quando|por quê|como)\b/i, weight: 0.7 },
      { regex: /[áàâãéêíóôõúüç]/i, weight: 0.5 },
    ],
    nl: [
      { regex: /\b(de|het|een|en|of|is|zijn|was|waren|heeft|hebben|had|hadden|zal|zou|kon|zou moeten)\b/i, weight: 0.8 },
      { regex: /\b(hallo|wereld|goed|slecht|ja|nee|alsjeblieft|dank je|jij|ik|wij|zij|hen|waar|wat|wanneer|waarom|hoe)\b/i, weight: 0.7 },
    ],
    pl: [
      { regex: /\b(i|a|o|w|z|na|do|od|po|za|że|jest|są|był|była|było|byli|ma|mają|miał|mieli|będzie|byłoby|mógł|powinien)\b/i, weight: 0.8 },
      { regex: /[ąćęłńóśźż]/i, weight: 0.5 },
    ],
    tr: [
      { regex: /\b(ve|ile|için|gibi|ki|bu|şu|o|bir|var|yok|oldu|olduğu|olmuş|olacak|yapmak|etmek|gelmek|gitmek)\b/i, weight: 0.8 },
      { regex: /[çğıöşü]/i, weight: 0.5 },
    ],
    sv: [
      { regex: /\b(och|eller|är|var|varit|har|hade|kommer|skulle|kunde|borde|den|det|de|en|ett|på|i|med|för|av)\b/i, weight: 0.8 },
    ],
    da: [
      { regex: /\b(og|eller|er|var|været|har|havde|vil|ville|kunne|burde|den|det|de|en|et|på|i|med|for|af)\b/i, weight: 0.8 },
    ],
    no: [
      { regex: /\b(og|eller|er|var|vært|har|hadde|vil|ville|kunne|burde|den|det|de|en|et|på|i|med|for|av)\b/i, weight: 0.8 },
    ],
    fi: [
      { regex: /\b(ja|tai|on|oli|ollut|onko|ei|kyllä|tämä|tuo|se|hän|me|te|he|minä|sinä|missä|mitä|milloin|miksi|miten)\b/i, weight: 0.8 },
    ],
    cs: [
      { regex: /\b(a|i|o|v|z|na|do|od|po|za|že|je|jsou|byl|byla|bylo|byli|má|mají|měl|měli|bude|by|mohl|měl by)\b/i, weight: 0.8 },
      { regex: /[áčďéěíňóřšťúůýž]/i, weight: 0.5 },
    ],
    ro: [
      { regex: /\b(și|sau|este|sunt|era|erau|a fost|au fost|are|au|avea|aveau|va|ar|ar putea|ar trebui|cel|cea|cei|cele)\b/i, weight: 0.8 },
    ],
    hu: [
      { regex: /\b(és|vagy|van|vannak|volt|voltak|lesz|lesznek|van|vannak|volt|voltak|fog|fognak|lehetne|kellene|a|az|egy|ez|az)\b/i, weight: 0.8 },
    ],
    bg: [
      { regex: /\b(и|в|на|с|за|от|по|из|к|като|че|е|са|беше|бяха|е|са|има|имат|имаше|имаха|ще|би|би могъл|би трябвало)\b/i, weight: 0.8 },
    ],
    sk: [
      { regex: /\b(a|i|o|v|z|na|do|od|po|za|že|je|sú|bol|bola|bolo|boli|má|majú|mal|mali|bude|by|mohol|mal by)\b/i, weight: 0.8 },
    ],
    vi: [
      { regex: /\b(và|hoặc|là|có|đã|sẽ|sẽ có|được|bị|cho|với|từ|về|trong|trên|dưới|này|đó|kia|tôi|bạn|chúng ta|họ)\b/i, weight: 0.8 },
    ],
    id: [
      { regex: /\b(dan|atau|adalah|adalah|adalah|adalah|adalah|adalah|adalah|adalah|adalah|adalah|adalah|adalah|adalah|adalah|adalah|adalah|adalah|adalah)\b/i, weight: 0.7 },
      { regex: /\b(dan|atau|adalah|yang|dengan|dari|untuk|pada|di|ke|dari|ini|itu|saya|kamu|kita|mereka)\b/i, weight: 0.7 },
    ],
  };

  const scores: Record<string, number> = {};

  // Score each language
  for (const [lang, langPatterns] of Object.entries(patterns)) {
    let score = 0;
    for (const pattern of langPatterns) {
      const matches = text.match(pattern.regex);
      if (matches) {
        score += matches.length * pattern.weight;
      }
    }
    scores[lang] = score;
  }

  // Find language with highest score
  let bestLang = 'en';
  let bestScore = scores['en'] || 0;

  for (const [lang, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestLang = lang;
    }
  }

  // Calculate confidence (normalize score)
  const maxPossibleScore = text.length * 0.5; // Rough estimate
  const confidence = Math.min(bestScore / maxPossibleScore, 0.9);

  return {
    language: bestLang,
    confidence: Math.max(confidence, 0.3), // Minimum 30% confidence
    method: 'pattern',
  };
}

/**
 * Get language name from code
 */
export function getLanguageName(code: string): string {
  const lang = SUPPORTED_LANGUAGES.find(l => l.value === code);
  return lang ? lang.label : code.toUpperCase();
}

