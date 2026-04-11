"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";

interface GetStartedProps {
  userId: string;
}

export default function GetStarted({ userId: _userId }: GetStartedProps) {
  return (
    <div className="w-full">
      <Button asChild className="w-full">
        <Link href="/onboarding/create-workspace">Get started</Link>
      </Button>
    </div>
  );
}
