/// Generic paginated result matching the web `{ data, pagination }` shape.
class Paginated<T> {
  Paginated({
    required this.items,
    required this.total,
    required this.page,
    required this.pages,
  });

  final List<T> items;
  final int total;
  final int page;
  final int pages;

  bool get hasMore => page < pages;

  factory Paginated.fromJson(
    Map<String, dynamic> json,
    T Function(Map<String, dynamic>) fromItem,
  ) {
    final data = (json['data'] as List?) ?? const [];
    final pagination = (json['pagination'] as Map?) ?? const {};
    int asInt(dynamic v, int fallback) =>
        v is num ? v.toInt() : int.tryParse(v?.toString() ?? '') ?? fallback;
    return Paginated<T>(
      items: data
          .whereType<Map>()
          .map((e) => fromItem(Map<String, dynamic>.from(e)))
          .toList(),
      total: asInt(pagination['total'], data.length),
      page: asInt(pagination['page'], 1),
      pages: asInt(pagination['pages'], 1),
    );
  }
}
