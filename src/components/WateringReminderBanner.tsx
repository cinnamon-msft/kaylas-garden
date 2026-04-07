"use client";

import Link from "next/link";
import type { Plant } from "@/lib/types";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function WateringReminderBanner({ plants }: { readonly plants: Plant[] }) {
  const today = todayISO();
  const needsWatering = plants.filter(
    (p) => p.nextWateringDate && p.nextWateringDate.slice(0, 10) === today
  );

  if (needsWatering.length === 0) return null;

  return (
    <div className="mb-4 rounded-lg border border-blue-300 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-900">
      <span className="mr-1">💧</span>
      <strong>Watering reminder:</strong>{" "}
      {needsWatering.length === 1
        ? <>
            <Link
              href={`/plants/${needsWatering[0].id}`}
              className="underline hover:text-blue-700"
            >
              {needsWatering[0].name}
            </Link>
            {" "}needs watering today!
          </>
        : <>
            {needsWatering.map((p, i) => (
              <span key={p.id}>
                <Link
                  href={`/plants/${p.id}`}
                  className="underline hover:text-blue-700"
                >
                  {p.name}
                </Link>
                {i < needsWatering.length - 1 ? ", " : ""}
              </span>
            ))}
            {" "}need watering today!
          </>
      }
    </div>
  );
}
