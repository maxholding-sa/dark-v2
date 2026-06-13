/// Shared model for featured brands and featured models (same shape).
class FeaturedItem {
  FeaturedItem({
    required this.id,
    required this.name,
    this.nameAr,
    this.image,
    this.order = 0,
  });

  final String id;
  final String name;
  final String? nameAr;
  final String? image;
  final int order;

  String get displayName => (nameAr?.isNotEmpty ?? false) ? nameAr! : name;

  factory FeaturedItem.fromJson(Map<String, dynamic> json) {
    return FeaturedItem(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      nameAr: json['nameAr']?.toString(),
      image: json['image']?.toString(),
      order: json['order'] is num ? (json['order'] as num).toInt() : 0,
    );
  }
}
