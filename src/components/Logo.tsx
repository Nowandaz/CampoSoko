import Link from "next/link";
import { APP_NAME } from "@/config/site";

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <Link href="/" className="flex items-center gap-2 font-extrabold tracking-tight text-xl" aria-label={`${APP_NAME} home`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-mark.svg" alt="" width={size} height={size} />
      <span>Campo<span className="text-primary">Soko</span></span>
    </Link>
  );
}
