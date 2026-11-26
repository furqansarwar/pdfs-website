
/* ==========================================
   PDFS — MAIN JAVASCRIPT
   Navigation, animations and PDF tools
========================================== */

const $ = (selector) => document.querySelector(selector);

const menuToggle = $("#menuToggle");
const navLinks = $("#navLinks");
const modal = $("#toolModal");
const modalTitle = $("#modalTitle");
const modalDescription = $("#modalDescription");
const fileInput = $("#fileInput");
const fileName = $("#fileName");
const processBtn = $("#processBtn");
const modalStatus = $("#modalStatus");
const toolOptions = $("#toolOptions");

let activeTool = "";
let selectedFiles = [];

/* PDF.js configuration */

if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
}

/* MOBILE NAVIGATION */

menuToggle?.addEventListener("click", () => {
  const isOpen = navLinks.classList.toggle("active");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
});

navLinks?.querySelectorAll("a").forEach(link => {
  link.addEventListener("click", () => {
    navLinks.classList.remove("active");
    menuToggle?.setAttribute("aria-expanded", "false");
    menuToggle?.setAttribute("aria-label", "Open menu");
  });
});

/* SCROLL ANIMATIONS */

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll(".reveal").forEach(element => {
  observer.observe(element);
});

/* TOOL INFORMATION */

const tools = {
  merge: {
    title: "Merge PDF",
    description: "Combine multiple PDF documents into one file.",
    accept: ".pdf",
    multiple: true
  },
  split: {
    title: "Split PDF",
    description: "Extract selected page ranges into a new PDF. Use formats like 1-3,5,7-9.",
    accept: ".pdf"
  },
  compress: {
    title: "Compress PDF",
    description: "Apply basic PDF optimization. Image-heavy files may not become smaller.",
    accept: ".pdf"
  },
  "pdf-word": {
    title: "PDF to Word",
    description: "Export selectable PDF text into an editable DOCX file. Original layout may not be preserved.",
    accept: ".pdf"
  },
  "word-pdf": {
    title: "Word to PDF",
    description: "Create a simple PDF from DOCX text. Original formatting may not be preserved.",
    accept: ".docx"
  },
  "pdf-jpg": {
    title: "PDF to JPG",
    description: "Convert every PDF page into a JPG image.",
    accept: ".pdf"
  },
  "jpg-pdf": {
    title: "JPG to PDF",
    description: "Combine images into one PDF document.",
    accept: ".jpg,.jpeg,.png",
    multiple: true
  },
  "pdf-excel": {
    title: "PDF to Excel",
    description: "Export extracted page text into spreadsheet rows. Complex tables may need cleanup.",
    accept: ".pdf"
  },
  rotate: {
    title: "Rotate PDF",
    description: "Rotate all pages in your PDF.",
    accept: ".pdf"
  },
  watermark: {
    title: "Watermark PDF",
    description: "Add a custom text watermark to every page.",
    accept: ".pdf"
  },
  protect: {
    title: "Protect PDF",
    description: "PDF password encryption is not supported by this browser-only version yet.",
    accept: ".pdf"
  },
  unlock: {
    title: "Unlock PDF",
    description: "Attempt to open supported restricted PDFs. Only use this for documents you are authorized to modify.",
    accept: ".pdf"
  }
};

/* OPEN TOOL */

document.querySelectorAll("[data-tool]").forEach(button => {
  button.addEventListener("click", () => openTool(button.dataset.tool));
});

function openTool(name) {
  activeTool = name;
  selectedFiles = [];

  const config = tools[name];
  if (!config) return;

  modalTitle.textContent = config.title;
  modalDescription.textContent = config.description;
  fileInput.value = "";
  fileInput.accept = config.accept;
  fileInput.multiple = !!config.multiple;
  fileName.textContent = "Supported files: " + config.accept;
  modalStatus.textContent = "";
  toolOptions.innerHTML = "";
  processBtn.disabled = name === "protect";
  processBtn.innerHTML = name === "protect" ? "Coming soon" : 'Continue <i class="fa-solid fa-arrow-right"></i>';

  if (name === "split") {
    toolOptions.innerHTML = `
      <label>Page range (example: 1-3)
        <input type="text" id="pageRange" placeholder="Example: 1-3,5,7-9" aria-describedby="pageRangeHelp">
        <small id="pageRangeHelp">Enter page numbers and ranges separated by commas. Example: 1-3,5,7-9.</small>
      </label>`;
  }

  if (name === "rotate") {
    toolOptions.innerHTML = `
      <label>Rotation
        <select id="rotation">
          <option value="90">90° clockwise</option>
          <option value="180">180°</option>
          <option value="270">270° clockwise</option>
        </select>
      </label>`;
  }

  if (name === "watermark") {
    toolOptions.innerHTML = `
      <label>Watermark text
        <input type="text" id="watermarkText" placeholder="CONFIDENTIAL">
      </label>`;
  }

  if (name === "protect") {
    toolOptions.innerHTML = `
      <p class="tool-notice" role="status">
        Password protection is not available in this version. This option is shown for transparency and cannot process files yet.
      </p>`;
    processBtn.disabled = true;
    processBtn.textContent = "Coming soon";
  }

  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  modalTitle.focus?.();
}

/* CLOSE TOOL */

function closeTool() {
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  $("#modalClose")?.blur();
}

$("#modalClose")?.addEventListener("click", closeTool);
$("#modalBackdrop")?.addEventListener("click", closeTool);

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    if (modal.classList.contains("open")) closeTool();
    if (navLinks?.classList.contains("active")) {
      navLinks.classList.remove("active");
      menuToggle?.setAttribute("aria-expanded", "false");
      menuToggle?.setAttribute("aria-label", "Open menu");
    }
  }
});

/* FILE SELECTION */

fileInput.addEventListener("change", () => {
  selectedFiles = Array.from(fileInput.files || []);

  if (!selectedFiles.length) {
    processBtn.disabled = true;
    return;
  }

  fileName.textContent = selectedFiles.map(file => file.name).join(", ");
  processBtn.disabled = activeTool === "protect";
  modalStatus.textContent = selectedFiles.length + " file(s) selected.";
});

/* DRAG AND DROP */

const uploadZone = $(".upload-zone");

uploadZone.addEventListener("dragover", event => {
  event.preventDefault();
  uploadZone.classList.add("dragover");
});

uploadZone.addEventListener("dragleave", () => {
  uploadZone.classList.remove("dragover");
});

uploadZone.addEventListener("drop", event => {
  event.preventDefault();
  uploadZone.classList.remove("dragover");

  const files = Array.from(event.dataTransfer.files);
  const config = tools[activeTool];

  selectedFiles = files.filter(file => {
    const extension = "." + file.name.split(".").pop().toLowerCase();
    return config.accept.split(",").includes(extension);
  });

  if (!selectedFiles.length) {
    modalStatus.textContent = "Please select a supported file.";
    return;
  }

  if (!config.multiple) selectedFiles = selectedFiles.slice(0, 1);

  fileInput.value = "";
  fileName.textContent = selectedFiles.map(f => f.name).join(", ");
  processBtn.disabled = activeTool === "protect";
  modalStatus.textContent = selectedFiles.length + " file(s) selected.";
});

/* DOWNLOAD HELPER */

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

/* FILE NAME HELPER */

function outputName(file, suffix, extension = "pdf") {
  return file.name.replace(/\.[^.]+$/, "") + suffix + "." + extension;
}

/* PDF READER */

async function readPDF(file, options = {}) {
  const bytes = await file.arrayBuffer();
  return PDFLib.PDFDocument.load(bytes, options);
}

/* PDF TO TEXT */

async function extractPDFText(file) {
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const pages = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    pages.push(
      content.items.map(item => item.str).join(" ")
    );
  }

  return pages;
}

/* LOAD DOCX LIBRARY WHEN NEEDED */

function loadDocxLibrary() {
  return new Promise((resolve, reject) => {
    if (window.docx) return resolve();

    const script = document.createElement("script");
    script.src = "https://unpkg.com/docx@8.5.0/build/index.umd.js";

    script.onload = resolve;
    script.onerror = () => reject(new Error("Could not load Word library."));

    document.head.appendChild(script);
  });
}

/* MAIN PROCESSOR */

async function processTool() {
  if (!selectedFiles.length) return;

  if (!window.PDFLib || !window.pdfjsLib) {
    throw new Error("PDF libraries could not load. Refresh and try again.");
  }

  const file = selectedFiles[0];

  switch (activeTool) {

    /* MERGE PDF */

    case "merge": {
      if (selectedFiles.length < 2) {
        throw new Error("Select at least two PDF files.");
      }

      const merged = await PDFLib.PDFDocument.create();

      for (const selected of selectedFiles) {
        const source = await readPDF(selected);
        const pages = await merged.copyPages(
          source,
          source.getPageIndices()
        );

        pages.forEach(page => merged.addPage(page));
      }

      const bytes = await merged.save();
      downloadBlob(
        new Blob([bytes], { type: "application/pdf" }),
        "merged.pdf"
      );
      break;
    }

    /* SPLIT PDF */

    case "split": {
      const source = await readPDF(file);
      const total = source.getPageCount();
      const range = $("#pageRange").value.trim();
      if (!range) throw new Error("Enter the page numbers or ranges you want to extract.");

      const indexes = [];
      const seen = new Set();
      const parts = range.split(",");

      for (const part of parts) {
        const token = part.trim();
        const match = token.match(/^(\d+)(?:\s*-\s*(\d+))?$/);
        if (!match) throw new Error("Use page numbers or ranges like 1-3,5,7-9.");

        const start = Number(match[1]);
        const end = match[2] ? Number(match[2]) : start;

        if (start < 1 || end > total || start > end) {
          throw new Error("One or more selected pages are outside this document.");
        }

        for (let page = start; page <= end; page++) {
          if (!seen.has(page)) {
            seen.add(page);
            indexes.push(page - 1);
          }
        }
      }

      const output = await PDFLib.PDFDocument.create();
      const pages = await output.copyPages(source, indexes);
      pages.forEach(page => output.addPage(page));

      const bytes = await output.save();
      downloadBlob(
        new Blob([bytes], { type: "application/pdf" }),
        outputName(file, "-split")
      );
      break;
    }

    /* COMPRESS PDF */

    case "compress": {
      const source = await readPDF(file);
      const bytes = await source.save({
        useObjectStreams: true,
        objectsPerTick: 50
      });

      downloadBlob(
        new Blob([bytes], { type: "application/pdf" }),
        outputName(file, "-optimized")
      );

      modalStatus.textContent =
        "Basic PDF optimization complete. Image-heavy files may not shrink.";
      break;
    }

    /* ROTATE PDF */

    case "rotate": {
      const source = await readPDF(file);
      const angle = Number($("#rotation").value);

      source.getPages().forEach(page => {
        const current = page.getRotation().angle;
        page.setRotation(PDFLib.degrees((current + angle) % 360));
      });

      const bytes = await source.save();

      downloadBlob(
        new Blob([bytes], { type: "application/pdf" }),
        outputName(file, "-rotated")
      );
      break;
    }

    /* WATERMARK PDF */

    case "watermark": {
      const text = $("#watermarkText").value.trim();
      if (!text) throw new Error("Enter your watermark text.");

      const source = await readPDF(file);
      const font = await source.embedFont(PDFLib.StandardFonts.HelveticaBold);

      source.getPages().forEach(page => {
        const { width, height } = page.getSize();

        page.drawText(text, {
          x: width * 0.15,
          y: height * 0.5,
          size: Math.min(width, height) * 0.065,
          font,
          color: PDFLib.rgb(0.55, 0.48, 0.85),
          opacity: 0.25,
          rotate: PDFLib.degrees(35)
        });
      });

      const bytes = await source.save();

      downloadBlob(
        new Blob([bytes], { type: "application/pdf" }),
        outputName(file, "-watermarked")
      );
      break;
    }

    /* PDF TO JPG */

    case "pdf-jpg": {
      const data = new Uint8Array(await file.arrayBuffer());
      const pdf = await pdfjsLib.getDocument({ data }).promise;

      for (let i = 1; i <= pdf.numPages; i++) {
        modalStatus.textContent = `Converting page ${i} of ${pdf.numPages}...`;

        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.8 });
        const canvas = document.createElement("canvas");

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const context = canvas.getContext("2d");

        await page.render({
          canvasContext: context,
          viewport
        }).promise;

        const blob = await new Promise(resolve =>
          canvas.toBlob(resolve, "image/jpeg", 0.92)
        );

        downloadBlob(
          blob,
          file.name.replace(/\.pdf$/i, "") + "-page-" + i + ".jpg"
        );
      }

      break;
    }

    /* JPG TO PDF */

    case "jpg-pdf": {
      const output = new jspdf.jsPDF();

      for (let i = 0; i < selectedFiles.length; i++) {
        const image = selectedFiles[i];

        if (i > 0) output.addPage();

        const dataURL = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(image);
        });

        const dimensions = await new Promise(resolve => {
          const img = new Image();
          img.onload = () => resolve({
            width: img.width,
            height: img.height
          });
          img.src = dataURL;
        });

        const pageWidth = output.internal.pageSize.getWidth();
        const pageHeight = output.internal.pageSize.getHeight();

        const ratio = Math.min(
          pageWidth / dimensions.width,
          pageHeight / dimensions.height
        );

        const width = dimensions.width * ratio;
        const height = dimensions.height * ratio;

        output.addImage(
          dataURL,
          image.type === "image/png" ? "PNG" : "JPEG",
          (pageWidth - width) / 2,
          (pageHeight - height) / 2,
          width,
          height
        );
      }

      output.save("images-to-pdf.pdf");
      break;
    }

    /* PDF TO WORD */

    case "pdf-word": {
      const pages = await extractPDFText(file);
      const text = pages.join("\n\n");

      await loadDocxLibrary();

      const { Document, Packer, Paragraph } = window.docx;

      const documentFile = new Document({
        sections: [{
          children: text.split("\n").map(line =>
            new Paragraph({ text: line })
          )
        }]
      });

      const blob = await Packer.toBlob(documentFile);

      downloadBlob(
        blob,
        outputName(file, "-converted", "docx")
      );

      break;
    }

    /* WORD TO PDF */

    case "word-pdf": {
      const buffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer: buffer });

      const pdf = new jspdf.jsPDF();
      const lines = pdf.splitTextToSize(
        result.value,
        175
      );

      let y = 20;

      for (const line of lines) {
        if (y > 275) {
          pdf.addPage();
          y = 20;
        }

        pdf.text(line, 18, y);
        y += 7;
      }

      pdf.save(outputName(file, "-converted", "pdf"));
      break;
    }

    /* PDF TO EXCEL */

    case "pdf-excel": {
      const pages = await extractPDFText(file);

      const rows = [["Page", "Extracted Text"]];

      pages.forEach((text, index) => {
        rows.push([index + 1, text]);
      });

      const worksheet = XLSX.utils.aoa_to_sheet(rows);
      const workbook = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "PDF Data"
      );

      XLSX.writeFile(
        workbook,
        outputName(file, "-data", "xlsx")
      );
      break;
    }

    /* UNLOCK PDF */

    case "unlock": {
      const source = await readPDF(file, {
        ignoreEncryption: true
      });

      const bytes = await source.save();

      downloadBlob(
        new Blob([bytes], { type: "application/pdf" }),
        outputName(file, "-unlocked")
      );
      break;
    }

    /* PROTECT PDF */

    case "protect": {
      throw new Error(
        "Password protection is not available in this browser-only version yet."
      );
    }

    default:
      throw new Error("This tool is not available.");
  }
}

/* PROCESS BUTTON */

processBtn.addEventListener("click", async () => {
  processBtn.disabled = true;
  processBtn.innerHTML =
    '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';

  modalStatus.textContent = "Please wait while your file is processed.";

  try {
    await processTool();

    if (activeTool !== "compress") {
      modalStatus.textContent = "Your file is ready for download!";
    }

    processBtn.innerHTML =
      '<i class="fa-solid fa-check"></i> Completed';

  } catch (error) {
    console.error(error);
    modalStatus.textContent = error.message || "Something went wrong.";
    processBtn.innerHTML = "Try Again";
  }

  processBtn.disabled = activeTool === "protect";
});

/* LEGAL LINKS
   Privacy and Terms now point to real sections in index.html. */

/* PAGE READY */

console.log("PDFS website initialized successfully.");


