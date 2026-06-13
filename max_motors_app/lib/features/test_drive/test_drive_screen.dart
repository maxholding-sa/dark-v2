import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_colors.dart';
import '../../core/utils/formatters.dart';
import '../../core/utils/launchers.dart';
import '../../core/widgets/async_view.dart';
import '../../core/widgets/glass_card.dart';
import '../../core/widgets/gradient_button.dart';
import '../../data/local/local_requests.dart';
import '../../data/models/car.dart';
import '../../data/providers.dart';

const _cities = <String>[
  'الرياض', 'جدة', 'مكة', 'المدينة', 'الدمام', 'الخبر', 'الطائف',
  'تبوك', 'أبها', 'حائل', 'الجوف', 'نجران', 'جازان', 'الباحة',
];

class TestDriveScreen extends ConsumerWidget {
  const TestDriveScreen({super.key, required this.carId});

  final String carId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final car = ref.watch(carByIdProvider(carId));
    return Scaffold(
      appBar: AppBar(title: const Text('حجز قيادة تجريبية')),
      body: AsyncView(
        value: car,
        onRetry: () => ref.invalidate(carByIdProvider(carId)),
        data: (c) => _TestDriveForm(car: c),
      ),
    );
  }
}

class _TestDriveForm extends ConsumerStatefulWidget {
  const _TestDriveForm({required this.car});
  final Car car;

  @override
  ConsumerState<_TestDriveForm> createState() => _TestDriveFormState();
}

class _TestDriveFormState extends ConsumerState<_TestDriveForm> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _mobile = TextEditingController();
  final _email = TextEditingController();
  String? _city;
  DateTime? _date;
  bool _submitting = false;

  @override
  void dispose() {
    _name.dispose();
    _mobile.dispose();
    _email.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: now.add(const Duration(days: 1)),
      firstDate: now,
      lastDate: now.add(const Duration(days: 60)),
    );
    if (picked != null) setState(() => _date = picked);
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    if (_city == null || _date == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('يرجى اختيار المدينة والتاريخ')),
      );
      return;
    }
    setState(() => _submitting = true);
    final car = widget.car;
    final dateText = Formatters.dateArabic(_date);
    final message =
        'طلب قيادة تجريبية\nالسيارة: ${car.title} (${car.year})\n'
        'الاسم: ${_name.text.trim()}\nالجوال: +966${_mobile.text.trim()}\n'
        'المدينة: $_city\nالتاريخ المفضل: $dateText';

    try {
      await ref.read(formsRepositoryProvider).submitContact(
            name: _name.text.trim(),
            email: _email.text.trim().isEmpty
                ? 'noreply@maxmotors.app'
                : _email.text.trim(),
            subject: 'حجز قيادة تجريبية - ${car.title}',
            message: message,
          );
    } catch (_) {
      // Fall back to WhatsApp if the contact endpoint is unavailable.
      await Launchers.whatsapp(message);
    }

    await LocalRequests.instance.add(MyRequest(
      type: 'test_drive',
      title: 'قيادة تجريبية: ${car.title}',
      subtitle: 'التاريخ المفضل: $dateText',
      createdAt: DateTime.now(),
    ));

    if (!mounted) return;
    setState(() => _submitting = false);
    await showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        icon: const Icon(Icons.check_circle_rounded,
            color: Color(0xFF22C55E), size: 56),
        title: const Text('تم إرسال طلبك', textAlign: TextAlign.center),
        content: const Text('سنتواصل معك لتأكيد موعد القيادة التجريبية.',
            textAlign: TextAlign.center),
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

  @override
  Widget build(BuildContext context) {
    final car = widget.car;
    return Form(
      key: _formKey,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          GlassCard(
            child: Row(
              children: [
                const Icon(Icons.drive_eta_rounded,
                    color: AppColors.gold, size: 32),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(car.title,
                          style: const TextStyle(
                              fontWeight: FontWeight.w800, fontSize: 16)),
                      Text('موديل ${car.year}',
                          style: const TextStyle(
                              color: AppColors.mutedForeground)),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          GlassCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                TextFormField(
                  controller: _name,
                  decoration: const InputDecoration(labelText: 'الاسم الكامل *'),
                  validator: (v) =>
                      (v?.trim().isEmpty ?? true) ? 'مطلوب' : null,
                ),
                const SizedBox(height: 12),
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
                const SizedBox(height: 12),
                TextFormField(
                  controller: _email,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(
                      labelText: 'البريد الإلكتروني (اختياري)'),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  value: _city,
                  isExpanded: true,
                  decoration: const InputDecoration(labelText: 'المدينة *'),
                  dropdownColor: AppColors.surfaceAlt,
                  items: _cities
                      .map((c) => DropdownMenuItem(value: c, child: Text(c)))
                      .toList(),
                  onChanged: (v) => setState(() => _city = v),
                ),
                const SizedBox(height: 12),
                InkWell(
                  onTap: _pickDate,
                  borderRadius: BorderRadius.circular(10),
                  child: InputDecorator(
                    decoration:
                        const InputDecoration(labelText: 'التاريخ المفضل *'),
                    child: Row(
                      children: [
                        const Icon(Icons.calendar_today_rounded,
                            size: 18, color: AppColors.gold),
                        const SizedBox(width: 10),
                        Text(
                          _date == null
                              ? 'اختر تاريخاً'
                              : Formatters.dateArabic(_date),
                          style: TextStyle(
                            color: _date == null
                                ? AppColors.mutedForeground
                                : AppColors.white,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          GradientButton(
            label: 'تأكيد الحجز',
            icon: Icons.event_available_rounded,
            loading: _submitting,
            onPressed: _submitting ? null : _submit,
          ),
        ],
      ),
    );
  }
}
