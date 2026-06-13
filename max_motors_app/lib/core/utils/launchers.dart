import 'package:url_launcher/url_launcher.dart';

import '../config/app_config.dart';

/// Helpers for WhatsApp / phone / email / external links — used across the
/// app the same way the web app relies on WhatsApp CTAs.
class Launchers {
  const Launchers._();

  static Future<void> whatsapp(String message, {String? number}) async {
    final n = number ?? AppConfig.whatsappNumber;
    final uri = Uri.parse(
        'https://wa.me/$n?text=${Uri.encodeComponent(message)}');
    await _open(uri);
  }

  static Future<void> call(String phone) async =>
      _open(Uri(scheme: 'tel', path: phone));

  static Future<void> email(String address, {String? subject}) async => _open(
        Uri(
          scheme: 'mailto',
          path: address,
          query: subject == null ? null : 'subject=${Uri.encodeComponent(subject)}',
        ),
      );

  static Future<void> url(String link) async => _open(Uri.parse(link));

  static Future<void> _open(Uri uri) async {
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }
}
