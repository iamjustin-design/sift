import { Logo } from "@/components/landing/Logo";
import { UrlInput } from "@/components/landing/UrlInput";
import { FeatureCards } from "@/components/landing/FeatureCards";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserMenu } from "@/components/auth/UserMenu";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-surface-light via-[#f0efe8] to-[#e8e6dd] dark:from-surface-dark dark:via-[#1a1a1a] dark:to-[#111111] px-5 py-10">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <UserMenu />
        <ThemeToggle />
      </div>
      <Logo />
      <UrlInput />
      <FeatureCards />
    </main>
  );
}
