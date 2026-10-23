import 'package:flutter/material.dart';
import 'lib/main.dart' show BulkBuyingCompanionApp;
import 'lib/data/repositories/auth_repository.dart';
import 'lib/data/repositories/deal_repository.dart';
import 'lib/data/repositories/reservation_repository.dart';
import 'lib/data/services/location_service.dart';
import 'lib/models/deal.dart';
import 'lib/models/reservation.dart';

// Portfolio recording build: the real app on its built-in mock repositories,
// starting signed out. Reservations are kept per deal (the app's own mock
// holds one deal), and a deal the signed-in student posts is joined by three
// sample classmates so the organiser's side of the flow can be shown.
//
// Build it next to the app's sources (lib/, web/ and assets/ from the Bulk
// Buying Companion repository): flutter build web -t preview_full.dart

class PreviewLocation implements LocationService {
  @override
  Future<Coordinates> getCurrentPosition() async =>
      const Coordinates(latitude: 10.2967, longitude: 123.8988);
}

class PreviewReservations
    implements ReservationRepository, RealtimeReservationRepository {
  PreviewReservations(this.auth);

  final AuthRepository auth;
  final Map<String, MockReservationRepository> _byDeal = {};

  String get _me => auth.currentUser?.uid ?? 'demo-student';

  MockReservationRepository _for(Deal deal) {
    return _byDeal.putIfAbsent(deal.id, () {
      final repo = MockReservationRepository(deal: deal, currentUserId: _me);
      if (deal.createdBy == _me) {
        repo.reserveSlotFor('Ana Reyes');
        repo.reserveSlotFor('Paolo Cruz');
        repo.reserveSlotFor('Mika Santos');
      }
      return repo;
    });
  }

  MockReservationRepository? _known(String dealId) => _byDeal[dealId];

  // The app's mock names unknown students by their id; show the signed-in
  // student's own name instead.
  List<Reservation> _named(List<Reservation> people) => [
    for (final r in people)
      r.userId == _me
          ? Reservation(
              dealId: r.dealId,
              userId: r.userId,
              studentName: auth.currentUser?.displayName,
              isHost: r.isHost,
              reservedAt: r.reservedAt,
              paidAt: r.paidAt,
              collectedAt: r.collectedAt,
            )
          : r,
  ];

  @override
  Stream<DealDetailsSnapshot> watchDealDetails(Deal deal) =>
      _for(deal).watchDealDetails(deal).map(
        (snap) => DealDetailsSnapshot(
          deal: snap.deal,
          participants: _named(snap.participants),
        ),
      );

  @override
  Future<List<Reservation>> getParticipants(String dealId) async => _named(
    await _known(dealId)?.getParticipants(dealId) ?? const <Reservation>[],
  );

  MockReservationRepository _require(String dealId) {
    final repo = _known(dealId);
    if (repo == null) throw const ReservationFailure('Open the deal first.');
    return repo;
  }

  @override
  Future<Deal> reserveSlot(String dealId) => _require(dealId).reserveSlot(dealId);

  @override
  Future<Deal> cancelReservation(String dealId) =>
      _require(dealId).cancelReservation(dealId);

  @override
  Future<Deal> setPaid(String dealId, String userId, {required bool paid}) =>
      _require(dealId).setPaid(dealId, userId, paid: paid);

  @override
  Future<Deal> setCollected(
    String dealId,
    String userId, {
    required bool collected,
  }) => _require(dealId).setCollected(dealId, userId, collected: collected);

  @override
  Future<Deal> markPurchased(String dealId) =>
      _require(dealId).markPurchased(dealId);

  @override
  Future<Deal> cancelDeal(String dealId) => _require(dealId).cancelDeal(dealId);
}

/// The app's mock deal list, with two things the database does in production:
/// a posted deal records who posted it, and the board shows each deal's
/// latest counts once its reservations change.
class PreviewDeals implements DealRepository {
  PreviewDeals(this.auth, this.reservations);

  final AuthRepository auth;
  final PreviewReservations reservations;
  final MockDealRepository _inner = MockDealRepository();
  final Map<String, Deal> _mine = {};

  Deal _current(Deal deal) {
    final own = _mine[deal.id] ?? deal;
    return reservations._known(deal.id)?.deal ?? own;
  }

  @override
  Future<List<Deal>> getDeals(String hubId) async =>
      (await _inner.getDeals(hubId)).map(_current).toList();

  @override
  Stream<List<Deal>> watchDeals(String hubId) async* {
    yield await getDeals(hubId);
  }

  @override
  Future<Deal> createDeal(DealDraft draft) async {
    final d = await _inner.createDeal(draft);
    final user = auth.currentUser;
    final mine = Deal(
      id: d.id,
      hubId: d.hubId,
      title: d.title,
      description: d.description,
      category: d.category,
      totalPrice: d.totalPrice,
      amount: d.amount,
      unit: d.unit,
      availableSlots: d.availableSlots,
      totalSlots: d.totalSlots,
      pickupLocation: d.pickupLocation,
      paymentMethod: d.paymentMethod,
      paymentAccountName: d.paymentAccountName,
      paymentAccountHandle: d.paymentAccountHandle,
      paymentInstructions: d.paymentInstructions,
      closesAt: d.closesAt,
      createdBy: user?.uid,
      hostName: user?.displayName,
      paidCount: d.paidCount,
    );
    _mine[d.id] = mine;
    // Classmates join as soon as the deal is on the board.
    reservations._for(mine);
    return reservations._known(mine.id)!.deal;
  }
}

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final auth = MockAuthRepository();
  final reservations = PreviewReservations(auth);
  runApp(
    BulkBuyingCompanionApp(
      authRepository: auth,
      dealRepository: PreviewDeals(auth, reservations),
      reservationRepository: reservations,
      locationService: PreviewLocation(),
      showStartupSplash: true,
    ),
  );
}
