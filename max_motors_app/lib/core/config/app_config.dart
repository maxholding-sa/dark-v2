import 'package:flutter/foundation.dart';

/// App-wide configuration sourced from `--dart-define` values so the same
/// build can point at different backends / Clerk apps.
///
/// Values come from the web `.env` when you use:
///   `./scripts/run_with_web_env.sh chrome`
///
/// Manual override example:
/// flutter run \
///   --dart-define=API_BASE_URL=http://127.0.0.1:3001 \
///   --dart-define=SUPABASE_URL=https://xxx.supabase.co \
///   --dart-define=SUPABASE_ANON_KEY=eyJ... \
///   --dart-define=USE_DEMO_DATA=false
class AppConfig {
  const AppConfig._();

  /// Base URL of the deployed Next.js backend (no trailing slash).
  /// Mirrors `NEXT_PUBLIC_BASE_URL` from the web `.env`.
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://127.0.0.1:3001',
  );

  /// Mirrors `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` from the web `.env`.
  static const String clerkPublishableKey = String.fromEnvironment(
    'CLERK_PUBLISHABLE_KEY',
    defaultValue: '',
  );

  /// Mirrors `NEXT_PUBLIC_SUPABASE_URL` from the web `.env`.
  static const String supabaseUrl = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: '',
  );

  /// Mirrors `NEXT_PUBLIC_SUPABASE_ANON_KEY` from the web `.env`.
  static const String supabaseAnonKey = String.fromEnvironment(
    'SUPABASE_ANON_KEY',
    defaultValue: '',
  );

  /// Storage bucket that holds car/review/brand images on Supabase.
  static const String supabaseBucket = String.fromEnvironment(
    'SUPABASE_BUCKET',
    defaultValue: 'car-images',
  );

  static bool get hasSupabase =>
      supabaseUrl.isNotEmpty && supabaseAnonKey.isNotEmpty;

  /// WhatsApp contact number in international format without `+`.
  static const String whatsappNumber = String.fromEnvironment(
    'WHATSAPP_NUMBER',
    defaultValue: '966500000000',
  );

  static bool get hasClerk => clerkPublishableKey.isNotEmpty;

  /// When true, cars/home/banks load from bundled sample data (no network).
  /// Defaults to on in debug builds while Supabase/API are unavailable.
  /// Pass `--dart-define=USE_DEMO_DATA=false` once `.env` database is fixed.
  static bool get useDemoCatalog {
    const flag = String.fromEnvironment('USE_DEMO_DATA');
    if (flag == 'true') return true;
    if (flag == 'false') return false;
    return kDebugMode;
  }
}
