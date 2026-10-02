import PageSkeleton from "@/components/web/skeletons/page-skeleton";

// Workspace root (Links) loading state. Content-shaped skeleton instead of a
// centered full-height spinner, so navigation doesn't blank the content area.
export default function Loading() {
  return <PageSkeleton rows={8} />;
}
