"use client";

import { useEffect, useRef, useState } from "react";

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
    const signMap: Record<string, { type: string; color: string; emoji?: string }> = {
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
    };

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

