// GD&T dialog functions
export function setupGDTHelpers() {
  const dialog = document.getElementById("gdt-dialog");
  document.getElementById("open-gdt-dialog").addEventListener("click", () => {
    dialog.showModal();
  });
}

