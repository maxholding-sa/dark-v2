import 'package:supabase_flutter/supabase_flutter.dart';

import '../network/api_exception.dart';

/// Translates any error thrown by the Supabase SDK into the app-wide
/// [ApiException] with an Arabic-friendly message, mirroring the previous
/// REST behaviour.
Never throwAsApi(Object error) {
  if (error is ApiException) throw error;

  if (error is PostgrestException) {
    throw ApiException(
      error.message,
      statusCode: int.tryParse(error.code ?? ''),
    );
  }
  if (error is StorageException) {
    throw ApiException(
      error.message,
      statusCode: int.tryParse(error.statusCode ?? ''),
    );
  }
  if (error is AuthException) {
    throw ApiException(error.message);
  }
  throw ApiException(error.toString());
}
