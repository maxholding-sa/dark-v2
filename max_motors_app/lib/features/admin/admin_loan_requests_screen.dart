import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_colors.dart';
import '../../core/utils/formatters.dart';
import '../../core/utils/launchers.dart';
import '../../core/widgets/async_view.dart';
import '../../core/widgets/glass_card.dart';
import '../../data/models/loan_request.dart';
import '../../data/providers.dart';

class AdminLoanRequestsScreen extends ConsumerWidget {
  const AdminLoanRequestsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final requests = ref.watch(adminLoanRequestsProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('طلبات التمويل')),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(adminLoanRequestsProvider),
        child: AsyncView(
          value: requests,
          isEmpty: (list) => list.isEmpty,
          emptyMessage: 'لا توجد طلبات تمويل',
          emptyIcon: Icons.request_quote_outlined,
          onRetry: () => ref.invalidate(adminLoanRequestsProvider),
          data: (list) => ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: list.length,
            separatorBuilder: (_, __) => const SizedBox(height: 12),
            itemBuilder: (_, i) => _LoanRequestCard(request: list[i]),
          ),
        ),
      ),
    );
  }
}

class _LoanRequestCard extends StatelessWidget {
  const _LoanRequestCard({required this.request});
  final LoanRequest request;

  Color get _statusColor {
    switch (request.status.toUpperCase()) {
      case 'APPROVED':
        return const Color(0xFF22C55E);
      case 'REJECTED':
        return AppColors.destructive;
      default:
        return AppColors.gold;
    }
  }

  String get _statusLabel {
    switch (request.status.toUpperCase()) {
      case 'APPROVED':
        return 'مقبول';
      case 'REJECTED':
        return 'مرفوض';
      default:
        return 'قيد المراجعة';
    }
  }

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(request.fullName,
                    style: const TextStyle(fontWeight: FontWeight.w800)),
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: _statusColor.withValues(alpha: 0.18),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: _statusColor),
                ),
                child: Text(_statusLabel,
                    style: TextStyle(
                        color: _statusColor,
                        fontSize: 11,
                        fontWeight: FontWeight.w700)),
              ),
            ],
          ),
          const SizedBox(height: 8),
          _row(Icons.directions_car_rounded,
              '${request.carMake} ${request.carModel}'),
          _row(Icons.location_city_rounded, request.city),
          _row(Icons.payments_rounded, Formatters.sar(request.loanAmount)),
          if (request.createdAt != null)
            _row(Icons.schedule_rounded,
                Formatters.dateArabic(request.createdAt)),
          const SizedBox(height: 8),
          Row(
            children: [
              TextButton.icon(
                onPressed: () => Launchers.call(request.mobileNumber),
                icon: const Icon(Icons.call_rounded, size: 18),
                label: Text(request.mobileNumber),
              ),
              const Spacer(),
              IconButton(
                icon: const Icon(Icons.chat_rounded, color: Color(0xFF25D366)),
                onPressed: () => Launchers.whatsapp(
                  'مرحباً ${request.fullName}، بخصوص طلب التمويل الخاص بك',
                  number: request.mobileNumber.replaceAll('+', ''),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _row(IconData icon, String text) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 3),
        child: Row(
          children: [
            Icon(icon, size: 16, color: AppColors.mutedForeground),
            const SizedBox(width: 8),
            Expanded(
              child: Text(text,
                  style: const TextStyle(color: Colors.white70, fontSize: 13)),
            ),
          ],
        ),
      );
}
