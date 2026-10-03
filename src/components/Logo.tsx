import Link from "next/link";
import { APP_NAME } from "@/config/site";

export function Logo({ size = 30 }: { size?: number }) {
  return (
    <Link href="/" className="flex h-10 items-center gap-2 text-[17px] font-bold tracking-tight md:gap-2.5 md:text-[19px]" aria-label={`${APP_NAME} home`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-mark.svg" alt="" width={size} height={size} className="rounded-lg" />
      <span>Campo<span className="text-primary">Soko</span></span>
    </Link>
  );
}
