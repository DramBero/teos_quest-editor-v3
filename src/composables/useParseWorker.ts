import { ref } from 'vue';
import type { WorkerResponse } from '@/workers/parse.worker';

/**
 * Spawns a Web Worker to parse a .esp/.esm file via WASM.
 * Returns parsed objects without blocking the main thread.
 *
 * Usage:
 *   const { parse, stage } = useParseWorker();
 *   const objects = await parse(file.arrayBuffer());
 *   // stage.value updates: "Reading…" → "Initializing…" → "Parsing…" → "Done"
 */
export function useParseWorker() {
    const stage = ref('');
    let worker: Worker | null = null;

    function getWorker(): Worker {
        if (!worker) {
            worker = new Worker(
                new URL('@/workers/parse.worker.ts', import.meta.url),
                { type: 'module' },
            );
        }
        return worker;
    }

    async function parse(buffer: ArrayBuffer): Promise<any[]> {
        stage.value = 'Reading…';
        const w = getWorker();

        return new Promise<any[]>((resolve, reject) => {
            w.onmessage = (e: MessageEvent<WorkerResponse>) => {
                const msg = e.data;
                switch (msg.type) {
                    case 'stage':
                        stage.value = msg.stage;
                        break;
                    case 'done':
                        stage.value = '';
                        resolve(msg.objects);
                        break;
                    case 'error':
                        stage.value = '';
                        reject(new Error(msg.message));
                        break;
                }
            };

            w.onerror = (err) => {
                stage.value = '';
                reject(err);
            };

            // Transfer buffer (zero-copy) to worker
            w.postMessage({ type: 'parse', buffer }, [buffer]);
        });
    }

    function terminate() {
        worker?.terminate();
        worker = null;
    }

    return { parse, stage, terminate };
}
