import { Midi } from "@tonejs/midi";
import { detect } from "@tonaljs/chord-detect";
import { Note } from "@tonaljs/tonal";

// Ein Cluster von Midi-Noten in Akkord umwandeln
export function detectChordFromNotes(midiNotes: number[]): string {
	// MIDI-Nummern → z. B. 60 → 'C4', dann 'C'
	const noteNames = midiNotes
		.map((n) => Note.pitchClass(Note.fromMidi(n)))
		.filter((v, i, a) => a.indexOf(v) === i); // Duplikate entfernen
	const chords = detect(noteNames);
	return chords[0] || "N.C."; // N.C. = no chord
}

// MIDI-Datei parsen und zeitlich clustern
export async function analyzeMidi(buffer: ArrayBuffer) {
	const midi = new Midi(buffer);
	// const ticksPerBeat = midi.header.ppq;
	const secondsPerBeat = midi.header.tempos[0]?.bpm
		? 60 / midi.header.tempos[0].bpm
		: 0.5;
	const beatDuration = secondsPerBeat; // einfach 1 Beat
	const clusterSize = beatDuration * 4; // z. B. 4-Beats-Takte

	// alle Note-On Events sammeln
	const events = midi.tracks.flatMap((track) =>
		track.notes.map((n) => ({ time: n.time, midi: n.midi }))
	);

	// nach Zeit sortieren
	events.sort((a, b) => a.time - b.time);

	// zeitlich clustern und Akkorde erkennen
	const result: { start: number; chord: string }[] = [];
	let clusterStart = 0;
	let clusterNotes: number[] = [];

	for (const ev of events) {
		if (ev.time < clusterStart + clusterSize) {
			clusterNotes.push(ev.midi);
		} else {
			// alten Cluster abschließen
			result.push({
				start: clusterStart,
				chord: detectChordFromNotes(clusterNotes)
			});
			// neuen Cluster starten
			clusterStart += clusterSize;
			clusterNotes = [ev.midi];
		}
	}
	// letzten Cluster
	if (clusterNotes.length) {
		result.push({
			start: clusterStart,
			chord: detectChordFromNotes(clusterNotes)
		});
	}

	return result;
}

/** Extrahiert aus z.B. "Emb6M7" → "Eb", "Cm9" → "Cm", "Cmaj7" → "C" */
export function simplifyChord(chord: string): string {
	if (!chord || chord === "N.C.") return "";
	// Match: Root (A–G + optional #/b), evtl. ein "m" direkt dahinter
	const m = chord.match(/^([A-G][b#]?)(m)?/);
	if (m) {
		const [, root, minor] = m;
		return root + (minor ? "m" : "");
	}
	// Fallback: ganzen String, wenn nicht parsebar
	return chord;
}

/**
 * Gruppiert eine Akkordfolge in wiederholte Sequenzen.
 *
 * @param chords             Die vereinfachte Akkordfolge, z.B. ["Am","E","C","F",…]
 * @param maxPatternLength   Max. Länge eines Patterns, das wir suchen wollen (z.B. 8)
 * @param minPatternLength   Min. Länge eines Patterns, das sich lohnen könnte zu gruppieren (z.B. 2)
 * @param minRepeatCount     Min. Wiederholungen, damit wir eine Gruppierung anlegen (z.B. 2)
 * @returns                  Array von {count, pattern}, das unser Komprimierungs-Resultat ist
 */
export function groupRepetitions(
	chords: string[],
	maxPatternLength = 8,
	minPatternLength = 2,
	minRepeatCount = 2
): { count: number; pattern: string[] }[] {
	const result: { count: number; pattern: string[] }[] = [];
	let i = 0;

	while (i < chords.length) {
		const remaining = chords.length - i;
		// wir können Patterns nur bis zur Hälfte der Rest-Sequenz suchen
		const maxLen = Math.min(maxPatternLength, Math.floor(remaining / 2));
		let matched = false;

		// teste von der längsten möglichen Länge runter bis zur minPatternLength
		for (let len = maxLen; len >= minPatternLength; len--) {
			const pat = chords.slice(i, i + len).join("|");
			let count = 1;

			// zähle, wie oft sich pat hintereinander wiederholt
			while (
				i + count * len + len <= chords.length &&
				chords
					.slice(i + count * len, i + (count + 1) * len)
					.join("|") === pat
			) {
				count++;
			}

			// wenn wir unsere Mindestwiederholungen erreichen, nehmen wir das Pattern
			if (count >= minRepeatCount) {
				result.push({ count, pattern: pat.split("|") });
				i += count * len;
				matched = true;
				break;
			}
		}

		if (!matched) {
			// kein längeres Pattern: dann prüfen wir Einzelakkorde
			// nur gruppieren, wenn sie sich über minRepeatCount >1
			let count = 1;
			while (
				i + count < chords.length &&
				chords[i + count] === chords[i] &&
				count + 1 < minRepeatCount
			) {
				count++;
			}
			// wenn genug Wiederholungen, als Pattern packen, sonst einzeln
			if (count >= minRepeatCount) {
				result.push({ count, pattern: [chords[i]] });
				i += count;
			} else {
				result.push({ count: 1, pattern: [chords[i]] });
				i++;
			}
		}
	}

	return result;
}
