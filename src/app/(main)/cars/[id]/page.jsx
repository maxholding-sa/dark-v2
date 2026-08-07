import { getCarById, getSimilarCars } from "@/actions/car-details";
import { notFound } from "next/navigation";
import CarDetails from "./_components/CarDetails";
import { generateCarMetadata, generateJsonLd, SITE_CONFIG, truncate } from "@/lib/seo";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const result = await getCarById(id);

  if (!result.success) {
    return {
      title: "السيارة غير موجودة",
      description: "لم يتم العثور على السيارة المطلوبة",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  return generateCarMetadata(result.data);
}

const CarPage = async ({ params }) => {
  // Fetch car details
  const { id } = await params;
  const result = await getCarById(id);

  // If car not found, show 404
  if (!result.success) {
    notFound();
  }

  const similarCarsResult = await getSimilarCars(id, 4);
  const car = result.data;
  const carName = `${car.year} ${car.make} ${car.model}`.replace(/\s+/g, " ").trim();

  return (
    <>
      <script
        id="car-product-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(generateJsonLd("product", {
            name: carName,
            description: truncate(car.description, 160),
            image: car.images?.map((image) => image.startsWith("http") ? image : `${SITE_CONFIG.url}${image}`),
            brand: car.make,
            year: car.year,
            url: `${SITE_CONFIG.url}/cars/${car.id}`,
            price: car.price,
            availability: car.status === "AVAILABLE" ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          })),
        }}
      />
      <div className="w-full px-4 py-6">
        <CarDetails
          car={car}
          testDriveInfo={result?.data.testDriveInfo}
          similarCars={similarCarsResult?.data || []}
        />
      </div>
    </>
  );
};

export default CarPage;
