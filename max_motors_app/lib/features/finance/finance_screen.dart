import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_colors.dart';
import '../../core/utils/formatters.dart';
import '../../core/widgets/glass_card.dart';
import '../../core/widgets/gradient_button.dart';
import '../../core/widgets/section_header.dart';
import '../../data/models/bank.dart';
import '../../data/providers.dart';
import '../../finance/loan_calculator.dart';

class FinanceScreen extends ConsumerStatefulWidget {
  const FinanceScreen({super.key, this.carId});

  final String? carId;

  @override
  ConsumerState<FinanceScreen> createState() => _FinanceScreenState();
}

class _FinanceScreenState extends ConsumerState<FinanceScreen> {
  double _carPrice = 100000;
  double _downPct = 10;
  double _balloonPct = 0;
  final double _adminPct = 1;
  int _termMonths = 60;
  String _gender = 'male';
  String _ageBracket = '31 to 35';
  Bank? _selectedBank;
  String _carBrand = '';

  bool _prefilled = false;

  @override
  void initState() {
    super.initState();
    if (widget.carId != null) {
      // Prefill from the selected car once it loads.
      Future.microtask(_loadCar);
    }
  }

  Future<void> _loadCar() async {
    try {
      final car =
          await ref.read(catalogRepositoryProvider).getCarById(widget.carId!);
      if (!mounted) return;
      setState(() {
        _carPrice = car.price > 0 ? car.price : _carPrice;
        _carBrand = car.make;
        _prefilled = true;
      });
    } catch (_) {
      // Ignore; user can enter price manually.
    }
  }

  FinanceResult _compute(Bank? bank) {
    final profit = bank?.interestRate ?? 5.0;
    return calculateIslamicAutoFinance(
      defaultBankConfig,
      FinanceInputs(
        carPrice: _carPrice,
        termMonths: _termMonths,
        profitRate: profit,
        downPaymentPct: _downPct,
        adminFeesPct: _adminPct,
        balloonPaymentPct: _balloonPct,
        gender: _gender,
        ageBracket: _ageBracket,
        carBrand: _carBrand,
      ),
    );
  }

  Future<void> _compareOffers(List<Bank> banks) async {
    if (banks.length < 2) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('يلزم وجود بنكين على الأقل للمقارنة')),
      );
      return;
    }
    final offers = banks.map((bank) {
      final r = _compute(bank);
      return {
        'bankName': bank.name,
        'monthlyPayment': r.totalMonthlyPayment,
        'totalCost': r.grandTotal,
        'interestRate': bank.interestRate,
        'downPayment': r.downPayment,
        'loanAmount': r.financeAmount,
        'tenure': _termMonths,
      };
    }).toList();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => _OffersComparison(offers: offers, banks: banks),
    );
  }

  @override
  Widget build(BuildContext context) {
    final banksAsync = ref.watch(banksProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('حاسبة التمويل')),
      body: banksAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => _body(const []),
        data: (banks) {
          _selectedBank ??= banks.isNotEmpty ? banks.first : null;
          return _body(banks);
        },
      ),
    );
  }

  Widget _body(List<Bank> banks) {
    final result = _compute(_selectedBank);
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const SectionHeader(
          title: 'التمويل الإسلامي',
          subtitle: 'احسب القسط الشهري بطريقة المرابحة',
        ),
        const SizedBox(height: 16),
        _ResultCard(result: result),
        const SizedBox(height: 16),
        GlassCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _sliderField(
                label: 'سعر السيارة',
                value: _carPrice,
                min: 20000,
                max: 1000000,
                divisions: 98,
                display: Formatters.sar(_carPrice),
                onChanged: (v) => setState(() => _carPrice = v),
              ),
              if (banks.isNotEmpty) ...[
                const SizedBox(height: 8),
                DropdownButtonFormField<Bank>(
                  value: _selectedBank,
                  decoration: const InputDecoration(labelText: 'البنك'),
                  isExpanded: true,
                  dropdownColor: AppColors.surfaceAlt,
                  items: banks
                      .map((b) => DropdownMenuItem(
                            value: b,
                            child: Text('${b.name} (${b.interestRate}%)'),
                          ))
                      .toList(),
                  onChanged: (b) => setState(() => _selectedBank = b),
                ),
              ],
              const SizedBox(height: 8),
              _sliderField(
                label: 'الدفعة الأولى',
                value: _downPct,
                min: 0,
                max: 50,
                divisions: 50,
                display: '${_downPct.round()}%',
                onChanged: (v) => setState(() => _downPct = v),
              ),
              _sliderField(
                label: 'مدة التمويل',
                value: _termMonths.toDouble(),
                min: 12,
                max: 72,
                divisions: 5,
                display: '${(_termMonths / 12).round()} سنوات',
                onChanged: (v) => setState(() => _termMonths = v.round()),
              ),
              _sliderField(
                label: 'الدفعة الأخيرة (بالون)',
                value: _balloonPct,
                min: 0,
                max: 40,
                divisions: 40,
                display: '${_balloonPct.round()}%',
                onChanged: (v) => setState(() => _balloonPct = v),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      value: _gender,
                      decoration: const InputDecoration(labelText: 'الجنس'),
                      dropdownColor: AppColors.surfaceAlt,
                      items: LoanCalculatorMeta.genders
                          .map((g) => DropdownMenuItem(
                              value: g.$1, child: Text(g.$2)))
                          .toList(),
                      onChanged: (v) =>
                          setState(() => _gender = v ?? 'male'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      value: _ageBracket,
                      isExpanded: true,
                      decoration: const InputDecoration(labelText: 'العمر'),
                      dropdownColor: AppColors.surfaceAlt,
                      items: LoanCalculatorMeta.ageBrackets
                          .map((a) =>
                              DropdownMenuItem(value: a, child: Text(a)))
                          .toList(),
                      onChanged: (v) =>
                          setState(() => _ageBracket = v ?? '31 to 35'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        GradientButton(
          label: 'قارن عروض البنوك',
          icon: Icons.compare_arrows_rounded,
          onPressed: banks.length >= 2 ? () => _compareOffers(banks) : null,
        ),
        const SizedBox(height: 16),
        _ScheduleCard(schedule: result.schedule),
        if (_prefilled)
          const Padding(
            padding: EdgeInsets.only(top: 12),
            child: Text(
              'تم تعبئة سعر السيارة المختارة تلقائياً',
              style: TextStyle(color: AppColors.mutedForeground, fontSize: 12),
            ),
          ),
      ],
    );
  }

  Widget _sliderField({
    required String label,
    required double value,
    required double min,
    required double max,
    required int divisions,
    required String display,
    required ValueChanged<double> onChanged,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text(label, style: const TextStyle(fontWeight: FontWeight.w600)),
            const Spacer(),
            Text(display, style: const TextStyle(color: AppColors.gold)),
          ],
        ),
        Slider(
          value: value.clamp(min, max),
          min: min,
          max: max,
          divisions: divisions,
          activeColor: AppColors.gold,
          onChanged: onChanged,
        ),
      ],
    );
  }
}

class _ResultCard extends StatelessWidget {
  const _ResultCard({required this.result});
  final FinanceResult result;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF1C1A18), Color(0xFF080706)],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0x33FFD700)),
      ),
      child: Column(
        children: [
          const Text('القسط الشهري',
              style: TextStyle(color: AppColors.mutedForeground)),
          const SizedBox(height: 4),
          ShaderMask(
            shaderCallback: (b) =>
                const LinearGradient(colors: AppColors.goldTextGradient)
                    .createShader(b),
            child: Text(
              Formatters.sar(result.totalMonthlyPayment),
              style: const TextStyle(
                fontSize: 30,
                fontWeight: FontWeight.w900,
                color: Colors.white,
              ),
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              _stat('الدفعة الأولى', Formatters.sar(result.downPayment)),
              _stat('مبلغ التمويل', Formatters.sar(result.financeAmount)),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              _stat('إجمالي التكلفة', Formatters.sar(result.grandTotal)),
              _stat('نسبة APR', Formatters.percent(result.apr)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _stat(String label, String value) => Expanded(
        child: Column(
          children: [
            Text(label,
                style: const TextStyle(
                    color: AppColors.mutedForeground, fontSize: 12)),
            const SizedBox(height: 2),
            Text(value,
                style: const TextStyle(fontWeight: FontWeight.w700)),
          ],
        ),
      );
}

class _ScheduleCard extends StatelessWidget {
  const _ScheduleCard({required this.schedule});
  final List<ScheduleRow> schedule;

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      padding: EdgeInsets.zero,
      child: Theme(
        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          title: const Text('جدول السداد',
              style: TextStyle(fontWeight: FontWeight.w700)),
          childrenPadding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
          children: [
            SizedBox(
              height: 280,
              child: ListView.separated(
                itemCount: schedule.length,
                separatorBuilder: (_, __) =>
                    Divider(color: AppColors.border, height: 1),
                itemBuilder: (_, i) {
                  final r = schedule[i];
                  return Padding(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    child: Row(
                      children: [
                        SizedBox(
                            width: 36,
                            child: Text('${r.month}',
                                style: const TextStyle(
                                    color: AppColors.gold))),
                        Expanded(
                          child: Text(
                            'قسط: ${Formatters.number(r.cashflow)}',
                            style: const TextStyle(fontSize: 12),
                          ),
                        ),
                        Text(
                          'المتبقي: ${Formatters.number(r.outstandingEnd)}',
                          style: const TextStyle(
                              fontSize: 12,
                              color: AppColors.mutedForeground),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _OffersComparison extends ConsumerStatefulWidget {
  const _OffersComparison({required this.offers, required this.banks});
  final List<Map<String, dynamic>> offers;
  final List<Bank> banks;

  @override
  ConsumerState<_OffersComparison> createState() => _OffersComparisonState();
}

class _OffersComparisonState extends ConsumerState<_OffersComparison> {
  String? _serverNote;

  @override
  void initState() {
    super.initState();
    _analyze();
  }

  Future<void> _analyze() async {
    try {
      final result = await ref.read(financeRepositoryProvider).analyzeOffers(
            offers: widget.offers,
            userData: const {'netSalary': 0, 'monthlyObligations': 0},
          );
      final note = result['recommendation'] ??
          result['summary'] ??
          result['message'];
      if (mounted && note != null) {
        setState(() => _serverNote = note.toString());
      }
    } catch (_) {
      // Backend may require salary data or >= 2 offers; local sort still works.
    }
  }

  @override
  Widget build(BuildContext context) {
    // Sort offers locally by monthly payment as a sensible default; the
    // backend /api/analyze-offers endpoint refines this when available.
    final sorted = [...widget.offers]..sort((a, b) =>
        (a['monthlyPayment'] as num).compareTo(b['monthlyPayment'] as num));

    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.7,
      builder: (context, controller) => ListView(
        controller: controller,
        padding: const EdgeInsets.all(16),
        children: [
          const Text('مقارنة العروض',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
          const SizedBox(height: 12),
          if (_serverNote != null) ...[
            GlassCard(
              padding: const EdgeInsets.all(12),
              child: Row(
                children: [
                  const Icon(Icons.insights_rounded, color: AppColors.gold),
                  const SizedBox(width: 10),
                  Expanded(child: Text(_serverNote!)),
                ],
              ),
            ),
            const SizedBox(height: 12),
          ],
          ...sorted.asMap().entries.map((entry) {
            final i = entry.key;
            final o = entry.value;
            return Card(
              child: ListTile(
                leading: CircleAvatar(
                  backgroundColor:
                      i == 0 ? AppColors.gold : AppColors.surfaceAlt,
                  child: Text('${i + 1}',
                      style: TextStyle(
                          color: i == 0 ? Colors.black : Colors.white)),
                ),
                title: Text(o['bankName'].toString()),
                subtitle: Text(
                  'القسط: ${Formatters.sar(o['monthlyPayment'] as num)}\n'
                  'الإجمالي: ${Formatters.sar(o['totalCost'] as num)}',
                ),
                trailing: i == 0
                    ? const Chip(
                        label: Text('الأفضل'),
                        backgroundColor: AppColors.gold,
                        labelStyle: TextStyle(color: Colors.black),
                      )
                    : null,
              ),
            );
          }),
        ],
      ),
    );
  }
}
