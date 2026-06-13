import 'package:shared_preferences/shared_preferences.dart';

/// Stores saved/favorited car ids on-device. The web app keeps favorites
/// server-side (Clerk-gated server actions); on mobile we persist locally so
/// the feature works without an account.
class LocalFavorites {
  LocalFavorites._();
  static final LocalFavorites instance = LocalFavorites._();

  static const _key = 'saved_car_ids';
  SharedPreferences? _prefs;

  Future<SharedPreferences> get _p async =>
      _prefs ??= await SharedPreferences.getInstance();

  Future<Set<String>> getIds() async {
    final p = await _p;
    return (p.getStringList(_key) ?? const []).toSet();
  }

  Future<bool> isSaved(String id) async => (await getIds()).contains(id);

  /// Toggles a car id; returns the new saved state.
  Future<bool> toggle(String id) async {
    final p = await _p;
    final ids = (p.getStringList(_key) ?? const <String>[]).toSet();
    final nowSaved = !ids.contains(id);
    if (nowSaved) {
      ids.add(id);
    } else {
      ids.remove(id);
    }
    await p.setStringList(_key, ids.toList());
    return nowSaved;
  }
}
