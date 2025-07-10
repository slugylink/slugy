import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";

interface FeatureCardProps {
  title: string;
  description: string;
  image: string;
}


export function FeatureCard({ title, description, image }: FeatureCardProps) {
  return (
    <Card className="group relative mx-auto w-full max-w-xs bg-white border border-zinc-200 shadow-none hover:shadow-lg transition-all">
      <CardContent className="flex flex-col items-center space-y-4 p-6">
        <div className="relative w-full aspect-[4/3] overflow-hidden rounded-lg bg-zinc-50">
          <Image
            src={image}
            alt={title}
            fill
            className="object-contain transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
        <div className="space-y-2 text-center">
          <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
          <p className="text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
} 