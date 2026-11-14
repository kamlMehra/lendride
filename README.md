# Seva Ride

Next.js client + Express/MongoDB API for assigning routes to drivers.

## Roles
- Coordinator (the middle person): creates routes, picks the driver, adds or removes people to pick up and where from. Sees all routes.
- Driver: sees only the routes assigned to them (Current and Previous), marks people as picked up, starts and completes a trip.
- Lender: optional field on a route. Leave it unchecked when there is none.

## Run
    cd server && cp .env.example .env   (edit values)
    npm install && npm run dev

    cd client && cp .env.local.example .env.local
    npm install && npm run dev

Open http://localhost:3000. Register the coordinator using the COORDINATOR_CODE from server/.env. Everyone else registers normally and becomes a driver.
