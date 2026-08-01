import { notFound } from 'next/navigation';
import LoanRequestForm from '../_components/LoanRequestForm';
import { getCarById } from '@/actions/car-details';
import { generateMetadata as buildMetadata } from '@/lib/seo';

export default async function LoanRequestPage({ params }) {
  const { id } = await params;

  try {
    const result = await getCarById(id);

    if (!result.success || !result.data) {
      notFound();
    }

    const car = result.data;

    return (
      <div
        className="min-h-dvh overflow-x-clip py-8"
        style={{
          width: '100dvw',
          maxWidth: '100dvw',
          marginInline: 'calc(50% - 50dvw)',
          backgroundImage: 'url(/back.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed',
        }}
      >
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto backdrop-blur-sm">
            <div className="mb-6 text-center">
              <h1 className="text-3xl font-bold text-white mb-2">
                طلب قرض للسيارة
              </h1>
              <p className="text-white">
                املأ النموذج أدناه لطلب قرض لشراء هذه السيارة
              </p>
            </div>

            <LoanRequestForm car={car} />
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error loading car for loan request:', error);
    notFound();
  }
}

export async function generateMetadata({ params }) {
  const { id } = await params;

  try {
    const result = await getCarById(id);

    if (!result.success || !result.data) {
      return buildMetadata({
        title: 'السيارة غير موجودة',
        robots: {
          index: false,
          follow: false,
        },
      });
    }

    const car = result.data;

    return buildMetadata({
      title: `طلب قرض لسيارة ${car.year} ${car.make} ${car.model}`,
      description: `اطلب قرض لشراء ${car.year} ${car.make} ${car.model} بسعر ${car.price} ريال سعودي`,
      canonicalUrl: `/loan-request/${id}`,
      robots: {
        index: false,
        follow: false,
      },
    });
  } catch (error) {
    return buildMetadata({
      title: 'طلب قرض',
      robots: {
        index: false,
        follow: false,
      },
    });
  }
}
