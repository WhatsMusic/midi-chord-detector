// utils/audioConverter.ts
import { BasicPitch, NoteEventTime } from "@spotify/basic-pitch";
import { Midi } from "@tonejs/midi";
import * as tf from '@tensorflow/tfjs-node';
import path from 'path'; // Added for resolving path
import WavDecoder from 'wav-decoder'; // For decoding WAV files

// The target sample rate BasicPitch expects
const BASIC_PITCH_SAMPLE_RATE = 22050;

// Helper function to convert stereo to mono
function stereoToMono(channelData: Float32Array[]): Float32Array {
    if (channelData.length === 1) {
        return channelData[0]; // Already mono
    }
    if (channelData.length === 0) {
        throw new Error("Cannot process audio with no channel data.");
    }
    // Average the channels for stereo
    const left = channelData[0];
    const right = channelData[1];
    const mono = new Float32Array(left.length);
    for (let i = 0; i < left.length; i++) {
        mono[i] = (left[i] + right[i]) / 2;
    }
    return mono;
}

// Helper function to resample audio using TensorFlow.js
async function resampleAudio(
    audioSamples: Float32Array,
    inputSampleRate: number,
    targetSampleRate: number
): Promise<Float32Array> {
    if (inputSampleRate === targetSampleRate) {
        return audioSamples;
    }

    console.log(`Resampling audio from ${inputSampleRate} Hz to ${targetSampleRate} Hz`);
    const inputTensor = tf.tensor1d(audioSamples);
    // Reshape to [1, numSamples, 1] to use 2D resizeBilinear
    const inputTensor2D = tf.reshape(inputTensor, [1, audioSamples.length, 1]);
    
    const newLength = Math.round(audioSamples.length * (targetSampleRate / inputSampleRate));
    
    // Resize (bilinear interpolation)
    const outputTensor2D = tf.image.resizeBilinear(inputTensor2D, [1, newLength], true /* align_corners */);
    
    const outputTensor1D = tf.reshape(outputTensor2D, [newLength]);
    const resampledSamples = await outputTensor1D.data() as Float32Array;
    
    tf.dispose([inputTensor, inputTensor2D, outputTensor2D, outputTensor1D]);
    console.log("Resampling complete.");
    return resampledSamples;
}


export async function convertAudioToMidi(audioFileBuffer: ArrayBuffer): Promise<ArrayBuffer> {
    let audioTensor: tf.Tensor1D | undefined;

    try {
        console.log(`convertAudioToMidi called with ArrayBuffer of length: ${audioFileBuffer.byteLength}`);
        // tf.ready() should be called once at application startup, not in every function call.
        // Assuming it's handled by the testing environment's beforeAll or app's initialization.

        // --- 1. Audio Decoding (Focus on WAV) ---
        console.log("Attempting to decode audio as WAV...");
        // Assuming the input is a WAV file for now.
        // For other formats, a more robust decoding solution would be needed.
        const buffer = Buffer.from(audioFileBuffer); // WavDecoder expects a Buffer
        
        let decodedAudio;
        try {
            decodedAudio = WavDecoder.decode.sync(buffer); // { sampleRate, channelData: [Float32Array, Float32Array|undefined] }
        } catch (decodeError) {
            console.error("Failed to decode WAV:", decodeError);
            throw new Error("Audio decoding failed. Only WAV format is currently supported. " + (decodeError instanceof Error ? decodeError.message : String(decodeError)));
        }
        
        const inputSampleRate = decodedAudio.sampleRate;
        console.log(`Decoded WAV audio. Sample rate: ${inputSampleRate}, Channels: ${decodedAudio.channelData.length}`);

        let monoSamples = stereoToMono(decodedAudio.channelData);

        // --- 2. Preprocess Audio for BasicPitch ---
        // Resample if necessary
        const resampledMonoSamples = await resampleAudio(monoSamples, inputSampleRate, BASIC_PITCH_SAMPLE_RATE);
        
        // Convert to Tensor
        audioTensor = tf.tensor1d(resampledMonoSamples);
        
        // --- 3. BasicPitch Integration ---
        console.log("Initializing BasicPitch model...");
        // Resolve the absolute path to the model directory.
        // BasicPitch should handle loading from a directory path in Node.js.
        const modelDirectoryPath = path.resolve('node_modules/@spotify/basic-pitch/dist/model/');
        console.log(`Using model directory path: ${modelDirectoryPath}`);
        const model = new BasicPitch(modelDirectoryPath); 
        console.log("BasicPitch instance created in convertAudioToMidi. Type of model.predict:", typeof model.predict); // ADDED
        
        console.log("Running basic-pitch model.predict()...");
        // Log again just before calling
        console.log("Before calling model.predict. Type of model.predict:", typeof model.predict); // ADDED
        // The predict method takes the audio tensor, an optional onProgress callback, and an optional MIDI I/O threshold.
        // VITERBI_DECODING is not a direct option for predict, it's part of the internal model config.
        // The third argument (0.5) is the MIDI_IO_THRESH for note detection.
        const { notes } = await model.predict(audioTensor, undefined, 0.5); 
        console.log(`Basic-pitch processing complete. Found ${notes.length} notes.`);
        
        // --- 4. MIDI Generation ---
        const midi = new Midi();
        const track = midi.addTrack();

        notes.forEach((note: NoteEventTime) => {
            track.addNote({
                midi: note.pitchMidi,
                time: note.startTimeSeconds,
                duration: note.durationSeconds,
                // basic-pitch output might include velocity (amplitudeBends), but NoteEventTime doesn't directly map it.
                // For simplicity, we'll use default velocity.
            });
        });

        const midiArrayBuffer = midi.toArray().buffer;
        console.log("MIDI data generated from basic-pitch output.");
        return midiArrayBuffer;

    } catch (error) {
        console.error("Error in convertAudioToMidi:", error);
        if (error instanceof Error) {
            throw new Error(`Failed to convert audio to MIDI: ${error.message}`);
        }
        throw new Error("Failed to convert audio to MIDI due to an unknown error.");
    } finally {
        if (audioTensor) {
            tf.dispose(audioTensor); // Dispose tensor to free memory
            console.log("Audio tensor disposed.");
        }
    }
}
