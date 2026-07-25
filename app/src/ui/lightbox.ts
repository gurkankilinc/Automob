/** Tam ekran fotoğraf önizleme — çoklu fotoğrafta ileri/geri gezinme. */

let root: HTMLElement | null = null;
let imgEl: HTMLImageElement;
let counterEl: HTMLElement;
let urls: string[] = [];
let idx = 0;

function build(): void {
  root = document.createElement("div");
  root.className = "lightbox";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.innerHTML = `
    <button class="lb-close" aria-label="Kapat">×</button>
    <button class="lb-nav prev" aria-label="Önceki">‹</button>
    <img class="lb-img" alt="Fotoğraf önizleme" />
    <button class="lb-nav next" aria-label="Sonraki">›</button>
    <div class="lb-counter"></div>`;
  document.body.appendChild(root);

  imgEl = root.querySelector(".lb-img") as HTMLImageElement;
  counterEl = root.querySelector(".lb-counter")!;

  root.querySelector(".lb-close")!.addEventListener("click", close);
  root.querySelector(".lb-nav.prev")!.addEventListener("click", (e) => { e.stopPropagation(); step(-1); });
  root.querySelector(".lb-nav.next")!.addEventListener("click", (e) => { e.stopPropagation(); step(1); });
  root.addEventListener("click", (e) => { if (e.target === root) close(); });
  document.addEventListener("keydown", (e) => {
    if (!root!.classList.contains("open")) return;
    if (e.key === "Escape") close();
    else if (e.key === "ArrowLeft") step(-1);
    else if (e.key === "ArrowRight") step(1);
  });
}

function render(): void {
  imgEl.src = urls[idx];
  const multi = urls.length > 1;
  counterEl.textContent = multi ? `${idx + 1} / ${urls.length}` : "";
  counterEl.hidden = !multi;
  for (const n of root!.querySelectorAll(".lb-nav")) (n as HTMLElement).hidden = !multi;
}

function step(d: number): void {
  idx = (idx + d + urls.length) % urls.length;
  render();
}

export function openLightbox(list: string[], start = 0): void {
  if (!root) build();
  urls = list;
  idx = start;
  render();
  root!.classList.add("open");
}

function close(): void {
  root?.classList.remove("open");
}
