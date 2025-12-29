"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";

export default function PrivacyPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-blue-900 py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => router.back()}
          className="mb-6 inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <span>←</span>
          <span>Back</span>
        </button>

        <h1 className="text-4xl font-bold mb-2 text-white text-center">Privacy Policy</h1>
        <p className="text-sm text-blue-300 mb-8 text-center">Last updated: {new Date().toLocaleDateString()}</p>

        <div className="space-y-4">
          <section className="bg-blue-800 border-l-4 border-blue-300 p-4 rounded">
            <h2 className="text-xl font-bold text-blue-400 mb-3">1. Introduction</h2>
            <p className="text-white leading-relaxed">
              M-Lingua ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our communication platform.
            </p>
          </section>

          <section className="bg-blue-800 border-l-4 border-blue-300 p-4 rounded">
            <h2 className="text-xl font-bold text-blue-400 mb-3">2. Information We Collect</h2>
            <p className="text-white leading-relaxed mb-2">We collect information that you provide directly to us, including:</p>
            <ul className="list-disc pl-6 text-white space-y-1">
              <li>Account information (name, email, username)</li>
              <li>Communication data (text, audio, translations)</li>
              <li>Usage data (how you interact with the platform)</li>
              <li>Device information (browser type, device type)</li>
              <li>Accessibility preferences</li>
            </ul>
          </section>

          <section className="bg-blue-800 border-l-4 border-blue-300 p-4 rounded">
            <h2 className="text-xl font-bold text-blue-400 mb-3">3. How We Use Your Information</h2>
            <p className="text-white leading-relaxed mb-2">We use the information we collect to:</p>
            <ul className="list-disc pl-6 text-white space-y-1">
              <li>Provide, maintain, and improve our services</li>
              <li>Process your communications and translations</li>
              <li>Personalize your experience</li>
              <li>Respond to your inquiries and support requests</li>
              <li>Ensure accessibility features work properly</li>
              <li>Detect and prevent technical issues</li>
            </ul>
          </section>

          <section className="bg-blue-800 border-l-4 border-blue-300 p-4 rounded">
            <h2 className="text-xl font-bold text-blue-400 mb-3">4. Data Storage</h2>
            <p className="text-white leading-relaxed">
              Currently, M-Lingua stores data locally on your device using browser storage (localStorage and IndexedDB). This means:
            </p>
            <ul className="list-disc pl-6 text-white space-y-1 mt-2">
              <li>Your data remains on your device</li>
              <li>We do not transmit your conversations to our servers</li>
              <li>You have full control over your data</li>
              <li>Data is cleared when you clear your browser data</li>
            </ul>
          </section>

          <section className="bg-blue-800 border-l-4 border-blue-300 p-4 rounded">
            <h2 className="text-xl font-bold text-blue-400 mb-3">5. Third-Party Services</h2>
            <p className="text-white leading-relaxed mb-2">
              M-Lingua uses the following third-party services:
            </p>
            <ul className="list-disc pl-6 text-white space-y-1">
              <li><strong className="text-blue-300">MyMemory Translation API:</strong> For translation services. Your text may be sent to this service for translation.</li>
              <li><strong className="text-blue-300">Google Sign-In:</strong> If you choose to sign in with Google, your authentication is handled by Google.</li>
              <li><strong className="text-blue-300">Browser APIs:</strong> We use Web Speech API and other browser-native features that process audio locally.</li>
            </ul>
          </section>

          <section className="bg-blue-800 border-l-4 border-blue-300 p-4 rounded">
            <h2 className="text-xl font-bold text-blue-400 mb-3">6. Data Security</h2>
            <p className="text-white leading-relaxed">
              We implement appropriate technical and organizational measures to protect your information. However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your information, we cannot guarantee absolute security.
            </p>
          </section>

          <section className="bg-blue-800 border-l-4 border-blue-300 p-4 rounded">
            <h2 className="text-xl font-bold text-blue-400 mb-3">7. Your Rights</h2>
            <p className="text-white leading-relaxed mb-2">You have the right to:</p>
            <ul className="list-disc pl-6 text-white space-y-1">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Delete your account and data</li>
              <li>Export your data</li>
              <li>Opt-out of certain data processing</li>
            </ul>
          </section>

          <section className="bg-blue-800 border-l-4 border-blue-300 p-4 rounded">
            <h2 className="text-xl font-bold text-blue-400 mb-3">8. Children's Privacy</h2>
            <p className="text-white leading-relaxed">
              M-Lingua is not intended for children under the age of 13. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us.
            </p>
          </section>

          <section className="bg-blue-800 border-l-4 border-blue-300 p-4 rounded">
            <h2 className="text-xl font-bold text-blue-400 mb-3">9. Changes to This Privacy Policy</h2>
            <p className="text-white leading-relaxed">
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
            </p>
          </section>

          <section className="bg-blue-800 border-l-4 border-blue-300 p-4 rounded">
            <h2 className="text-xl font-bold text-blue-400 mb-3">10. Contact Us</h2>
            <p className="text-white leading-relaxed">
              If you have any questions about this Privacy Policy, please contact us.
            </p>
          </section>
        </div>

        <div className="mt-8 pt-6 border-t border-blue-700">
          <Link
            href="/signup"
            className="text-blue-300 hover:text-blue-200 font-medium focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded"
          >
            ← Back to Sign Up
          </Link>
        </div>
      </div>
    </main>
  );
}

