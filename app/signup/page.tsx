import Link from "next/link";
import { AuthButtons } from "@/components/auth/AuthButtons";
import { SignupForm } from "@/components/auth/SignupForm";

export default function SignupPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-surface-light dark:bg-surface-dark px-5 py-10">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-sift-gold hover:text-sift-gold-dark transition-colors">
            Sift
          </Link>
          <p className="mt-2 text-gray-500 dark:text-gray-400 text-sm">Create your account</p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-gray-900 border border-border-light dark:border-border-dark rounded-xl p-6 shadow-sm">
          <AuthButtons mode="signup" />

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-border-light dark:bg-border-dark" />
            <span className="text-xs text-gray-400 dark:text-gray-500">or</span>
            <div className="flex-1 h-px bg-border-light dark:bg-border-dark" />
          </div>

          <SignupForm />
        </div>

        {/* Footer link */}
        <p className="text-center mt-5 text-sm text-gray-500 dark:text-gray-400">
          Already have an account?{" "}
          <Link href="/login" className="text-sift-gold hover:text-sift-gold-dark font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
