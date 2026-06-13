import 'car.dart';

/// Payload for `POST /api/loan-request` (mirrors the web form fields).
class LoanRequestInput {
  LoanRequestInput({
    required this.fullName,
    required this.email,
    required this.mobileNumber,
    required this.city,
    required this.time,
    required this.idNumber,
    this.idImage,
    required this.carMake,
    required this.carModel,
    this.carCategory,
    required this.carYear,
    required this.birthMonth,
    required this.birthYear,
    required this.gender,
    required this.loanAmount,
    required this.downPayment,
    required this.loanTerm,
    this.monthlyPayment,
    this.interestRate,
    this.finalPayment,
    this.netSalary,
    this.employerSector,
    this.employer,
    this.salaryTransferBank,
    this.hasRealEstateFinance = false,
    this.hasCreditDefault = false,
    this.totalMonthlyObligations,
    this.additionalInfo,
    required this.carId,
  });

  final String fullName;
  final String email;
  final String mobileNumber;
  final String city;
  final String time;
  final String idNumber;
  final String? idImage;
  final String carMake;
  final String carModel;
  final String? carCategory;
  final int carYear;
  final String birthMonth;
  final String birthYear;
  final String gender;
  final double loanAmount;
  final double downPayment;
  final int loanTerm;
  final double? monthlyPayment;
  final double? interestRate;
  final double? finalPayment;
  final double? netSalary;
  final String? employerSector;
  final String? employer;
  final String? salaryTransferBank;
  final bool hasRealEstateFinance;
  final bool hasCreditDefault;
  final double? totalMonthlyObligations;
  final String? additionalInfo;
  final String carId;

  Map<String, dynamic> toJson() => {
        'fullName': fullName,
        'email': email,
        'mobileNumber': mobileNumber,
        'city': city,
        'time': time,
        'idNumber': idNumber,
        'idImage': idImage,
        'carMake': carMake,
        'carModel': carModel,
        'carCategory': carCategory,
        'carYear': carYear,
        'birthMonth': birthMonth,
        'birthYear': birthYear,
        'gender': gender,
        'loanAmount': loanAmount,
        'downPayment': downPayment,
        'loanTerm': loanTerm,
        'monthlyPayment': monthlyPayment,
        'interestRate': interestRate,
        'finalPayment': finalPayment,
        'netSalary': netSalary,
        'employerSector': employerSector,
        'employer': employer,
        // Web expects the bank id under `salaryTransferBank`.
        'salaryTransferBank': salaryTransferBank,
        // Web maps the string 'yes' to boolean true.
        'hasRealEstateFinance': hasRealEstateFinance ? 'yes' : 'no',
        'hasCreditDefault': hasCreditDefault ? 'yes' : 'no',
        'totalMonthlyObligations': totalMonthlyObligations,
        'additionalInfo': additionalInfo,
        'carId': carId,
      };
}

/// Parsed loan request for the admin listing view.
class LoanRequest {
  LoanRequest({
    required this.id,
    required this.fullName,
    required this.mobileNumber,
    required this.city,
    required this.carMake,
    required this.carModel,
    required this.loanAmount,
    required this.status,
    this.createdAt,
    this.car,
  });

  final String id;
  final String fullName;
  final String mobileNumber;
  final String city;
  final String carMake;
  final String carModel;
  final double loanAmount;
  final String status;
  final DateTime? createdAt;
  final Car? car;

  factory LoanRequest.fromJson(Map<String, dynamic> json) {
    return LoanRequest(
      id: json['id']?.toString() ?? '',
      fullName: json['fullName']?.toString() ?? '',
      mobileNumber: json['mobileNumber']?.toString() ?? '',
      city: json['city']?.toString() ?? '',
      carMake: json['carMake']?.toString() ?? '',
      carModel: json['carModel']?.toString() ?? '',
      loanAmount: json['loanAmount'] is num
          ? (json['loanAmount'] as num).toDouble()
          : double.tryParse(json['loanAmount']?.toString() ?? '') ?? 0,
      status: json['status']?.toString() ?? 'PENDING',
      createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? ''),
      car: json['car'] is Map
          ? Car.fromJson(Map<String, dynamic>.from(json['car'] as Map))
          : null,
    );
  }
}
