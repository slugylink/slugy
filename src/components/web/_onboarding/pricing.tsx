import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

export default function Pricing() {
  return (
    <div className="relative bg-transparent py-16 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-balance md:text-4xl lg:text-5xl">
            Pricing that scale with your business
          </h2>
          <p className="text-muted-foreground mx-auto mt-4 max-w-xl text-lg text-balance">
            Choose the perfect plan for your needs and start optimizing your
            workflow today
          </p>
        </div>
        <div className="@container relative mt-12 md:mt-20">
          <Card className="relative mx-auto max-w-sm rounded-none @4xl:max-w-3xl">
            <div className="grid @3xl:grid-cols-2">
              <div>
                <CardHeader className="p-8">
                  <CardTitle className="font-medium">Free</CardTitle>
                  <span className="mt-2 mb-0.5 block text-lg font-semibold">
                    $0 / mo
                  </span>
                </CardHeader>
                <div className="border-y px-8 py-4">
                  <Button asChild variant={"secondary"} className="w-full">
                    <Link href="#">Continue with Free</Link>
                  </Button>
                </div>

                <ul role="list" className="space-y-3 p-8">
                  {[
                    "Basic Analytics Dashboard",
                    "5GB Cloud Storage",
                    "Email and Chat Support",
                  ].map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-2 text-sm font-light"
                    >
                      <Check
                        className="text-primary size-3"
                        strokeWidth={3.5}
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="ring-foreground/10 bg-background -mx-1 rounded-(--radius) border-transparent shadow ring-1 @3xl:mx-0 @3xl:-my-3">
                <div className="relative px-1 @3xl:px-0 @3xl:py-3">
                  <CardHeader className="p-8">
                    <CardTitle className="font-medium">Pro</CardTitle>
                    <span className="mt-2 mb-0.5 block text-lg font-semibold">
                      $19 / mo
                    </span>
                  </CardHeader>
                  <div className="-mx-1 border-y px-8 py-4 @3xl:mx-0">
                    <Button asChild className="w-full">
                      <Link href="#">Get Started</Link>
                    </Button>
                  </div>

                  <ul role="list" className="space-y-3 p-8">
                    {[
                      "Everything in Free Plan",
                      "5GB Cloud Storage",
                      "Email and Chat Support",
                      "Access to Community Forum",
                      "Single User Access",
                      "Access to Basic Templates",
                      "Mobile App Access",
                      "1 Custom Report Per Month",
                      "Monthly Product Updates",
                      "Standard Security Features",
                    ].map((item) => (
                      <li
                        key={item}
                        className="flex items-center gap-2 text-sm font-light"
                      >
                        <Check
                          className="text-primary size-3"
                          strokeWidth={3.5}
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
