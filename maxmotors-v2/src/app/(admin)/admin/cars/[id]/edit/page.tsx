import { notFound } from "next/navigation";
import { getCar } from "@/server/modules/cars";
import { isAppError } from "@/server/errors/app-error";
import { CarForm } from "@/features/cars/components/car-form";
import { createTranslator } from "@/i18n";

interface EditCarPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditCarPage({ params }: EditCarPageProps) {
  const t = createTranslator();
  const { id } = await params;

  try {
    const car = await getCar(id);

    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t("admin.cars.edit")}</h1>
        <CarForm car={car} />
      </div>
    );
  } catch (error) {
    // A bad id in the URL is a 404, not a crash. Anything else is a real
    // failure and belongs to the error boundary.
    if (isAppError(error) && ["NOT_FOUND", "VALIDATION"].includes(error.code)) notFound();
    throw error;
  }
}
