"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useTheme } from "@/components/ThemeProvider";

export default function AccountPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-light dark:bg-surface-dark">
        <div className="w-10 h-10 border-4 border-sift-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) return null;

  const user = session.user;
  const initials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? "?";

  return (
    <div className="min-h-screen bg-surface-light dark:bg-surface-dark">
      <div className="max-w-2xl mx-auto px-5 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="text-sift-gold hover:text-sift-gold-dark font-semibold text-sm flex items-center gap-1">
            <span>&larr;</span> Sift
          </Link>
          <ThemeToggle />
        </div>

        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">Account</h1>

        {/* Profile card */}
        <div className="bg-white dark:bg-gray-900 border border-border-light dark:border-border-dark rounded-xl p-6 mb-4">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">Profile</h2>
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 w-14 h-14 rounded-full bg-sift-gold text-white flex items-center justify-center text-xl font-bold overflow-hidden">
              {user?.image ? (
                <Image src={user.image} alt={user.name ?? "User"} width={56} height={56} className="w-14 h-14 object-cover" />
              ) : (
                initials
              )}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-800 dark:text-gray-100 truncate">{user?.name ?? "—"}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Preferences card */}
        <div className="bg-white dark:bg-gray-900 border border-border-light dark:border-border-dark rounded-xl p-6 mb-4">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">Preferences</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Theme</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                Currently {resolvedTheme === "dark" ? "dark" : "light"} mode
              </p>
            </div>
            <button
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              className="px-3 py-1.5 text-sm border border-border-light dark:border-border-dark rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            >
              {resolvedTheme === "dark" ? "Switch to light" : "Switch to dark"}
            </button>
          </div>
        </div>

        {/* Bookmarks card */}
        <div className="bg-white dark:bg-gray-900 border border-border-light dark:border-border-dark rounded-xl p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">Bookmarks</h2>
          <p className="text-sm text-gray-400 dark:text-gray-500">Coming soon</p>
        </div>

        {/* Sign out */}
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="w-full px-4 py-3 border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 font-semibold rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
