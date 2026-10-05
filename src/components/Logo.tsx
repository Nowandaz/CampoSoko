import Link from "next/link";
import { APP_NAME } from "@/config/site";

export function Logo({ size = 34 }: { size?: number }) {
  return (
    <Link href="/" className="flex h-10 items-center gap-2.5 text-[18px] font-semibold tracking-tight text-brand md:text-[20px]" aria-label={`${APP_NAME} home`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-mark.png" alt="" width={size} height={size} className="shrink-0" />
      <span>{APP_NAME}</span>
    </Link>
  );
}
