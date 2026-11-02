import { useEffect, useState } from 'react';
import type { AppState, Booking, BookingStatus, CarInput, Filters, SortOption, View } from './types';
import {
  addBooking,
  addCar,
  deleteCar,
  isSaved,
  loadSessionUserId,
  loadState,
  saveSessionUserId,
  saveState,
  setBookingStatus,
  setCarAvailability,
  toggleSaved,
  updateCar,
} from './lib/store';
import { defaultFilters, ownerOf } from './lib/filters';
import { addDaysISO, todayISO } from './lib/pricing';
import Header from './components/Header';
import Footer from './components/Footer';
import LoginScreen from './components/LoginScreen';
import RenterHome from './components/RenterHome';
import CarDetails from './components/CarDetails';
import { MyBookings, SavedCars } from './components/RenterPages';
import CarForm from './components/CarForm';
import { OwnerDashboard, MyFleet } from './components/OwnerPages';

function initialDates() {
  const today = todayISO();
  return { pickup: addDaysISO(today, 1), ret: addDaysISO(today, 4) };
}

export default function App() {
  const [state, setState] = useState<AppState>(() => loadState());
  const [userId, setUserId] = useState<string | null>(() => {
    const id = loadSessionUserId();
    if (!id) return null;
    const s = loadState();
    return s.users.some((u) => u.id === id) ? id : null;
  });
  const [view, setView] = useState<View>(() => {
    const id = loadSessionUserId();
    const s = loadState();
    const u = s.users.find((x) => x.id === id);
    return u?.role === 'owner' ? 'dashboard' : 'home';
  });
  const [selectedCarId, setSelectedCarId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingCarId, setEditingCarId] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(() => defaultFilters());
  const [sort, setSort] = useState<SortOption>('newest');
  const [page, setPage] = useState(1);
  const [dates, setDates] = useState(() => initialDates());

  useEffect(() => {
    saveState(state);
  }, [state]);

  const user = userId ? state.users.find((u) => u.id === userId) : undefined;

  const scrollTop = () => {
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 });
  };

  const handleLogin = (id: string) => {
    const u = state.users.find((x) => x.id === id);
    if (!u) return;
    setUserId(id);
    saveSessionUserId(id);
    setSelectedCarId(null);
    setFormOpen(false);
    setEditingCarId(null);
    setFilters(defaultFilters());
    setSort('newest');
    setPage(1);
    setView(u.role === 'owner' ? 'dashboard' : 'home');
    scrollTop();
  };

  const handleLogout = () => {
    setUserId(null);
    saveSessionUserId(null);
    setSelectedCarId(null);
    setFormOpen(false);
    setEditingCarId(null);
    setFilters(defaultFilters());
    setSort('newest');
    setPage(1);
    setDates(initialDates());
    setView('home');
    scrollTop();
  };

  const navigate = (next: View) => {
    setSelectedCarId(null);
    setFormOpen(false);
    setEditingCarId(null);
    if (next === 'home') {
      setFilters(defaultFilters());
      setSort('newest');
      setPage(1);
    }
    setView(next);
    scrollTop();
  };

  const openAddCar = () => {
    setSelectedCarId(null);
    setEditingCarId(null);
    setFormOpen(true);
    setView('fleet');
    scrollTop();
  };

  const openEditCar = (carId: string) => {
    setEditingCarId(carId);
    setFormOpen(true);
    setView('fleet');
    scrollTop();
  };

  const handleSaveCar = (input: CarInput) => {
    if (!user) return;
    if (editingCarId) {
      setState((s) => updateCar(s, editingCarId, input));
    } else {
      setState((s) => addCar(s, user.id, input));
    }
    setFormOpen(false);
    setEditingCarId(null);
    setView('fleet');
    scrollTop();
  };

  const handleCancelForm = () => {
    setFormOpen(false);
    setEditingCarId(null);
    scrollTop();
  };

  const handleToggleSave = (carId: string) => {
    if (!user) return;
    setState((s) => toggleSaved(s, user.id, carId));
  };

  const openCar = (carId: string) => {
    setSelectedCarId(carId);
    setView('details');
    scrollTop();
  };

  const handleFiltersChange = (f: Filters) => {
    setFilters(f);
    setPage(1);
  };

  const handleSortChange = (s: SortOption) => {
    setSort(s);
    setPage(1);
  };

  const handleSetStatus = (bookingId: string, status: BookingStatus) => {
    setState((s) => setBookingStatus(s, bookingId, status));
  };

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <div className="flex-1">
          <LoginScreen users={state.users} onLogin={handleLogin} />
        </div>
        <Footer />
      </div>
    );
  }

  const isOwner = user.role === 'owner';
  let effectiveView: View = view;
  if (isOwner && (effectiveView === 'home' || effectiveView === 'details' || effectiveView === 'bookings' || effectiveView === 'saved')) {
    effectiveView = 'dashboard';
  }
  if (!isOwner && (effectiveView === 'dashboard' || effectiveView === 'fleet')) {
    effectiveView = 'home';
  }

  const selectedCar = selectedCarId ? state.cars.find((c) => c.id === selectedCarId) : undefined;
  if (effectiveView === 'details' && !selectedCar) effectiveView = 'home';

  const editingCar = editingCarId ? state.cars.find((c) => c.id === editingCarId) : undefined;

  let content: React.ReactNode = null;

  if (isOwner) {
    if (formOpen) {
      content = (
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
          <CarForm
            key={editingCar?.id ?? 'new'}
            initial={editingCar}
            onSave={handleSaveCar}
            onCancel={handleCancelForm}
          />
        </div>
      );
    } else if (effectiveView === 'fleet') {
      content = (
        <MyFleet
          state={state}
          ownerId={user.id}
          onAdd={openAddCar}
          onEdit={openEditCar}
          onToggleAvailability={(carId, available) => setState((s) => setCarAvailability(s, carId, available))}
          onDelete={(carId) => setState((s) => deleteCar(s, carId))}
        />
      );
    } else {
      content = <OwnerDashboard state={state} ownerId={user.id} onSetStatus={handleSetStatus} />;
    }
  } else {
    if (effectiveView === 'details' && selectedCar) {
      content = (
        <CarDetails
          key={selectedCar.id}
          car={selectedCar}
          owner={ownerOf(state.users, selectedCar.ownerId)}
          saved={isSaved(state, user.id, selectedCar.id)}
          initialPickupDate={dates.pickup}
          initialReturnDate={dates.ret}
          onBack={() => {
            setSelectedCarId(null);
            setView('home');
            scrollTop();
          }}
          onToggleSave={handleToggleSave}
          onRequestBooking={(params) => {
            const result = addBooking(state, { ...params, carId: selectedCar.id, renterId: user.id });
            const booking: Booking | null = result.booking;
            if (booking) setState(result.state);
            return booking;
          }}
          onViewBookings={() => navigate('bookings')}
        />
      );
    } else if (effectiveView === 'bookings') {
      content = (
        <MyBookings
          state={state}
          userId={user.id}
          onCancel={(bookingId) => handleSetStatus(bookingId, 'Cancelled')}
          onBrowse={() => navigate('home')}
        />
      );
    } else if (effectiveView === 'saved') {
      content = (
        <SavedCars
          state={state}
          userId={user.id}
          onOpenCar={openCar}
          onToggleSave={handleToggleSave}
          onBrowse={() => navigate('home')}
        />
      );
    } else {
      content = (
        <RenterHome
          state={state}
          userId={user.id}
          filters={filters}
          onFiltersChange={handleFiltersChange}
          sort={sort}
          onSortChange={handleSortChange}
          page={page}
          onPageChange={setPage}
          pickupDate={dates.pickup}
          returnDate={dates.ret}
          onDatesChange={(pickup, ret) => setDates({ pickup, ret })}
          onOpenCar={openCar}
          onToggleSave={handleToggleSave}
        />
      );
    }
  }

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-background text-text">
      <Header
        user={user}
        view={effectiveView}
        onNavigate={navigate}
        onAddCar={openAddCar}
        onLogout={handleLogout}
      />
      <main className="flex-1">{content}</main>
      <Footer />
    </div>
  );
}
