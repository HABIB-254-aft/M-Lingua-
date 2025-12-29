"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";

export default function TermsPage() {
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

        <h1 className="text-4xl font-bold mb-2 text-white text-center">Terms and Conditions</h1>
        <p className="text-sm text-blue-300 mb-8 text-center">Last updated: {new Date().toLocaleDateString()}</p>

        <div className="space-y-4">
          <section className="bg-blue-800 border-l-4 border-blue-300 p-4 rounded">
            <h2 className="text-xl font-bold text-blue-400 mb-3">1. Acceptance of Terms</h2>
            <p className="text-white leading-relaxed">
              By accessing and using M-Lingua, you accept and agree to be bound by the terms and provision of this agreement.
            </p>
          </section>

          <section className="bg-blue-800 border-l-4 border-blue-300 p-4 rounded">
            <h2 className="text-xl font-bold text-blue-400 mb-3">2. Use License</h2>
            <p className="text-white leading-relaxed mb-2">
              Permission is granted to temporarily use M-Lingua for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
            </p>
            <ul className="list-disc pl-6 text-white space-y-1">
              <li>Modify or copy the materials</li>
              <li>Use the materials for any commercial purpose or for any public display</li>
              <li>Attempt to reverse engineer any software contained in M-Lingua</li>
              <li>Remove any copyright or other proprietary notations from the materials</li>
            </ul>
          </section>

          <section className="bg-blue-800 border-l-4 border-blue-300 p-4 rounded">
            <h2 className="text-xl font-bold text-blue-400 mb-3">3. User Account</h2>
            <p className="text-white leading-relaxed mb-2">
              When you create an account with us, you must provide information that is accurate, complete, and current at all times. You are responsible for:
            </p>
            <ul className="list-disc pl-6 text-white space-y-1">
              <li>Maintaining the security of your account and password</li>
              <li>All activities that occur under your account</li>
              <li>Notifying us immediately of any unauthorized use of your account</li>
            </ul>
          </section>

          <section className="bg-blue-800 border-l-4 border-blue-300 p-4 rounded">
            <h2 className="text-xl font-bold text-blue-400 mb-3">4. Accessibility Features</h2>
            <p className="text-white leading-relaxed">
              M-Lingua is designed to be accessible to users with disabilities. We are committed to providing an inclusive communication platform. However, we cannot guarantee that all features will work perfectly on all devices or in all situations.
            </p>
          </section>

          <section className="bg-blue-800 border-l-4 border-blue-300 p-4 rounded">
            <h2 className="text-xl font-bold text-blue-400 mb-3">5. Privacy</h2>
            <p className="text-white leading-relaxed">
              Your use of M-Lingua is also governed by our Privacy Policy. Please review our Privacy Policy, which also governs your use of the service, to understand our practices.
            </p>
          </section>

          <section className="bg-blue-800 border-l-4 border-blue-300 p-4 rounded">
            <h2 className="text-xl font-bold text-blue-400 mb-3">6. Disclaimer</h2>
            <p className="text-white leading-relaxed">
              The materials on M-Lingua are provided on an 'as is' basis. M-Lingua makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
            </p>
          </section>

          <section className="bg-blue-800 border-l-4 border-blue-300 p-4 rounded">
            <h2 className="text-xl font-bold text-blue-400 mb-3">7. Limitations</h2>
            <p className="text-white leading-relaxed">
              In no event shall M-Lingua or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use M-Lingua, even if M-Lingua or a M-Lingua authorized representative has been notified orally or in writing of the possibility of such damage.
            </p>
          </section>

          <section className="bg-blue-800 border-l-4 border-blue-300 p-4 rounded">
            <h2 className="text-xl font-bold text-blue-400 mb-3">8. Revisions</h2>
            <p className="text-white leading-relaxed">
              M-Lingua may revise these terms of service at any time without notice. By using this service you are agreeing to be bound by the then current version of these terms of service.
            </p>
          </section>

          <section className="bg-blue-800 border-l-4 border-blue-300 p-4 rounded">
            <h2 className="text-xl font-bold text-blue-400 mb-3">9. Contact Information</h2>
            <p className="text-white leading-relaxed">
              If you have any questions about these Terms and Conditions, please contact us.
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

