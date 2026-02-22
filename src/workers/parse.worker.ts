import init, { load_objects } from '@/tes3_wasm/tes3_wasm.js';
import type { TES3_Record } from '@/types/tes3';

let wasmReady = false;

export type WorkerMessage =
    | { type: 'parse'; buffer: ArrayBuffer }

export type WorkerResponse =
    | { type: 'stage'; stage: string }
    | { type: 'done'; objects: TES3_Record[] }
    | { type: 'error'; message: string }

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
    const msg = e.data;

    if (msg.type === 'parse') {
        try {
            // Init WASM once
            if (!wasmReady) {
                self.postMessage({ type: 'stage', stage: 'Initializing…' } satisfies WorkerResponse);
                await init();
                wasmReady = true;
            }

            self.postMessage({ type: 'stage', stage: 'Parsing…' } satisfies WorkerResponse);
            const bytes = new Uint8Array(msg.buffer);
            const objects = load_objects(bytes);

            self.postMessage({ type: 'done', objects } satisfies WorkerResponse);
        } catch (err: unknown) {
            self.postMessage({
                type: 'error',
                message: err instanceof Error ? err.message : String(err),
            } satisfies WorkerResponse);
        }
    }
};
