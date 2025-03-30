import Vue from "vue";
import Vuex from "vuex";

import plugin from "./plugin.module";
import modals from "./modals.module";
import sidebar from "./sidebar.module";

Vue.use(Vuex);

export default new Vuex.Store({
  modules: {
    plugin,
    modals,
    sidebar
  }
});
