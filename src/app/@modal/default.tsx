// Обязателен для parallel route slot: без него Next не знает, что рендерить в @modal на
// путях, которые ни один page.tsx внутри слота не матчит (то есть почти везде, кроме
// перехваченного /lessons/[id]) — без default.tsx слот бросал бы 404 на любой другой странице.
export default function Default() {
  return null;
}
