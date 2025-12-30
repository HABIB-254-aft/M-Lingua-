"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { resetPassword } from "@/lib/firebase/auth";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      alert("Please enter your email address");
      return;
    }

    try {
      const { error } = await resetPassword(email);
      
      if (error) {
        if (error.includes("user-not-found")) {
          alert("No account found with this email address.");
        } else {
          alert(`Error: ${error}`);
        }
        return;
      }

      // Success - show success message
      setIsSubmitted(true);
    } catch (error) {
      console.error("Password reset error:", error);
      alert("An error occurred. Please try again.");
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <section className="w-full max-w-md bg-white border border-slate-200 rounded-lg p-8 shadow-sm">
        <button
          onClick={() => router.back()}
          className="mb-6 inline-flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-md text-sm text-slate-700 bg-white hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
        >
          <span>←</span>
          <span>Back</span>
        </button>

        <h1 className="text-2xl font-bold mb-2">Forgot Password?</h1>
        <p className="text-sm text-slate-600 mb-6">
          Enter your email address and we'll send you instructions to reset your password.
        </p>

        {!isSubmitted ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 text-slate-900"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center px-4 py-3 bg-indigo-600 text-white font-semibold rounded-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50"
              >
                Send Reset Instructions
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-800">
                If an account exists with that email, we've sent password reset instructions. Please check your email.
              </p>
            </div>
            <button
              onClick={() => {
                setIsSubmitted(false);
                setEmail("");
              }}
              className="w-full inline-flex items-center justify-center px-4 py-3 bg-slate-100 text-slate-700 font-semibold rounded-md hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
            >
              Send Another Email
            </button>
          </div>
        )}

        <div className="mt-6 text-center">
          <p className="text-sm text-slate-700">
            Remember your password?{" "}
            <Link
              href="/login"
              className="text-indigo-600 hover:text-indigo-700 font-semibold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 rounded"
            >
              Log in
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}

