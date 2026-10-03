import Link from "next/link";
import { APP_NAME } from "@/config/site";

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <Link href="/" className="flex items-center gap-2.5 text-[19px] font-bold tracking-tight" aria-label={`${APP_NAME} home`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-mark.svg" alt="" width={size} height={size} className="rounded-lg" />
      <span>Campo<span className="text-primary">Soko</span></span>
    </Link>
  );
}
