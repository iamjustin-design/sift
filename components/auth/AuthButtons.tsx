"use client";

import { signIn } from "next-auth/react";

interface AuthButtonsProps {
  mode: "signin" | "signup";
}

export function AuthButtons({ mode }: AuthButtonsProps) {
  const label = mode === "signin" ? "Sign in" : "Sign up";

  return (
    <div className="flex flex-col gap-3">
      {/* Google */}
      <button
        onClick={() => signIn("google", { callbackUrl: "/" })}
        className="flex items-center justify-center gap-3 w-full px-4 py-3 bg-white border border-border-light rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M17.64 9.2045c0-.638-.0573-1.2518-.1636-1.8409H9v3.4814h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.7164v2.2581h2.9087c1.7018-1.5668 2.6836-3.874 2.6836-6.615z" fill="#4285F4"/>
          <path d="M9 18c2.43 0 4.4673-.806 5.9564-2.1805l-2.9087-2.2581c-.8059.54-1.8368.859-3.0477.859-2.3436 0-4.3282-1.5832-5.036-3.7104H.9574v2.3318C2.4382 15.9832 5.4818 18 9 18z" fill="#34A853"/>
          <path d="M3.964 10.71c-.18-.54-.2827-1.1168-.2827-1.71s.1027-1.17.2827-1.71V4.9582H.9573A8.9965 8.9965 0 000 9c0 1.4514.3477 2.8268.9573 4.0418L3.964 10.71z" fill="#FBBC05"/>
          <path d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.346l2.5813-2.5814C13.4632.8918 11.426 0 9 0 5.4818 0 2.4382 2.0168.9573 4.9582L3.964 7.29C4.6718 5.1627 6.6564 3.5795 9 3.5795z" fill="#EA4335"/>
        </svg>
        {label} with Google
      </button>

      {/* Apple */}
      <button
        onClick={() => signIn("apple", { callbackUrl: "/" })}
        className="flex items-center justify-center gap-3 w-full px-4 py-3 bg-black border border-black rounded-lg font-medium text-white hover:bg-gray-900 transition-colors cursor-pointer"
      >
        <svg width="17" height="20" viewBox="0 0 17 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M13.8667 10.5987C13.8534 8.83159 14.6799 7.50557 16.3463 6.52965C15.4131 5.18697 14.0037 4.44726 12.1474 4.31049C10.3911 4.17372 8.46791 5.35371 7.74153 5.35371C6.97516 5.35371 5.25197 4.35694 3.92928 4.35694C1.18389 4.39026 -1.52588e-05 6.41213 -1.52588e-05 10.5054C-1.52588e-05 13.151 0.786651 15.8832 2.09601 17.7928C3.21204 19.4126 4.16539 20.7419 5.51142 20.7153C6.80412 20.6887 7.26746 19.8455 8.90083 19.8455C10.5209 19.8455 10.9309 20.7153 12.3236 20.6887C13.7163 20.6621 14.5362 19.3727 15.6522 17.753C16.1822 16.967 16.5922 16.101 16.8689 15.1818C14.2302 14.1183 13.8667 11.7255 13.8667 10.5987Z" fill="white"/>
          <path d="M11.3667 2.89356C12.2999 1.77754 12.7399 0.395518 12.5999 -0.000244141C11.3133 0.0930892 9.82658 0.892421 8.8666 2.04178C7.9799 3.09115 7.47324 4.43383 7.5999 5.7632C8.99991 5.84985 10.3999 5.04385 11.3667 2.89356Z" fill="white"/>
        </svg>
        {label} with Apple
      </button>
    </div>
  );
}
