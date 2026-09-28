import { Card, CardContent } from "@/components/ui/card";
import { DeviceFormWrapper } from "@/features/devices/components/device-form";

export default function NewDevicePage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-base leading-snug font-medium">New device</h1>
      <Card>
        <CardContent className="pt-4">
          <DeviceFormWrapper mode="create" />
        </CardContent>
      </Card>
    </div>
  );
}