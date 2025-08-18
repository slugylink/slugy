import { Card } from "@/components/ui/card";
import FeatureQRCodeDesign from "./feature-qr-code-design";

export default function FeatureQrCode() {
  return (
    <Card className="border p-3 sm:max-w-[400px] w-full">
      <FeatureQRCodeDesign code="app" />
    </Card>
  );
}
