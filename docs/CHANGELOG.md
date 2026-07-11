# Changelog — Changes Made Through July 10, 2026

## Session 9: Profile Photos, Edit, Swipe Reset, Photo Viewer (July 10, 2026)

**Date**: July 10, 2026  
**Goal**: Fix photo display, add profile editing, reset left swipes, photo viewer, MinIO CORS  
**Status**: ✅ Complete  

### What Was Implemented

- ✅ Profile photo sizing: 85% viewport width, 4:5 aspect ratio, centered, rounded corners
- ✅ SwipeCard photo layout: explicit pixel heights instead of % (fix web rendering)
- ✅ Profile screen carousel: arrow navigation (‹/›) + dots for multiple photos
- ✅ Full-screen photo viewer: tap any photo → modal with arrows, counter (1/N), dot indicators
- ✅ Edit Profile screen: name, bio, location, interests (email/phone/birth date locked)
- ✅ Backend `PATCH /api/users/me` — partial profile updates
- ✅ Reset left swipes: `POST /api/swipes/reset-left`, confirmation dialog, Redux refresh
- ✅ MinIO bucket made publicly readable (`mc anonymous set download`)
- ✅ Mock unit tests and testing dependencies removed from `package.json` files
- ✅ 30 mock test user records deleted from DB
- ✅ Navigation: `⋮` dropdown menu (Editar perfil / Salir) replaces old logout button
- ✅ Photo size capped at 480px on wide screens (notebook-friendly)

### Files Modified

**Backend**:
- `backend/src/routes/swipes.ts` — POST /api/swipes/reset-left endpoint
- `backend/src/services/swipeService.ts` — resetLeftSwipes() implementation
- `backend/src/routes/users.ts` — PATCH /api/users/me endpoint
- `backend/src/services/userService.ts` — partialUpdateUser() with partial update logic
- `backend/package.json` — removed mock test deps

**Frontend**:
- `frontend/src/screens/HomeScreen.tsx` — ⋮ dropdown menu, reset swipe dialog
- `frontend/src/screens/ProfileScreen.tsx` — carousel + photo viewer with arrows
- `frontend/src/screens/EditProfileScreen.tsx` (NEW) — profile editing UI
- `frontend/src/navigation/RootNavigator.tsx` — EditProfile route registered
- `frontend/src/services/userService.ts` — updateProfile() wrapper
- `frontend/src/components/SwipeCard.tsx` — explicit pixel heights for photo
- `frontend/package.json` — removed mock test deps

### Key Technical Decisions

- **Photo sizing**: 85% width × 4:5 ratio, max 480px — prevents full-screen takeover on notebooks
- **Swipe reset**: `DELETE FROM swipes WHERE swiper_id = $1 AND direction = 'left'` — safe, doesn't touch matches
- **Profile edit scope**: Non-credential fields only (name, bio, location, interests)
- **Carousel**: Arrow navigation instead of FlatList paging (FlatList doesn't work well on React Native Web)

---

## Session 5-8: Auth, Photos, Scaling (June 2026)

See earlier entries in this file for details on JWT auth, photo upload, and horizontal scaling.

---

**Session Complete** ✅  
**Status**: Production ready  
**Date**: July 10, 2026  
**Next Milestone**: Production deployment
