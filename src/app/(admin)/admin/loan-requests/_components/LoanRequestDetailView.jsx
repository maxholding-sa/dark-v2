import Link from "next/link";
import {
  formatGenderAr,
  formatHijriBirthMonth,
  formatPercent,
  formatSaudiRiyalReact,
  formatYesNo,
} from "@/lib/helper";

function formatOptionalMoney(value) {
  if (value == null || value === "") return "غير محدد";
  return formatSaudiRiyalReact(value);
}

function DetailSection({ title, children }) {
  return (
    <div className="rounded-lg border border-white/10 bg-zinc-950/80 p-4">
      <h4 className="mb-3 font-semibold text-white">{title}</h4>
      {children}
    </div>
  );
}

function DetailField({ label, value, children }) {
  return (
    <div>
      <p className="text-sm text-white/60">{label}</p>
      <div className="mt-1 text-base text-white">{children ?? value ?? "غير محدد"}</div>
    </div>
  );
}

export default function LoanRequestDetailView({ loanRequest, statusBadge = null }) {
  if (!loanRequest) return null;

  const offer = loanRequest.offerSnapshot && typeof loanRequest.offerSnapshot === "object"
    ? loanRequest.offerSnapshot
    : null;

  return (
    <div className="space-y-6">
      <DetailSection title="معلومات الهوية (السعودية)">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <DetailField label="رقم الهوية" value={loanRequest.idNumber} />
          {loanRequest.idImage ? (
            <div className="md:col-span-2">
              <p className="text-sm text-white/60">صورة الهوية</p>
              <img
                src={loanRequest.idImage}
                alt="صورة الهوية"
                className="mt-2 max-h-48 max-w-full rounded-lg border border-white/10"
              />
            </div>
          ) : (
            <DetailField label="صورة الهوية" value="لم يتم تحميل الصورة" />
          )}
        </div>
      </DetailSection>

      <DetailSection title="المعلومات الشخصية">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <DetailField label="الاسم الكامل" value={loanRequest.fullName} />
          <DetailField label="البريد الإلكتروني">
            <a href={`mailto:${loanRequest.email}`} className="text-blue-400 hover:underline">
              {loanRequest.email}
            </a>
          </DetailField>
          <DetailField label="رقم الجوال" value={loanRequest.mobileNumber} />
          <DetailField label="المدينة" value={loanRequest.city} />
          <DetailField label="وقت التواصل المفضل" value={loanRequest.time} />
          <DetailField label="النوع" value={formatGenderAr(loanRequest.gender)} />
          <DetailField
            label="تاريخ الميلاد (هجري)"
            value={`${formatHijriBirthMonth(loanRequest.birthMonth)} / ${loanRequest.birthYear} هـ`}
          />
        </div>
      </DetailSection>

      <DetailSection title="معلومات السيارة">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <DetailField label="ماركة السيارة" value={loanRequest.carMake} />
          <DetailField label="موديل السيارة" value={loanRequest.carModel} />
          <DetailField label="سنة الصنع" value={loanRequest.carYear} />
          <DetailField label="فئة السيارة" value={loanRequest.carCategory || "غير محدد"} />
          <DetailField label="فئة التأمين" value={loanRequest.insuranceSegment || "غير محدد"} />
          <DetailField label="رابط السيارة">
            <Link href={`/cars/${loanRequest.carId}`} className="text-blue-400 hover:underline">
              عرض السيارة
            </Link>
          </DetailField>
          {loanRequest.car?.images?.[0] ? (
            <div className="md:col-span-2">
              <p className="text-sm text-white/60">صورة السيارة</p>
              <img
                src={loanRequest.car.images[0]}
                alt={`${loanRequest.carMake} ${loanRequest.carModel}`}
                className="mt-2 h-32 w-auto rounded-lg border border-white/10 object-cover"
              />
            </div>
          ) : null}
        </div>
      </DetailSection>

      <DetailSection title="العرض التمويلي المختار">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <DetailField
            label="البنك"
            value={offer?.bankName || loanRequest.salaryTransferBank?.name || "غير محدد"}
          />
          <DetailField label="سعر السيارة (مبلغ التمويل)" value={formatOptionalMoney(loanRequest.loanAmount)} />
          <DetailField label="الدفعة الأولى" value={formatOptionalMoney(loanRequest.downPayment)} />
          <DetailField label="نسبة الدفعة الأولى" value={formatPercent(loanRequest.downPaymentPct)} />
          <DetailField
            label="مدة التمويل"
            value={
              loanRequest.termMonths
                ? `${loanRequest.termMonths} شهر (${loanRequest.loanTerm} سنة)`
                : `${loanRequest.loanTerm} سنة`
            }
          />
          <DetailField label="القسط الشهري (شامل التأمين)" value={formatOptionalMoney(loanRequest.monthlyPayment)} />
          <DetailField label="قسط التمويل (بدون تأمين)" value={formatOptionalMoney(loanRequest.baseInstallment)} />
          <DetailField label="التأمين الشهري" value={formatOptionalMoney(loanRequest.monthlyInsurance)} />
          <DetailField label="نسبة الربح السنوية" value={formatPercent(loanRequest.interestRate)} />
          {offer?.aprAvailable && offer?.apr != null ? (
            <DetailField label="النسبة الفعلية (APR)" value={formatPercent(offer.apr)} />
          ) : null}
          <DetailField label="الدفعة الأخيرة (شهر أخير)" value={formatOptionalMoney(loanRequest.finalPayment)} />
          <DetailField label="دفعة البالون" value={formatOptionalMoney(loanRequest.balloonPayment)} />
          <DetailField label="نسبة البالون" value={formatPercent(loanRequest.balloonPaymentPct)} />
          <DetailField label="الرسوم الإدارية" value={formatOptionalMoney(loanRequest.adminFees)} />
          <DetailField label="إجمالي التأمين" value={formatOptionalMoney(loanRequest.totalInsurance)} />
          <DetailField label="إجمالي الربح" value={formatOptionalMoney(loanRequest.totalProfit)} />
          <DetailField label="إجمالي التكلفة" value={formatOptionalMoney(loanRequest.totalPayment)} />
        </div>
      </DetailSection>

      <DetailSection title="البيانات الإئتمانية والمالية">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <DetailField label="صافي الراتب" value={formatOptionalMoney(loanRequest.netSalary)} />
          <DetailField label="جهة العمل" value={loanRequest.employerSector} />
          <DetailField label="اسم جهة العمل" value={loanRequest.employer} />
          <DetailField label="جهة تحويل الراتب" value={loanRequest.salaryTransferBank?.name} />
          <DetailField label="هل لديك تمويل عقاري" value={formatYesNo(loanRequest.hasRealEstateFinance)} />
          <DetailField label="هل لديك تعثر في سمة" value={formatYesNo(loanRequest.hasCreditDefault)} />
          <DetailField
            label="إجمالي الإلتزامات الشهرية"
            value={formatOptionalMoney(loanRequest.totalMonthlyObligations)}
          />
        </div>
      </DetailSection>

      {loanRequest.additionalInfo ? (
        <DetailSection title="معلومات إضافية">
          <p className="whitespace-pre-wrap text-white">{loanRequest.additionalInfo}</p>
        </DetailSection>
      ) : null}

      <DetailSection title="حالة الطلب والتواريخ">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <DetailField label="الحالة">{statusBadge}</DetailField>
          <DetailField
            label="تاريخ الطلب"
            value={new Date(loanRequest.createdAt).toLocaleString("ar-SA")}
          />
          <DetailField
            label="آخر تحديث"
            value={new Date(loanRequest.updatedAt).toLocaleString("ar-SA")}
          />
        </div>
      </DetailSection>
    </div>
  );
}
