import Image from "next/image";

export function Logo() {
  return (
    <div className="text-center mb-10">
      <div className="w-20 h-20 mx-auto mb-4 text-sift-gold">
        <Image src="/sift-logo.svg" alt="BitSift" width={80} height={80} priority />
      </div>
      <h1 className="text-5xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
        BitSift
      </h1>
      <p className="mt-1 text-base text-gray-400 italic">
        Sifting bits from bytes
      </p>
    </div>
  );
}
