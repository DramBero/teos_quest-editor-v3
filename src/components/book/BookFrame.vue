<template>
  <div class="book-frame">
    <BookFrameItem v-for="book in getBooks" :key="book.id" :book="book" />
  </div>
</template>

<script>
export default {
  computed: {
    getBooks() {
      return this.$store.getters['getBooks'];
    },
  },
};
</script>

<style>
.book-frame {
  background-color: #986;
  padding: 10px;
  max-width: 500px;
  height: 100%;
}
</style>
