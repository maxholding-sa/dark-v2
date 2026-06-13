import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_colors.dart';
import '../../core/widgets/app_network_image.dart';
import '../../core/widgets/async_view.dart';
import '../../core/widgets/glass_card.dart';
import '../../data/models/bank.dart';
import '../../data/providers.dart';

class BanksScreen extends ConsumerWidget {
  const BanksScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final banks = ref.watch(banksProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('البنوك الشريكة')),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(banksProvider),
        child: AsyncView(
          value: banks,
          isEmpty: (list) => list.isEmpty,
          emptyMessage: 'لا توجد بنوك شريكة حالياً',
          emptyIcon: Icons.account_balance_outlined,
          onRetry: () => ref.invalidate(banksProvider),
          data: (list) => ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: list.length,
            separatorBuilder: (_, __) => const SizedBox(height: 12),
            itemBuilder: (_, i) => _BankCard(bank: list[i]),
          ),
        ),
      ),
    );
  }
}

class _BankCard extends StatelessWidget {
  const _BankCard({required this.bank});
  final Bank bank;

  @override
  Widget build(BuildContext context) {
    final hasPolicy = bank.loanPolicy != null && bank.loanPolicy!.isNotEmpty;
    return GlassCard(
      padding: EdgeInsets.zero,
      child: Theme(
        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          tilePadding: const EdgeInsets.symmetric(horizontal: 14),
          leading: ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: AppNetworkImage(url: bank.logoImage, width: 48, height: 48),
          ),
          title: Text(bank.name,
              style: const TextStyle(fontWeight: FontWeight.w700)),
          subtitle: Text('نسبة التمويل ${bank.interestRate}%',
              style: const TextStyle(color: AppColors.gold, fontSize: 12)),
          children: [
            if (hasPolicy)
              Padding(
                padding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
                child: Align(
                  alignment: Alignment.centerRight,
                  child: Text(
                    bank.loanPolicy!,
                    style: const TextStyle(
                        color: Colors.white70, height: 1.5, fontSize: 13),
                  ),
                ),
              )
            else
              const Padding(
                padding: EdgeInsets.fromLTRB(14, 0, 14, 14),
                child: Text('لا توجد تفاصيل إضافية',
                    style: TextStyle(color: AppColors.mutedForeground)),
              ),
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 0, 14, 12),
              child: Align(
                alignment: Alignment.centerRight,
                child: OutlinedButton.icon(
                  onPressed: () => context.push('/finance'),
                  icon: const Icon(Icons.calculate_rounded, size: 18),
                  label: const Text('احسب التمويل'),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
