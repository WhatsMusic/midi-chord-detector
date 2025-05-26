import { NextRequest, NextResponse } from "next/server";
import {
	analyzeMidi,
	simplifyChord,
	groupRepetitions
} from "@/utils/chordDetector";
import { convertAudioToMidi } from "@/utils/audioConverter"; // Using path alias

export const POST = async (req: NextRequest) => {
	try {
		const form = await req.formData();
		const file = form.get("file") as Blob | null;

		if (!file) {
			return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
		}

		const fileName = file.name || "uploaded_file"; // For logging
		const fileType = file.type;
		console.log(`Received file: ${fileName}, type: ${fileType}`);

		let midiBuffer: ArrayBuffer;

		if (fileType === "audio/midi" || fileType === "audio/x-midi") {
			console.log("Processing as MIDI file...");
			midiBuffer = await file.arrayBuffer();
		} else if (fileType === "audio/wav" || fileType === "audio/x-wav") {
			console.log("Processing as WAV audio file, converting to MIDI...");
			const audioFileBuffer = await file.arrayBuffer();
			try {
				midiBuffer = await convertAudioToMidi(audioFileBuffer);
				console.log("Audio to MIDI conversion successful.");
			} catch (conversionError) {
				console.error("Error during audio to MIDI conversion:", conversionError);
				const message = conversionError instanceof Error ? conversionError.message : "Audio to MIDI conversion failed";
				// Send a more specific error message to the client
				return NextResponse.json({ error: `Audio conversion failed: ${message}` }, { status: 500 });
			}
		} else {
			console.log(`Unsupported file type: ${fileType}`);
			return NextResponse.json({ error: `Unsupported file type: ${fileType}. Please upload a MIDI (.mid, .midi) or WAV (.wav) file.` }, { status: 415 });
		}

		// Proceed with MIDI analysis using midiBuffer
		console.log("Analyzing MIDI data...");
		const raw = await analyzeMidi(midiBuffer);
		console.log("MIDI analysis complete.");

		// 1) Simplify & Filter NC & deduplicate on change
		const simple: string[] = [];
		let last = "";
		for (const { chord } of raw) {
			const s = simplifyChord(chord);
			if (s && s !== last) {
				simple.push(s);
				last = s;
			}
		}

		// 2) Group repetitions with tuning parameters
		const grouped = groupRepetitions(
			simple,
			8, // maxPatternLength
			2, // minPatternLength
			2  // minRepeatCount
		);

		// 3) Output format
		const progression = grouped.map(({ count, pattern }) =>
			count > 1 ? `${count}x ${pattern.join(" ")}` : pattern[0]
		);

		return NextResponse.json({ progression });

	} catch (error) {
		console.error("Error in API route:", error);
		const message = error instanceof Error ? error.message : "An unexpected error occurred.";
		// General server error
		return NextResponse.json({ error: `Server error: ${message}` }, { status: 500 });
	}
};
