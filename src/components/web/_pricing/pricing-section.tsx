import { plans } from "@/constants/data/price";
import MaxWidthContainer from "@/components/max-width-container";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IoIosCheckmarkCircle } from "react-icons/io";
import { MoveUpRight } from "lucide-react";
import Link from "next/link";

export default function PricingSection() {
  return (
    <section className="pb-14 sm:pb-20">
      <MaxWidthContainer>
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-medium text-balance sm:text-4xl">
            Flexible Pricing for Everyone
          </h2>
          <p className="text-muted-foreground mx-auto mt-3 max-w-2xl text-sm sm:text-base">
            Pick a plan that fits your needs. Upgrade anytime.
          </p>
        </div>

        <div className="mx-auto flex w-full flex-col items-start justify-center gap-8 sm:flex-row">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className="w-full max-w-[370px] rounded-3xl border bg-zinc-100/90 p-1.5 backdrop-blur-md dark:bg-zinc-900/60"
            >
              <CardHeader className="space-y-4 rounded-[18px] bg-white p-6 shadow-md [.border-b]:border-zinc-200/60 dark:[.border-b]:border-zinc-800">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    <CardDescription className="mt-1 text-zinc-700">
                      {plan.description}
                    </CardDescription>
                  </div>
                </div>
                <div className="mb-4 flex items-end gap-1">
                  <span className="text-3xl font-medium tracking-tight">
                    ${plan.monthlyPrice}
                  </span>
                  <span className="mb-1 text-sm text-zinc-700">/ month</span>
                </div>
                <Link href="https://app.slugy.co">
                  <Button
                    size={"lg"}
                    className="w-full rounded-lg"
                    disabled={!plan.isReady}
                  >
                    {plan.buttonLabel}
                  </Button>
                </Link>
              </CardHeader>

              <CardContent className="pb-5">
                <div className="border-zinc-200 px-2 text-sm dark:border-zinc-800">
                  <p className="mb-3 border-b pb-2.5 font-normal text-zinc-700 uppercase dark:text-zinc-200">
                    Includes:{" "}
                    {plan.name !== "Free" && (
                      <span className="normal-case">
                        (Everything in free, plus)
                      </span>
                    )}
                  </p>
                  <ul className="space-y-2">
                    {plan.features.slice(0, 9).map((feat, idx) => (
                      <li
                        key={feat}
                        className="flex items-start gap-2 capitalize"
                      >
                        <IoIosCheckmarkCircle size={19} />
                        <span>{feat}</span>{" "}
                        {plan.features.length > 9 && idx === 8 && (
                          <p className="text-muted-foreground ml-1 flex cursor-pointer items-center gap-1 lowercase underline">
                            more <MoveUpRight size={12} />{" "}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </MaxWidthContainer>
    </section>
  );
}
