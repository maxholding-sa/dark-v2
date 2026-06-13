import 'package:image_picker/image_picker.dart' show XFile;
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:uuid/uuid.dart';

import '../../core/config/app_config.dart';
import '../../core/supabase/supabase_helpers.dart';
import '../models/loan_request.dart';

/// Submits user-generated forms directly to Supabase: loan requests, contact
/// messages, reviews, and media uploads (Storage).
///
/// NOTE: `id` and `updatedAt` have no database default (Prisma sets them
/// client-side), so each insert generates a UUID and timestamp explicitly.
class FormsRepository {
  FormsRepository(this._db);
  final SupabaseClient _db;

  static const _uuid = Uuid();

  /// Inserts a row into `LoanRequest`; returns the created id.
  Future<String> submitLoanRequest(LoanRequestInput input) async {
    try {
      final id = _uuid.v4();
      final row = <String, dynamic>{
        'id': id,
        'carId': input.carId,
        'fullName': input.fullName,
        'email': input.email,
        'mobileNumber': input.mobileNumber,
        'city': input.city,
        'time': input.time,
        'idNumber': input.idNumber,
        'idImage': input.idImage,
        'carMake': input.carMake,
        'carModel': input.carModel,
        'carCategory': input.carCategory,
        'carYear': input.carYear,
        'birthMonth': input.birthMonth,
        'birthYear': input.birthYear,
        'gender': input.gender,
        'loanAmount': input.loanAmount,
        'downPayment': input.downPayment,
        'loanTerm': input.loanTerm,
        'monthlyPayment': input.monthlyPayment,
        'interestRate': input.interestRate,
        'finalPayment': input.finalPayment,
        'netSalary': input.netSalary,
        'employerSector': input.employerSector,
        'employer': input.employer,
        'salaryTransferBankId': input.salaryTransferBank,
        'hasRealEstateFinance': input.hasRealEstateFinance,
        'hasCreditDefault': input.hasCreditDefault,
        'totalMonthlyObligations': input.totalMonthlyObligations,
        'additionalInfo': input.additionalInfo,
        'status': 'PENDING',
        'updatedAt': _now(),
      };
      final res =
          await _db.from('LoanRequest').insert(row).select('id').single();
      return res['id']?.toString() ?? id;
    } catch (e) {
      throwAsApi(e);
    }
  }

  /// Inserts a row into `Contact`.
  Future<void> submitContact({
    required String name,
    required String email,
    required String subject,
    required String message,
  }) async {
    try {
      await _db.from('Contact').insert({
        'id': _uuid.v4(),
        'name': name,
        'email': email,
        'subject': subject,
        'message': message,
        'updatedAt': _now(),
      });
    } catch (e) {
      throwAsApi(e);
    }
  }

  /// Inserts a row into `Review`.
  Future<void> submitReview({
    required String clientName,
    required String city,
    required String car,
    required int rating,
    required String reviewText,
    String? imageUrl,
    String? videoUrl,
  }) async {
    try {
      await _db.from('Review').insert({
        'id': _uuid.v4(),
        'clientName': clientName,
        'city': city,
        'car': car,
        'rating': rating,
        'reviewText': reviewText,
        'imageUrl': imageUrl,
        'videoUrl': videoUrl,
        'updatedAt': _now(),
      });
    } catch (e) {
      throwAsApi(e);
    }
  }

  /// Uploads a file to the Supabase Storage bucket and returns its public URL.
  Future<String> uploadFile(XFile file) async {
    try {
      final bytes = await file.readAsBytes();
      final ext = _extension(file.name);
      final path = 'mobile/${_uuid.v4()}${ext.isEmpty ? '' : '.$ext'}';

      await _db.storage.from(AppConfig.supabaseBucket).uploadBinary(
            path,
            bytes,
            fileOptions: FileOptions(
              contentType: file.mimeType,
              cacheControl: '3600',
              upsert: false,
            ),
          );

      return _db.storage.from(AppConfig.supabaseBucket).getPublicUrl(path);
    } catch (e) {
      throwAsApi(e);
    }
  }

  String _now() => DateTime.now().toUtc().toIso8601String();

  String _extension(String name) {
    final dot = name.lastIndexOf('.');
    if (dot < 0 || dot == name.length - 1) return '';
    return name.substring(dot + 1).toLowerCase();
  }
}
