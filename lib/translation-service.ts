/**
 * Translation Service with Multiple API Fallbacks
 * 
 * Fallback chain: Google Translate → DeepL → MyMemory
 * 
 * Environment variables needed:
 * - NEXT_PUBLIC_GOOGLE_TRANSLATE_API_KEY (optional)
 * - NEXT_PUBLIC_DEEPL_API_KEY (optional)
 * 
 * If API keys are not provided, the service will skip those APIs
 * and fall back to the next available option.
 */

export interface TranslationResult {
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  provider: 'google' | 'deepl' | 'mymemory';
}

export interface TranslationError {
  message: string;
  provider: string;
}

/**
 * Translate text using multiple API fallbacks
 * @param text - Text to translate
 * @param sourceLang - Source language code (e.g., 'en', 'es')
 * @param targetLang - Target language code (e.g., 'en', 'es')
 * @returns Translation result with provider information
 */
export async function translateText(
  text: string,
  sourceLang: string = 'en',
  targetLang: string = 'es'
): Promise<TranslationResult> {
  if (!text || !text.trim()) {
    throw new Error('Text to translate is required');
  }

  if (sourceLang === targetLang) {
    return {
      translatedText: text,
      sourceLang,
      targetLang,
      provider: 'mymemory', // Default provider when no translation needed
    };
  }

  const errors: TranslationError[] = [];

  // Try Google Translate API first (if API key is available)
  const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_TRANSLATE_API_KEY;
  if (googleApiKey) {
    try {
      const result = await translateWithGoogle(text, sourceLang, targetLang, googleApiKey);
      if (result) {
        return result;
      }
    } catch (error: any) {
      console.warn('Google Translate API failed:', error.message);
      errors.push({ message: error.message, provider: 'google' });
    }
  }

  // Try DeepL API second (if API key is available)
  const deeplApiKey = process.env.NEXT_PUBLIC_DEEPL_API_KEY;
  if (deeplApiKey) {
    try {
      const result = await translateWithDeepL(text, sourceLang, targetLang, deeplApiKey);
      if (result) {
        return result;
      }
    } catch (error: any) {
      console.warn('DeepL API failed:', error.message);
      errors.push({ message: error.message, provider: 'deepl' });
    }
  }

  // Fallback to MyMemory (always available, no API key needed)
  try {
    const result = await translateWithMyMemory(text, sourceLang, targetLang);
    if (result) {
      return result;
    }
  } catch (error: any) {
    console.error('MyMemory API failed:', error.message);
    errors.push({ message: error.message, provider: 'mymemory' });
  }

  // If all APIs failed, throw an error with details
  const errorMessages = errors.map(e => `${e.provider}: ${e.message}`).join('; ');
  throw new Error(`All translation APIs failed. ${errorMessages}`);
}

/**
 * Translate using Google Translate API
 */
async function translateWithGoogle(
  text: string,
  sourceLang: string,
  targetLang: string,
  apiKey: string
): Promise<TranslationResult | null> {
  try {
    // Google Cloud Translation API v2 - uses URL-encoded parameters
    const params = new URLSearchParams({
      key: apiKey,
      q: text,
      target: targetLang,
      format: 'text',
    });
    
    // Add source language only if not 'auto'
    if (sourceLang && sourceLang !== 'auto') {
      params.append('source', sourceLang);
    }
    
    const url = `https://translation.googleapis.com/language/translate/v2?${params.toString()}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Google Translate API error: ${response.status} ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    
    if (data.data?.translations?.[0]?.translatedText) {
      return {
        translatedText: data.data.translations[0].translatedText,
        sourceLang,
        targetLang,
        provider: 'google',
      };
    }

    throw new Error('Invalid response from Google Translate API');
  } catch (error: any) {
    // Re-throw to be caught by fallback chain
    throw error;
  }
}

/**
 * Translate using DeepL API
 */
async function translateWithDeepL(
  text: string,
  sourceLang: string,
  targetLang: string,
  apiKey: string
): Promise<TranslationResult | null> {
  try {
    // DeepL API endpoint (free tier: api-free.deepl.com, paid: api.deepl.com)
    const apiEndpoint = apiKey.includes('free') 
      ? 'https://api-free.deepl.com/v2/translate'
      : 'https://api.deepl.com/v2/translate';
    
    // DeepL uses uppercase language codes for some languages
    const deeplSourceLang = convertToDeepLLangCode(sourceLang);
    const deeplTargetLang = convertToDeepLLangCode(targetLang);

    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        text: text,
        source_lang: deeplSourceLang,
        target_lang: deeplTargetLang,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DeepL API error: ${response.status} ${errorText || response.statusText}`);
    }

    const data = await response.json();
    
    if (data.translations?.[0]?.text) {
      return {
        translatedText: data.translations[0].text,
        sourceLang,
        targetLang,
        provider: 'deepl',
      };
    }

    throw new Error('Invalid response from DeepL API');
  } catch (error: any) {
    // Re-throw to be caught by fallback chain
    throw error;
  }
}

/**
 * Translate using MyMemory API (fallback, no API key needed)
 */
async function translateWithMyMemory(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<TranslationResult | null> {
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`MyMemory API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.responseStatus === 200 && data.responseData?.translatedText) {
      return {
        translatedText: data.responseData.translatedText,
        sourceLang,
        targetLang,
        provider: 'mymemory',
      };
    }

    const errorMsg = data.responseData?.error || data.responseDetails || 'Translation failed';
    throw new Error(errorMsg);
  } catch (error: any) {
    // Re-throw to be caught by fallback chain
    throw error;
  }
}

/**
 * Convert language code to DeepL format
 * DeepL uses uppercase for some languages and has specific codes
 */
function convertToDeepLLangCode(langCode: string): string {
  const langMap: Record<string, string> = {
    'en': 'EN',
    'es': 'ES',
    'fr': 'FR',
    'de': 'DE',
    'it': 'IT',
    'pt': 'PT',
    'ru': 'RU',
    'ja': 'JA',
    'zh': 'ZH',
    'ko': 'KO',
    'pl': 'PL',
    'nl': 'NL',
    'ar': 'AR',
    'tr': 'TR',
    'sv': 'SV',
    'da': 'DA',
    'no': 'NO',
    'fi': 'FI',
    'cs': 'CS',
    'el': 'EL',
    'hu': 'HU',
    'ro': 'RO',
    'bg': 'BG',
    'sk': 'SK',
    'sl': 'SL',
    'et': 'ET',
    'lv': 'LV',
    'lt': 'LT',
    'uk': 'UK',
  };

  // Return mapped code or uppercase version
  return langMap[langCode.toLowerCase()] || langCode.toUpperCase();
}

/**
 * Get available translation providers based on API keys
 */
export function getAvailableProviders(): Array<'google' | 'deepl' | 'mymemory'> {
  const providers: Array<'google' | 'deepl' | 'mymemory'> = [];
  
  if (process.env.NEXT_PUBLIC_GOOGLE_TRANSLATE_API_KEY) {
    providers.push('google');
  }
  
  if (process.env.NEXT_PUBLIC_DEEPL_API_KEY) {
    providers.push('deepl');
  }
  
  // MyMemory is always available
  providers.push('mymemory');
  
  return providers;
}

