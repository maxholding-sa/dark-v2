/// Compares finance offers locally (the previous `/api/analyze-offers`
/// endpoint was a deterministic, self-contained computation, so it's ported
/// here — the app no longer needs a separate backend for it).
class FinanceRepository {
  FinanceRepository();

  static const double _dtiThreshold = 35;

  Future<Map<String, dynamic>> analyzeOffers({
    required List<Map<String, dynamic>> offers,
    required Map<String, dynamic> userData,
  }) async {
    if (offers.length < 2) {
      return {'message': 'يجب تقديم عرضين على الأقل للمقارنة'};
    }

    final netSalary = _num(userData['netSalary']);
    final obligations = _num(userData['totalMonthlyObligations'] ??
        userData['monthlyObligations']);
    final availableIncome = netSalary - obligations;

    final analyzed = offers.map((o) {
      final monthly = _num(o['monthlyPayment']);
      final down = _num(o['downPayment']);
      final termMonths = _num(o['termMonths'] ?? o['tenure'], fallback: 12);
      final totalCost =
          _num(o['totalCost'] ?? o['totalPayment'], fallback: down + monthly * termMonths);
      final ratio =
          availableIncome > 0 ? (monthly / availableIncome) * 100 : 100;
      return {
        'label': (o['bankName'] ?? o['title'] ?? 'عرض').toString(),
        'monthlyPayment': monthly,
        'downPayment': down,
        'totalCost': totalCost,
        'paymentToIncomeRatio': double.parse(ratio.toStringAsFixed(1)),
        'isAffordable': ratio <= _dtiThreshold,
      };
    }).toList();

    final affordable =
        analyzed.where((o) => o['isAffordable'] == true).toList();
    final byCost = [...analyzed]
      ..sort((a, b) =>
          (a['totalCost'] as num).compareTo(b['totalCost'] as num));
    final byMonthly = [...analyzed]
      ..sort((a, b) =>
          (a['monthlyPayment'] as num).compareTo(b['monthlyPayment'] as num));

    String? recommendation;
    if (affordable.isNotEmpty) {
      final best = byCost.first;
      recommendation =
          'أفضل تكلفة إجمالية: ${best['label']} (${_fmt(best['totalCost'])} ريال)، '
          'وأخف قسط شهري: ${byMonthly.first['label']} (${_fmt(byMonthly.first['monthlyPayment'])} ريال).';
    } else {
      recommendation =
          'لا يوجد عرض ضمن حد التحمل الشهري الحالي. جرّب رفع الدفعة الأولى أو مدة أطول.';
    }

    return {
      'recommendation': recommendation,
      'offers': analyzed,
      'summary': {
        'totalOffersAnalyzed': analyzed.length,
        'affordableOffersCount': affordable.length,
        'lowestMonthlyPayment': byMonthly.first['monthlyPayment'],
        'lowestTotalCost': byCost.first['totalCost'],
      },
    };
  }

  static num _num(dynamic v, {num fallback = 0}) {
    if (v is num) return v;
    return num.tryParse(v?.toString() ?? '') ?? fallback;
  }

  static String _fmt(dynamic v) {
    final n = _num(v).round();
    final s = n.toString();
    final buf = StringBuffer();
    for (int i = 0; i < s.length; i++) {
      if (i > 0 && (s.length - i) % 3 == 0) buf.write(',');
      buf.write(s[i]);
    }
    return buf.toString();
  }
}
