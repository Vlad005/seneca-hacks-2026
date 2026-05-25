import Link from "next/link";

type Variant = "primary" | "ghost" | "onDark";

interface ButtonBaseProps {
  variant?: Variant;
  arrow?: boolean;
  className?: string;
  children: React.ReactNode;
}

interface AsButton extends ButtonBaseProps {
  href?: undefined;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  type?: "button" | "submit";
  disabled?: boolean;
}

interface AsLink extends ButtonBaseProps {
  href: string;
}

type Props = AsButton | AsLink;

const base =
  "inline-flex items-center gap-2 rounded-full text-[14px] font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 disabled:cursor-not-allowed disabled:opacity-40";

const variants: Record<Variant, string> = {
  primary:
    "bg-[var(--ink)] text-[var(--background)] hover:opacity-90 px-5 py-2.5",
  ghost:
    "text-[var(--foreground)] hover:bg-black/5 dark:hover:bg-white/5 px-4 py-2",
  onDark:
    "bg-white text-neutral-900 hover:bg-white/90 px-5 py-2.5",
};

function Arrow({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const bg = tone === "dark" ? "bg-white text-black" : "bg-neutral-900 text-white";
  return (
    <span
      aria-hidden
      className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${bg}`}
    >
      <svg
        viewBox="0 0 16 16"
        width="11"
        height="11"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 8h10M9 4l4 4-4 4" />
      </svg>
    </span>
  );
}

export function Button(props: Props) {
  const { variant = "primary", arrow = false, className = "", children } = props;
  const cls = `${base} ${variants[variant]} ${className}`;
  const arrowTone = variant === "onDark" ? "light" : "dark";

  const inner = (
    <>
      <span>{children}</span>
      {arrow && <Arrow tone={arrowTone} />}
    </>
  );

  if ("href" in props && props.href !== undefined) {
    return (
      <Link href={props.href} className={cls}>
        {inner}
      </Link>
    );
  }
  const { onClick, type = "button", disabled } = props as AsButton;
  return (
    <button onClick={onClick} type={type} disabled={disabled} className={cls}>
      {inner}
    </button>
  );
}
