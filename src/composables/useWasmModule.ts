import init, { load_objects, save_objects } from '@/tes3_wasm/tes3_wasm.js';
import { onMounted } from 'vue';

export const useWasmModule = () => {
    onMounted(async () => {
        await init();
    })
    async function loadPlugin(file: File) {
        try {
            const buffer = await file.arrayBuffer();
            const bytes = new Uint8Array(buffer);
            const objects = await load_objects(bytes);
            return objects;
        } catch (error) {
            throw error;
        }
    }
    async function savePlugin(object: File, name: string) {
        try {
            const bytes = save_objects(object);
            const blob = new Blob([bytes], { type: "application/octet-stream" });
            const url = URL.createObjectURL(blob);
            download(url, name);
        } catch (error) {
            throw error;
        }
    }
    function download(url: string, fileName: string) {
        const a: HTMLAnchorElement = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.style = "display: none";

        document.body.appendChild(a);
        a.click();
        a.remove();
    };
    return { loadPlugin, savePlugin };
}