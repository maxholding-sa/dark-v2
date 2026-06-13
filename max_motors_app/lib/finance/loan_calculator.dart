import 'dart:math' as math;

/// Dart port of the web app `src/lib/loan-calculator.js` — an Islamic
/// (Murabaha-style) auto-finance calculator. Field names and math are kept
/// identical so results match the website exactly.

const double _epsilon = 1e-10;

const List<String> defaultAgeBrackets = [
  '18 to 24',
  '25 to 30',
  '31 to 35',
  '36 to 40',
  '41 to 45',
  '46 to 50',
  '51 to 60',
  '61+',
];

const Map<String, Map<String, Map<String, double>>> _defaultSegmentRates = {
  'male': {
    '18 to 24': {'A': 0.0581, 'B': 0.0504, 'C': 0.0455, 'D': 0.043, 'E': 0.041, 'F': 0.04, 'G': 0.039},
    '25 to 30': {'A': 0.034, 'B': 0.0325, 'C': 0.031, 'D': 0.03, 'E': 0.029, 'F': 0.0285, 'G': 0.028},
    '31 to 35': {'A': 0.0252, 'B': 0.0245, 'C': 0.0266, 'D': 0.026, 'E': 0.0255, 'F': 0.025, 'G': 0.0245},
    '36 to 40': {'A': 0.0235, 'B': 0.023, 'C': 0.024, 'D': 0.0238, 'E': 0.0235, 'F': 0.0232, 'G': 0.023},
    '41 to 45': {'A': 0.024, 'B': 0.0237, 'C': 0.0243, 'D': 0.024, 'E': 0.0238, 'F': 0.0235, 'G': 0.0232},
    '46 to 50': {'A': 0.026, 'B': 0.0255, 'C': 0.0265, 'D': 0.026, 'E': 0.0258, 'F': 0.0255, 'G': 0.0252},
    '51 to 60': {'A': 0.03, 'B': 0.0295, 'C': 0.03, 'D': 0.0298, 'E': 0.0295, 'F': 0.0292, 'G': 0.029},
    '61+': {'A': 0.038, 'B': 0.037, 'C': 0.0375, 'D': 0.0372, 'E': 0.037, 'F': 0.0368, 'G': 0.0365},
  },
  'female': {
    '18 to 24': {'A': 0.0441, 'B': 0.0469, 'C': 0.0588, 'D': 0.048, 'E': 0.046, 'F': 0.045, 'G': 0.044},
    '25 to 30': {'A': 0.031, 'B': 0.032, 'C': 0.034, 'D': 0.0335, 'E': 0.033, 'F': 0.0325, 'G': 0.032},
    '31 to 35': {'A': 0.028, 'B': 0.0294, 'C': 0.0336, 'D': 0.031, 'E': 0.03, 'F': 0.0295, 'G': 0.029},
    '36 to 40': {'A': 0.026, 'B': 0.027, 'C': 0.029, 'D': 0.0285, 'E': 0.028, 'F': 0.0275, 'G': 0.027},
    '41 to 45': {'A': 0.0265, 'B': 0.0275, 'C': 0.0295, 'D': 0.029, 'E': 0.0285, 'F': 0.028, 'G': 0.0278},
    '46 to 50': {'A': 0.0285, 'B': 0.0295, 'C': 0.0315, 'D': 0.031, 'E': 0.0305, 'F': 0.03, 'G': 0.0298},
    '51 to 60': {'A': 0.032, 'B': 0.033, 'C': 0.035, 'D': 0.0345, 'E': 0.034, 'F': 0.0335, 'G': 0.0332},
    '61+': {'A': 0.039, 'B': 0.04, 'C': 0.0415, 'D': 0.041, 'E': 0.0405, 'F': 0.04, 'G': 0.0395},
  },
};

class BankConfig {
  const BankConfig({
    this.adminFeesCap = 5000,
    this.minInsurancePremium = 1650,
    this.ftpAnchors = const [2.45, 2.7, 2.75, 2.78, 2.8, 2.46],
    this.cor = 0.0108,
    this.opex = 0.0048,
    this.irrTarget = 0.0621,
    this.brandSegmentMap = const {},
    this.insuranceTable = _defaultSegmentRates,
  });

  final double adminFeesCap;
  final double minInsurancePremium;
  final List<double> ftpAnchors;
  final double cor;
  final double opex;
  final double irrTarget;
  final Map<String, String> brandSegmentMap;
  final Map<String, Map<String, Map<String, double>>> insuranceTable;

  static const defaultBrandSegmentMap = {
    'Toyota': 'A',
    'Hyundai': 'B',
    'Kia': 'B',
    'Jeep': 'C',
    'BMW': 'D',
    'Mercedes': 'D',
    'Nissan': 'B',
  };
}

const BankConfig defaultBankConfig = BankConfig();

class FinanceInputs {
  const FinanceInputs({
    required this.carPrice,
    this.termMonths = 12,
    this.profitRate = 0,
    this.downPaymentPct = 0,
    this.adminFeesPct = 0,
    this.balloonPaymentPct = 0,
    this.rebate = 0,
    this.gender = 'male',
    this.ageBracket = '31 to 35',
    this.carBrand = '',
  });

  final double carPrice;
  final int termMonths;
  final double profitRate;
  final double downPaymentPct;
  final double adminFeesPct;
  final double balloonPaymentPct;
  final double rebate;
  final String gender;
  final String ageBracket;
  final String carBrand;
}

class ScheduleRow {
  ScheduleRow({
    required this.month,
    required this.outstandingStart,
    required this.profit,
    required this.principal,
    required this.insurance,
    required this.cashflow,
    required this.outstandingEnd,
  });

  final int month;
  final double outstandingStart;
  final double profit;
  final double principal;
  final double insurance;
  final double cashflow;
  final double outstandingEnd;
}

class FinanceResult {
  FinanceResult({
    required this.downPayment,
    required this.financeAmount,
    required this.balloonPayment,
    required this.adminFees,
    required this.insuranceRate,
    required this.segment,
    required this.installment,
    required this.monthlyInsurance,
    required this.totalMonthlyPayment,
    required this.totalInsurance,
    required this.totalProfit,
    required this.totalPrincipal,
    required this.grandTotal,
    required this.apr,
    required this.irr,
    required this.schedule,
  });

  final double downPayment;
  final double financeAmount;
  final double balloonPayment;
  final double adminFees;
  final double insuranceRate;
  final String segment;
  final double installment;
  final double monthlyInsurance;
  final double totalMonthlyPayment;
  final double totalInsurance;
  final double totalProfit;
  final double totalPrincipal;
  final double grandTotal;
  final double apr;
  final double irr;
  final List<ScheduleRow> schedule;
}

double _clamp(double value, double min, double max) =>
    math.min(math.max(value, min), max);

double _round(double value, [int digits = 2]) {
  final factor = math.pow(10, digits);
  return (value * factor).round() / factor;
}

double _normalizeRate(dynamic value) {
  if (value == null) return 0;
  final numeric = value is num ? value.toDouble() : double.tryParse('$value');
  if (numeric == null || numeric.isNaN) return 0;
  return numeric > 1 ? numeric / 100 : numeric;
}

String _segmentForBrand(Map<String, String> map, String? brand) {
  if (brand == null || brand.isEmpty) return 'A';
  return map[brand] ?? map[brand.toLowerCase()] ?? 'A';
}

double _insuranceRate(
  Map<String, Map<String, Map<String, double>>> table,
  String gender,
  String ageBracket,
  String segment,
) {
  final g = gender == 'female' ? 'female' : 'male';
  final ageTable = table[g]?[ageBracket] ?? table[g]?['31 to 35'];
  return ageTable?[segment] ?? ageTable?['A'] ?? 0.025;
}

/// Loan payment (PMT) — matches Excel/JS PMT.
double pmt(double rate, int nper, double pv, [double fv = 0]) {
  if (rate.abs() < _epsilon) return -(pv + fv) / nper;
  final q = math.pow(1 + rate, nper).toDouble();
  return (-rate * (pv * q + fv)) / (q - 1);
}

/// Newton-Raphson IRR solver — matches the JS `rate()` helper.
double rate(int nper, double payment, double pv,
    [double fv = 0, double tol = 1e-8, int maxIter = 100]) {
  double r = 0.01;
  for (var i = 0; i < maxIter; i++) {
    final q = math.pow(1 + r, nper).toDouble();
    final f = pv * q + payment * ((q - 1) / r) + fv;
    final df = nper * pv * math.pow(1 + r, nper - 1).toDouble() +
        payment *
            ((nper * r * math.pow(1 + r, nper - 1).toDouble() - q + 1) /
                (r * r));
    if (df.abs() < _epsilon) break;
    final dr = f / df;
    r -= dr;
    if (dr.abs() < tol) break;
  }
  return r;
}

List<_BaseRow> _buildBaseSchedule(double financeAmount, double monthlyRate,
    int termMonths, double balloonPayment, double monthlyInstallment) {
  final schedule = <_BaseRow>[];
  double outstanding = financeAmount;
  for (var month = 1; month <= termMonths; month++) {
    final profit = outstanding * monthlyRate;
    double principal = monthlyInstallment - profit;
    if (month == termMonths) principal += balloonPayment;
    principal = _clamp(principal, 0, outstanding);
    final nextOutstanding = math.max(0.0, outstanding - principal);
    schedule.add(_BaseRow(
      month: month,
      outstandingStart: outstanding,
      profit: profit,
      principal: principal,
      outstandingEnd: nextOutstanding,
    ));
    outstanding = nextOutstanding;
  }
  return schedule;
}

class _BaseRow {
  _BaseRow({
    required this.month,
    required this.outstandingStart,
    required this.profit,
    required this.principal,
    required this.outstandingEnd,
  });
  final int month;
  final double outstandingStart;
  final double profit;
  final double principal;
  final double outstandingEnd;
}

double _totalInsurance(List<_BaseRow> base, double financeAmount,
    double insuranceRate, int termMonths, double minPremium) {
  final years = (termMonths / 12).ceil();
  double total = 0;
  for (var yearIndex = 0; yearIndex < years; yearIndex++) {
    final startMonth = yearIndex * 12 + 1;
    final row = base.firstWhere(
      (r) => r.month == startMonth,
      orElse: () => _BaseRow(
        month: startMonth,
        outstandingStart: financeAmount,
        profit: 0,
        principal: 0,
        outstandingEnd: financeAmount,
      ),
    );
    final annualPremium =
        math.max(row.outstandingStart * insuranceRate, minPremium);
    total += annualPremium;
  }
  return ((total) * 100).ceil() / 100;
}

// Kept for parity with the web `loan-calculator.js`; not used by the current
// engine but retained so future FTP-curve features match the website exactly.
// ignore: unused_element
List<double> _interpolateFtpMonthly(List<double> anchors, int termMonths) {
  final normalized =
      (anchors.isNotEmpty ? anchors : [2.5]).map(_normalizeRate).toList();
  final lastIndex = normalized.length - 1;
  final result = <double>[];
  for (var month = 1; month <= termMonths; month++) {
    final yearLower = ((month - 1) / 12).floor();
    final yearUpper = math.min(yearLower + 1, lastIndex);
    final lower = normalized[math.min(yearLower, lastIndex)];
    final upper = normalized[yearUpper];
    final fraction = ((month - 1) % 12) / 12;
    result.add(lower + (upper - lower) * fraction);
  }
  return result;
}

/// Core engine — mirrors `calculateIslamicAutoFinance`.
FinanceResult calculateIslamicAutoFinance(
  BankConfig bankConfig,
  FinanceInputs inputs,
) {
  final term = math.max(1, inputs.termMonths);
  final profitRate = _normalizeRate(inputs.profitRate);
  final downPct = _normalizeRate(inputs.downPaymentPct);
  final adminPct = _normalizeRate(inputs.adminFeesPct);
  final balloonPct = _normalizeRate(inputs.balloonPaymentPct);
  final rebate = inputs.rebate;

  final carPrice = inputs.carPrice;
  final downPayment = carPrice * downPct;
  final financeAmount = math.max(0.0, carPrice - downPayment);
  final balloonPayment = carPrice * balloonPct;
  final adminFees =
      math.min(bankConfig.adminFeesCap, financeAmount * adminPct).roundToDouble();

  final monthlyRate = profitRate / 12;
  final monthlyInstallment = pmt(monthlyRate, term, -financeAmount, balloonPayment);

  final brandMap = {
    ...BankConfig.defaultBrandSegmentMap,
    ...bankConfig.brandSegmentMap,
  };
  final segment = _segmentForBrand(brandMap, inputs.carBrand);
  final insuranceRate = _insuranceRate(
      bankConfig.insuranceTable, inputs.gender, inputs.ageBracket, segment);

  final base = _buildBaseSchedule(
      financeAmount, monthlyRate, term, balloonPayment, monthlyInstallment);
  final totalInsurance = _totalInsurance(
      base, financeAmount, insuranceRate, term, bankConfig.minInsurancePremium);
  final monthlyInsurance = totalInsurance / term;
  final totalMonthlyPayment = monthlyInstallment + monthlyInsurance;

  final schedule = base
      .map((row) => ScheduleRow(
            month: row.month,
            outstandingStart: _round(row.outstandingStart),
            profit: _round(row.profit),
            principal: _round(row.principal),
            insurance: _round(monthlyInsurance),
            cashflow: _round(row.principal + row.profit + monthlyInsurance),
            outstandingEnd: _round(row.outstandingEnd),
          ))
      .toList();

  final totalProfit = base.fold<double>(0, (sum, r) => sum + r.profit);
  final totalPrincipal = base.fold<double>(0, (sum, r) => sum + r.principal);
  final grandTotal = totalPrincipal + totalInsurance + totalProfit + adminFees;

  final monthlyRoiRate = rate(
      term, monthlyInstallment, -(financeAmount - rebate + totalInsurance),
      balloonPayment);
  final irr = monthlyRoiRate * 12;
  final apr = math.pow(1 + monthlyRoiRate, 12).toDouble() - 1;

  return FinanceResult(
    downPayment: _round(downPayment),
    financeAmount: _round(financeAmount),
    balloonPayment: _round(balloonPayment),
    adminFees: _round(adminFees),
    insuranceRate: insuranceRate,
    segment: segment,
    installment: _round(monthlyInstallment),
    monthlyInsurance: _round(monthlyInsurance),
    totalMonthlyPayment: _round(totalMonthlyPayment),
    totalInsurance: _round(totalInsurance),
    totalProfit: _round(totalProfit),
    totalPrincipal: _round(totalPrincipal),
    grandTotal: _round(grandTotal),
    apr: apr,
    irr: irr,
    schedule: schedule,
  );
}

class LoanCalculatorMeta {
  static const ageBrackets = defaultAgeBrackets;
  static const genders = [
    ('male', 'ذكر'),
    ('female', 'أنثى'),
  ];
}
