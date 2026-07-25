import { openLightbox } from "./lightbox";

/** Küçük fotoğraf şeridi — tıklayınca tam ekran önizleme açar. */
export function renderThumbs(urls: string[], max = 4): HTMLElement {
  const strip = document.createElement("div");
  strip.className = "photo-thumbs";
  const shown = urls.slice(0, max);
  shown.forEach((url, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "mini-thumb";
    btn.setAttribute("aria-label", `Fotoğraf ${i + 1} önizle`);
    const img = document.createElement("img");
    img.src = url;
    img.alt = "";
    btn.appendChild(img);
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      openLightbox(urls, i);
    });
    if (i === max - 1 && urls.length > max) {
      const more = document.createElement("span");
      more.className = "thumb-more";
      more.textContent = `+${urls.length - max + 1}`;
      btn.appendChild(more);
    }
    strip.appendChild(btn);
  });
  return strip;
}
