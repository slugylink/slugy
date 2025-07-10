import { ProfileDropdown } from "@/components/web/_onboarding/profile-dropdown";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-svh">
      <div className="fixed inset-x-0 -top-52 m-auto aspect-video max-w-lg bg-gradient-to-tr from-yellow-400 to-violet-400 opacity-40 blur-3xl md:inset-x-16" />
      <div className="fixed top-4 right-4 z-50">
        <ProfileDropdown />
      </div>
      <main>{children}</main>
    </div>
  );
}
