import { BotGreeting } from "@/components/bot/BotGreeting";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserMenu } from "@/components/auth/UserMenu";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-surface-light via-[#f0efe8] to-[#e8e6dd] dark:from-surface-dark dark:via-[#1a1a1a] dark:to-[#111111]">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <UserMenu />
        <ThemeToggle />
      </div>
      <BotGreeting />
      {/* Branding footer */}
      <div className="fixed bottom-4 left-0 right-0 text-center">
        <span className="text-sift-gold font-bold text-lg tracking-wide">BitSift</span>
        <span className="text-gray-500 dark:text-gray-400 text-xs italic ml-2">Sifting bits from bytes</span>
      </div>
    </main>
  );
}
