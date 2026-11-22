# Barbershop (parked)

The barbershop booking pages, kept for the future "barbershop" section inside manino_one.
They are excluded from the build (see `web/tsconfig.json`) and not routed in `App.tsx`.
They expect the old `ShopSettings` from `useAuth()`; reconnect them when this section is brought back.
The database tables (barbers, services, appointments, ...) are still in Supabase.
