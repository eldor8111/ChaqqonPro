# Davomat (Attendance) System - Complete Documentation

## 📋 Overview

Complete attendance tracking system for UBT POS that allows staff (Kassir and Ofitsiant) to check in/out and provides comprehensive reporting for administrators.

---

## ✅ Implementation Complete

### 1. Database Schema
**File:** `prisma/schema.prisma` (lines 501-541)

```prisma
model Attendance {
  id              String   @id @default(cuid())
  tenantId        String
  staffId         String
  staffName       String
  staffRole       String
  checkInTime     DateTime
  checkOutTime    DateTime?
  workDuration    Int?     // minutes
  breakDuration   Int      @default(0)
  checkInLocation String?
  checkOutLocation String?
  notes           String?
  status          String   @default("active")
  ipAddress       String?
  deviceInfo      String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  tenant          Tenant   @relation(...)
}
```

**Features:**
- Multi-tenant support with tenantId
- Tracks check-in and check-out times
- Automatically calculates work duration
- Records location (POS, Office, etc.)
- Captures IP address and device info for security
- Status tracking (active, completed)
- Break duration tracking

---

### 2. Backend API
**File:** `src/app/api/attendance/route.ts` (340 lines)

#### Endpoints:

**POST /api/attendance** - Check In
```typescript
// Request
{
  "location": "POS",
  "notes": "Starting shift"
}

// Response
{
  "success": true,
  "message": "Kirish muvaffaqiyatli belgilandi",
  "attendance": { ... }
}
```

**PUT /api/attendance** - Check Out
```typescript
// Request
{
  "attendanceId": "cuid_xxx", // optional, finds active if not provided
  "location": "POS",
  "notes": "End of shift"
}

// Response
{
  "success": true,
  "message": "Chiqish muvaffaqiyatli belgilandi",
  "attendance": { ... },
  "workDuration": {
    "minutes": 480,
    "hours": 8,
    "remainingMinutes": 0
  }
}
```

**GET /api/attendance** - Get Reports
```typescript
// Query parameters
?date=2026-03-26
?staffId=staff_123
?from=2026-03-01&to=2026-03-31
?status=active

// Response
{
  "attendances": [...],
  "stats": {
    "total": 50,
    "active": 5,
    "completed": 45,
    "totalWorkMinutes": 19200,
    "totalWorkHours": 320
  }
}
```

**PATCH /api/attendance** - Update Break Duration
```typescript
// Request
{
  "attendanceId": "cuid_xxx",
  "breakDuration": 30,
  "notes": "Lunch break"
}
```

**DELETE /api/attendance** - Delete Record (Admin only)
```typescript
// Query parameters
?id=cuid_xxx
```

**Security Features:**
- JWT authentication required
- Staff can only check in/out for themselves
- Admin can view all records
- Prevents duplicate check-ins on same day
- Validates tenant isolation

---

### 3. Frontend Components

#### a) useAttendance Hook
**File:** `src/hooks/useAttendance.ts` (150 lines)

Custom React hook for managing attendance state:

```typescript
const {
  currentAttendance,
  isCheckedIn,
  loading,
  error,
  checkIn,
  checkOut,
  refreshAttendance
} = useAttendance(token);
```

**Features:**
- Automatic state management
- Real-time attendance status
- Error handling
- Loading states
- Auto-refresh on mount

#### b) AttendanceWidget Component
**File:** `src/components/AttendanceWidget.tsx` (210 lines)

Beautiful UI component for check-in/check-out:

```tsx
<AttendanceWidget
  token={token}
  staffName="John Doe"
  lang="uz"
  dark={false}
  compact={false}
/>
```

**Features:**
- Multi-language support (uz, ru, en)
- Dark mode support
- Compact mode for dropdowns
- Real-time work duration display
- Success/error notifications
- Beautiful animations
- Time formatting
- Status indicators (active/completed)

**UI Elements:**
- Check-in button (green)
- Check-out button (red)
- Work duration display
- Status badge with pulse animation
- Time stamps

---

### 4. Integration Points

#### a) HoReCa POS Profile Menu
**File:** `src/app/horeca-pos/page.tsx` (lines 891-920)

Integrated into the profile dropdown:
- Shows attendance widget when hovering over profile icon
- Available to both Kassir and Ofitsiant
- Located in top-right header
- Width: 320px (w-80)

**Access:**
1. Click profile icon (circle with initial)
2. Attendance widget appears at top
3. Below it: Menu items (KUNLIK OTCHOT, MENING ZAKAZLARIM)

#### b) Admin Dashboard Page
**File:** `src/app/(dashboard)/horeca/davomat/page.tsx` (400+ lines)

Comprehensive attendance report dashboard:

**Features:**
- Statistics cards (Total, Active, Completed, Work Hours)
- Filter by date, status, role, search
- Beautiful table with avatars
- Real-time status indicators
- CSV export functionality
- Responsive design
- Dark mode support

**Statistics:**
- 📊 Total records count
- ✅ Currently checked in (green)
- ❌ Completed shifts (gray)
- ⏱️ Total work hours

**Filters:**
- Search by staff name
- Date picker
- Status filter (All, Active, Completed)
- Role filter (All, Kassir, Ofitsiant)

**Table Columns:**
- Staff avatar + name
- Role badge (colored)
- Check-in time
- Check-out time
- Work duration
- Status (with pulse animation for active)

#### c) Sidebar Navigation
**File:** `src/components/layout/Sidebar.tsx` (line 21)

Added "Davomat" menu item:
```typescript
{ href: "/horeca/davomat", icon: Clock, key: "Davomat" }
```

---

## 🎯 User Workflows

### For Staff (Kassir/Ofitsiant):

1. **Check In (Kelish):**
   - Open HoReCa POS
   - Click profile icon in top-right
   - Click "Kelgan vaqtini belgilash" (green button)
   - System records: time, location, IP, device
   - Success message appears

2. **Check Out (Ketish):**
   - Click profile icon
   - Click "Ketgan vaqtini belgilash" (red button)
   - System calculates work duration
   - Shows total work hours

3. **View Status:**
   - Hover over profile icon
   - See current status (Ishda/Tugallangan)
   - View check-in time
   - View work duration (if checked out)

### For Admins:

1. **Access Dashboard:**
   - Navigate to Admin Panel
   - Click "Davomat" in sidebar
   - Or go to `/horeca/davomat`

2. **View Reports:**
   - See statistics cards at top
   - Filter by date, staff, role, status
   - Search for specific staff members
   - View detailed table

3. **Export Data:**
   - Click "Eksport" button
   - Downloads CSV file
   - Filename: `davomat-YYYY-MM-DD.csv`

4. **Monitor Real-time:**
   - Green pulse = currently working
   - Gray badge = shift completed
   - View work duration for each staff

---

## 🎨 UI/UX Features

### Attendance Widget:
- **Colors:**
  - Green for check-in (bg-green-600)
  - Red for check-out (bg-red-600)
  - Blue for davomat header
  - Pulse animation for active status

- **Responsive:**
  - Compact mode in dropdown (w-80)
  - Full mode standalone
  - Mobile-friendly

- **Accessibility:**
  - Clear button labels
  - Loading states
  - Error messages
  - Success feedback

### Admin Dashboard:
- **Modern Design:**
  - Gradient stat cards
  - Rounded borders
  - Shadow effects
  - Hover animations

- **Data Visualization:**
  - Color-coded badges
  - Avatar circles
  - Icons for actions
  - Status indicators

- **Performance:**
  - Client-side filtering (instant)
  - Efficient rendering
  - Optimized queries

---

## 🔒 Security Features

1. **Authentication:**
   - JWT token required
   - Session validation
   - Staff ID verification

2. **Authorization:**
   - Staff can only check in/out for themselves
   - Admin sees all records
   - Tenant isolation enforced

3. **Audit Trail:**
   - IP address logged
   - Device info captured
   - Timestamps recorded
   - Location tracked

4. **Data Integrity:**
   - No duplicate check-ins
   - Validates active status
   - Prevents unauthorized modifications

---

## 📊 Database Indexes

Optimized for performance:
```prisma
@@index([tenantId])
@@index([staffId])
@@index([tenantId, staffId])
@@index([checkInTime])
```

---

## 🌐 Multi-language Support

Translations for:
- **Uzbek (uz):** Davomat, Kelgan vaqt, Ketgan vaqt
- **Russian (ru):** Посещаемость, Время прихода, Время ухода
- **English (en):** Attendance, Check-in Time, Check-out Time

---

## 📱 Access URLs

- **Staff Check-in/out:** `/horeca-pos` (profile dropdown)
- **Admin Dashboard:** `/horeca/davomat`
- **API Endpoint:** `/api/attendance`

---

## ✨ Testing Checklist

- [x] Database schema created
- [x] API endpoints functional
- [x] Frontend components rendering
- [x] Check-in working
- [x] Check-out working
- [x] Work duration calculation
- [x] Admin dashboard displaying
- [x] Filters working
- [x] CSV export functional
- [x] Multi-language support
- [x] Dark mode support
- [x] Mobile responsive
- [x] Security implemented
- [x] Tenant isolation
- [x] Server running (http://localhost:3005)

---

## 🚀 Next Steps (Optional Enhancements)

1. **Reports:**
   - Weekly/monthly summaries
   - Late arrival tracking
   - Early departure tracking
   - Overtime calculation

2. **Notifications:**
   - Remind staff to check out
   - Alert admin of long shifts
   - Daily attendance summary emails

3. **Analytics:**
   - Attendance patterns
   - Peak hours analysis
   - Staff productivity metrics
   - Attendance percentage charts

4. **Advanced Features:**
   - Geolocation verification
   - Photo capture on check-in
   - Biometric authentication
   - Shift scheduling integration

---

## 📞 Support

For questions or issues:
- Check this documentation
- Review API logs in console
- Test in Prisma Studio
- Verify JWT token validity

---

**Status: ✅ FULLY IMPLEMENTED AND OPERATIONAL**

**Last Updated:** 2026-03-26
**Version:** 1.0.0
