import { redirect } from "next/navigation";

// Отдельной лендинг-страницы в этом заходе нет — каталог курсов и есть входная точка
// продукта. Ссылка на "/" в логотипе хедера должна куда-то вести, а не оставаться пустой.
export default function Home() {
  redirect("/courses");
}
