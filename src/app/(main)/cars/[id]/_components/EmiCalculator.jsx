"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import '@abdulrysr/saudi-riyal-new-symbol-font/style.css';
import { getBanks } from "@/actions/banks";
import { formatSaudiRiyalReact } from "@/lib/helper";
import {
  calculateIslamicAutoFinance,
  createBankConfigFromBank,
  LOAN_CALCULATOR_META,
} from "@/lib/loan-calculator";

function EmiCalculator({ price, carId, carBrand }) {
  const router = useRouter();
  const [loanAmount, setLoanAmount] = useState(price || 1000);
  const [downPayment, setDownPayment] = useState(0);
  const [downPaymentPercent, setDownPaymentPercent] = useState(0);
  const [selectedBankId, setSelectedBankId] = useState(null);
  const [interestRate, setInterestRate] = useState(5);
  const [loanPolicy, setLoanPolicy] = useState("");
  const [loanTenure, setLoanTenure] = useState(1);
  const [gender, setGender] = useState("male");
  const [ageBracket, setAgeBracket] = useState("31 to 35");
  const [adminFeePercent, setAdminFeePercent] = useState(1);
  const [balloonPercent, setBalloonPercent] = useState(0);
  const [rebate, setRebate] = useState(0);
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");
  const [banks, setBanks] = useState([]);
  const [loadingBanks, setLoadingBanks] = useState(true);

  // handle change on Loan amount
  const handleLoanAmountChange = (value) => {
    const newLoanAmount = Math.min(Math.max(value, 1000), 150000);
    setLoanAmount(newLoanAmount);
    const newDownPayment = (downPaymentPercent / 100) * newLoanAmount;
    setDownPayment(newDownPayment);
    calculateLoan(newLoanAmount, newDownPayment, interestRate, loanTenure);
  };

  // handle downpayment
  const handleDownPaymentChange = (value) => {
    const newDownPayment = Math.min(Math.max(value, 0), loanAmount);
    setDownPayment(newDownPayment);
    setDownPaymentPercent((newDownPayment / loanAmount) * 100);
    calculateLoan(loanAmount, newDownPayment, interestRate, loanTenure);
  };

  const handleDownPaymentPercentChange = (percent) => {
    const newPercent = Math.min(Math.max(percent, 0), 100);
    setDownPaymentPercent(newPercent);
    const newDownPayment = (newPercent / 100) * loanAmount;
    setDownPayment(newDownPayment);
    calculateLoan(loanAmount, newDownPayment, interestRate, loanTenure);
  };

  // handle interset rate
  const handleInterestRateChange = (value) => {
    const newRate = Math.min(Math.max(value, 0.1), 25);
    setInterestRate(newRate);
    calculateLoan(loanAmount, downPayment, newRate, loanTenure);
  };

  // handle bank selection
  const handleBankChange = (bankId) => {
    const selectedBank = banks.find((bank) => bank.id === bankId);
    if (selectedBank) {
      setSelectedBankId(bankId);
      const bankRate = parseFloat(selectedBank.interestRate);
      setInterestRate(bankRate);
      setLoanPolicy(selectedBank.loanPolicy || "");
      calculateLoan(loanAmount, downPayment, bankRate, loanTenure);
    }
  };

  // handle loan time-period
  const handleLoanTenureChange = (value) => {
    const newTenure = Math.min(Math.max(value, 1), 5);
    setLoanTenure(newTenure);
    calculateLoan(loanAmount, downPayment, interestRate, newTenure);
  };

  const calculateLoan = (principal, down, rate, years) => {
    const loanPrincipal = principal - down;
    if (loanPrincipal <= 0 || !selectedBankId) {
      setResults(null);
      return;
    }

    const selectedBank = banks.find((bank) => bank.id === selectedBankId);
    const bankConfig = createBankConfigFromBank(selectedBank);
    const calculation = calculateIslamicAutoFinance(bankConfig, {
      car_price: principal,
      down_payment_pct: principal > 0 ? down / principal : 0,
      term_months: years * 12,
      profit_rate: rate / 100,
      admin_fees_pct: adminFeePercent / 100,
      balloon_payment_pct: balloonPercent / 100,
      gender,
      age_bracket: ageBracket,
      car_brand: carBrand,
      rebate,
    });

    setResults({
      emi: calculation.totals.installment.toFixed(2),
      totalInterest: calculation.totals.total_profit.toFixed(2),
      totalPayment: calculation.totals.grand_total.toFixed(2),
      loanPrincipal: calculation.derived.finance_amount.toFixed(2),
      downPayment: calculation.derived.down_payment_sar.toFixed(2),
      monthlyInsurance: calculation.totals.monthly_insurance.toFixed(2),
      totalMonthlyPayment: calculation.totals.total_monthly_payment.toFixed(2),
      totalInsurance: calculation.totals.total_insurance.toFixed(2),
      adminFees: calculation.derived.admin_fees.toFixed(2),
      apr: (calculation.metrics.apr * 100).toFixed(2),
      irr: (calculation.metrics.irr * 100).toFixed(2),
    });
  };

  useEffect(() => {
    // Fetch banks from database
    const fetchBanks = async () => {
      try {
        const result = await getBanks();
        if (result.success && result.data && result.data.length > 0) {
          setBanks(result.data);
          // Set first bank as default
          const firstBank = result.data[0];
          setSelectedBankId(firstBank.id);
          const bankRate = parseFloat(firstBank.interestRate);
          setInterestRate(bankRate);
          calculateLoan(loanAmount, downPayment, bankRate, loanTenure);
        } else {
          setError("لم يتم العثور على البنوك. يرجى المحاولة لاحقاً.");
        }
      } catch (err) {
        setError("حدث خطأ في تحميل البنوك.");
        console.error("Error fetching banks:", err);
      } finally {
        setLoadingBanks(false);
      }
    };

    fetchBanks();
  }, []);

  useEffect(() => {
    if (!selectedBankId) return;
    calculateLoan(loanAmount, downPayment, interestRate, loanTenure);
  }, [selectedBankId, gender, ageBracket, adminFeePercent, balloonPercent, rebate, carBrand]);

  return (
    <div
      dir="rtl"
      className="w-full max-h-[80vh] overflow-y-auto overflow-x-hidden pr-4
                [&::-webkit-scrollbar]:w-1.5
                [&::-webkit-scrollbar-track]:bg-black-300
                [&::-webkit-scrollbar-thumb]:bg-black-400
                [&::-webkit-scrollbar-thumb]:rounded-lg
                bg-black backdrop-blur-lg"
    >
      <div className="w-full">
        <h1 className="text-2xl font-bold text-center mb-4 text-white">حاسبة قرض السيارة Click Car</h1>
        <div className="space-y-2">
          {/* Vehicle Price */}
          <div className="bg-white-50 dark:bg-white-800 rounded-xl p-4">
            <h2 className="text-lg font-inter text-white-900 mb-2 text-right">
              • سعر السيارة
            </h2>
            {/* Price inout */}
            <div className="space-y-3">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  {formatSaudiRiyalReact(0).props.children[1]}
                </div>
                <input
                  type="number"
                  value={loanAmount}
                  readOnly
                  className="w-full pl-8 pr-4 py-2 rounded-md border border-white-200 bg-gray-600 text-white-700 dark:text-white focus:outline-none focus:border-white-900 cursor-not-allowed"
                />
              </div>
              <input
                type="range"
                min="1000"
                max="150000"
                value={loanAmount}
                disabled
                className="w-full [&::-webkit-slider-thumb]:bg-gray-400 [&::-webkit-slider-track]:bg-gray-300 cursor-not-allowed"
              />
            </div>
          </div>

          {/* Down Payment */}
          <div className="bg-white-50 dark:bg-white-800 rounded-xl p-4">
            <h2 className="text-lg font-inter  text-white-900 dark:text-white mb-2 text-right">
              • الدفعة المقدمة
            </h2>
            <div className="space-y-3">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  {formatSaudiRiyalReact(0).props.children[1]}
                </div>
                <input
                  type="number"
                  value={downPayment}
                  onChange={(e) =>
                    handleDownPaymentChange(parseFloat(e.target.value))
                  }
                  className="w-full pl-8 pr-4 py-2 rounded-md border border-white-200 bg-black text-white-700 focus:outline-none focus:border-white-900"
                />
              </div>
              <input
                type="range"
                min="0"
                max={loanAmount}
                value={downPayment}
                onChange={(e) =>
                  handleDownPaymentChange(parseFloat(e.target.value))
                }
                className="w-full [&::-webkit-slider-thumb]:bg-[#a16207] [&::-webkit-slider-track]:bg-[#fef3c7] [&::-moz-range-thumb]:bg-[#a16207] [&::-moz-range-track]:bg-[#fef3c7]"
              />
              <div className="text-sm text-white-600 dark:text-white-400 text-right">
                الدفعة المقدمة: {downPaymentPercent.toFixed(1)}% من سعر السيارة
              </div>
            </div>
          </div>

          {/* Interest & Loan */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Bank Selection */}
            <div className="bg-white-50 dark:bg-white-800 rounded-xl p-4">
              <h2 className="text-lg font-inter text-white-900 dark:text-white mb-3 text-right">
                • اختار البنك
              </h2>
              <div className="space-y-3">
                <select
                  value={selectedBankId || ""}
                  onChange={(e) => handleBankChange(e.target.value)}
                  disabled={loadingBanks}
                  className="w-full px-4 py-3 md:py-2 text-lg md:text-base rounded-md border border-white-200 bg-black text-white-700 dark:text-white text-right focus:outline-none focus:border-white-900 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingBanks ? (
                    <option>جاري التحميل...</option>
                  ) : banks.length > 0 ? (
                    <>
                      <option value="">اختر البنك</option>
                      {banks.map((bank) => (
                        <option key={bank.id} value={bank.id}>
                          {bank.name}
                        </option>
                      ))}
                    </>
                  ) : (
                    <option>لا توجد بنوك متاحة</option>
                  )}
                </select>
                {/* {selectedBankId && (
                  <div className="text-sm text-white-600 dark:text-white-400 text-right">
                    سعر الفائدة: {interestRate.toFixed(2)}%
                  </div>
                )} */}
              </div>
            </div>
            {/* Loan */}
            <div className="bg-white-50 dark:bg-white-800 rounded-xl p-4">
              <h2 className="text-lg font-inter text-white-900 mb-3 text-right">
                • مدة القرض
              </h2>
              <div className="space-y-3">
                <div className="relative">
                  <input
                    type="number"
                    value={loanTenure}
                    onChange={(e) =>
                      handleLoanTenureChange(parseFloat(e.target.value))
                    }
                    className="w-full pl-14 pr-2 py-2 rounded-md border border-white-200 bg-blacktext-white-700 text-right focus:outline-none focus:border-white-900"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-white-700 dark:text-white-300">
                      سنوات
                    </span>
                  </div>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={loanTenure}
                  onChange={(e) =>
                    handleLoanTenureChange(parseFloat(e.target.value))
                  }
                  className="w-full [&::-webkit-slider-thumb]:bg-[#a16207] [&::-webkit-slider-track]:bg-[#fef3c7] [&::-moz-range-thumb]:bg-[#a16207] [&::-moz-range-track]:bg-[#fef3c7]"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white-50 dark:bg-white-800 rounded-xl p-4">
              <h2 className="text-lg font-inter text-white-900 dark:text-white mb-3 text-right">
                • ملف التأمين
              </h2>
              <div className="space-y-3">
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-4 py-2 rounded-md border border-white-200 bg-black text-white text-right focus:outline-none"
                >
                  {LOAN_CALCULATOR_META.genders.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
                <select
                  value={ageBracket}
                  onChange={(e) => setAgeBracket(e.target.value)}
                  className="w-full px-4 py-2 rounded-md border border-white-200 bg-black text-white text-right focus:outline-none"
                >
                  {LOAN_CALCULATOR_META.ageBrackets.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-white-50 dark:bg-white-800 rounded-xl p-4">
              <h2 className="text-lg font-inter text-white-900 dark:text-white mb-3 text-right">
                • إعدادات التمويل
              </h2>
              <div className="space-y-3">
                <input
                  type="number"
                  value={adminFeePercent}
                  min={0}
                  max={10}
                  onChange={(e) =>
                    setAdminFeePercent(
                      Math.min(Math.max(parseFloat(e.target.value) || 0, 0), 10)
                    )
                  }
                  placeholder="رسوم إدارية %"
                  className="w-full px-4 py-2 rounded-md border border-white-200 bg-black text-white text-right focus:outline-none"
                />
                <input
                  type="number"
                  value={balloonPercent}
                  min={0}
                  max={50}
                  onChange={(e) =>
                    setBalloonPercent(
                      Math.min(Math.max(parseFloat(e.target.value) || 0, 0), 50)
                    )
                  }
                  placeholder="دفعة بالون %"
                  className="w-full px-4 py-2 rounded-md border border-white-200 bg-black text-white text-right focus:outline-none"
                />
                <input
                  type="number"
                  value={rebate}
                  min={0}
                  onChange={(e) => setRebate(Math.max(parseFloat(e.target.value) || 0, 0))}
                  placeholder="Rebate"
                  className="w-full px-4 py-2 rounded-md border border-white-200 bg-black text-white text-right focus:outline-none"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="text-red-500 dark:text-red-400 text-sm mt-3">
              {error}
            </div>
          )}

          {results && (
            <div className="bg-white-50 dark:bg-white-800 rounded-xl p-4 mt-4 max-w-full overflow-hidden">
              <div className="text-center mb-4 px-2 md:px-0">
                <div className="text-sm font-inter text-white-700 dark:text-white-300">
                  سياسة القرض
                </div>
                <div className="text-sm text-white-600 dark:text-white-400 mt-1 whitespace-pre-wrap break-all max-w-full leading-relaxed overflow-hidden w-full">
                  {loanPolicy}
                </div>
              </div>
              <div className="text-center mb-4">
                <div className="text-sm font-inter text-white-700 dark:text-white-300">
                  الدفعة الشهرية الإجمالية
                </div>
                <div className="text-3xl font-bold text-white-900 dark:text-white mt-1">
                  {formatSaudiRiyalReact(results.totalMonthlyPayment)}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-black dark:bg-white-900 p-3 rounded-lg text-center">
                  <div className="text-sm font-inter text-white-700 dark:text-white-300">
                    سعر السيارة
                  </div>
                  <div className="text-lg font-bold text-white-900 dark:text-white mt-1">
                    {formatSaudiRiyalReact(loanAmount)}
                  </div>
                </div>

                <div className="bg-black dark:bg-white-900 p-3 rounded-lg text-center">
                  <div className="text-sm font-inter text-white-700 dark:text-white-300">
                    الدفعة المقدمة
                  </div>
                  <div className="text-lg font-bold text-white-900 dark:text-white mt-1">
                    {formatSaudiRiyalReact(results.downPayment)}
                  </div>
                </div>

                <div className="bg-black dark:bg-white-900 p-3 rounded-lg text-center">
                  <div className="text-sm font-inter text-white-700 dark:text-white-300">
                    مبلغ القرض
                  </div>
                  <div className="text-lg font-bold text-white-900 dark:text-white mt-1">
                    {formatSaudiRiyalReact(results.loanPrincipal)}
                  </div>
                </div>

                <div className="bg-black dark:bg-white-900 p-3 rounded-lg text-center">
                  <div className="text-sm font-inter text-white-700 dark:text-white-300">
                    إجمالي الربح
                  </div>
                  <div className="text-lg font-bold text-white-900 dark:text-white mt-1">
                    {formatSaudiRiyalReact(results.totalInterest)}
                  </div>
                </div>

                <div className="bg-black dark:bg-white-900 p-3 rounded-lg text-center">
                  <div className="text-sm font-inter text-white-700 dark:text-white-300">
                    التأمين الشهري
                  </div>
                  <div className="text-lg font-bold text-white-900 dark:text-white mt-1">
                    {formatSaudiRiyalReact(results.monthlyInsurance)}
                  </div>
                </div>

                <div className="bg-black dark:bg-white-900 p-3 rounded-lg text-center">
                  <div className="text-sm font-inter text-white-700 dark:text-white-300">
                    الرسوم الإدارية
                  </div>
                  <div className="text-lg font-bold text-white-900 dark:text-white mt-1">
                    {formatSaudiRiyalReact(results.adminFees)}
                  </div>
                </div>

                <div className="bg-black dark:bg-white-900 p-3 rounded-lg text-center">
                  <div className="text-sm font-inter text-white-700 dark:text-white-300">
                    IRR
                  </div>
                  <div className="text-lg font-bold text-white-900 dark:text-white mt-1">
                    %{results.irr}
                  </div>
                </div>

                <div className="bg-black dark:bg-white-900 p-3 rounded-lg text-center">
                  <div className="text-sm font-inter text-white-700 dark:text-white-300">
                    APR
                  </div>
                  <div className="text-lg font-bold text-white-900 dark:text-white mt-1">
                    %{results.apr}
                  </div>
                </div>

                {/* <div className="bg-black dark:bg-white-900 p-3 rounded-lg md:col-span-2 text-center">
                  <div className="text-sm font-inter text-white-700 dark:text-white-300">
                    المبلغ الإجمالي (الدفعة المقدمة + إجمالي الدفعات)
                  </div>
                  <div className="text-lg font-bold text-white-900 dark:text-white mt-1">
                    {formatSaudiRiyalReact(
                      parseFloat(results.downPayment) +
                        parseFloat(results.totalPayment)
                    )}
                  </div>
                </div> */}
              </div>
            </div>
          )}

          {results && (
            <div className="flex justify-center mt-4">
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('startLoading'));
                  router.push(`/loan-request/${carId}`);
                }}
                className="w-1/2 bg-yellow-700 text-white px-6 py-2 rounded-lg hover:bg-yellow-800 transition-colors"
              >
                طلب قرض
              </button>
            </div>
          )}

          {/* <p className="text-sm text-white-700 dark:text-white-300 text-center font-inter text-right">
            هذا تقدير. قد يختلف القسط الشهري الفعلي بناءً على درجة الائتمان الخاصة بك وشروط المُقرض.
          </p> */}
        </div>
      </div>
    </div>
  );
}

export default EmiCalculator;
