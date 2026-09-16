import { NextResponse } from "next/server";
import argon2 from "argon2";

import { db } from "@/lib/db";
import { registrationSchema } from "@/lib/auth-validation";

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = registrationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "The request contains invalid fields.",
          fields: parsed.error.flatten().fieldErrors,
        },
      },
      { status: 400 },
    );
  }

  const { email, password, displayName, timeZone } = parsed.data;
  const existingUser = await db.user.findUnique({ where: { email } });

  if (existingUser) {
    return NextResponse.json(
      {
        error: {
          code: "EMAIL_ALREADY_IN_USE",
          message: "Unable to create an account with those details.",
        },
      },
      { status: 409 },
    );
  }

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  const user = await db.user.create({
    data: { email, displayName, passwordHash, timeZone },
    select: { id: true, email: true, displayName: true, timeZone: true },
  });

  return NextResponse.json({ data: user }, { status: 201 });
}
