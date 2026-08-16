import { CarForm } from "@/features/cars/components/car-form";
import { createTranslator } from "@/i18n";

export default function CreateCarPage() {
  const t = createTranslator();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("admin.cars.create")}</h1>
      <CarForm />
    </div>
  );
}
