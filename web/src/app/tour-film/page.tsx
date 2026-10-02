"use client";

import { Film } from "@/components/landing/tour-film";

const noop = () => {};

// The tour film on its own, with no player controls. scripts/record-tour.mjs records
// this page to produce public/tour.webm.
export default function TourFilmPage() {
  return <Film bare onClose={noop} />;
}
