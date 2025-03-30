const state = {
  sidebarActive: "",
};

const mutations = {
  toggleSidebarActive(state, value) {
    if (state.sidebarActive === value) state.sidebarActive = ""
    else state.sidebarActive = value;
  },
  setSidebarActive(state, value) {
    state.sidebarActive = value
  }
};

const actions = {};

const getters = {
  getSidebarActive: (s) => s.sidebarActive,
};

export default {
  state,
  getters,
  actions,
  mutations
};
