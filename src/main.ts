
import { createApp } from 'vue';
import { createPinia } from 'pinia';

import App from './App.vue';
import router from './router';
import Tres from '@tresjs/core'
import '@imengyu/vue3-context-menu/lib/vue3-context-menu.css'
import ContextMenu from '@imengyu/vue3-context-menu'
import { InstallCodeMirror } from "codemirror-editor-vue3";
import { vSanitizeHtml } from '@nanogiants/vue3-sanitize-html';
import DraggableResizableVue from 'draggable-resizable-vue3';
import Vueform from '@vueform/vueform'
import vueformConfig from './../vueform.config'

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(Tres);
app.use(ContextMenu);
app.use(DraggableResizableVue);
app.use(InstallCodeMirror);
app.use(Vueform, vueformConfig);
app.directive('sanitize-html', vSanitizeHtml);

app.mount('#app');
