import { notFound } from 'next/navigation';
import LoanRequestForm from './_components/LoanRequestForm';
import { getCarById } from '@/actions/car-details';

export default async function LoanRequestPage({ params }) {
  const { id } = await params;

  try {
    const result = await getCarById(id);

    if (!result.success || !result.data) {
      notFound();
    }

    const car = result.data;

    return (
      <div className="min-h-screen py-8" style={{ backgroundImage: 'url(/back.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
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
      return {
        title: 'السيارة غير موجودة',
      };
    }

    const car = result.data;

    return {
      title: `طلب قرض لسيارة ${car.year} ${car.make} ${car.model}`,
      description: `اطلب قرض لشراء ${car.year} ${car.make} ${car.model} بسعر ${car.price} ريال سعودي`,
    };
  } catch (error) {
    return {
      title: 'طلب قرض',
    };
  }
}
