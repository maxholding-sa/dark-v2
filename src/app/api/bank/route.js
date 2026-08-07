import { NextResponse } from "next/server";
import { db, withDbRetry } from "@/lib/prisma";
import { revalidateTag } from "next/cache";
import { parseBankFinancePayload, parseSectorInterestRatesPayload, serializeBankRecord } from "@/lib/bank-finance";

export const dynamic = "force-dynamic";

function buildBankData(body) {
  const { name, logoImage, loanPolicy, defaultBalloonPaymentPct } = body;
  const { errors: sectorErrors, data: sectorInterestRates } = parseSectorInterestRatesPayload(body);
  const { errors: financeErrors, data: financeData } = parseBankFinancePayload(body);
  const errors = [...sectorErrors, ...financeErrors];
  if (errors.length) {
    return { error: errors.join("، ") };
  }

  const toDecimal = (value) => {
    if (value == null || value === "") return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  };

  // Keep legacy interestRate in sync (first sector rate) for backward compatibility
  const interestRate = sectorInterestRates["خاص"] ?? Object.values(sectorInterestRates)[0];

  return {
    data: {
      name,
      logoImage,
      interestRate,
      sectorInterestRates,
      defaultBalloonPaymentPct: toDecimal(defaultBalloonPaymentPct),
      loanPolicy: loanPolicy || null,
      ...financeData,
    },
  };
}

export async function GET() {
  try {
    // The offers step is unusable without banks, so ride out transient pooler
    // failures instead of handing the client an empty list.
    const banks = await withDbRetry(() =>
      db.bank.findMany({
        orderBy: { createdAt: "desc" },
      })
    );
    return NextResponse.json({
      success: true,
      data: banks.map(serializeBankRecord),
    });
  } catch (error) {
    console.error("Error fetching banks:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, logoImage } = body;
    if (!name || !logoImage) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const built = buildBankData(body);
    if (built.error) {
      return NextResponse.json({ success: false, error: built.error }, { status: 400 });
    }

    const newBank = await db.bank.create({ data: built.data });
    revalidateTag("banks");
    return NextResponse.json({ success: true, data: serializeBankRecord(newBank) });
  } catch (error) {
    console.error("Error creating bank:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, name, logoImage } = body;
    if (!id || !name || !logoImage) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const built = buildBankData(body);
    if (built.error) {
      return NextResponse.json({ success: false, error: built.error }, { status: 400 });
    }

    const updatedBank = await db.bank.update({
      where: { id },
      data: built.data,
    });
    revalidateTag("banks");
    return NextResponse.json({ success: true, data: serializeBankRecord(updatedBank) });
  } catch (error) {
    console.error("Error updating bank:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ success: false, error: "Missing id field" }, { status: 400 });
    }

    await db.loanRequest.updateMany({
      where: { salaryTransferBankId: id },
      data: { salaryTransferBankId: null },
    });

    try {
      await db.bank.delete({ where: { id } });
    } catch (e) {
      if (e.code !== "P2025") throw e;
    }

    revalidateTag("banks");
    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error("Error deleting bank:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const data = await request.json();
    if (!Array.isArray(data)) {
      return NextResponse.json({ success: false, error: "Expected an array of {id, order}" }, { status: 400 });
    }

    const baseTime = Date.now();
    await db.$transaction(
      data.map((item) => {
        const newCreatedAt = new Date(baseTime - item.order * 10000);
        return db.bank.update({
          where: { id: item.id },
          data: { createdAt: newCreatedAt },
        });
      })
    );

    revalidateTag("banks");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating bank order:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
