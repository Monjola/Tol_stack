// Help dialog functions
export function setupHelp() {
  const dialog = document.getElementById("help-dialog");
  const openBtn = document.getElementById("open-help-dialog");
  
  if (!dialog || !openBtn) return;
  
  openBtn.addEventListener("click", () => {
    dialog.showModal();
  });
  
  // Handle TOC link clicks
  const tocLinks = document.querySelectorAll(".toc-link");
  tocLinks.forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const targetId = link.getAttribute("href").substring(1);
      const targetSection = document.getElementById(targetId);
      if (targetSection) {
        const helpContent = document.querySelector(".help-content");
        if (helpContent) {
          const offset = targetSection.offsetTop - helpContent.offsetTop;
          helpContent.scrollTo({
            top: offset,
            behavior: "smooth"
          });
        }
      }
    });
  });
}

