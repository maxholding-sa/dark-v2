import { NextResponse } from 'next/server';
import { db } from '@/lib/prisma';

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      fullName,
      email,
      mobileNumber,
      city,
      time,
      idNumber,
      idImage,
      carMake,
      carModel,
      carCategory,
      carYear,
      birthMonth,
      birthYear,
      gender,
      loanAmount,
      downPayment,
      loanTerm,
      monthlyPayment,
      interestRate,
      finalPayment,
      netSalary,
      employerSector,
      employer,
      salaryTransferBank,
      hasRealEstateFinance,
      hasCreditDefault,
      totalMonthlyObligations,
      additionalInfo,
      carId,
      carDetails
    } = body;

    // Validate required fields
    if (!fullName || !email || !mobileNumber || !city || !time || !idNumber ||
        !carMake || !carModel || !carYear || !birthMonth || !birthYear || !gender ||
        !loanAmount || !downPayment || !loanTerm || !carId) {
      return NextResponse.json(
        { success: false, message: 'جميع الحقول المطلوبة يجب ملؤها' },
        { status: 400 }
      );
    }

    // Create loan request record
    const loanRequest = await db.loanRequest.create({
      data: {
        // Personal Information
        fullName,
        email,
        mobileNumber,
        city,
        time,

        // ID Information
        idNumber,
        idImage: idImage || null,

        // Car Information
        carMake,
        carModel,
        carCategory: carCategory || null,
        carYear: parseInt(carYear),

        // Birth Information
        birthMonth,
        birthYear,

        // Gender
        gender,

        // Loan Details
        loanAmount: parseFloat(loanAmount),
        downPayment: parseFloat(downPayment),
        loanTerm: parseInt(loanTerm),
        monthlyPayment: monthlyPayment ? parseFloat(monthlyPayment) : null,
        interestRate: interestRate ? parseFloat(interestRate) : null,
        finalPayment: finalPayment ? parseFloat(finalPayment) : null,

        // Financial Information
        netSalary: netSalary ? parseFloat(netSalary) : null,
        employerSector: employerSector || null,
        employer: employer || null,
        salaryTransferBankId: salaryTransferBank || null,

        // Credit Information
        hasRealEstateFinance: hasRealEstateFinance === 'yes',
        hasCreditDefault: hasCreditDefault === 'yes',
        totalMonthlyObligations: totalMonthlyObligations ? parseFloat(totalMonthlyObligations) : null,

        // Additional Information
        additionalInfo: additionalInfo || null,

        // Car relation
        carId,

        // Status
        status: 'PENDING',
      },
    });

    // Here you could add email notification logic or other integrations
    // For now, we'll just return success

    return NextResponse.json({
      success: true,
      message: 'تم إرسال طلب القرض بنجاح',
      data: {
        id: loanRequest.id,
        status: loanRequest.status
      }
    });

  } catch (error) {
    console.error('Error creating loan request:', error);
    return NextResponse.json(
      { success: false, message: 'حدث خطأ في معالجة الطلب' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { success: false, message: 'Method not allowed' },
    { status: 405 }
  );
}
