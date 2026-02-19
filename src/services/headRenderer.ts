/**
 * Singleton offscreen Three.js renderer for NPC head portraits.
 *
 * Instead of creating 292 WebGL contexts (one per NPC card),
 * this service uses a single renderer + scene and processes
 * render requests through a queue with in-memory caching.
 *
 * Usage:
 *   import { renderHead } from '@/services/headRenderer';
 *   const dataURL = await renderHead('/meshes/head.glb', '/meshes/hair.glb');
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// ---------------------------------------------------------------------------
//  Types
// ---------------------------------------------------------------------------

interface RenderRequest {
    headPath: string;
    hairPath: string;
    resolve: (dataURL: string) => void;
    reject: (err: unknown) => void;
}

// ---------------------------------------------------------------------------
//  Singleton state (created lazily)
// ---------------------------------------------------------------------------

const RENDER_SIZE = 256; // px — rendered then downscaled by <img> CSS

let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let loader: GLTFLoader | null = null;

const cache = new Map<string, string>(); // "head|hair" → dataURL
const queue: RenderRequest[] = [];
let processing = false;

// ---------------------------------------------------------------------------
//  Lazy init
// ---------------------------------------------------------------------------

function ensureRenderer() {
    if (renderer) return;

    renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        preserveDrawingBuffer: true,
    });
    renderer.setSize(RENDER_SIZE, RENDER_SIZE);
    renderer.setPixelRatio(1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    scene = new THREE.Scene();

    // Ambient light — same intensity as the old TresCanvas
    const ambient = new THREE.AmbientLight(0xffffff, 1.7);
    scene.add(ambient);

    // Soft directional to add some depth
    const dir = new THREE.DirectionalLight(0xffffff, 0.6);
    dir.position.set(-2, 4, 3);
    scene.add(dir);

    camera = new THREE.PerspectiveCamera(50, 1, 0.01, 10);
    camera.position.set(0, 0, 0.27);
    camera.lookAt(0, 0, 0);

    loader = new GLTFLoader();
}

// ---------------------------------------------------------------------------
//  GLTF loading helper
// ---------------------------------------------------------------------------

function loadGLTF(path: string): Promise<THREE.Group> {
    return new Promise((resolve, reject) => {
        loader!.load(
            path,
            (gltf) => resolve(gltf.scene),
            undefined,
            (err) => reject(err),
        );
    });
}

// ---------------------------------------------------------------------------
//  Dispose helper — free GPU memory after each render
// ---------------------------------------------------------------------------

function disposeGroup(group: THREE.Group) {
    group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
            child.geometry?.dispose();
            if (Array.isArray(child.material)) {
                child.material.forEach((m: THREE.Material) => m.dispose());
            } else if (child.material) {
                child.material.dispose();
            }
        }
    });
}

// ---------------------------------------------------------------------------
//  Core: render one (head, hair) pair
// ---------------------------------------------------------------------------

async function renderOne(headPath: string, hairPath: string): Promise<string> {
    ensureRenderer();

    const group = new THREE.Group();
    group.rotation.y = -0.3; // match old card rotation

    try {
        // Load head
        const headModel = await loadGLTF(headPath);
        group.add(headModel);
    } catch {
        // Head GLB missing — return empty (caller falls back to race sprite)
        return '';
    }

    // Load hair (optional — some NPCs have no hair)
    if (hairPath) {
        try {
            const hairModel = await loadGLTF(hairPath);
            group.add(hairModel);
        } catch {
            // Hair missing — render head only
        }
    }

    scene!.add(group);
    renderer!.render(scene!, camera!);

    const dataURL = renderer!.domElement.toDataURL('image/png');

    // Cleanup
    scene!.remove(group);
    disposeGroup(group);

    return dataURL;
}

// ---------------------------------------------------------------------------
//  Queue processor
// ---------------------------------------------------------------------------

async function processQueue() {
    if (processing) return;
    processing = true;

    while (queue.length > 0) {
        const request = queue.shift()!;
        const cacheKey = `${request.headPath}|${request.hairPath}`;

        // Double-check cache (might have been filled while in queue)
        if (cache.has(cacheKey)) {
            request.resolve(cache.get(cacheKey)!);
            continue;
        }

        try {
            const dataURL = await renderOne(request.headPath, request.hairPath);
            if (dataURL) {
                cache.set(cacheKey, dataURL);
            }
            request.resolve(dataURL);
        } catch (err) {
            request.reject(err);
        }

        // Small yield to not block the UI thread
        await new Promise((r) => setTimeout(r, 5));
    }

    processing = false;
}

// ---------------------------------------------------------------------------
//  Public API
// ---------------------------------------------------------------------------

/**
 * Render an NPC head+hair combo and return a data URL (PNG).
 *
 * Results are cached in memory — calling with the same paths
 * will return the cached image instantly.
 *
 * Returns empty string if the head GLB cannot be loaded.
 */
export function renderHead(headPath: string, hairPath: string): Promise<string> {
    const cacheKey = `${headPath}|${hairPath}`;

    // Cache hit — instant
    if (cache.has(cacheKey)) {
        return Promise.resolve(cache.get(cacheKey)!);
    }

    // Enqueue
    return new Promise<string>((resolve, reject) => {
        queue.push({ headPath, hairPath, resolve, reject });
        processQueue();
    });
}

/**
 * Clear the in-memory image cache.
 * Call when switching sessions / plugins.
 */
export function clearHeadCache() {
    cache.clear();
}

/**
 * Fully dispose the renderer and free GPU resources.
 * Call only when the app is shutting down.
 */
export function disposeHeadRenderer() {
    if (renderer) {
        renderer.dispose();
        renderer = null;
    }
    scene = null;
    camera = null;
    loader = null;
    cache.clear();
}
