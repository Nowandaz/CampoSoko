"use client";
import { useEffect } from "react";
import { trackView } from "@/app/listing/actions";

export function ViewTracker({ listingId }: { listingId: string }) {
  useEffect(() => { void trackView(listingId); }, [listingId]);
  return null;
}
