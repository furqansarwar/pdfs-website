
document.addEventListener("DOMContentLoaded", () => {
  const $ = (selector) => document.querySelector(selector);

  const modal = $("#toolModal");
  const modalTitle = $("#modalTitle");
  const modalDescription = $("#modalDescription");
  const modalClose = $("#modalClose");
  const modalBackdrop = $("#modalBackdrop");
  const fileInput = $("#fileInput");
  const fileName = $("#fileName");
  const processBtn = $("#processBtn");
  const modalStatus = $("#modalStatus");
  const toolOptions = $("#toolOptions");
  const menuToggle = $("#menuToggle");
  const navLinks = $("#navLinks");

  let currentTool = "";
  let selectedFiles = [];

  const tools = {
    merge: ["Merge PDF", "Combine two or more PDF files into one.", ".pdf", true],
    split: ["Split PDF", "Extract a page or a range of pages.", ".pdf", false],
    compress: ["Compress PDF", "Save an optimized copy of your PDF.", ".pdf", false],
    "pdf-word": ["PDF to Word", "Extract text from a PDF into a text document. Formatting may not be preserved.", ".pdf", false],
    "word-pdf": ["Word to PDF", "Convert a DOCX document's text into a PDF. Complex formatting may not be preserved.", ".docx", false],
    "pdf-jpg": ["PDF to JPG", "Convert PDF pages into JPG images.", ".pdf", false],
    "jpg-pdf": ["JPG to PDF", "Combine JPG or PNG images into a PDF.", ".jpg,.jpeg,.png", true],
    "pdf-excel": ["PDF to Excel", "Export extracted PDF text into an Excel spreadsheet.", ".pdf", false],
    rotate: ["Rotate PDF", "Rotate every page of your PDF.", ".pdf", false],
    watermark: ["Watermark PDF", "Add a custom text watermark to your PDF.", ".pdf", false],
    protect: ["Protect PDF", "Password protection is not available in this browser version yet.", ".pdf", false],
    unlock: ["Unlock PDF", "Encrypted PDF unlocking is not available in this browser version yet.", ".pdf", false]
  };

  if (window.pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  }

  function openModal(tool) {
    if (!tools[tool]) return;

    currentTool = tool;
    selectedFiles = [];

    modalTitle.textContent = tools[tool][0];
    modalDescription.textContent = tools[tool][1];

    fileInput.accept = tools[tool][2];
    fileInput.multiple = tools[tool][3];

    fileInput.value = "";
    fileName.textContent = "Choose files from your device";
    modalStatus.textContent = "";
    toolOptions.innerHTML = "";

    if (tool === "split") {
      addOption("Pages (example: 1-3)", "pageRange", "1-3");
    }

    if (tool === "rotate") {
      addOption("Rotation angle", "rotation", "90");
    }

    if (tool === "watermark") {
      addOption("Watermark text", "watermarkText", "PDFS");
    }

    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    updateButton();
  }

  function addOption(label, id, value) {
    const wrapper = document.createElement("div");
    wrapper.className = "option-field";

    const text = document.createElement("label");
    text.htmlFor = id;
    text.textContent = label;

    const input = document.createElement("input");
    input.id = id;
    input.type = "text";
    input.value = value;

    wrapper.append(text, input);
    toolOptions.appendChild(wrapper);
  }

  function closeModal() {
    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  function updateButton() {
    processBtn.disabled = selectedFiles.length === 0;
    processBtn.innerHTML = "Process file <span>→</span>";

    if (selectedFiles.length) {
      fileName.textContent = selectedFiles.map(f => f.name).join(", ");
    }
  }

  document.querySelectorAll("[data-tool]").forEach(button => {
    button.addEventListener("click", () => {
      openModal(button.dataset.tool);
    });
  });

  fileInput.addEventListener("change", () => {
    selectedFiles = Array.from(fileInput.files || []);
    updateButton();
    modalStatus.textContent = "";
  });

  modalClose.addEventListener("click", closeModal);
  modalBackdrop.addEventListener("click", closeModal);

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && modal.classList.contains("active")) {
      closeModal();
    }
  });

  menuToggle.addEventListener("click", () => {
    navLinks.classList.toggle("show");
  });

  navLinks.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => navLinks.classList.remove("show"));
  });

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function outputName(name, extension) {
    return name.replace(/\.[^/.]+$/, "") + extension;
  }

  async function processTool() {
    if (!selectedFiles.length) return;

    processBtn.disabled = true;
    processBtn.textContent = "Processing...";
    modalStatus.textContent = "Please wait while your file is processing.";

    try {
      switch (currentTool) {
        case "merge":
          await mergePDF();
          break;
        case "split":
          await splitPDF();
          break;
        case "compress":
          await compressPDF();
          break;
        case "rotate":
          await rotatePDF();
          break;
        case "watermark":
          await watermarkPDF();
          break;
        case "jpg-pdf":
          await imagesToPDF();
          break;
        case "pdf-jpg":
          await pdfToJPG();
          break;
        case "pdf-word":
          await pdfToText();
          break;
        case "word-pdf":
          await wordToPDF();
          break;
        case "pdf-excel":
          await pdfToExcel();
          break;
        case "protect":
        case "unlock":
          throw new Error("This feature is not available yet.");
        default:
          throw new Error("Unknown tool selected.");
      }

      modalStatus.textContent = "Your file has been processed successfully.";
    } catch (error) {
      console.error(error);
      modalStatus.textContent = error.message || "Something went wrong. Please try again.";
    } finally {
      processBtn.disabled = false;
      processBtn.innerHTML = "Process file <span>→</span>";
    }
  }

  async function getPDF(file) {
    const bytes = await file.arrayBuffer();
    return PDFLib.PDFDocument.load(bytes);
  }

  async function mergePDF() {
    if (selectedFiles.length < 2) {
      throw new Error("Please select at least two PDF files.");
    }

    const merged = await PDFLib.PDFDocument.create();

    for (const file of selectedFiles) {
      const pdf = await getPDF(file);
      const pages = await merged.copyPages(pdf, pdf.getPageIndices());
      pages.forEach(page => merged.addPage(page));
    }

    const bytes = await merged.save();
    downloadBlob(new Blob([bytes], { type: "application/pdf" }), "merged.pdf");
  }

  async function splitPDF() {
    const pdf = await getPDF(selectedFiles[0]);
    const range = ($("#pageRange")?.value || "1").trim();
    const pages = [];

    range.split(",").forEach(part => {
      const values = part.trim().split("-").map(Number);

      if (values.length === 1 && Number.isInteger(values[0])) {
        pages.push(values[0]);
      } else if (values.length === 2 && values.every(Number.isInteger)) {
        for (let n = values[0]; n <= values[1]; n++) pages.push(n);
      }
    });

    const uniquePages = [...new Set(pages)];

    if (!uniquePages.length || uniquePages.some(n => n < 1 || n > pdf.getPageCount())) {
      throw new Error("Enter valid page numbers. Example: 1-3");
    }

    const result = await PDFLib.PDFDocument.create();
    const copied = await result.copyPages(pdf, uniquePages.map(n => n - 1));
    copied.forEach(page => result.addPage(page));

    downloadBlob(
      new Blob([await result.save()], { type: "application/pdf" }),
      "split.pdf"
    );
  }

  async function compressPDF() {
    const pdf = await getPDF(selectedFiles[0]);
    const bytes = await pdf.save({ useObjectStreams: true });

    downloadBlob(
      new Blob([bytes], { type: "application/pdf" }),
      outputName(selectedFiles[0].name, "-optimized.pdf")
    );
  }

  async function rotatePDF() {
    const pdf = await getPDF(selectedFiles[0]);
    const angle = Number($("#rotation").value);

    if (![90, 180, 270].includes(angle)) {
      throw new Error("Choose 90, 180 or 270 degrees.");
    }

    pdf.getPages().forEach(page => {
      page.setRotation(PDFLib.degrees(
        (page.getRotation().angle + angle) % 360
      ));
    });

    downloadBlob(
      new Blob([await pdf.save()], { type: "application/pdf" }),
      outputName(selectedFiles[0].name, "-rotated.pdf")
    );
  }

  async function watermarkPDF() {
    const pdf = await getPDF(selectedFiles[0]);
    const text = ($("#watermarkText").value || "PDFS").trim();

    if (!text) throw new Error("Enter watermark text.");

    const font = await pdf.embedFont(PDFLib.StandardFonts.Helvetica);

    pdf.getPages().forEach(page => {
      const { width, height } = page.getSize();

      page.drawText(text, {
        x: width / 4,
        y: height / 2,
        size: 38,
        font,
        color: PDFLib.rgb(0.55, 0.48, 0.78),
        opacity: 0.25,
        rotate: PDFLib.degrees(35)
      });
    });

    downloadBlob(
      new Blob([await pdf.save()], { type: "application/pdf" }),
      outputName(selectedFiles[0].name, "-watermarked.pdf")
    );
  }

  async function imagesToPDF() {
    const pdf = await PDFLib.PDFDocument.create();

    for (const file of selectedFiles) {
      const bytes = await file.arrayBuffer();
      const image = file.type === "image/png"
        ? await pdf.embedPng(bytes)
        : await pdf.embedJpg(bytes);

      const page = pdf.addPage([595.28, 841.89]);
      const scale = Math.min(
        555 / image.width,
        801 / image.height
      );

      const width = image.width * scale;
      const height = image.height * scale;

      page.drawImage(image, {
        x: (595.28 - width) / 2,
        y: (841.89 - height) / 2,
        width,
        height
      });
    }

    downloadBlob(
      new Blob([await pdf.save()], { type: "application/pdf" }),
      "images-to-pdf.pdf"
    );
  }

  async function pdfToJPG() {
    const file = selectedFiles[0];
    const data = new Uint8Array(await file.arrayBuffer());
    const pdf = await pdfjsLib.getDocument({ data }).promise;

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({ canvasContext: context, viewport }).promise;

      const blob = await new Promise(resolve =>
        canvas.toBlob(resolve, "image/jpeg", 0.92)
      );

      downloadBlob(blob, `page-${i}.jpg`);
    }
  }

  async function extractPDFText() {
    const data = new Uint8Array(await selectedFiles[0].arrayBuffer());
    const pdf = await pdfjsLib.getDocument({ data }).promise;
    let text = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map(item => item.str).join(" ") + "\n\n";
    }

    return text;
  }

  async function pdfToText() {
    const text = await extractPDFText();

    if (!text.trim()) {
      throw new Error("No selectable text found. Scanned PDF OCR is not supported.");
    }

    downloadBlob(
      new Blob([text], { type: "text/plain;charset=utf-8" }),
      outputName(selectedFiles[0].name, ".txt")
    );
  }

  async function pdfToExcel() {
    const text = await extractPDFText();

    if (!text.trim()) {
      throw new Error("No selectable text found in this PDF.");
    }

    const rows = text.split("\n")
      .filter(line => line.trim())
      .map(line => [line.trim()]);

    const sheet = XLSX.utils.aoa_to_sheet([["Extracted PDF Text"], ...rows]);
    const book = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(book, sheet, "PDF Text");
    XLSX.writeFile(book, "pdf-text.xlsx");
  }

  async function wordToPDF() {
    if (!window.mammoth || !window.jspdf) {
      throw new Error("Conversion library could not load. Refresh and try again.");
    }

    const result = await mammoth.extractRawText({
      arrayBuffer: await selectedFiles[0].arrayBuffer()
    });

    const doc = new jspdf.jsPDF();
    const lines = doc.splitTextToSize(result.value || " ", 175);
    let y = 18;

    lines.forEach(line => {
      if (y > 280) {
        doc.addPage();
        y = 18;
      }
      doc.text(line, 17, y);
      y += 7;
    });

    doc.save("word-to-pdf.pdf");
  }

  processBtn.addEventListener("click", processTool);

  // Reveal animation for page sections
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("in-view");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  document.querySelectorAll(
    ".tool-card, .step-card, .feature-copy, .about-copy, .about-card"
  ).forEach(element => {
    element.style.opacity = "0";
    element.style.transform = "translateY(18px)";
    element.style.transition = "opacity .6s ease, transform .6s ease";
    observer.observe(element);
  });

  const revealStyle = document.createElement("style");
  revealStyle.textContent =
    ".in-view{opacity:1!important;transform:translateY(0)!important}";
  document.head.appendChild(revealStyle);
});
