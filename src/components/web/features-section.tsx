import { data as features } from "@/constants/data/feature";
import { FeatureCard } from "./feature-card";

export function FeaturesSection() {
  return (
    <section className="container py-24 sm:py-32">
      <div className="mx-auto max-w-5xl text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Everything you need to manage your links
        </h2>
        <p className="text-muted-foreground mt-4 text-lg">
          Powerful features to help you create, manage, and track your links
          effectively.
        </p>
      </div>
      <div className="">
        {features.map((feature, index) => (
          <FeatureCard key={feature.title} {...feature} />
        ))}
      </div>
    </section>
  );
}
