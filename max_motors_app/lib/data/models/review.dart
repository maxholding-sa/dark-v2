class Review {
  Review({
    required this.id,
    required this.clientName,
    this.city,
    this.car,
    this.rating = 5,
    this.videoUrl,
    this.imageUrl,
    this.reviewText,
    this.createdAt,
  });

  final String id;
  final String clientName;
  final String? city;
  final String? car;
  final int rating;
  final String? videoUrl;
  final String? imageUrl;
  final String? reviewText;
  final DateTime? createdAt;

  factory Review.fromJson(Map<String, dynamic> json) {
    return Review(
      id: json['id']?.toString() ?? '',
      clientName: json['clientName']?.toString() ?? '',
      city: json['city']?.toString(),
      car: json['car']?.toString(),
      rating: json['rating'] is num
          ? (json['rating'] as num).toInt()
          : int.tryParse(json['rating']?.toString() ?? '') ?? 5,
      videoUrl: json['videoUrl']?.toString(),
      imageUrl: json['imageUrl']?.toString(),
      reviewText: json['reviewText']?.toString(),
      createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? ''),
    );
  }
}
