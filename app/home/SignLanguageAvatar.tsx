"use client";

import { useEffect, useRef, useState } from "react";
import { syncSignDictionaryToIndexedDB, loadSignDictionaryFromIndexedDB, hasSignDictionaryInIndexedDB } from "@/lib/sign-dictionary-sync";
import { initDatabase } from "@/lib/indexeddb";

interface SignLanguageAvatarProps {
  text: string;
  speed?: number;
  containerId?: string;
}

export default function SignLanguageAvatar({ text, speed = 1, containerId = "sign-avatar" }: SignLanguageAvatarProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isAnimatingRef = useRef(false);
  const wordsQueueRef = useRef<string[]>([]);
  const currentWordRef = useRef<string>("");
  const animationStartTimeRef = useRef<number>(0);
  const signMapRef = useRef<Record<string, { type: string; color: string; emoji?: string }> | null>(null);
  const [isDictionaryLoaded, setIsDictionaryLoaded] = useState(false);

  // Get in-memory sign map (fallback)
  const getInMemorySignMap = (): Record<string, { type: string; color: string; emoji?: string }> => {
    // This will be populated below in getSignGesture
    return {};
  };

  // Initialize IndexedDB and load/sync dictionary
  useEffect(() => {
    const initializeDictionary = async () => {
      try {
        // Initialize IndexedDB
        await initDatabase();

        // Check if dictionary exists in IndexedDB
        const hasDictionary = await hasSignDictionaryInIndexedDB();
        
        if (hasDictionary) {
          // Load from IndexedDB
          const cachedMap = await loadSignDictionaryFromIndexedDB();
          if (cachedMap) {
            signMapRef.current = cachedMap;
            setIsDictionaryLoaded(true);
            return;
          }
        }

        // If no cached dictionary, will be populated when getSignGesture is called
        setIsDictionaryLoaded(true);
      } catch (error) {
        console.error('Failed to initialize dictionary:', error);
        setIsDictionaryLoaded(true);
      }
    };

    initializeDictionary();
  }, []);

  // Phrase dictionary - common phrases that should be signed as single units
  const getPhraseSign = (phrase: string): { type: string; color: string; emoji?: string } | null => {
    const phraseMap: Record<string, { type: string; color: string; emoji?: string }> = {
      // Greetings
      "good morning": { type: "good-morning", color: "#4CAF50", emoji: "🌅" },
      "good afternoon": { type: "good-afternoon", color: "#4CAF50", emoji: "☀️" },
      "good evening": { type: "good-evening", color: "#4CAF50", emoji: "🌆" },
      "good night": { type: "good-night", color: "#2196F3", emoji: "🌙" },
      "good bye": { type: "goodbye", color: "#4CAF50", emoji: "👋" },
      "goodbye": { type: "goodbye", color: "#4CAF50", emoji: "👋" },
      
      // Questions
      "how are you": { type: "how-are-you", color: "#00BCD4", emoji: "❓" },
      "how do you do": { type: "how-are-you", color: "#00BCD4", emoji: "❓" },
      "what is your name": { type: "what-name", color: "#00BCD4", emoji: "❓" },
      "what's your name": { type: "what-name", color: "#00BCD4", emoji: "❓" },
      "where are you from": { type: "where-from", color: "#00BCD4", emoji: "📍" },
      "where is": { type: "where-is", color: "#00BCD4", emoji: "📍" },
      "how much": { type: "how-much", color: "#00BCD4", emoji: "❓" },
      "how many": { type: "how-many", color: "#00BCD4", emoji: "❓" },
      "what time": { type: "what-time", color: "#00BCD4", emoji: "⏰" },
      "what's up": { type: "what-up", color: "#00BCD4", emoji: "❓" },
      
      // Politeness
      "thank you": { type: "thank-you", color: "#FF9800", emoji: "🙏" },
      "thanks a lot": { type: "thank-you-much", color: "#FF9800", emoji: "🙏" },
      "thank you very much": { type: "thank-you-much", color: "#FF9800", emoji: "🙏" },
      "you're welcome": { type: "welcome", color: "#4CAF50", emoji: "🙏" },
      "excuse me": { type: "excuse-me", color: "#795548", emoji: "🙏" },
      "i'm sorry": { type: "sorry", color: "#795548", emoji: "😔" },
      "i am sorry": { type: "sorry", color: "#795548", emoji: "😔" },
      
      // Common phrases
      "nice to meet you": { type: "nice-meet", color: "#4CAF50", emoji: "🤝" },
      "pleased to meet you": { type: "nice-meet", color: "#4CAF50", emoji: "🤝" },
      "see you later": { type: "see-later", color: "#4CAF50", emoji: "👋" },
      "see you soon": { type: "see-soon", color: "#4CAF50", emoji: "👋" },
      "take care": { type: "take-care", color: "#4CAF50", emoji: "🤗" },
      "have a good day": { type: "good-day", color: "#4CAF50", emoji: "☀️" },
      "have a nice day": { type: "good-day", color: "#4CAF50", emoji: "☀️" },
      
      // Actions
      "i need help": { type: "need-help", color: "#E91E63", emoji: "🆘" },
      "can you help": { type: "can-help", color: "#E91E63", emoji: "🆘" },
      "please help": { type: "please-help", color: "#E91E63", emoji: "🆘" },
      "i don't understand": { type: "dont-understand", color: "#00BCD4", emoji: "❓" },
      "i don't know": { type: "dont-know", color: "#00BCD4", emoji: "❓" },
      "i understand": { type: "understand", color: "#00BCD4", emoji: "💡" },
      
      // Time phrases
      "right now": { type: "now", color: "#FF9800", emoji: "⏰" },
      "later today": { type: "later-today", color: "#00BCD4", emoji: "⏰" },
      "next week": { type: "next-week", color: "#2196F3", emoji: "📅" },
      "last week": { type: "last-week", color: "#795548", emoji: "📅" },
      
      // Feelings
      "i'm fine": { type: "fine", color: "#4CAF50", emoji: "😊" },
      "i am fine": { type: "fine", color: "#4CAF50", emoji: "😊" },
      "i'm good": { type: "good", color: "#4CAF50", emoji: "👍" },
      "i am good": { type: "good", color: "#4CAF50", emoji: "👍" },
      "i'm okay": { type: "okay", color: "#2196F3", emoji: "👌" },
      "i am okay": { type: "okay", color: "#2196F3", emoji: "👌" },
      
      // Requests
      "can i": { type: "can-i", color: "#9C27B0", emoji: "🙏" },
      "may i": { type: "may-i", color: "#9C27B0", emoji: "🙏" },
      "could you": { type: "could-you", color: "#9C27B0", emoji: "🙏" },
      "would you": { type: "would-you", color: "#9C27B0", emoji: "🙏" },
    };

    // Normalize phrase (lowercase, remove extra spaces)
    const normalized = phrase.toLowerCase().trim().replace(/\s+/g, " ");
    
    // Try exact match
    if (phraseMap[normalized]) {
      return phraseMap[normalized];
    }
    
    // Try with punctuation removed
    const noPunctuation = normalized.replace(/[.,!?;:]/g, "");
    if (phraseMap[noPunctuation]) {
      return phraseMap[noPunctuation];
    }
    
    return null;
  };

  // Parse text into phrases and words (grammar-aware)
  const parseTextToSignUnits = (text: string): string[] => {
    if (!text || !text.trim()) return [];
    
    // Normalize text: lowercase, handle punctuation
    let normalized = text.toLowerCase().trim();
    
    // Remove excessive punctuation but keep sentence structure
    normalized = normalized.replace(/[.,!?;:]+/g, " ");
    normalized = normalized.replace(/\s+/g, " ");
    
    const units: string[] = [];
    const words = normalized.split(/\s+/).filter(w => w.length > 0);
    
    if (words.length === 0) return [];
    
    let i = 0;
    while (i < words.length) {
      let matched = false;
      
      // Try to match phrases of decreasing length (longest first)
      for (let phraseLength = Math.min(5, words.length - i); phraseLength >= 2; phraseLength--) {
        const phraseWords = words.slice(i, i + phraseLength);
        const phrase = phraseWords.join(" ");
        
        if (getPhraseSign(phrase)) {
          units.push(phrase);
          i += phraseLength;
          matched = true;
          break;
        }
      }
      
      // If no phrase matched, add single word
      if (!matched) {
        units.push(words[i]);
        i++;
      }
    }
    
    return units;
  };

  // Sign vocabulary mapping
  const getSignGesture = (word: string) => {
    // Use cached dictionary if available, otherwise create in-memory map
    let signMap: Record<string, { type: string; color: string; emoji?: string }>;
    
    if (signMapRef.current) {
      signMap = signMapRef.current;
    } else {
      // Create in-memory map and sync to IndexedDB
      signMap = {
      // Greetings
      hello: { type: "hello", color: "#4CAF50", emoji: "👋" },
      hi: { type: "hello", color: "#4CAF50", emoji: "👋" },
      hey: { type: "hello", color: "#4CAF50", emoji: "👋" },
      goodbye: { type: "goodbye", color: "#4CAF50", emoji: "👋" },
      bye: { type: "goodbye", color: "#4CAF50", emoji: "👋" },
      morning: { type: "good", color: "#4CAF50" },
      afternoon: { type: "good", color: "#4CAF50" },
      evening: { type: "good", color: "#4CAF50" },

      // Responses
      yes: { type: "yes", color: "#2196F3", emoji: "👍" },
      no: { type: "no", color: "#F44336", emoji: "👎" },
      ok: { type: "yes", color: "#2196F3", emoji: "👌" },
      okay: { type: "yes", color: "#2196F3", emoji: "👌" },
      sure: { type: "yes", color: "#2196F3", emoji: "👍" },
      maybe: { type: "maybe", color: "#FF9800" },

      // Politeness
      thank: { type: "thank", color: "#FF9800", emoji: "🙏" },
      thanks: { type: "thank", color: "#FF9800", emoji: "🙏" },
      please: { type: "please", color: "#9C27B0", emoji: "🙏" },
      sorry: { type: "sorry", color: "#795548", emoji: "😔" },
      excuse: { type: "sorry", color: "#795548" },
      pardon: { type: "sorry", color: "#795548" },
      welcome: { type: "welcome", color: "#4CAF50" },

      // Questions
      what: { type: "what", color: "#00BCD4", emoji: "❓" },
      where: { type: "where", color: "#00BCD4", emoji: "📍" },
      how: { type: "how", color: "#00BCD4", emoji: "❓" },
      when: { type: "when", color: "#00BCD4", emoji: "⏰" },
      why: { type: "why", color: "#00BCD4", emoji: "❓" },
      who: { type: "who", color: "#00BCD4", emoji: "👤" },
      which: { type: "what", color: "#00BCD4" },

      // Actions
      help: { type: "help", color: "#E91E63", emoji: "🆘" },
      stop: { type: "stop", color: "#F44336", emoji: "🛑" },
      go: { type: "go", color: "#4CAF50", emoji: "👉" },
      come: { type: "come", color: "#4CAF50", emoji: "👈" },
      wait: { type: "wait", color: "#FF9800" },
      look: { type: "look", color: "#2196F3", emoji: "👀" },
      see: { type: "look", color: "#2196F3", emoji: "👀" },
      listen: { type: "listen", color: "#9C27B0", emoji: "👂" },
      hear: { type: "listen", color: "#9C27B0", emoji: "👂" },
      speak: { type: "speak", color: "#00BCD4", emoji: "💬" },
      talk: { type: "speak", color: "#00BCD4", emoji: "💬" },
      read: { type: "read", color: "#607D8B" },
      write: { type: "write", color: "#607D8B" },

      // Emotions
      love: { type: "love", color: "#E91E63", emoji: "🤟" },
      like: { type: "like", color: "#E91E63", emoji: "❤️" },
      happy: { type: "happy", color: "#4CAF50", emoji: "😊" },
      sad: { type: "sad", color: "#2196F3", emoji: "😢" },
      angry: { type: "angry", color: "#F44336", emoji: "😠" },
      scared: { type: "scared", color: "#9C27B0", emoji: "😨" },
      tired: { type: "tired", color: "#795548", emoji: "😴" },

      // Descriptions
      good: { type: "good", color: "#4CAF50", emoji: "👍" },
      bad: { type: "bad", color: "#F44336", emoji: "👎" },
      big: { type: "big", color: "#FF9800", emoji: "⬆️" },
      small: { type: "small", color: "#00BCD4", emoji: "⬇️" },
      hot: { type: "hot", color: "#F44336", emoji: "🔥" },
      cold: { type: "cold", color: "#2196F3", emoji: "❄️" },
      fast: { type: "fast", color: "#E91E63", emoji: "⚡" },
      slow: { type: "slow", color: "#9C27B0" },

      // Time
      now: { type: "now", color: "#FF9800" },
      later: { type: "later", color: "#00BCD4" },
      today: { type: "today", color: "#4CAF50" },
      tomorrow: { type: "tomorrow", color: "#2196F3" },
      yesterday: { type: "yesterday", color: "#795548" },

      // People
      me: { type: "me", color: "#607D8B", emoji: "👈" },
      you: { type: "you", color: "#607D8B", emoji: "👉" },
      he: { type: "he", color: "#607D8B", emoji: "👤" },
      she: { type: "she", color: "#607D8B", emoji: "👤" },
      we: { type: "we", color: "#607D8B", emoji: "👥" },
      they: { type: "they", color: "#607D8B", emoji: "👥" },

      // Common words
      water: { type: "water", color: "#2196F3", emoji: "💧" },
      food: { type: "food", color: "#FF9800", emoji: "🍽️" },
      eat: { type: "eat", color: "#FF9800", emoji: "🍽️" },
      drink: { type: "drink", color: "#2196F3", emoji: "🥤" },
      home: { type: "home", color: "#9C27B0", emoji: "🏠" },
      work: { type: "work", color: "#607D8B", emoji: "💼" },
      school: { type: "school", color: "#00BCD4", emoji: "🏫" },
      hospital: { type: "hospital", color: "#E91E63", emoji: "🏥" },
      doctor: { type: "doctor", color: "#E91E63", emoji: "👨‍⚕️" },
      friend: { type: "friend", color: "#4CAF50", emoji: "👫" },
      family: { type: "family", color: "#E91E63", emoji: "👨‍👩‍👧‍👦" },
      name: { type: "name", color: "#607D8B" },
      understand: { type: "understand", color: "#00BCD4", emoji: "💡" },
      know: { type: "know", color: "#00BCD4", emoji: "💡" },
      think: { type: "think", color: "#9C27B0", emoji: "🤔" },
      remember: { type: "remember", color: "#9C27B0", emoji: "🧠" },
      forget: { type: "forget", color: "#795548" },

      // Numbers (0-100)
      zero: { type: "zero", color: "#607D8B" },
      one: { type: "one", color: "#607D8B" },
      two: { type: "two", color: "#607D8B" },
      three: { type: "three", color: "#607D8B" },
      four: { type: "four", color: "#607D8B" },
      five: { type: "five", color: "#607D8B" },
      six: { type: "six", color: "#607D8B" },
      seven: { type: "seven", color: "#607D8B" },
      eight: { type: "eight", color: "#607D8B" },
      nine: { type: "nine", color: "#607D8B" },
      ten: { type: "ten", color: "#607D8B" },
      eleven: { type: "eleven", color: "#607D8B" },
      twelve: { type: "twelve", color: "#607D8B" },
      thirteen: { type: "thirteen", color: "#607D8B" },
      fourteen: { type: "fourteen", color: "#607D8B" },
      fifteen: { type: "fifteen", color: "#607D8B" },
      sixteen: { type: "sixteen", color: "#607D8B" },
      seventeen: { type: "seventeen", color: "#607D8B" },
      eighteen: { type: "eighteen", color: "#607D8B" },
      nineteen: { type: "nineteen", color: "#607D8B" },
      twenty: { type: "twenty", color: "#607D8B" },
      thirty: { type: "thirty", color: "#607D8B" },
      forty: { type: "forty", color: "#607D8B" },
      fifty: { type: "fifty", color: "#607D8B" },
      sixty: { type: "sixty", color: "#607D8B" },
      seventy: { type: "seventy", color: "#607D8B" },
      eighty: { type: "eighty", color: "#607D8B" },
      ninety: { type: "ninety", color: "#607D8B" },
      hundred: { type: "hundred", color: "#607D8B" },

      // Days of the week
      monday: { type: "monday", color: "#2196F3", emoji: "📅" },
      tuesday: { type: "tuesday", color: "#2196F3", emoji: "📅" },
      wednesday: { type: "wednesday", color: "#2196F3", emoji: "📅" },
      thursday: { type: "thursday", color: "#2196F3", emoji: "📅" },
      friday: { type: "friday", color: "#2196F3", emoji: "📅" },
      saturday: { type: "saturday", color: "#2196F3", emoji: "📅" },
      sunday: { type: "sunday", color: "#2196F3", emoji: "📅" },
      day: { type: "day", color: "#2196F3", emoji: "☀️" },
      week: { type: "week", color: "#2196F3", emoji: "📅" },
      month: { type: "month", color: "#2196F3", emoji: "📆" },
      year: { type: "year", color: "#2196F3", emoji: "📅" },

      // Months
      january: { type: "january", color: "#2196F3", emoji: "📆" },
      february: { type: "february", color: "#2196F3", emoji: "📆" },
      march: { type: "march", color: "#2196F3", emoji: "📆" },
      april: { type: "april", color: "#2196F3", emoji: "📆" },
      may: { type: "may", color: "#2196F3", emoji: "📆" },
      june: { type: "june", color: "#2196F3", emoji: "📆" },
      july: { type: "july", color: "#2196F3", emoji: "📆" },
      august: { type: "august", color: "#2196F3", emoji: "📆" },
      september: { type: "september", color: "#2196F3", emoji: "📆" },
      october: { type: "october", color: "#2196F3", emoji: "📆" },
      november: { type: "november", color: "#2196F3", emoji: "📆" },
      december: { type: "december", color: "#2196F3", emoji: "📆" },

      // Time expressions
      hour: { type: "hour", color: "#FF9800", emoji: "⏰" },
      minute: { type: "minute", color: "#FF9800", emoji: "⏰" },
      second_time: { type: "second", color: "#FF9800", emoji: "⏰" },
      morning: { type: "morning", color: "#FF9800", emoji: "🌅" },
      noon: { type: "noon", color: "#FF9800", emoji: "☀️" },
      night: { type: "night", color: "#2196F3", emoji: "🌙" },
      midnight: { type: "midnight", color: "#2196F3", emoji: "🌙" },
      early: { type: "early", color: "#FF9800" },
      late: { type: "late", color: "#795548" },
      soon: { type: "soon", color: "#FF9800" },
      before: { type: "before", color: "#795548" },
      after: { type: "after", color: "#2196F3" },
      next: { type: "next", color: "#2196F3" },
      last: { type: "last", color: "#795548" },
      first: { type: "first", color: "#4CAF50" },
      second: { type: "second", color: "#4CAF50" },
      third: { type: "third", color: "#4CAF50" },

      // More Verbs
      run: { type: "run", color: "#E91E63", emoji: "🏃" },
      walk: { type: "walk", color: "#4CAF50", emoji: "🚶" },
      sit: { type: "sit", color: "#795548" },
      stand: { type: "stand", color: "#795548" },
      sleep: { type: "sleep", color: "#2196F3", emoji: "😴" },
      wake: { type: "wake", color: "#FF9800", emoji: "☀️" },
      open: { type: "open", color: "#4CAF50", emoji: "🚪" },
      close: { type: "close", color: "#F44336", emoji: "🚪" },
      start: { type: "start", color: "#4CAF50", emoji: "▶️" },
      finish: { type: "finish", color: "#795548", emoji: "🏁" },
      end: { type: "end", color: "#795548", emoji: "🏁" },
      begin: { type: "begin", color: "#4CAF50", emoji: "▶️" },
      make: { type: "make", color: "#FF9800" },
      do: { type: "do", color: "#FF9800" },
      get: { type: "get", color: "#4CAF50" },
      give: { type: "give", color: "#4CAF50", emoji: "🤲" },
      take: { type: "take", color: "#FF9800" },
      buy: { type: "buy", color: "#4CAF50", emoji: "💰" },
      sell: { type: "sell", color: "#FF9800", emoji: "💰" },
      pay: { type: "pay", color: "#4CAF50", emoji: "💵" },
      cost: { type: "cost", color: "#FF9800", emoji: "💰" },
      find: { type: "find", color: "#00BCD4", emoji: "🔍" },
      lose: { type: "lose", color: "#F44336" },
      search: { type: "search", color: "#00BCD4", emoji: "🔍" },
      play: { type: "play", color: "#E91E63", emoji: "🎮" },
      learn: { type: "learn", color: "#00BCD4", emoji: "📚" },
      teach: { type: "teach", color: "#00BCD4", emoji: "👨‍🏫" },
      study: { type: "study", color: "#00BCD4", emoji: "📖" },
      practice: { type: "practice", color: "#00BCD4", emoji: "📝" },
      try: { type: "try", color: "#FF9800" },
      want: { type: "want", color: "#E91E63", emoji: "💭" },
      need: { type: "need", color: "#E91E63", emoji: "🆘" },
      must: { type: "must", color: "#F44336" },
      should: { type: "should", color: "#FF9800" },
      can: { type: "can", color: "#4CAF50" },
      will: { type: "will", color: "#2196F3" },
      would: { type: "would", color: "#2196F3" },
      could: { type: "could", color: "#2196F3" },
      may: { type: "may", color: "#2196F3" },
      might: { type: "might", color: "#2196F3" },
      use: { type: "use", color: "#607D8B" },
      call: { type: "call", color: "#2196F3", emoji: "📞" },
      phone: { type: "phone", color: "#2196F3", emoji: "📱" },
      text: { type: "text", color: "#2196F3", emoji: "💬" },
      message: { type: "message", color: "#2196F3", emoji: "💬" },
      send: { type: "send", color: "#4CAF50", emoji: "📤" },
      receive: { type: "receive", color: "#4CAF50", emoji: "📥" },
      meet: { type: "meet", color: "#4CAF50", emoji: "🤝" },
      visit: { type: "visit", color: "#4CAF50", emoji: "🏠" },
      leave: { type: "leave", color: "#795548", emoji: "👋" },
      arrive: { type: "arrive", color: "#4CAF50", emoji: "📍" },
      travel: { type: "travel", color: "#2196F3", emoji: "✈️" },
      move: { type: "move", color: "#607D8B" },
      stay: { type: "stay", color: "#795548" },
      live: { type: "live", color: "#4CAF50", emoji: "🏠" },
      die: { type: "die", color: "#795548" },
      birth: { type: "birth", color: "#4CAF50", emoji: "🎂" },
      grow: { type: "grow", color: "#4CAF50", emoji: "🌱" },
      change: { type: "change", color: "#FF9800", emoji: "🔄" },
      become: { type: "become", color: "#FF9800" },
      turn: { type: "turn", color: "#FF9800", emoji: "🔄" },
      feel: { type: "feel", color: "#E91E63", emoji: "💭" },
      touch: { type: "touch", color: "#607D8B", emoji: "✋" },
      smell: { type: "smell", color: "#9C27B0", emoji: "👃" },
      taste: { type: "taste", color: "#FF9800", emoji: "👅" },
      show: { type: "show", color: "#2196F3", emoji: "👀" },
      hide: { type: "hide", color: "#795548" },
      bring: { type: "bring", color: "#4CAF50" },
      carry: { type: "carry", color: "#607D8B" },
      hold: { type: "hold", color: "#607D8B", emoji: "🤲" },
      drop: { type: "drop", color: "#F44336" },
      pick: { type: "pick", color: "#4CAF50" },
      choose: { type: "choose", color: "#4CAF50" },
      decide: { type: "decide", color: "#9C27B0", emoji: "🤔" },
      plan: { type: "plan", color: "#9C27B0", emoji: "📋" },
      prepare: { type: "prepare", color: "#FF9800" },
      cook: { type: "cook", color: "#FF9800", emoji: "👨‍🍳" },
      clean: { type: "clean", color: "#00BCD4", emoji: "🧹" },
      wash: { type: "wash", color: "#00BCD4", emoji: "🧼" },
      dry: { type: "dry", color: "#FF9800" },
      wear: { type: "wear", color: "#9C27B0", emoji: "👕" },
      dress: { type: "dress", color: "#9C27B0", emoji: "👗" },

      // More Nouns - Places
      store: { type: "store", color: "#FF9800", emoji: "🏪" },
      shop: { type: "shop", color: "#FF9800", emoji: "🛍️" },
      restaurant: { type: "restaurant", color: "#FF9800", emoji: "🍽️" },
      hotel: { type: "hotel", color: "#9C27B0", emoji: "🏨" },
      airport: { type: "airport", color: "#2196F3", emoji: "✈️" },
      station: { type: "station", color: "#607D8B", emoji: "🚉" },
      bus: { type: "bus", color: "#FF9800", emoji: "🚌" },
      train: { type: "train", color: "#607D8B", emoji: "🚂" },
      car: { type: "car", color: "#F44336", emoji: "🚗" },
      taxi: { type: "taxi", color: "#FFC107", emoji: "🚕" },
      street: { type: "street", color: "#795548" },
      road: { type: "road", color: "#795548" },
      park: { type: "park", color: "#4CAF50", emoji: "🌳" },
      library: { type: "library", color: "#00BCD4", emoji: "📚" },
      bank: { type: "bank", color: "#4CAF50", emoji: "🏦" },
      post: { type: "post", color: "#FF9800", emoji: "📮" },
      office: { type: "office", color: "#607D8B", emoji: "🏢" },
      building: { type: "building", color: "#607D8B", emoji: "🏢" },
      room: { type: "room", color: "#9C27B0", emoji: "🚪" },
      door: { type: "door", color: "#795548", emoji: "🚪" },
      window: { type: "window", color: "#00BCD4", emoji: "🪟" },
      wall: { type: "wall", color: "#795548" },
      floor: { type: "floor", color: "#795548" },
      ceiling: { type: "ceiling", color: "#607D8B" },
      bathroom: { type: "bathroom", color: "#00BCD4", emoji: "🚿" },
      toilet: { type: "toilet", color: "#00BCD4", emoji: "🚽" },
      kitchen: { type: "kitchen", color: "#FF9800", emoji: "🍳" },
      bedroom: { type: "bedroom", color: "#2196F3", emoji: "🛏️" },
      living: { type: "living", color: "#4CAF50", emoji: "🛋️" },

      // More Nouns - Objects
      table: { type: "table", color: "#795548", emoji: "🪑" },
      chair: { type: "chair", color: "#795548", emoji: "🪑" },
      bed: { type: "bed", color: "#2196F3", emoji: "🛏️" },
      pillow: { type: "pillow", color: "#2196F3", emoji: "🛏️" },
      blanket: { type: "blanket", color: "#2196F3", emoji: "🛏️" },
      book: { type: "book", color: "#607D8B", emoji: "📖" },
      paper: { type: "paper", color: "#607D8B", emoji: "📄" },
      pen: { type: "pen", color: "#607D8B", emoji: "✏️" },
      pencil: { type: "pencil", color: "#607D8B", emoji: "✏️" },
      computer: { type: "computer", color: "#2196F3", emoji: "💻" },
      laptop: { type: "laptop", color: "#2196F3", emoji: "💻" },
      screen: { type: "screen", color: "#2196F3", emoji: "🖥️" },
      keyboard: { type: "keyboard", color: "#607D8B", emoji: "⌨️" },
      mouse: { type: "mouse", color: "#607D8B", emoji: "🖱️" },
      bag: { type: "bag", color: "#9C27B0", emoji: "👜" },
      wallet: { type: "wallet", color: "#FFC107", emoji: "👛" },
      money: { type: "money", color: "#4CAF50", emoji: "💰" },
      dollar: { type: "dollar", color: "#4CAF50", emoji: "💵" },
      key: { type: "key", color: "#FFC107", emoji: "🔑" },
      lock: { type: "lock", color: "#795548", emoji: "🔒" },
      clock: { type: "clock", color: "#FF9800", emoji: "🕐" },
      watch: { type: "watch", color: "#FF9800", emoji: "⌚" },
      camera: { type: "camera", color: "#607D8B", emoji: "📷" },
      picture: { type: "picture", color: "#E91E63", emoji: "🖼️" },
      photo: { type: "photo", color: "#E91E63", emoji: "📸" },
      music: { type: "music", color: "#9C27B0", emoji: "🎵" },
      song: { type: "song", color: "#9C27B0", emoji: "🎵" },
      movie: { type: "movie", color: "#E91E63", emoji: "🎬" },
      film: { type: "film", color: "#E91E63", emoji: "🎬" },
      tv: { type: "tv", color: "#2196F3", emoji: "📺" },
      television: { type: "television", color: "#2196F3", emoji: "📺" },
      radio: { type: "radio", color: "#2196F3", emoji: "📻" },
      game: { type: "game", color: "#E91E63", emoji: "🎮" },
      toy: { type: "toy", color: "#E91E63", emoji: "🧸" },
      ball: { type: "ball", color: "#4CAF50", emoji: "⚽" },
      box: { type: "box", color: "#795548", emoji: "📦" },
      bottle: { type: "bottle", color: "#00BCD4", emoji: "🍼" },
      cup: { type: "cup", color: "#00BCD4", emoji: "☕" },
      glass: { type: "glass", color: "#00BCD4", emoji: "🥛" },
      plate: { type: "plate", color: "#FF9800", emoji: "🍽️" },
      bowl: { type: "bowl", color: "#FF9800", emoji: "🥣" },
      spoon: { type: "spoon", color: "#FF9800", emoji: "🥄" },
      fork: { type: "fork", color: "#FF9800", emoji: "🍴" },
      knife: { type: "knife", color: "#FF9800", emoji: "🔪" },
      light: { type: "light", color: "#FFC107", emoji: "💡" },
      lamp: { type: "lamp", color: "#FFC107", emoji: "💡" },
      candle: { type: "candle", color: "#FFC107", emoji: "🕯️" },
      fire: { type: "fire", color: "#F44336", emoji: "🔥" },
      match: { type: "match", color: "#F44336", emoji: "🔥" },
      medicine: { type: "medicine", color: "#E91E63", emoji: "💊" },
      pill: { type: "pill", color: "#E91E63", emoji: "💊" },
      bandage: { type: "bandage", color: "#E91E63", emoji: "🩹" },
      toothbrush: { type: "toothbrush", color: "#00BCD4", emoji: "🪥" },
      soap: { type: "soap", color: "#00BCD4", emoji: "🧼" },
      towel: { type: "towel", color: "#00BCD4", emoji: "🛁" },
      shower: { type: "shower", color: "#00BCD4", emoji: "🚿" },
      bath: { type: "bath", color: "#00BCD4", emoji: "🛁" },
      clothes: { type: "clothes", color: "#9C27B0", emoji: "👕" },
      shirt: { type: "shirt", color: "#9C27B0", emoji: "👕" },
      pants: { type: "pants", color: "#9C27B0", emoji: "👖" },
      shoes: { type: "shoes", color: "#795548", emoji: "👟" },
      hat: { type: "hat", color: "#FF9800", emoji: "🧢" },
      coat: { type: "coat", color: "#2196F3", emoji: "🧥" },
      jacket: { type: "jacket", color: "#2196F3", emoji: "🧥" },
      umbrella: { type: "umbrella", color: "#2196F3", emoji: "☂️" },
      rain: { type: "rain", color: "#2196F3", emoji: "🌧️" },
      snow: { type: "snow", color: "#00BCD4", emoji: "❄️" },
      sun: { type: "sun", color: "#FFC107", emoji: "☀️" },
      moon: { type: "moon", color: "#2196F3", emoji: "🌙" },
      star: { type: "star", color: "#FFC107", emoji: "⭐" },
      cloud: { type: "cloud", color: "#607D8B", emoji: "☁️" },
      wind: { type: "wind", color: "#00BCD4", emoji: "💨" },
      tree: { type: "tree", color: "#4CAF50", emoji: "🌳" },
      flower: { type: "flower", color: "#E91E63", emoji: "🌸" },
      grass: { type: "grass", color: "#4CAF50", emoji: "🌱" },
      animal: { type: "animal", color: "#FF9800", emoji: "🐾" },
      dog: { type: "dog", color: "#FF9800", emoji: "🐕" },
      cat: { type: "cat", color: "#FF9800", emoji: "🐈" },
      bird: { type: "bird", color: "#FF9800", emoji: "🐦" },
      fish: { type: "fish", color: "#00BCD4", emoji: "🐟" },
      horse: { type: "horse", color: "#795548", emoji: "🐴" },
      cow: { type: "cow", color: "#795548", emoji: "🐄" },
      pig: { type: "pig", color: "#E91E63", emoji: "🐷" },
      chicken: { type: "chicken", color: "#FFC107", emoji: "🐔" },
      egg: { type: "egg", color: "#FFC107", emoji: "🥚" },
      bread: { type: "bread", color: "#FFC107", emoji: "🍞" },
      rice: { type: "rice", color: "#FFC107", emoji: "🍚" },
      meat: { type: "meat", color: "#F44336", emoji: "🥩" },
      fruit: { type: "fruit", color: "#4CAF50", emoji: "🍎" },
      apple: { type: "apple", color: "#F44336", emoji: "🍎" },
      orange: { type: "orange", color: "#FF9800", emoji: "🍊" },
      banana: { type: "banana", color: "#FFC107", emoji: "🍌" },
      vegetable: { type: "vegetable", color: "#4CAF50", emoji: "🥬" },
      milk: { type: "milk", color: "#FFFFFF", emoji: "🥛" },
      juice: { type: "juice", color: "#FF9800", emoji: "🧃" },
      coffee: { type: "coffee", color: "#795548", emoji: "☕" },
      tea: { type: "tea", color: "#4CAF50", emoji: "🍵" },
      sugar: { type: "sugar", color: "#FFFFFF", emoji: "🍬" },
      salt: { type: "salt", color: "#FFFFFF", emoji: "🧂" },
      pepper: { type: "pepper", color: "#795548", emoji: "🌶️" },
      butter: { type: "butter", color: "#FFC107", emoji: "🧈" },
      cheese: { type: "cheese", color: "#FFC107", emoji: "🧀" },
      cake: { type: "cake", color: "#E91E63", emoji: "🎂" },
      cookie: { type: "cookie", color: "#795548", emoji: "🍪" },
      ice: { type: "ice", color: "#00BCD4", emoji: "🧊" },
      cream: { type: "cream", color: "#FFFFFF", emoji: "🍦" },

      // Body Parts
      head: { type: "head", color: "#607D8B", emoji: "👤" },
      face: { type: "face", color: "#607D8B", emoji: "😊" },
      eye: { type: "eye", color: "#2196F3", emoji: "👁️" },
      eyes: { type: "eyes", color: "#2196F3", emoji: "👀" },
      ear: { type: "ear", color: "#9C27B0", emoji: "👂" },
      nose: { type: "nose", color: "#9C27B0", emoji: "👃" },
      mouth: { type: "mouth", color: "#E91E63", emoji: "👄" },
      tooth: { type: "tooth", color: "#FFFFFF", emoji: "🦷" },
      teeth: { type: "teeth", color: "#FFFFFF", emoji: "🦷" },
      tongue: { type: "tongue", color: "#E91E63", emoji: "👅" },
      hair: { type: "hair", color: "#795548", emoji: "💇" },
      neck: { type: "neck", color: "#607D8B" },
      shoulder: { type: "shoulder", color: "#607D8B" },
      arm: { type: "arm", color: "#FF9800", emoji: "💪" },
      hand: { type: "hand", color: "#FF9800", emoji: "✋" },
      finger: { type: "finger", color: "#FF9800", emoji: "👆" },
      thumb: { type: "thumb", color: "#FF9800", emoji: "👍" },
      leg: { type: "leg", color: "#795548", emoji: "🦵" },
      foot: { type: "foot", color: "#795548", emoji: "🦶" },
      feet: { type: "feet", color: "#795548", emoji: "🦶" },
      knee: { type: "knee", color: "#795548" },
      back: { type: "back", color: "#607D8B" },
      chest: { type: "chest", color: "#607D8B" },
      stomach: { type: "stomach", color: "#607D8B", emoji: "🤰" },
      heart: { type: "heart", color: "#E91E63", emoji: "❤️" },
      blood: { type: "blood", color: "#F44336", emoji: "🩸" },
      bone: { type: "bone", color: "#FFFFFF", emoji: "🦴" },
      skin: { type: "skin", color: "#FFDBAC", emoji: "👋" },

      // People & Relationships
      person: { type: "person", color: "#607D8B", emoji: "👤" },
      people: { type: "people", color: "#607D8B", emoji: "👥" },
      man: { type: "man", color: "#2196F3", emoji: "👨" },
      woman: { type: "woman", color: "#E91E63", emoji: "👩" },
      boy: { type: "boy", color: "#2196F3", emoji: "👦" },
      girl: { type: "girl", color: "#E91E63", emoji: "👧" },
      child: { type: "child", color: "#FF9800", emoji: "🧒" },
      children: { type: "children", color: "#FF9800", emoji: "👶" },
      baby: { type: "baby", color: "#FFC107", emoji: "👶" },
      parent: { type: "parent", color: "#4CAF50", emoji: "👨‍👩‍👧" },
      father: { type: "father", color: "#2196F3", emoji: "👨" },
      dad: { type: "dad", color: "#2196F3", emoji: "👨" },
      mother: { type: "mother", color: "#E91E63", emoji: "👩" },
      mom: { type: "mom", color: "#E91E63", emoji: "👩" },
      son: { type: "son", color: "#2196F3", emoji: "👦" },
      daughter: { type: "daughter", color: "#E91E63", emoji: "👧" },
      brother: { type: "brother", color: "#2196F3", emoji: "👨" },
      sister: { type: "sister", color: "#E91E63", emoji: "👩" },
      uncle: { type: "uncle", color: "#2196F3", emoji: "👨" },
      aunt: { type: "aunt", color: "#E91E63", emoji: "👩" },
      cousin: { type: "cousin", color: "#607D8B", emoji: "👤" },
      grandfather: { type: "grandfather", color: "#795548", emoji: "👴" },
      grandmother: { type: "grandmother", color: "#795548", emoji: "👵" },
      grandpa: { type: "grandpa", color: "#795548", emoji: "👴" },
      grandma: { type: "grandma", color: "#795548", emoji: "👵" },
      husband: { type: "husband", color: "#2196F3", emoji: "👨" },
      wife: { type: "wife", color: "#E91E63", emoji: "👩" },
      boyfriend: { type: "boyfriend", color: "#2196F3", emoji: "👨" },
      girlfriend: { type: "girlfriend", color: "#E91E63", emoji: "👩" },
      neighbor: { type: "neighbor", color: "#4CAF50", emoji: "👋" },
      teacher: { type: "teacher", color: "#00BCD4", emoji: "👨‍🏫" },
      student: { type: "student", color: "#00BCD4", emoji: "👨‍🎓" },
      nurse: { type: "nurse", color: "#E91E63", emoji: "👩‍⚕️" },
      police: { type: "police", color: "#2196F3", emoji: "👮" },
      firefighter: { type: "firefighter", color: "#F44336", emoji: "👨‍🚒" },
      driver: { type: "driver", color: "#FF9800", emoji: "🚗" },
      worker: { type: "worker", color: "#607D8B", emoji: "👷" },
      boss: { type: "boss", color: "#FF9800", emoji: "👔" },
      employee: { type: "employee", color: "#607D8B", emoji: "👤" },
      customer: { type: "customer", color: "#4CAF50", emoji: "👤" },
      client: { type: "client", color: "#4CAF50", emoji: "👤" },

      // More Adjectives
      new: { type: "new", color: "#4CAF50", emoji: "✨" },
      old: { type: "old", color: "#795548" },
      young: { type: "young", color: "#4CAF50" },
      beautiful: { type: "beautiful", color: "#E91E63", emoji: "✨" },
      ugly: { type: "ugly", color: "#795548" },
      pretty: { type: "pretty", color: "#E91E63", emoji: "✨" },
      handsome: { type: "handsome", color: "#2196F3", emoji: "✨" },
      clean: { type: "clean", color: "#00BCD4", emoji: "✨" },
      dirty: { type: "dirty", color: "#795548" },
      fresh: { type: "fresh", color: "#4CAF50", emoji: "🌿" },
      stale: { type: "stale", color: "#795548" },
      full: { type: "full", color: "#4CAF50", emoji: "✅" },
      empty: { type: "empty", color: "#607D8B" },
      heavy: { type: "heavy", color: "#795548" },
      light_weight: { type: "light", color: "#00BCD4" },
      light: { type: "light", color: "#00BCD4" },
      easy: { type: "easy", color: "#4CAF50", emoji: "👍" },
      hard: { type: "hard", color: "#795548" },
      difficult: { type: "difficult", color: "#F44336" },
      simple: { type: "simple", color: "#4CAF50" },
      complex: { type: "complex", color: "#9C27B0" },
      important: { type: "important", color: "#F44336", emoji: "⚠️" },
      necessary: { type: "necessary", color: "#F44336", emoji: "⚠️" },
      possible: { type: "possible", color: "#4CAF50", emoji: "✅" },
      impossible: { type: "impossible", color: "#F44336", emoji: "❌" },
      ready: { type: "ready", color: "#4CAF50", emoji: "✅" },
      busy: { type: "busy", color: "#FF9800", emoji: "⏰" },
      free: { type: "free", color: "#4CAF50", emoji: "🆓" },
      available: { type: "available", color: "#4CAF50", emoji: "✅" },
      safe: { type: "safe", color: "#4CAF50", emoji: "🛡️" },
      dangerous: { type: "dangerous", color: "#F44336", emoji: "⚠️" },
      healthy: { type: "healthy", color: "#4CAF50", emoji: "💚" },
      sick: { type: "sick", color: "#F44336", emoji: "🤒" },
      ill: { type: "ill", color: "#F44336", emoji: "🤒" },
      well: { type: "well", color: "#4CAF50", emoji: "✅" },
      better: { type: "better", color: "#4CAF50", emoji: "📈" },
      worse: { type: "worse", color: "#F44336", emoji: "📉" },
      best: { type: "best", color: "#4CAF50", emoji: "⭐" },
      worst: { type: "worst", color: "#F44336", emoji: "💔" },
      right: { type: "right", color: "#4CAF50", emoji: "✅" },
      wrong: { type: "wrong", color: "#F44336", emoji: "❌" },
      correct: { type: "correct", color: "#4CAF50", emoji: "✅" },
      incorrect: { type: "incorrect", color: "#F44336", emoji: "❌" },
      true: { type: "true", color: "#4CAF50", emoji: "✅" },
      false: { type: "false", color: "#F44336", emoji: "❌" },
      real: { type: "real", color: "#4CAF50", emoji: "✅" },
      fake: { type: "fake", color: "#795548" },
      same: { type: "same", color: "#607D8B" },
      different: { type: "different", color: "#FF9800", emoji: "🔄" },
      similar: { type: "similar", color: "#FF9800", emoji: "🔄" },
      special: { type: "special", color: "#E91E63", emoji: "⭐" },
      normal: { type: "normal", color: "#607D8B" },
      usual: { type: "usual", color: "#607D8B" },
      unusual: { type: "unusual", color: "#9C27B0" },
      strange: { type: "strange", color: "#9C27B0" },
      weird: { type: "weird", color: "#9C27B0" },
      funny: { type: "funny", color: "#FFC107", emoji: "😄" },
      serious: { type: "serious", color: "#795548" },
      quiet: { type: "quiet", color: "#00BCD4" },
      loud: { type: "loud", color: "#F44336", emoji: "🔊" },
      noisy: { type: "noisy", color: "#F44336", emoji: "🔊" },
      calm: { type: "calm", color: "#00BCD4", emoji: "😌" },
      excited: { type: "excited", color: "#E91E63", emoji: "🎉" },
      nervous: { type: "nervous", color: "#FF9800", emoji: "😰" },
      worried: { type: "worried", color: "#FF9800", emoji: "😟" },
      afraid: { type: "afraid", color: "#9C27B0", emoji: "😨" },
      brave: { type: "brave", color: "#4CAF50", emoji: "🦸" },
      strong: { type: "strong", color: "#FF9800", emoji: "💪" },
      weak: { type: "weak", color: "#795548" },
      rich: { type: "rich", color: "#FFC107", emoji: "💰" },
      poor: { type: "poor", color: "#795548" },
      expensive: { type: "expensive", color: "#F44336", emoji: "💰" },
      cheap: { type: "cheap", color: "#4CAF50", emoji: "💰" },
      free_cost: { type: "free", color: "#4CAF50", emoji: "🆓" },
      free: { type: "free", color: "#4CAF50", emoji: "🆓" },
      high: { type: "high", color: "#FF9800", emoji: "⬆️" },
      low: { type: "low", color: "#00BCD4", emoji: "⬇️" },
      tall: { type: "tall", color: "#FF9800", emoji: "⬆️" },
      short_height: { type: "short", color: "#00BCD4", emoji: "⬇️" },
      short_length: { type: "short", color: "#00BCD4", emoji: "↔️" },
      short: { type: "short", color: "#00BCD4", emoji: "⬇️" },
      long: { type: "long", color: "#FF9800", emoji: "↔️" },
      wide: { type: "wide", color: "#FF9800", emoji: "↔️" },
      narrow: { type: "narrow", color: "#00BCD4" },
      thick: { type: "thick", color: "#795548" },
      thin: { type: "thin", color: "#00BCD4" },
      deep: { type: "deep", color: "#2196F3", emoji: "⬇️" },
      shallow: { type: "shallow", color: "#00BCD4" },
      round: { type: "round", color: "#FF9800", emoji: "⭕" },
      square: { type: "square", color: "#607D8B", emoji: "⬜" },
      straight: { type: "straight", color: "#607D8B" },
      curved: { type: "curved", color: "#9C27B0", emoji: "〰️" },
      sharp: { type: "sharp", color: "#F44336", emoji: "🔪" },
      dull: { type: "dull", color: "#795548" },
      smooth: { type: "smooth", color: "#00BCD4" },
      rough: { type: "rough", color: "#795548" },
      soft: { type: "soft", color: "#E91E63", emoji: "🪶" },
      hard_texture: { type: "hard", color: "#795548" },
      wet: { type: "wet", color: "#2196F3", emoji: "💧" },
      dry_adj: { type: "dry", color: "#FF9800" },
      dry: { type: "dry", color: "#FF9800" },
      warm: { type: "warm", color: "#FF9800", emoji: "🔥" },
      cool: { type: "cool", color: "#00BCD4", emoji: "❄️" },
      dark: { type: "dark", color: "#795548", emoji: "🌑" },
      bright: { type: "bright", color: "#FFC107", emoji: "💡" },
      colorful: { type: "colorful", color: "#E91E63", emoji: "🌈" },
      white: { type: "white", color: "#FFFFFF", emoji: "⚪" },
      black: { type: "black", color: "#000000", emoji: "⚫" },
      red: { type: "red", color: "#F44336", emoji: "🔴" },
      blue: { type: "blue", color: "#2196F3", emoji: "🔵" },
      green: { type: "green", color: "#4CAF50", emoji: "🟢" },
      yellow: { type: "yellow", color: "#FFC107", emoji: "🟡" },
      orange: { type: "orange", color: "#FF9800", emoji: "🟠" },
      purple: { type: "purple", color: "#9C27B0", emoji: "🟣" },
      pink: { type: "pink", color: "#E91E63", emoji: "🌸" },
      brown: { type: "brown", color: "#795548", emoji: "🟤" },
      gray: { type: "gray", color: "#607D8B", emoji: "⚫" },
      grey: { type: "grey", color: "#607D8B", emoji: "⚫" },

      // Conjunctions & Connectors
      and: { type: "and", color: "#607D8B" },
      or: { type: "or", color: "#607D8B" },
      but: { type: "but", color: "#607D8B" },
      because: { type: "because", color: "#00BCD4", emoji: "💭" },
      so: { type: "so", color: "#00BCD4", emoji: "💭" },
      if: { type: "if", color: "#00BCD4", emoji: "❓" },
      then: { type: "then", color: "#00BCD4", emoji: "➡️" },
      than: { type: "than", color: "#607D8B" },
      that: { type: "that", color: "#607D8B" },
      this: { type: "this", color: "#607D8B", emoji: "👉" },
      these: { type: "these", color: "#607D8B", emoji: "👉" },
      those: { type: "those", color: "#607D8B", emoji: "👉" },
      here: { type: "here", color: "#4CAF50", emoji: "📍" },
      there: { type: "there", color: "#00BCD4", emoji: "📍" },
      where: { type: "where", color: "#00BCD4", emoji: "📍" },
      everywhere: { type: "everywhere", color: "#00BCD4", emoji: "🌍" },
      somewhere: { type: "somewhere", color: "#00BCD4", emoji: "📍" },
      anywhere: { type: "anywhere", color: "#00BCD4", emoji: "📍" },
      nowhere: { type: "nowhere", color: "#795548" },
      inside: { type: "inside", color: "#9C27B0", emoji: "📦" },
      outside: { type: "outside", color: "#4CAF50", emoji: "🌳" },
      up: { type: "up", color: "#FF9800", emoji: "⬆️" },
      down: { type: "down", color: "#00BCD4", emoji: "⬇️" },
      left: { type: "left", color: "#2196F3", emoji: "⬅️" },
      right_direction: { type: "right", color: "#4CAF50", emoji: "➡️" },
      right_dir: { type: "right", color: "#4CAF50", emoji: "➡️" },
      front: { type: "front", color: "#FF9800", emoji: "👉" },
      back_direction: { type: "back", color: "#795548", emoji: "👈" },
      back_dir: { type: "back", color: "#795548", emoji: "👈" },
      side: { type: "side", color: "#607D8B" },
      top: { type: "top", color: "#FF9800", emoji: "⬆️" },
      bottom: { type: "bottom", color: "#00BCD4", emoji: "⬇️" },
      middle: { type: "middle", color: "#607D8B" },
      center: { type: "center", color: "#607D8B" },
      near: { type: "near", color: "#4CAF50", emoji: "📍" },
      far: { type: "far", color: "#795548", emoji: "📍" },
      close_distance: { type: "close", color: "#4CAF50", emoji: "📍" },
      close: { type: "close", color: "#4CAF50", emoji: "📍" },
      far_distance: { type: "far", color: "#795548", emoji: "📍" },
      with: { type: "with", color: "#607D8B", emoji: "🤝" },
      without: { type: "without", color: "#795548" },
      from: { type: "from", color: "#607D8B", emoji: "👈" },
      to: { type: "to", color: "#607D8B", emoji: "➡️" },
      into: { type: "into", color: "#9C27B0", emoji: "📦" },
      onto: { type: "onto", color: "#FF9800", emoji: "⬆️" },
      upon: { type: "upon", color: "#FF9800", emoji: "⬆️" },
      over: { type: "over", color: "#FF9800", emoji: "⬆️" },
      under: { type: "under", color: "#00BCD4", emoji: "⬇️" },
      below: { type: "below", color: "#00BCD4", emoji: "⬇️" },
      above: { type: "above", color: "#FF9800", emoji: "⬆️" },
      through: { type: "through", color: "#9C27B0", emoji: "➡️" },
      across: { type: "across", color: "#4CAF50", emoji: "↔️" },
      around: { type: "around", color: "#FF9800", emoji: "🔄" },
      between: { type: "between", color: "#607D8B", emoji: "↔️" },
      among: { type: "among", color: "#607D8B", emoji: "👥" },
      during: { type: "during", color: "#FF9800", emoji: "⏰" },
      while: { type: "while", color: "#FF9800", emoji: "⏰" },
      until: { type: "until", color: "#795548", emoji: "⏰" },
      since: { type: "since", color: "#795548", emoji: "⏰" },
      for_prep: { type: "for", color: "#607D8B", emoji: "➡️" },
      of: { type: "of", color: "#607D8B" },
      about: { type: "about", color: "#607D8B", emoji: "💭" },
      against: { type: "against", color: "#F44336", emoji: "👊" },
      toward: { type: "toward", color: "#4CAF50", emoji: "➡️" },
      towards: { type: "towards", color: "#4CAF50", emoji: "➡️" },
      behind: { type: "behind", color: "#795548", emoji: "👈" },
      beside: { type: "beside", color: "#607D8B", emoji: "↔️" },
      next_to: { type: "next", color: "#607D8B", emoji: "➡️" },
      by: { type: "by", color: "#607D8B", emoji: "📍" },
      at: { type: "at", color: "#607D8B", emoji: "📍" },
      in: { type: "in", color: "#9C27B0", emoji: "📦" },
      on: { type: "on", color: "#FF9800", emoji: "⬆️" },
      off: { type: "off", color: "#795548", emoji: "⬇️" },
      out: { type: "out", color: "#4CAF50", emoji: "➡️" },
      away: { type: "away", color: "#795548", emoji: "👋" },
    };

      // Sync to IndexedDB in background (only if not already cached)
      if (!signMapRef.current) {
        signMapRef.current = signMap;
        syncSignDictionaryToIndexedDB(signMap).catch(console.error);
      }
    }

    // Try exact match first
    if (signMap[word]) {
      return signMap[word];
    }

    // Try partial match
    for (const [key, value] of Object.entries(signMap)) {
      if (word.includes(key) || key.includes(word)) {
        return value;
      }
    }

    return { type: "default", color: "#607D8B", emoji: "👋" };
  };

  const drawIdleState = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.font = "bold 18px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Sign Language Avatar", width / 2, height / 2 - 20);
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.font = "14px Arial";
    ctx.fillText("Ready to sign...", width / 2, height / 2 + 10);
  };

  const drawSignAnimation = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    sign: { type: string; color: string; emoji?: string },
    progress: number
  ) => {
    ctx.clearRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2;
    const scale = Math.min(width, height) / 300;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.scale(scale, scale);

    // Draw sign based on type
    if (sign.emoji) {
      // Draw emoji representation
      ctx.font = `${80 * (0.5 + progress * 0.5)}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(sign.emoji, 0, 0);
    } else {
      // Draw animated circle for unknown signs
      const radius = 30 + progress * 20;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fillStyle = sign.color;
      ctx.globalAlpha = 0.7;
      ctx.fill();
      ctx.globalAlpha = 1.0;
    }

    // Draw word text below
    ctx.font = "bold 16px Arial";
    ctx.fillStyle = sign.color;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(currentWordRef.current, 0, 60);

    ctx.restore();
  };

  const animateSign = (text: string) => {
    if (!text || !text.trim()) {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          drawIdleState(ctx, canvas.width, canvas.height);
        }
      }
      return;
    }

    if (isAnimatingRef.current) {
      // Stop current animation
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }

    isAnimatingRef.current = true;
    // Parse text into phrases and words (grammar-aware)
    const signUnits = parseTextToSignUnits(text);
    wordsQueueRef.current = signUnits;
    let unitIndex = 0;

    const animateUnit = () => {
      if (unitIndex >= wordsQueueRef.current.length) {
        isAnimatingRef.current = false;
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext("2d");
          if (ctx) {
            drawIdleState(ctx, canvas.width, canvas.height);
          }
        }
        return;
      }

      const unit = wordsQueueRef.current[unitIndex];
      currentWordRef.current = unit;
      
      // Try phrase first, then fall back to word
      let sign = getPhraseSign(unit);
      if (!sign) {
        sign = getSignGesture(unit);
      }
      
      // Longer phrases get slightly longer duration
      const baseDuration = 1500 / speed;
      const isPhrase = unit.split(/\s+/).length > 1;
      const duration = isPhrase ? baseDuration * 1.3 : baseDuration;
      animationStartTimeRef.current = Date.now();

      const animate = () => {
        const elapsed = Date.now() - animationStartTimeRef.current;
        const progress = Math.min(elapsed / duration, 1);

        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext("2d");
          if (ctx) {
            drawSignAnimation(ctx, canvas.width, canvas.height, sign, progress);
          }
        }

        if (progress < 1) {
          animationFrameRef.current = requestAnimationFrame(animate);
        } else {
          unitIndex++;
          // Slightly longer pause between phrases vs words
          const pauseDuration = isPhrase ? 600 / speed : 500 / speed;
          setTimeout(() => {
            animateUnit();
          }, pauseDuration);
        }
      };

      animate();
    };

    animateUnit();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const container = document.getElementById(containerId);
    if (container) {
      canvas.width = container.clientWidth || 400;
      canvas.height = container.clientHeight || 300;
    }

    const ctx = canvas.getContext("2d");
    if (ctx) {
      drawIdleState(ctx, canvas.width, canvas.height);
    }

    // Animate when text changes
    if (text) {
      animateSign(text);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      isAnimatingRef.current = false;
    };
  }, [text, speed, containerId]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}
      aria-label="Sign language avatar"
    />
  );
}

