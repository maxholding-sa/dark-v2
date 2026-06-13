import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:uuid/uuid.dart';

import '../../core/supabase/supabase_helpers.dart';
import '../models/bank.dart';
import '../models/loan_request.dart';

class ContactMessage {
  ContactMessage({
    required this.id,
    required this.name,
    required this.email,
    required this.subject,
    required this.message,
    this.createdAt,
  });

  final String id;
  final String name;
  final String email;
  final String subject;
  final String message;
  final DateTime? createdAt;

  factory ContactMessage.fromJson(Map<String, dynamic> json) => ContactMessage(
        id: json['id']?.toString() ?? '',
        name: json['name']?.toString() ?? '',
        email: json['email']?.toString() ?? '',
        subject: json['subject']?.toString() ?? '',
        message: json['message']?.toString() ?? '',
        createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? ''),
      );
}

/// Admin management backed directly by Supabase tables. Whether these
/// operations succeed depends on the project's RLS policies for the anon role.
class AdminRepository {
  AdminRepository(this._db);
  final SupabaseClient _db;

  static const _uuid = Uuid();

  // ---- Banks ----
  Future<List<Bank>> getBanks() async {
    try {
      final rows =
          await _db.from('Bank').select().order('createdAt', ascending: false);
      return rows.map((e) => Bank.fromJson(Map<String, dynamic>.from(e))).toList();
    } catch (e) {
      throwAsApi(e);
    }
  }

  Future<void> createBank({
    required String name,
    required String logoImage,
    required double interestRate,
    String? loanPolicy,
  }) async {
    try {
      await _db.from('Bank').insert({
        'id': _uuid.v4(),
        'name': name,
        'logoImage': logoImage,
        'interestRate': interestRate,
        'loanPolicy': loanPolicy,
        'updatedAt': DateTime.now().toUtc().toIso8601String(),
      });
    } catch (e) {
      throwAsApi(e);
    }
  }

  Future<void> updateBank({
    required String id,
    required String name,
    required String logoImage,
    required double interestRate,
    String? loanPolicy,
  }) async {
    try {
      await _db.from('Bank').update({
        'name': name,
        'logoImage': logoImage,
        'interestRate': interestRate,
        'loanPolicy': loanPolicy,
        'updatedAt': DateTime.now().toUtc().toIso8601String(),
      }).eq('id', id);
    } catch (e) {
      throwAsApi(e);
    }
  }

  Future<void> deleteBank(String id) async {
    try {
      // Unlink any loan requests first to avoid a foreign-key violation.
      await _db
          .from('LoanRequest')
          .update({'salaryTransferBankId': null}).eq('salaryTransferBankId', id);
      await _db.from('Bank').delete().eq('id', id);
    } catch (e) {
      throwAsApi(e);
    }
  }

  // ---- Contacts ----
  Future<List<ContactMessage>> getContacts() async {
    try {
      final rows = await _db
          .from('Contact')
          .select()
          .order('createdAt', ascending: false);
      return rows
          .map((e) => ContactMessage.fromJson(Map<String, dynamic>.from(e)))
          .toList();
    } catch (e) {
      throwAsApi(e);
    }
  }

  Future<void> deleteContact(String id) async {
    try {
      await _db.from('Contact').delete().eq('id', id);
    } catch (e) {
      throwAsApi(e);
    }
  }

  // ---- Loan requests (with embedded car) ----
  Future<List<LoanRequest>> getLoanRequests() async {
    try {
      final rows = await _db
          .from('LoanRequest')
          .select('*, car:Car(*)')
          .order('createdAt', ascending: false);
      return rows
          .map((e) => LoanRequest.fromJson(Map<String, dynamic>.from(e)))
          .toList();
    } catch (e) {
      throwAsApi(e);
    }
  }
}
