
import { createApp } from 'vue';
import { createPinia } from 'pinia';

import App from './App.vue';
import router from './router';
import Tres from '@tresjs/core'
import Vue3DraggableResizable from 'vue3-draggable-resizable';
import 'vue3-draggable-resizable/dist/Vue3DraggableResizable.css';
import '@imengyu/vue3-context-menu/lib/vue3-context-menu.css'
import ContextMenu from '@imengyu/vue3-context-menu'

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(Tres);
app.use(Vue3DraggableResizable);
app.use(ContextMenu);

app.mount('#app');
