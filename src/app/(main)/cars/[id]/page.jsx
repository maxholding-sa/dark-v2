import { getCarById } from "@/actions/car-details";
import { notFound } from "next/navigation";
import CarDetails from "./_components/CarDetails";

export async function generateMetaData({ params }) {
  const { id } = await params;
  const result = await getCarById(id);

  if (!result.success) {
    return {
      title: "السيارة غير موجودة | Click Car",
      description: "لم يتم العثور على السيارة المطلوبة",
    };
  }

  const car = result.data;

  return {
    title: `${car.year} ${car.make} ${car.model} | Click Car`,
    description: car.description.substring(0, 160),
    openGraph: {
      images: car.images?.[0] ? [car.images[0]] : [],
    },
  };
}

const CarPage = async ({ params }) => {
  // Fetch car details
  const { id } = await params;
  const result = await getCarById(id);

  // If car not found, show 404
  if (!result.success) {
    notFound();
  }

  return (
    <div className="w-full px-4 py-6">
      <CarDetails
        car={result.data}
        testDriveInfo={result?.data.testDriveInfo}
        user={result?.user}
      />
    </div>
  );
};

export default CarPage;
