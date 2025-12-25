import TextToSpeechCard from "./TextToSpeechCard";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="max-w-6xl mx-auto px-6 text-center">
        <h1 className="text-2xl md:text-3xl font-semibold text-blue-600 text-center">Speak. Sign. Hear. Understand.</h1>
        <p className="text-base text-gray-600 mt-3 text-center">Universal communication for everyone, regardless of ability or language.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
          <article className="border-2 border-gray-200 rounded-xl p-8 bg-white hover:border-blue-500 focus-visible:border-blue-500 focus-visible:outline-none">
            <div className="text-3xl mb-4">🎤</div>
            <div className="text-lg font-medium text-gray-900">Speech to Text</div>
            <p className="text-sm text-gray-600 mt-2">Convert spoken words into readable text instantly</p>
          </article>

          {/* Text to Speech — interactive card (preserves exact visuals) */}
          <TextToSpeechCard />

          <article className="border-2 border-gray-200 rounded-xl p-8 bg-white hover:border-blue-500 focus-visible:border-blue-500 focus-visible:outline-none">
            <div className="text-3xl mb-4">✋</div>
            <div className="text-lg font-medium text-gray-900">Speech to Sign</div>
            <p className="text-sm text-gray-600 mt-2">See spoken words translated to sign language</p>
          </article>

          <article className="border-2 border-gray-200 rounded-xl p-8 bg-white hover:border-blue-500 focus-visible:border-blue-500 focus-visible:outline-none">
            <div className="text-3xl mb-4">💬</div>
            <div className="text-lg font-medium text-gray-900">Conversation Mode</div>
            <p className="text-sm text-gray-600 mt-2">Real-time communication between different users</p>
          </article>

          <article className="border-2 border-gray-200 rounded-xl p-8 bg-white hover:border-blue-500 focus-visible:border-blue-500 focus-visible:outline-none">
            <div className="text-3xl mb-4">🌍</div>
            <div className="text-lg font-medium text-gray-900">Translation</div>
            <p className="text-sm text-gray-600 mt-2">Translate between multiple languages</p>
          </article>

          <article className="border-2 border-gray-200 rounded-xl p-8 bg-white hover:border-blue-500 focus-visible:border-blue-500 focus-visible:outline-none">
            <div className="text-3xl mb-4">✍️</div>
            <div className="text-lg font-medium text-gray-900">Text to Sign</div>
            <p className="text-sm text-gray-600 mt-2">Convert written text to sign language animation</p>
          </article>
        </div>
      </div>
    </main>
  );
}