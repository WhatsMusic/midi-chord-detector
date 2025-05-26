import { Midi } from '@tonejs/midi';
import path from 'path'; 
import * as tf from '@tensorflow/tfjs-node'; 
import { BasicPitch } from '@spotify/basic-pitch'; 
import { convertAudioToMidi } from './audioConverter'; 

const base64ValidWav = "UklGRqwaAABXQVZFZm10IBAAAAABAAEARKwAAESsAAACABAAZGF0YYAaAAD/AAD/AP8A/wD+AP4A/gD5APkA+QD5APkA+AD4APgA+AD3APcA9wD2APYA9gD1APUA9QD0APQA9ADzAPMA8wDyAPIA8gDxAPEA8QDxAO8A7wDvAO4A7gDuAO0A7QDtAOwA7ADsAOsA6wDpAOgA6ADnAOYA5gDkAOQA5ADjAOMA4wDiAOIA4gDhAOEA4QDeAN0A3QDcANsA2gDaANYA1QDUAM8AzADLAMEAvwDDAL0AtwDCALIArQDCALEAoADEAJwAlQDEAIcAiADAAGYAOQDAAFIAIgC/AEQAAP+/ADsA/gA1AP4AIgD+ABUA/gAOAP4ABQD+AAEA/gACAP4ABwD+AA4A/gAVAP4AHAD+ACEA/gAmAP4AKQD+ACkA/gAoAP4AJgD+ACIA/gAdAP4AGAD+ABIA/gANAP4ABgD+AAEA/wACAP8ABQD/AAkA/wANAP8AEQD/ABUA/wAZAP8AHQD/ACEA/wAiAP8AIgD/ACEA/wAdAP8AGQD/ABQA/wAQAP8ADAD/AAcA/wADAP8AAAD/AAIA/wAGAP8ACgD/AA8A/wATAP8AFwD/ABsA/wAdAP8AHwD/ACEA/wAhAP8AHwD/AB0A/wAbAP8AFwD/ABMA/wAQAP8ADAD/AAgA/wAEAP8AAAD+AP8A/gD/AP4A/wD+AAEA/gAEAP4ACAD+AAwA/gAQAP4AEwD+ABcA/gAaAP4AHAD+AB4A/gAgAP4AHgD+ABwA/gAaAP4AFgD+ABIA/gAPAP4ACwD+AAcA/gACAP4A/wD9APwA/QD8APkA/AD4APgA9wD3APYA9ADzAPIA8QDvAO0A6wDoAOQA4wDiAN4A2wDUAMwAwQC7AK8AowCcAIkAfgBYAEIAKQAUAAEADAADAAgADAAQABMAHAAhACYAJwAmACIAHAAUAA8ACQAEAAIAAwAGAAsADwAUABsAIQAmACgAKQAmACIAHAAWAA8ACgAFAAIAAwAFAAkADQARABYAGwAeACEAIgAiAB4AGwAWABEQAA0ACQAF";
const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
};

beforeAll(async () => {
    jest.setTimeout(90000); 
    console.log("Running beforeAll: tf.ready()");
    await tf.ready(); 
    console.log("beforeAll: tf.ready() complete.");
});

describe('convertAudioToMidi', () => {

    // This test was passing, but skipping for now to focus on the BasicPitch internal issue
    it.skip('should correctly load a TFJS GraphModel using IOHandler and check its methods', async () => {
        const modelJsonPath = path.resolve('node_modules/@spotify/basic-pitch/dist/model/model.json');
        const modelIOHandler = tf.io.fileSystem(modelJsonPath);
        
        let tfGraphModel: any; 
        try {
            console.log("Test (TF loadGraphModel debug): Loading graph model directly...");
            tfGraphModel = await tf.loadGraphModel(modelIOHandler);
            console.log("Test (TF loadGraphModel debug): Graph model loaded.");
        } catch (e) {
            console.error("Test (TF loadGraphModel debug): Error loading graph model:", e);
            throw e;
        }

        expect(tfGraphModel).toBeDefined();
        if (tfGraphModel) {
            console.log("Test (TF loadGraphModel debug): Keys of loaded TF graph model:", Object.keys(tfGraphModel));
            console.log("Test (TF loadGraphModel debug): typeof model.predict:", typeof tfGraphModel.predict);
            console.log("Test (TF loadGraphModel debug): typeof model.execute:", typeof tfGraphModel.execute);
            console.log("Test (TF loadGraphModel debug): typeof model.executeAsync:", typeof tfGraphModel.executeAsync);
            
            expect(typeof tfGraphModel.executeAsync).toBe('function'); 
            expect(typeof tfGraphModel.execute).toBe('function'); 
        }
    });

    // Focused test for BasicPitch instantiation and internal model loading
    it.only('should instantiate BasicPitch, load model, and execute internal predict', async () => {
        const modelJsonPath = path.resolve('node_modules/@spotify/basic-pitch/dist/model/model.json');
        const modelIOHandler = tf.io.fileSystem(modelJsonPath);
        const modelInstance = new BasicPitch(modelIOHandler); 
        
        expect(modelInstance).toBeInstanceOf(BasicPitch);
        expect(typeof modelInstance.predict).toBe('function'); // Check public predict method

        let dummyTensor;
        try {
            console.log("Test (BasicPitch predict debug): Calling public predict on instance...");
            dummyTensor = tf.zeros([1, 22050, 1]); 
            // This call will trigger ensureModelLoaded -> loadModel (which includes the warm-up this.model.execute(zero))
            await modelInstance.predict(dummyTensor, undefined, 0.5); 
            console.log("Test (BasicPitch predict debug): Public predict call completed.");
        } catch (e) {
            console.error("Test (BasicPitch predict debug): Error during modelInstance.predict():", e);
            throw e; 
        } finally {
            if (dummyTensor) {
                dummyTensor.dispose();
            }
        }
    });
    
    it.skip('should convert a valid WAV ArrayBuffer to a MIDI ArrayBuffer and detect notes', async () => {
        const wavArrayBuffer = base64ToArrayBuffer(base64ValidWav);
        const midiBuffer = await convertAudioToMidi(wavArrayBuffer); 
        
        expect(midiBuffer).toBeInstanceOf(ArrayBuffer);
        expect(midiBuffer.byteLength).toBeGreaterThan(0);
        
        const midi = new Midi(midiBuffer);
        expect(midi.tracks.length).toBeGreaterThan(0);
        if (midi.tracks[0]) {
            expect(midi.tracks[0].notes.length).toBeGreaterThan(0);
        } else {
            throw new Error("MIDI processing did not result in any tracks.");
        }
    });

    it.skip('should throw an error for an empty ArrayBuffer', async () => {
        const emptyBuffer = new ArrayBuffer(0);
        await expect(convertAudioToMidi(emptyBuffer))
            .rejects
            .toThrow(/Audio decoding failed|Cannot process audio with no channel data|Invalid WAV file/i);
    });

    it.skip('should throw an error for a malformed/non-WAV ArrayBuffer', async () => {
        const malformedBuffer = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]).buffer;
        await expect(convertAudioToMidi(malformedBuffer))
            .rejects
            .toThrow(/Audio decoding failed|Invalid WAV file/i);
    });

    it.skip('SKIPPED: should correctly identify the pitch of a simple known WAV', async () => {
        const wavArrayBuffer = base64ToArrayBuffer(base64ValidWav);
        const midiBuffer = await convertAudioToMidi(wavArrayBuffer);
        const midi = new Midi(midiBuffer);
        const hasA4Note = midi.tracks[0]?.notes.some(note => note.midi === 69);
        expect(hasA4Note).toBe(true); 
    });
});
