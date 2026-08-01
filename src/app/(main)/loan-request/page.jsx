import LoanRequestForm from './_components/LoanRequestForm';
import { generateMetadata as buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'طلب قرض سيارة',
  description: 'اطلب تمويل سيارة من ماكس موتورز. اختر الماركة والموديل وأكمل بيانات التمويل.',
  canonicalUrl: '/loan-request',
  robots: {
    index: false,
    follow: false,
  },
});

export default function LoanRequestPage() {
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
              املأ النموذج أدناه واختر السيارة من الخطوة الثانية لإكمال طلب التمويل
            </p>
          </div>

          <LoanRequestForm />
        </div>
      </div>
    </div>
  );
}
