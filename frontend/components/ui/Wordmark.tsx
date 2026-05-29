import Image from "next/image";
import Link from "next/link";

export function Wordmark() {
    return (
        <Link
            href="/"
            className="group inline-flex items-center transition hover:opacity-80"
            aria-label="Helios — home"
        >
            <Image
                src="/logo.png"
                alt="Helios"
                width={130}
                height={30}
                priority
            />
        </Link>
    );
}
