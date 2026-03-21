import { NextRequest, NextResponse } from "next/server";
import { checkInteractions } from "@/lib/interactionEngine";
import type { WesternMed, TCMInput } from "@/lib/types/clinical";

// ---------------------------------------------------------------------------
// POST /api/interactions
//
// Runs the interaction engine server-side. Client never imports the engine
// directly — all checks, including Modification Toggle re-calculations,
// go through this route.
//
// Request body:
//   { westernMeds: WesternMed[], tcmInput: TCMInput, excludedHerbIds?: string[] }
//
// Response: InteractionEngineResult
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON in request body" },
      { status: 400 }
    );
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "Request body must be a JSON object" },
      { status: 400 }
    );
  }

  const { westernMeds, tcmInput, excludedHerbIds } = body as {
    westernMeds?: unknown;
    tcmInput?: unknown;
    excludedHerbIds?: unknown;
  };

  // Validate westernMeds
  if (!Array.isArray(westernMeds) || westernMeds.length === 0) {
    return NextResponse.json(
      { error: "westernMeds must be a non-empty array" },
      { status: 400 }
    );
  }

  for (const med of westernMeds) {
    if (
      !med ||
      typeof med !== "object" ||
      typeof (med as Record<string, unknown>).rxcui !== "string" ||
      typeof (med as Record<string, unknown>).name !== "string"
    ) {
      return NextResponse.json(
        { error: "Each westernMed must have rxcui: string and name: string" },
        { status: 400 }
      );
    }
  }

  // Validate tcmInput
  if (!tcmInput || typeof tcmInput !== "object") {
    return NextResponse.json(
      { error: "tcmInput is required" },
      { status: 400 }
    );
  }

  const input = tcmInput as Record<string, unknown>;
  if (
    (input.type !== "herb" && input.type !== "formula") ||
    (input.type === "herb" && typeof input.herbId !== "string") ||
    (input.type === "formula" && typeof input.formulaId !== "string")
  ) {
    return NextResponse.json(
      {
        error:
          'tcmInput must be { type: "herb", herbId: string } or { type: "formula", formulaId: string }',
      },
      { status: 400 }
    );
  }

  // Validate optional excludedHerbIds
  if (
    excludedHerbIds !== undefined &&
    !Array.isArray(excludedHerbIds)
  ) {
    return NextResponse.json(
      { error: "excludedHerbIds must be an array of strings when provided" },
      { status: 400 }
    );
  }

  try {
    const result = await checkInteractions(
      westernMeds as WesternMed[],
      tcmInput as TCMInput,
      {
        excludedHerbIds: Array.isArray(excludedHerbIds)
          ? (excludedHerbIds as string[])
          : undefined,
      }
    );

    return NextResponse.json(result);
  } catch (err) {
    console.error("[/api/interactions] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
