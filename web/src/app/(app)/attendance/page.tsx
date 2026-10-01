"use client";

import { useEffect, useState } from "react";
import { Clock3, LogIn, LogOut, MapPin } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { Avatar, Badge, Button, Card, CardHeader, EmptyState, ErrorState, Input, PageHeader, PageLoader, StatCard, useToast, type Tone } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { formatDate, formatTime, todayYmd } from "@/lib/format";
import { getSocket } from "@/lib/socket";
import { useApi } from "@/lib/use-api";
import type { AttendanceRecord, LeaveType, UserBrief } from "@/lib/types";

interface MyAttendance {
  today: AttendanceRecord | null;
  records: AttendanceRecord[];
  geofence: { radiusM: number } | null;
}

interface TodayRow {
  user: UserBrief & { department: string | null };
  status: "PRESENT" | "LATE" | "ON_LEAVE" | "ABSENT";
  checkIn: string | null;
  checkOut: string | null;
  leaveType: LeaveType | null;
}

const statusBadge: Record<TodayRow["status"], { tone: Tone; label: string }> = {
  PRESENT: { tone: "green", label: "Present" },
  LATE: { tone: "amber", label: "Late" },
  ON_LEAVE: { tone: "blue", label: "On leave" },
  ABSENT: { tone: "gray", label: "Not checked in" },
};

function hoursBetween(a: string, b: string | null) {
  if (!b) return "—";
  const mins = Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000);
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function getPosition(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  });
}

export default function AttendancePage() {
  const { hasRole } = useAuth();
  const toast = useToast();
  const [month, setMonth] = useState(() => todayYmd().slice(0, 7));
  const mine = useApi<MyAttendance>(`/attendance/me?month=${month}`);
  const [busy, setBusy] = useState(false);

  async function checkIn() {
    setBusy(true);
    try {
      const position = await getPosition();
      if (!position && mine.data?.geofence) {
        toast("Please allow location access so we can verify you're at the office", "error");
        return;
      }
      await api.post("/attendance/check-in", position ?? {});
      toast("Checked in. Have a great day!");
      mine.reload();
    } catch (err) {
      toast(errorMessage(err), "error");
    } finally {
      setBusy(false);
    }
  }

  async function checkOut() {
    setBusy(true);
    try {
      await api.post("/attendance/check-out");
      toast("Checked out. See you tomorrow!");
      mine.reload();
    } catch (err) {
      toast(errorMessage(err), "error");
    } finally {
      setBusy(false);
    }
  }

  if (mine.loading && !mine.data) return <PageLoader />;
  if (mine.error || !mine.data) return <ErrorState message={mine.error ?? "Could not load attendance"} onRetry={mine.reload} />;

  const { today, records, geofence } = mine.data;
  const late = records.filter((r) => r.status === "LATE").length;

  return (
    <>
      <PageHeader icon={Clock3} title="Attendance" description={geofence ? `Check-in is verified within ${geofence.radiusM} m of the office.` : "Check in when you start work and check out when you leave."} />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-1">
          <p className="text-sm text-muted">{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</p>
          {!today ? (
            <>
              <p className="mt-2 text-2xl font-semibold">Not checked in</p>
              <Button className="mt-5 w-full" onClick={checkIn} loading={busy}>
                <LogIn className="size-4" /> Check in
              </Button>
              {geofence && (
                <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">
                  <MapPin className="size-3.5" /> Your location is checked once, only at check-in.
                </p>
              )}
            </>
          ) : (
            <>
              <p className="mt-2 text-2xl font-semibold">{today.checkOut ? "Day complete" : "You're checked in"}</p>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted">In</p>
                  <p className="font-medium">{formatTime(today.checkIn)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted">Out</p>
                  <p className="font-medium">{formatTime(today.checkOut)}</p>
                </div>
              </div>
              {today.status === "LATE" && <Badge tone="amber" className="mt-3">Marked late</Badge>}
              {!today.checkOut && (
                <Button variant="secondary" className="mt-5 w-full" onClick={checkOut} loading={busy}>
                  <LogOut className="size-4" /> Check out
                </Button>
              )}
            </>
          )}
        </Card>
        <StatCard label="Days present this month" value={records.length} />
        <StatCard label="Late check-ins" value={late} hint="After start time + 15 min grace" />
      </div>

      {hasRole("ADMIN", "MANAGER") && <TeamToday />}

      <Card className="mt-6">
        <CardHeader
          title="My history"
          action={<Input type="month" className="h-8 w-40 text-xs" value={month} max={todayYmd().slice(0, 7)} onChange={(e) => e.target.value && setMonth(e.target.value)} />}
        />
        {records.length === 0 ? (
          <EmptyState title="No attendance for this month" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted">
                <tr className="border-b border-line">
                  <th className="px-5 py-2.5 font-medium">Date</th>
                  <th className="px-5 py-2.5 font-medium">Check in</th>
                  <th className="px-5 py-2.5 font-medium">Check out</th>
                  <th className="px-5 py-2.5 font-medium">Worked</th>
                  <th className="px-5 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {records.map((r) => (
                  <tr key={r.id}>
                    <td className="px-5 py-3">{formatDate(r.date)}</td>
                    <td className="px-5 py-3">{formatTime(r.checkIn)}</td>
                    <td className="px-5 py-3">{formatTime(r.checkOut)}</td>
                    <td className="px-5 py-3">{hoursBetween(r.checkIn, r.checkOut)}</td>
                    <td className="px-5 py-3">
                      <Badge tone={r.status === "LATE" ? "amber" : "green"}>{r.status === "LATE" ? "Late" : "On time"}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

function TeamToday() {
  const { data, reload } = useApi<{ date: string; rows: TodayRow[] }>("/attendance/today");

  useEffect(() => {
    const socket = getSocket();
    socket.on("attendance:changed", reload);
    return () => {
      socket.off("attendance:changed", reload);
    };
  }, [reload]);

  if (!data) return null;
  const counts = data.rows.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.status]: (acc[r.status] ?? 0) + 1 }), {});

  return (
    <Card className="mt-6">
      <CardHeader
        title="Team today"
        subtitle={`${(counts.PRESENT ?? 0) + (counts.LATE ?? 0)} in · ${counts.ON_LEAVE ?? 0} on leave · ${counts.ABSENT ?? 0} not checked in · updates live`}
      />
      <ul className="grid divide-y divide-line sm:grid-cols-2 sm:divide-y-0">
        {data.rows.map((r) => (
          <li key={r.user.id} className="flex items-center gap-3 border-line px-5 py-3 sm:border-b">
            <Avatar name={r.user.name} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{r.user.name}</p>
              <p className="truncate text-xs text-muted">
                {r.checkIn ? `In at ${formatTime(r.checkIn)}${r.checkOut ? ` · out ${formatTime(r.checkOut)}` : ""}` : (r.user.designation ?? "")}
              </p>
            </div>
            <Badge tone={statusBadge[r.status].tone}>{statusBadge[r.status].label}</Badge>
          </li>
        ))}
      </ul>
    </Card>
  );
}
