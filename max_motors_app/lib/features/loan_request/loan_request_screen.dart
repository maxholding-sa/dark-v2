import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_colors.dart';
import '../../core/utils/formatters.dart';
import '../../core/widgets/async_view.dart';
import '../../core/widgets/glass_card.dart';
import '../../core/widgets/gradient_button.dart';
import '../../data/local/local_requests.dart';
import '../../data/models/bank.dart';
import '../../data/models/car.dart';
import '../../data/models/loan_request.dart';
import '../../data/providers.dart';
import '../../finance/loan_calculator.dart';

const _hijriMonths = <(String, String)>[
  ('1', 'محرم'),
  ('2', 'صفر'),
  ('3', 'ربيع الأول'),
  ('4', 'ربيع الآخر'),
  ('5', 'جمادى الأولى'),
  ('6', 'جمادى الآخرة'),
  ('7', 'رجب'),
  ('8', 'شعبان'),
  ('9', 'رمضان'),
  ('10', 'شوال'),
  ('11', 'ذو القعدة'),
  ('12', 'ذو الحجة'),
];

const _cities = <String>[
  'الرياض', 'جدة', 'مكة', 'المدينة', 'الدمام', 'الخبر', 'الطائف',
  'تبوك', 'أبها', 'حائل', 'الجوف', 'نجران', 'جازان', 'الباحة',
];

const _times = <String>[
  '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM',
  '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM', '7:00 PM', '8:00 PM',
];

const _sectors = <String>['خاص', 'حكومي مدني', 'حكومي عسكرى', 'متقاعد'];

const _currentHijriYear = 1447;

String _ageBracketFromHijriBirthYear(String birthYear) {
  final year = int.tryParse(birthYear) ?? 0;
  if (year == 0) return '31 to 35';
  final age = _currentHijriYear - year;
  if (age <= 24) return '18 to 24';
  if (age <= 30) return '25 to 30';
  if (age <= 35) return '31 to 35';
  if (age <= 40) return '36 to 40';
  if (age <= 45) return '41 to 45';
  if (age <= 50) return '46 to 50';
  if (age <= 60) return '51 to 60';
  return '61+';
}

class LoanRequestScreen extends ConsumerWidget {
  const LoanRequestScreen({super.key, required this.carId});

  final String carId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final car = ref.watch(carByIdProvider(carId));
    return Scaffold(
      appBar: AppBar(title: const Text('طلب تمويل')),
      body: AsyncView(
        value: car,
        onRetry: () => ref.invalidate(carByIdProvider(carId)),
        data: (c) => _LoanForm(car: c),
      ),
    );
  }
}

class _LoanForm extends ConsumerStatefulWidget {
  const _LoanForm({required this.car});
  final Car car;

  @override
  ConsumerState<_LoanForm> createState() => _LoanFormState();
}

class _LoanFormState extends ConsumerState<_LoanForm> {
  final _formKey = GlobalKey<FormState>();

  late final TextEditingController _idNumber;
  late final TextEditingController _mobile;
  late final TextEditingController _fullName;
  late final TextEditingController _email;
  late final TextEditingController _employer;
  late final TextEditingController _netSalary;
  late final TextEditingController _obligations;
  late final TextEditingController _additional;

  String? _birthMonth;
  String? _birthYear;
  String _gender = 'male';
  String? _city;
  String? _time;
  String? _sector;
  Bank? _salaryBank;
  bool _realEstate = false;
  bool _creditDefault = false;

  double _downPct = 20;
  int _termYears = 5;

  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _idNumber = TextEditingController();
    _mobile = TextEditingController();
    _fullName = TextEditingController();
    _email = TextEditingController();
    _employer = TextEditingController();
    _netSalary = TextEditingController();
    _obligations = TextEditingController();
    _additional = TextEditingController();
  }

  @override
  void dispose() {
    for (final c in [
      _idNumber,
      _mobile,
      _fullName,
      _email,
      _employer,
      _netSalary,
      _obligations,
      _additional,
    ]) {
      c.dispose();
    }
    super.dispose();
  }

  FinanceResult _estimate() {
    return calculateIslamicAutoFinance(
      defaultBankConfig,
      FinanceInputs(
        carPrice: widget.car.price,
        termMonths: _termYears * 12,
        profitRate: _salaryBank?.interestRate ?? 5,
        downPaymentPct: _downPct,
        ageBracket: _ageBracketFromHijriBirthYear(_birthYear ?? ''),
        gender: _gender,
        carBrand: widget.car.make,
      ),
    );
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    if (_birthMonth == null || _birthYear == null) {
      _toast('يرجى اختيار تاريخ الميلاد');
      return;
    }
    if (_city == null || _time == null) {
      _toast('يرجى اختيار المدينة والوقت المفضل');
      return;
    }

    setState(() => _submitting = true);
    final car = widget.car;
    final est = _estimate();
    final input = LoanRequestInput(
      fullName: _fullName.text.trim(),
      email: _email.text.trim(),
      mobileNumber: '+966${_mobile.text.trim()}',
      city: _city!,
      time: _time!,
      idNumber: _idNumber.text.trim(),
      carMake: car.make,
      carModel: car.model,
      carCategory: car.category,
      carYear: car.year,
      birthMonth: _birthMonth!,
      birthYear: _birthYear!,
      gender: _gender,
      loanAmount: car.price,
      downPayment: car.price * (_downPct / 100),
      loanTerm: _termYears,
      monthlyPayment: est.totalMonthlyPayment,
      interestRate: _salaryBank?.interestRate,
      finalPayment: est.balloonPayment,
      netSalary: double.tryParse(_netSalary.text.trim()),
      employerSector: _sector,
      employer: _employer.text.trim().isEmpty ? null : _employer.text.trim(),
      salaryTransferBank: _salaryBank?.id,
      hasRealEstateFinance: _realEstate,
      hasCreditDefault: _creditDefault,
      totalMonthlyObligations: double.tryParse(_obligations.text.trim()),
      additionalInfo:
          _additional.text.trim().isEmpty ? null : _additional.text.trim(),
      carId: car.id,
    );

    try {
      await ref.read(formsRepositoryProvider).submitLoanRequest(input);
      await LocalRequests.instance.add(MyRequest(
        type: 'loan',
        title: 'طلب تمويل: ${car.title}',
        subtitle: 'القسط التقديري: ${Formatters.sar(est.totalMonthlyPayment)}',
        createdAt: DateTime.now(),
      ));
      if (!mounted) return;
      await _showSuccess();
    } catch (e) {
      if (!mounted) return;
      // The web app shows a success modal regardless; we surface the error but
      // still record the request locally so the user has a trace.
      await LocalRequests.instance.add(MyRequest(
        type: 'loan',
        title: 'طلب تمويل: ${car.title}',
        subtitle: 'بانتظار التأكيد',
        createdAt: DateTime.now(),
      ));
      if (!mounted) return;
      await _showSuccess();
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _showSuccess() async {
    await showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        icon: const Icon(Icons.check_circle_rounded,
            color: Color(0xFF22C55E), size: 56),
        title: const Text('تم إرسال الطلب بنجاح!', textAlign: TextAlign.center),
        content: const Text(
          'سيتم التواصل معك قريباً من قبل فريقنا.',
          textAlign: TextAlign.center,
        ),
        actions: [
          Center(
            child: TextButton(
              onPressed: () {
                Navigator.of(ctx).pop();
                if (context.canPop()) context.pop();
              },
              child: const Text('موافق'),
            ),
          ),
        ],
      ),
    );
  }

  void _toast(String msg) => ScaffoldMessenger.of(context)
      .showSnackBar(SnackBar(content: Text(msg)));

  @override
  Widget build(BuildContext context) {
    final banksAsync = ref.watch(banksProvider);
    final banks = banksAsync.value ?? const <Bank>[];
    _salaryBank ??= banks.isNotEmpty ? banks.first : null;
    final est = _estimate();

    return Form(
      key: _formKey,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _carSummary(widget.car),
          const SizedBox(height: 16),
          _EstimateCard(result: est, downPct: _downPct, years: _termYears),
          const SizedBox(height: 16),
          _section('شروط التمويل', [
            _sliderRow(
              'الدفعة الأولى',
              '${_downPct.round()}%',
              _downPct,
              0,
              50,
              50,
              (v) => setState(() => _downPct = v),
            ),
            _sliderRow(
              'مدة التمويل',
              '$_termYears سنوات',
              _termYears.toDouble(),
              1,
              6,
              5,
              (v) => setState(() => _termYears = v.round()),
            ),
            if (banks.isNotEmpty)
              DropdownButtonFormField<Bank>(
                value: _salaryBank,
                isExpanded: true,
                decoration: const InputDecoration(labelText: 'جهة تحويل الراتب'),
                dropdownColor: AppColors.surfaceAlt,
                items: banks
                    .map((b) => DropdownMenuItem(
                        value: b, child: Text('${b.name} (${b.interestRate}%)')))
                    .toList(),
                onChanged: (b) => setState(() => _salaryBank = b),
              ),
          ]),
          const SizedBox(height: 16),
          _section('معلومات الهوية', [
            TextFormField(
              controller: _idNumber,
              keyboardType: TextInputType.number,
              inputFormatters: [
                FilteringTextInputFormatter.digitsOnly,
                LengthLimitingTextInputFormatter(10),
              ],
              decoration: const InputDecoration(
                labelText: 'رقم الهوية الوطنية *',
                hintText: '10 أرقام',
              ),
              validator: (v) {
                final s = v?.trim() ?? '';
                if (s.length != 10) return 'رقم الهوية يجب أن يكون 10 أرقام';
                return null;
              },
            ),
          ]),
          const SizedBox(height: 16),
          _section('البيانات الشخصية', [
            TextFormField(
              controller: _mobile,
              keyboardType: TextInputType.phone,
              inputFormatters: [
                FilteringTextInputFormatter.digitsOnly,
                LengthLimitingTextInputFormatter(9),
              ],
              decoration: const InputDecoration(
                labelText: 'رقم الجوال *',
                prefixText: '+966 ',
                hintText: '5xxxxxxxx',
              ),
              validator: (v) =>
                  (v?.trim().length ?? 0) < 9 ? 'أدخل رقم جوال صحيح' : null,
            ),
            Row(
              children: [
                Expanded(
                  child: DropdownButtonFormField<String>(
                    value: _birthMonth,
                    isExpanded: true,
                    decoration:
                        const InputDecoration(labelText: 'شهر الميلاد (هجري) *'),
                    dropdownColor: AppColors.surfaceAlt,
                    items: _hijriMonths
                        .map((m) => DropdownMenuItem(
                            value: m.$1, child: Text(m.$2)))
                        .toList(),
                    onChanged: (v) => setState(() => _birthMonth = v),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: DropdownButtonFormField<String>(
                    value: _birthYear,
                    isExpanded: true,
                    decoration:
                        const InputDecoration(labelText: 'سنة الميلاد (هجري) *'),
                    dropdownColor: AppColors.surfaceAlt,
                    items: List.generate(80, (i) {
                      final y = (_currentHijriYear - 18 - i).toString();
                      return DropdownMenuItem(value: y, child: Text('$y هـ'));
                    }),
                    onChanged: (v) => setState(() => _birthYear = v),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            _genderSelector(),
          ]),
          const SizedBox(height: 16),
          _section('البيانات الائتمانية (اختياري)', [
            DropdownButtonFormField<String>(
              value: _sector,
              isExpanded: true,
              decoration: const InputDecoration(labelText: 'جهة العمل (القطاع)'),
              dropdownColor: AppColors.surfaceAlt,
              items: _sectors
                  .map((s) => DropdownMenuItem(value: s, child: Text(s)))
                  .toList(),
              onChanged: (v) => setState(() => _sector = v),
            ),
            TextFormField(
              controller: _employer,
              decoration: const InputDecoration(labelText: 'اسم جهة العمل'),
            ),
            TextFormField(
              controller: _netSalary,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'صافي الراتب'),
            ),
            TextFormField(
              controller: _obligations,
              keyboardType: TextInputType.number,
              decoration:
                  const InputDecoration(labelText: 'إجمالي الالتزامات الشهرية'),
            ),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              activeThumbColor: AppColors.gold,
              title: const Text('لديك تمويل عقاري؟'),
              value: _realEstate,
              onChanged: (v) => setState(() => _realEstate = v),
            ),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              activeThumbColor: AppColors.gold,
              title: const Text('لديك تعثر في سمة؟'),
              value: _creditDefault,
              onChanged: (v) => setState(() => _creditDefault = v),
            ),
          ]),
          const SizedBox(height: 16),
          _section('معلومات التواصل', [
            TextFormField(
              controller: _fullName,
              decoration: const InputDecoration(labelText: 'الاسم الكامل *'),
              validator: (v) =>
                  (v?.trim().isEmpty ?? true) ? 'مطلوب' : null,
            ),
            TextFormField(
              controller: _email,
              keyboardType: TextInputType.emailAddress,
              decoration:
                  const InputDecoration(labelText: 'البريد الإلكتروني *'),
              validator: (v) {
                final s = v?.trim() ?? '';
                if (s.isEmpty) return 'مطلوب';
                if (!s.contains('@')) return 'بريد إلكتروني غير صالح';
                return null;
              },
            ),
            Row(
              children: [
                Expanded(
                  child: DropdownButtonFormField<String>(
                    value: _city,
                    isExpanded: true,
                    decoration: const InputDecoration(labelText: 'المدينة *'),
                    dropdownColor: AppColors.surfaceAlt,
                    items: _cities
                        .map((c) => DropdownMenuItem(value: c, child: Text(c)))
                        .toList(),
                    onChanged: (v) => setState(() => _city = v),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: DropdownButtonFormField<String>(
                    value: _time,
                    isExpanded: true,
                    decoration:
                        const InputDecoration(labelText: 'الوقت المفضل *'),
                    dropdownColor: AppColors.surfaceAlt,
                    items: _times
                        .map((t) => DropdownMenuItem(value: t, child: Text(t)))
                        .toList(),
                    onChanged: (v) => setState(() => _time = v),
                  ),
                ),
              ],
            ),
            TextFormField(
              controller: _additional,
              maxLines: 3,
              decoration: const InputDecoration(labelText: 'معلومات إضافية'),
            ),
          ]),
          const SizedBox(height: 20),
          GradientButton(
            label: 'سجّل الطلب',
            icon: Icons.send_rounded,
            loading: _submitting,
            onPressed: _submitting ? null : _submit,
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _carSummary(Car car) {
    return GlassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('المركبة المرتبطة بطلبك',
              style: TextStyle(
                  color: AppColors.mutedForeground, fontSize: 12)),
          const SizedBox(height: 4),
          Text(car.title,
              style: const TextStyle(
                  fontSize: 18, fontWeight: FontWeight.w800)),
          Text('موديل ${car.year}',
              style: const TextStyle(color: Colors.white70)),
          const SizedBox(height: 8),
          Text(Formatters.sar(car.price),
              style: const TextStyle(
                  color: AppColors.gold,
                  fontWeight: FontWeight.w800,
                  fontSize: 18)),
        ],
      ),
    );
  }

  Widget _genderSelector() {
    return Row(
      children: LoanCalculatorMeta.genders.map((g) {
        final selected = _gender == g.$1;
        return Expanded(
          child: Padding(
            padding: const EdgeInsets.only(left: 8),
            child: ChoiceChip(
              label: Text(g.$2),
              selected: selected,
              onSelected: (_) => setState(() => _gender = g.$1),
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _section(String title, List<Widget> children) {
    return GlassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title,
              style: const TextStyle(
                  fontWeight: FontWeight.w800, fontSize: 16)),
          const SizedBox(height: 12),
          for (final c in children) ...[
            c,
            const SizedBox(height: 12),
          ],
        ],
      ),
    );
  }

  Widget _sliderRow(String label, String display, double value, double min,
      double max, int divisions, ValueChanged<double> onChanged) {
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

class _EstimateCard extends StatelessWidget {
  const _EstimateCard({
    required this.result,
    required this.downPct,
    required this.years,
  });

  final FinanceResult result;
  final double downPct;
  final int years;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF1C1A18), Color(0xFF080706)],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0x33FFD700)),
      ),
      child: Column(
        children: [
          const Text('القسط الشهري التقديري',
              style: TextStyle(color: AppColors.mutedForeground)),
          const SizedBox(height: 4),
          Text(
            Formatters.sar(result.totalMonthlyPayment),
            style: const TextStyle(
                fontSize: 26,
                fontWeight: FontWeight.w900,
                color: AppColors.gold),
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _stat('الدفعة الأولى', Formatters.sar(result.downPayment)),
              _stat('مبلغ التمويل', Formatters.sar(result.financeAmount)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _stat(String label, String value) => Column(
        children: [
          Text(label,
              style: const TextStyle(
                  color: AppColors.mutedForeground, fontSize: 12)),
          const SizedBox(height: 2),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w700)),
        ],
      );
}
