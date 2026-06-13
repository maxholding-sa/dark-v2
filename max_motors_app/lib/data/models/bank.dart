class Bank {
  Bank({
    required this.id,
    required this.name,
    this.logoImage,
    this.interestRate = 0,
    this.loanPolicy,
  });

  final String id;
  final String name;
  final String? logoImage;
  final double interestRate;
  final String? loanPolicy;

  factory Bank.fromJson(Map<String, dynamic> json) {
    final rate = json['interestRate'];
    return Bank(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      logoImage: json['logoImage']?.toString(),
      interestRate: rate is num
          ? rate.toDouble()
          : double.tryParse(rate?.toString() ?? '') ?? 0,
      loanPolicy: json['loanPolicy']?.toString(),
    );
  }
}
