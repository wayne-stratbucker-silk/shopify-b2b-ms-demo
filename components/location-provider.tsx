"use client";

import { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
export interface BCLocation {
  id: number;
  label: string;
  operating_hours?: string;
  address?: {
    phone?: string;
    email?: string;
  };
}


export interface ActiveContact {
  phone: string;
  email: string;
  hours: string;
  locationName: string | null;
}

interface LocationContextValue {
  locations: BCLocation[];
  selectedId: number | null;
  setSelectedId: (id: number | null) => void;
  activeContact: ActiveContact;
}

const LocationContext = createContext<LocationContextValue>({
  locations: [],
  selectedId: null,
  setSelectedId: () => {},
  activeContact: { phone: "", email: "", hours: "", locationName: null },
});

export function useLocation() {
  return useContext(LocationContext);
}

function fmt12(time: string): string {
  if (!time) return "";
  const [hStr, mStr] = time.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr ?? "0", 10);
  const ampm = h >= 12 ? "p" : "a";
  const h12 = h % 12 || 12;
  return m > 0 ? `${h12}:${String(m).padStart(2, "0")}${ampm}` : `${h12}${ampm}`;
}

const DAY_ORDER = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
const DAY_ABBR: Record<string, string> = {
  monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu",
  friday: "Fri", saturday: "Sat", sunday: "Sun",
};

export function formatOperatingHours(
  hours: Record<string, { open: boolean; opening: string; closing: string }>
): string {
  const openDays = DAY_ORDER.filter((d) => hours[d]?.open);
  if (!openDays.length) return "Closed";

  // Group consecutive days with identical opening/closing into ranges
  const groups: { days: string[]; opening: string; closing: string }[] = [];
  for (const day of openDays) {
    const { opening, closing } = hours[day];
    const last = groups[groups.length - 1];
    const isConsecutive =
      last && DAY_ORDER.indexOf(day) === DAY_ORDER.indexOf(last.days[last.days.length - 1] as typeof DAY_ORDER[number]) + 1;
    if (last && last.opening === opening && last.closing === closing && isConsecutive) {
      last.days.push(day);
    } else {
      groups.push({ days: [day], opening, closing });
    }
  }

  return groups
    .map(({ days, opening, closing }) => {
      const start = DAY_ABBR[days[0]];
      const end = DAY_ABBR[days[days.length - 1]];
      const dayRange = start === end ? start : `${start}–${end}`;
      return `${dayRange} ${fmt12(opening)}–${fmt12(closing)}`;
    })
    .join(", ");
}

interface LocationProviderProps {
  children: React.ReactNode;
  defaultPhone?: string;
  defaultEmail?: string;
  defaultHours?: string;
}

export function LocationProvider({
  children,
  defaultPhone = "",
  defaultEmail = "",
  defaultHours = "Mon–Fri 6a–7p PT",
}: LocationProviderProps) {
  const [locations, setLocations] = useState<BCLocation[]>([]);
  const [selectedId, setSelectedIdRaw] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem("acme_location_id");
    return stored ? parseInt(stored, 10) : null;
  });

  const setSelectedId = useCallback((id: number | null) => {
    setSelectedIdRaw(id);
    if (id === null) {
      localStorage.removeItem("acme_location_id");
    } else {
      localStorage.setItem("acme_location_id", String(id));
    }
  }, []);

  useEffect(() => {
    fetch("/api/bc/locations")
      .then((r) => r.json())
      .then((d: { locations?: BCLocation[] }) => setLocations(d.locations ?? []))
      .catch(() => {});
  }, []);

  const activeContact = useMemo((): ActiveContact => {
    const loc = locations.find((l) => l.id === selectedId);
    if (!loc) {
      return {
        phone: defaultPhone,
        email: defaultEmail,
        hours: defaultHours,
        locationName: null,
      };
    }
    return {
      phone: loc.address?.phone || defaultPhone,
      email: loc.address?.email || defaultEmail,
      hours: loc.operating_hours ? formatOperatingHours(loc.operating_hours as unknown as Record<string, { open: boolean; opening: string; closing: string }>) : defaultHours,
      locationName: loc.label,
    };
  }, [selectedId, locations, defaultPhone, defaultEmail, defaultHours]);

  return (
    <LocationContext.Provider value={{ locations, selectedId, setSelectedId, activeContact }}>
      {children}
    </LocationContext.Provider>
  );
}
