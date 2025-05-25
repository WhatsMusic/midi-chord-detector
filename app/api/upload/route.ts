import { NextRequest, NextResponse } from "next/server";
import {
	analyzeMidi,
	simplifyChord,
	groupRepetitions
} from "@/utils/chordDetector";

export const POST = async (req: NextRequest) => {
	const form = await req.formData();
	const file = form.get("file") as Blob;
	if (!file)
		return NextResponse.json({ error: "Keine Datei" }, { status: 400 });

	const buffer = await file.arrayBuffer();
	const raw = await analyzeMidi(buffer);

	// 1) Simplify & Filter NC & deduplizieren bei Wechsel
	const simple: string[] = [];
	let last = "";
	for (const { chord } of raw) {
		const s = simplifyChord(chord);
		if (s && s !== last) {
			simple.push(s);
			last = s;
		}
	}

	// 2) Gruppieren mit Tuning-Parametern
	const grouped = groupRepetitions(
		simple,
		/*maxPatternLength=*/ 8,
		/*minPatternLength=*/ 2,
		/*minRepeatCount=*/ 2
	);

	// 3) Ausgabe-Format
	const progression = grouped.map(({ count, pattern }) =>
		count > 1 ? `${count}x ${pattern.join(" ")}` : pattern[0]
	);

	return NextResponse.json({ progression });
};
