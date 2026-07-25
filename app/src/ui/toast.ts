let timer: number | undefined;

export function showToast(msg: string): void {
  const el = document.getElementById("toast")!;
  el.textContent = msg;
  el.classList.add("show");
  window.clearTimeout(timer);
  timer = window.setTimeout(() => el.classList.remove("show"), 2800);
}
