import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../features/about/about_screen.dart';
import '../../features/articles/article_detail_screen.dart';
import '../../features/articles/articles_screen.dart';
import '../../features/auth/sign_in_screen.dart';
import '../../features/banks/banks_screen.dart';
import '../../features/car_details/car_details_screen.dart';
import '../../features/cars/cars_screen.dart';
import '../../features/companies/companies_screen.dart';
import '../../features/company_request/company_request_screen.dart';
import '../../features/contact/contact_screen.dart';
import '../../features/finance/finance_screen.dart';
import '../../features/home/home_screen.dart';
import '../../features/loan_request/loan_request_screen.dart';
import '../../features/more/more_screen.dart';
import '../../features/reservations/reservations_screen.dart';
import '../../features/reviews/reviews_screen.dart';
import '../../features/saved/saved_cars_screen.dart';
import '../../features/shell/app_shell.dart';
import '../../features/test_drive/test_drive_screen.dart';

final _rootKey = GlobalKey<NavigatorState>();
final _homeKey = GlobalKey<NavigatorState>();
final _carsKey = GlobalKey<NavigatorState>();
final _financeKey = GlobalKey<NavigatorState>();
final _savedKey = GlobalKey<NavigatorState>();
final _moreKey = GlobalKey<NavigatorState>();

GoRouter buildRouter() {
  return GoRouter(
    navigatorKey: _rootKey,
    initialLocation: '/',
    routes: [
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) =>
            AppShell(navigationShell: navigationShell),
        branches: [
          StatefulShellBranch(
            navigatorKey: _homeKey,
            routes: [
              GoRoute(
                path: '/',
                builder: (context, state) => const HomeScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            navigatorKey: _carsKey,
            routes: [
              GoRoute(
                path: '/cars',
                builder: (context, state) => const CarsScreen(),
                routes: [
                  GoRoute(
                    path: ':id',
                    parentNavigatorKey: _rootKey,
                    builder: (context, state) =>
                        CarDetailsScreen(carId: state.pathParameters['id']!),
                  ),
                ],
              ),
            ],
          ),
          StatefulShellBranch(
            navigatorKey: _financeKey,
            routes: [
              GoRoute(
                path: '/finance',
                builder: (context, state) =>
                    FinanceScreen(carId: state.uri.queryParameters['carId']),
              ),
            ],
          ),
          StatefulShellBranch(
            navigatorKey: _savedKey,
            routes: [
              GoRoute(
                path: '/saved',
                builder: (context, state) => const SavedCarsScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            navigatorKey: _moreKey,
            routes: [
              GoRoute(
                path: '/more',
                builder: (context, state) => const MoreScreen(),
              ),
            ],
          ),
        ],
      ),

      // Full-screen routes (outside the bottom-nav shell).
      GoRoute(
        path: '/loan-request/:carId',
        parentNavigatorKey: _rootKey,
        builder: (context, state) =>
            LoanRequestScreen(carId: state.pathParameters['carId']!),
      ),
      GoRoute(
        path: '/test-drive/:carId',
        parentNavigatorKey: _rootKey,
        builder: (context, state) =>
            TestDriveScreen(carId: state.pathParameters['carId']!),
      ),
      GoRoute(
        path: '/reviews',
        parentNavigatorKey: _rootKey,
        builder: (context, state) => const ReviewsScreen(),
      ),
      GoRoute(
        path: '/banks',
        parentNavigatorKey: _rootKey,
        builder: (context, state) => const BanksScreen(),
      ),
      GoRoute(
        path: '/companies',
        parentNavigatorKey: _rootKey,
        builder: (context, state) => const CompaniesScreen(),
      ),
      GoRoute(
        path: '/company-request',
        parentNavigatorKey: _rootKey,
        builder: (context, state) => const CompanyRequestScreen(),
      ),
      GoRoute(
        path: '/contact',
        parentNavigatorKey: _rootKey,
        builder: (context, state) => const ContactScreen(),
      ),
      GoRoute(
        path: '/about',
        parentNavigatorKey: _rootKey,
        builder: (context, state) => const AboutScreen(),
      ),
      GoRoute(
        path: '/articles',
        parentNavigatorKey: _rootKey,
        builder: (context, state) => const ArticlesScreen(),
        routes: [
          GoRoute(
            path: ':slug',
            parentNavigatorKey: _rootKey,
            builder: (context, state) =>
                ArticleDetailScreen(slug: state.pathParameters['slug']!),
          ),
        ],
      ),
      GoRoute(
        path: '/reservations',
        parentNavigatorKey: _rootKey,
        builder: (context, state) => const ReservationsScreen(),
      ),
      GoRoute(
        path: '/sign-in',
        parentNavigatorKey: _rootKey,
        builder: (context, state) => const SignInScreen(),
      ),
    ],
  );
}
