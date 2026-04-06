"use client";

import { useEffect, useRef, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";

export function UserMenu() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (status === "loading") {
    return <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />;
  }

  if (status === "unauthenticated" || !session) {
    return (
      <Link
        href="/login"
        className="px-3 py-1.5 text-sm font-medium text-sift-gold hover:text-sift-gold-dark transition-colors cursor-pointer"
      >
        Sign in
      </Link>
    );
  }

  const user = session.user;
  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? "?";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-center w-8 h-8 rounded-full bg-sift-gold text-white text-sm font-semibold overflow-hidden cursor-pointer hover:bg-sift-gold-dark transition-colors"
        aria-label="User menu"
      >
        {user?.image ? (
          <Image src={user.image} alt={user.name ?? "User"} width={32} height={32} className="w-8 h-8 object-cover" />
        ) : (
          initials
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-900 border border-border-light dark:border-border-dark rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-border-light dark:border-border-dark">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
              {user?.name ?? "Account"}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
          </div>
          <Link
            href="/account"
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            Account
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="block w-full text-left px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
