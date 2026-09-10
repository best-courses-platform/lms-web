// Обязателен для parallel route slot: без него Next не знает, что рендерить в @modal на
// путях под /courses/[id], которые ни один page.tsx внутри слота не матчит (то есть везде,
// кроме перехваченного /lessons/[id]) — без default.tsx слот бросал бы 404.
export default function Default() {
  return null;
}
