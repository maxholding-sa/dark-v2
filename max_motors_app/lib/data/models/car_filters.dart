/// Available filter options + price range, from the web `getCarFilters`.
class CarFilterOptions {
  CarFilterOptions({
    this.makes = const [],
    this.bodyTypes = const [],
    this.fuelTypes = const [],
    this.transmissions = const [],
    this.minPrice = 0,
    this.maxPrice = 1000000,
  });

  final List<String> makes;
  final List<String> bodyTypes;
  final List<String> fuelTypes;
  final List<String> transmissions;
  final double minPrice;
  final double maxPrice;

  factory CarFilterOptions.fromJson(Map<String, dynamic> json) {
    final price = (json['priceRange'] as Map?) ?? const {};
    List<String> list(dynamic v) =>
        v is List ? v.map((e) => e.toString()).toList() : const [];
    double dbl(dynamic v, double fallback) =>
        v is num ? v.toDouble() : double.tryParse(v?.toString() ?? '') ?? fallback;
    return CarFilterOptions(
      makes: list(json['makes']),
      bodyTypes: list(json['bodyTypes']),
      fuelTypes: list(json['fuelTypes']),
      transmissions: list(json['transmissions']),
      minPrice: dbl(price['min'], 0),
      maxPrice: dbl(price['max'], 1000000),
    );
  }
}

/// Active filter selections that drive the cars listing query.
class CarQuery {
  const CarQuery({
    this.search = '',
    this.make = '',
    this.bodyType = '',
    this.fuelType = '',
    this.transmission = '',
    this.minPrice,
    this.maxPrice,
    this.sortBy = 'newest',
    this.page = 1,
    this.limit = 10,
  });

  final String search;
  final String make;
  final String bodyType;
  final String fuelType;
  final String transmission;
  final double? minPrice;
  final double? maxPrice;
  final String sortBy; // newest | priceAsc | priceDesc
  final int page;
  final int limit;

  CarQuery copyWith({
    String? search,
    String? make,
    String? bodyType,
    String? fuelType,
    String? transmission,
    double? minPrice,
    double? maxPrice,
    String? sortBy,
    int? page,
    int? limit,
  }) {
    return CarQuery(
      search: search ?? this.search,
      make: make ?? this.make,
      bodyType: bodyType ?? this.bodyType,
      fuelType: fuelType ?? this.fuelType,
      transmission: transmission ?? this.transmission,
      minPrice: minPrice ?? this.minPrice,
      maxPrice: maxPrice ?? this.maxPrice,
      sortBy: sortBy ?? this.sortBy,
      page: page ?? this.page,
      limit: limit ?? this.limit,
    );
  }

  Map<String, dynamic> toQueryParameters() {
    final params = <String, dynamic>{
      'page': page,
      'limit': limit,
      'sortBy': sortBy,
    };
    if (search.isNotEmpty) params['search'] = search;
    if (make.isNotEmpty) params['make'] = make;
    if (bodyType.isNotEmpty) params['bodyType'] = bodyType;
    if (fuelType.isNotEmpty) params['fuelType'] = fuelType;
    if (transmission.isNotEmpty) params['transmission'] = transmission;
    if (minPrice != null) params['minPrice'] = minPrice;
    if (maxPrice != null) params['maxPrice'] = maxPrice;
    return params;
  }
}

