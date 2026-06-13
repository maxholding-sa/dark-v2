class Article {
  Article({
    required this.id,
    required this.title,
    required this.slug,
    this.excerpt,
    this.content,
    this.image,
    this.tags = const [],
    this.publishedAt,
  });

  final String id;
  final String title;
  final String slug;
  final String? excerpt;
  final String? content;
  final String? image;
  final List<String> tags;
  final DateTime? publishedAt;

  factory Article.fromJson(Map<String, dynamic> json) {
    return Article(
      id: json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      slug: json['slug']?.toString() ?? '',
      excerpt: json['excerpt']?.toString(),
      content: json['content']?.toString(),
      image: json['image']?.toString(),
      tags: json['tags'] is List
          ? (json['tags'] as List).map((e) => e.toString()).toList()
          : const [],
      publishedAt: DateTime.tryParse(json['publishedAt']?.toString() ?? ''),
    );
  }
}
