
document.addEventListener("DOMContentLoaded", function () {
  // Make all website sections visible
  document.querySelectorAll(".reveal").forEach(function (item) {
    item.classList.add("visible");
  });

  // Mobile menu
  const menuToggle = document.getElementById("menuToggle");
  const navLinks = document.getElementById("navLinks");

  if (menuToggle && navLinks) {
    menuToggle.addEventListener("click", function () {
      navLinks.classList.toggle("active");
    });
  }

  // PDF tool modal
  const modal = document.getElementById("toolModal");
  const closeBtn = document.getElementById("modalClose");
  const backdrop = document.getElementById("modalBackdrop");
  const title = document.getElementById("modalTitle");
  const description = document.getElementById("modalDescription");
  const fileInput = document.getElementById("fileInput");
  const fileName = document.getElementById("fileName");
  const processBtn = document.getElementById("processBtn");
  const status = document.getElementById("modalStatus");

  document.querySelectorAll(".tool-card").forEach(function (card) {
    card.addEventListener("click", function () {
      const toolName = card.querySelector("strong").textContent;
      title.textContent = toolName;
      description.textContent = "Choose your file to get started.";
      fileInput.value = "";
      fileName.textContent = "Select your document";
      processBtn.disabled = true;
      status.textContent = "";
      modal.classList.add("active");
      modal.setAttribute("aria-hidden", "false");
    });
  });

  function closeModal() {
    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");
  }

  if (closeBtn) closeBtn.addEventListener("click", closeModal);
  if (backdrop) backdrop.addEventListener("click", closeModal);

  if (fileInput) {
    fileInput.addEventListener("change", function () {
      if (fileInput.files.length) {
        fileName.textContent = Array.from(fileInput.files)
          .map(file => file.name).join(", ");
        processBtn.disabled = false;
        status.textContent = "File selected successfully.";
      }
    });
  }

  if (processBtn) {
    processBtn.addEventListener("click", function () {
      status.textContent =
        "File selected. PDF processing functions need to be connected next.";
    });
  }
});
