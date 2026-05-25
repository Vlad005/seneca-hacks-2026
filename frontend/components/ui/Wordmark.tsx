import Link from "next/link";

interface Props {
  className?: string;
  tone?: "light" | "dark";
}

export function Wordmark({ className = "", tone = "dark" }: Props) {
  const textCls = tone === "light" ? "text-white" : "text-[var(--foreground)]";
  return (
    <Link
      href="/"
      className={`group inline-flex items-center gap-2 text-[15px] font-semibold tracking-tight ${textCls} ${className}`}
    >
      <span
        aria-hidden
        className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500 transition group-hover:scale-110"
      />
      SolarFit
    </Link>
  );
}
