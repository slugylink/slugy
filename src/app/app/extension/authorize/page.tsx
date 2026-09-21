import AppLogo from "@/components/web/app-logo";

export const metadata = {
  title: "Connect extension · Slugy",
  robots: { index: false, follow: false },
};

export default function ExtensionAuthorizePage() {
  return (
    <div className="bg-background flex min-h-svh flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-md">
        <AppLogo />
      </div>
      <h1 className="text-xl font-medium">Connecting your account</h1>
      <p className="text-muted-foreground max-w-sm text-sm">
        You can close this tab. Head back to the Slugy extension to start
        shortening links.
      </p>
    </div>
  );
}
