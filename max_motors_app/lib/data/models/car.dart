/// Car model mirroring the web `serializedCarsData` shape.
class Car {
  Car({
    required this.id,
    required this.make,
    required this.model,
    required this.year,
    required this.price,
    this.mileage,
    this.color,
    this.fuelType,
    this.transmission,
    this.bodyType,
    this.isLuxury = false,
    this.driveType,
    this.seats,
    this.description,
    this.category,
    this.videoUrl,
    this.status,
    this.featured = false,
    this.testDriveAvailable = false,
    this.images = const [],
    this.wishlisted = false,
  });

  final String id;
  final String make;
  final String model;
  final int year;
  final double price;
  final int? mileage;
  final String? color;
  final String? fuelType;
  final String? transmission;
  final String? bodyType;
  final bool isLuxury;
  final String? driveType;
  final int? seats;
  final String? description;
  final String? category;
  final String? videoUrl;
  final String? status;
  final bool featured;
  final bool testDriveAvailable;
  final List<String> images;
  final bool wishlisted;

  String get title => '$make $model';

  String? get primaryImage => images.isNotEmpty ? images.first : null;

  factory Car.fromJson(Map<String, dynamic> json) {
    return Car(
      id: json['id']?.toString() ?? '',
      make: json['make']?.toString() ?? '',
      model: json['model']?.toString() ?? '',
      year: _toInt(json['year']) ?? 0,
      price: _toDouble(json['price']) ?? 0,
      mileage: _toInt(json['mileage']),
      color: json['color']?.toString(),
      fuelType: json['fuelType']?.toString(),
      transmission: json['transmission']?.toString(),
      bodyType: json['bodyType']?.toString(),
      isLuxury: json['isLuxury'] == true,
      driveType: json['driveType']?.toString(),
      seats: _toInt(json['seats']),
      description: json['description']?.toString(),
      category: json['category']?.toString(),
      videoUrl: json['videoUrl']?.toString(),
      status: json['status']?.toString(),
      featured: json['featured'] == true,
      testDriveAvailable: json['testDriveAvailable'] == true,
      images: _toStringList(json['images']),
      // Web helper uses the (typo'd) key `wishliseted`; accept both.
      wishlisted: json['wishlisted'] == true || json['wishliseted'] == true,
    );
  }

  Car copyWith({bool? wishlisted}) => Car(
        id: id,
        make: make,
        model: model,
        year: year,
        price: price,
        mileage: mileage,
        color: color,
        fuelType: fuelType,
        transmission: transmission,
        bodyType: bodyType,
        isLuxury: isLuxury,
        driveType: driveType,
        seats: seats,
        description: description,
        category: category,
        videoUrl: videoUrl,
        status: status,
        featured: featured,
        testDriveAvailable: testDriveAvailable,
        images: images,
        wishlisted: wishlisted ?? this.wishlisted,
      );
}

int? _toInt(dynamic v) {
  if (v == null) return null;
  if (v is int) return v;
  if (v is double) return v.toInt();
  return int.tryParse(v.toString());
}

double? _toDouble(dynamic v) {
  if (v == null) return null;
  if (v is num) return v.toDouble();
  return double.tryParse(v.toString());
}

List<String> _toStringList(dynamic v) {
  if (v is List) return v.map((e) => e.toString()).toList();
  return const [];
}
