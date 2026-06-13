import 'package:intl/intl.dart';

/// Formatting helpers mirroring the web `formatSaudiRiyalText` helper.
class Formatters {
  const Formatters._();

  static final NumberFormat _numberFormat = NumberFormat('#,##0', 'en');
  static final NumberFormat _decimalFormat = NumberFormat('#,##0.00', 'en');

  /// e.g. `85,000 ريال`
  static String sar(num? amount) {
    final value = amount ?? 0;
    return '${_numberFormat.format(value)} ريال';
  }

  static String sarDecimal(num? amount) {
    final value = amount ?? 0;
    return '${_decimalFormat.format(value)} ريال';
  }

  static String number(num? value) => _numberFormat.format(value ?? 0);

  /// e.g. `120,000 كم`
  static String mileage(num? km) => '${_numberFormat.format(km ?? 0)} كم';

  static String dateArabic(DateTime? date) {
    if (date == null) return '';
    return DateFormat('d MMMM yyyy', 'ar').format(date);
  }

  static String percent(num? fraction) {
    final value = (fraction ?? 0) * 100;
    return '${_decimalFormat.format(value)}%';
  }
}
