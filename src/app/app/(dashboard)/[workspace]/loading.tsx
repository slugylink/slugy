import { LoaderCircle } from "@/utils/icons/loader-circle";

export default function Loading() {
  return (
    <div className="flex h-full min-h-[80vh] w-full items-center justify-center">
      <LoaderCircle className="text-muted-foreground h-5 w-5 animate-spin" />
    </div>
  );
}
