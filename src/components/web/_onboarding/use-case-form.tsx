"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ONBOARDING_USE_CASES } from "@/constants/onboarding";
import { saveOnboardingUseCase } from "@/server/actions/onbaording/save-intended-use";
import { LoaderCircle } from "@/utils/icons/loader-circle";

export default function UseCaseForm() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleContinue() {
    if (!selected) return;

    setIsSubmitting(true);
    try {
      const result = await saveOnboardingUseCase(selected);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      router.push("/onboarding/create-workspace");
    } catch {
      toast.error("Could not save your answer. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full space-y-6">
      <fieldset className="space-y-2" disabled={isSubmitting}>
        <legend className="sr-only">
          What are you planning to use Slugy for?
        </legend>
        {ONBOARDING_USE_CASES.map((option) => {
          const isSelected = selected === option.value;
          return (
            <label
              key={option.value}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-lg border px-3.5 py-2.5 text-left text-sm transition-colors",
                isSelected
                  ? "border-zinc-900 bg-zinc-50 dark:border-white dark:bg-zinc-800"
                  : "border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800",
              )}
            >
              <input
                type="radio"
                name="intended-use"
                value={option.value}
                checked={isSelected}
                onChange={() => setSelected(option.value)}
                className="size-4 accent-zinc-900 dark:accent-white"
              />
              <span className="text-zinc-800 dark:text-zinc-100">
                {option.label}
              </span>
            </label>
          );
        })}
      </fieldset>
      <Button
        type="button"
        className="w-full"
        disabled={!selected || isSubmitting}
        onClick={handleContinue}
      >
        {isSubmitting && <LoaderCircle className="mr-1 h-5 w-5 animate-spin" />}
        Continue
      </Button>
    </div>
  );
}
