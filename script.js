
/* ==========================================
   PDFS — MAIN JAVASCRIPT
   Navigation, animations and PDF tools
========================================== */

/* Load large tool libraries only when a visitor uses that tool. */
const pdfsScriptPromises = new Map();
window.pdfsLoadScript = function (url, readyCheck) {
  if (readyCheck && readyCheck()) return Promise.resolve();
  if (pdfsScriptPromises.has(url)) return pdfsScriptPromises.get(url);
  const promise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = url;
    script.async = true;
    script.onload = () => readyCheck && !readyCheck()
      ? reject(new Error("A required library did not initialize."))
      : resolve();
    script.onerror = () => reject(new Error("A required library could not be downloaded."));
    document.head.appendChild(script);
  });
  pdfsScriptPromises.set(url, promise);
  return promise;
};

async function loadPdfToolLibraries(tool) {
  const urls = {
    pdfLib: "https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js",
    pdfJs: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",
    jsPdf: "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
    mammoth: "https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js",
    xlsx: "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"
  };
  const tasks = [];
  if (["merge", "split", "compress", "rotate", "watermark", "unlock", "edit"].includes(tool))
    tasks.push(window.pdfsLoadScript(urls.pdfLib, () => !!window.PDFLib));
  if (["pdf-word", "pdf-jpg", "pdf-excel", "edit"].includes(tool))
    tasks.push(window.pdfsLoadScript(urls.pdfJs, () => !!window.pdfjsLib).then(() => {
      pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    }));
  if (["jpg-pdf", "word-pdf"].includes(tool))
    tasks.push(window.pdfsLoadScript(urls.jsPdf, () => !!window.jspdf));
  if (tool === "word-pdf")
    tasks.push(window.pdfsLoadScript(urls.mammoth, () => !!window.mammoth));
  if (tool === "pdf-excel")
    tasks.push(window.pdfsLoadScript(urls.xlsx, () => !!window.XLSX));
  await Promise.all(tasks);
}

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

/* PREMIUM SCROLL REVEALS */
const revealElements = document.querySelectorAll(".reveal");

if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("visible");
      observer.unobserve(entry.target);
    });
  }, {
    threshold: 0.08,
    rootMargin: "0px 0px -45px 0px"
  });

  revealElements.forEach((element, index) => {
    const siblings = element.parentElement
      ? Array.from(element.parentElement.children).filter(child => child.classList.contains("reveal"))
      : [];
    const stagger = siblings.length > 1 ? siblings.indexOf(element) * 90 : 0;
    element.style.setProperty("--reveal-delay", Math.min(stagger, 360) + "ms");
    revealObserver.observe(element);
  });
} else {
  revealElements.forEach(element => element.classList.add("visible"));
}

/* TOOL INFORMATION */

const tools = {
  edit: {
    title: "Edit PDF Text",
    description: "Find an existing word or phrase and replace it in your PDF.",
    accept: ".pdf"
  },
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
    description: "Encrypt your PDF with a strong AES-256 password. Processing happens locally in your browser.",
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
  processBtn.disabled = true;
  processBtn.innerHTML = name === "protect" ? "Protect PDF" : 'Continue <i class="fa-solid fa-arrow-right"></i>';

  if (name === "edit") {
    toolOptions.innerHTML = `
      <label for="editFindText">Find text (exact word or phrase)
        <input type="text" id="editFindText" placeholder="e.g. arslan" autocomplete="off">
      </label>
      <label for="editReplaceText">Replace with
        <input type="text" id="editReplaceText" placeholder="e.g. arsalan" autocomplete="off">
      </label>
      <label for="editPageNumber">Page number (leave blank to search all pages)
        <input type="number" id="editPageNumber" min="1" step="1" placeholder="All pages">
      </label>
      <p class="tool-notice" role="note">Works with selectable text on plain/light backgrounds. Scanned PDFs, handwriting and complex layouts may not be editable. Your original stays unchanged; a new edited PDF is downloaded.</p>`;
  }

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
      <label for="protectPassword">Set PDF password
        <input type="password" id="protectPassword" autocomplete="new-password" minlength="6" placeholder="At least 6 characters">
      </label>
      <label for="confirmProtectPassword">Confirm password
        <input type="password" id="confirmProtectPassword" autocomplete="new-password" minlength="6" placeholder="Re-enter your password">
      </label>
      <p class="tool-notice" role="note">AES-256 encryption runs in your browser. Your PDF and password are not uploaded. Keep your password safe — it cannot be recovered.</p>`;
    processBtn.disabled = true;
    processBtn.textContent = "Protect PDF";
    const validateProtectPassword = () => {
      const password = $("#protectPassword")?.value || "";
      const confirmation = $("#confirmProtectPassword")?.value || "";
      processBtn.disabled = selectedFiles.length === 0 || password.length < 6 || password !== confirmation;
      modalStatus.textContent = password && confirmation && password !== confirmation ? "Passwords do not match." : password.length > 0 && password.length < 6 ? "Use at least 6 characters for your password." : "";
    };
    $("#protectPassword").addEventListener("input", validateProtectPassword);
    $("#confirmProtectPassword").addEventListener("input", validateProtectPassword);
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


/* VISUAL PDF PAGE EDITOR */
let visualPdfFile = null;
let visualPdfDoc = null;
let visualPdfPage = 1;
let visualPdfScale = 1.35;
let visualPdfDirty = false;

async function launchVisualPdfEditor(file) {
  visualPdfFile = file;
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  let editor = document.getElementById("visualPdfEditor");
  if (!editor) {
    editor = document.createElement("section");
    editor.id = "visualPdfEditor";
    editor.className = "visual-pdf-editor";
    editor.innerHTML = `
      <header class="vpe-toolbar">
        <button type="button" class="vpe-back" id="vpeBack"><i class="fa-solid fa-arrow-left"></i> Back</button>
        <strong id="vpeFilename">PDF Editor</strong>
        <div class="vpe-actions">
          <button type="button" id="vpeAddText"><i class="fa-solid fa-font"></i> Add text</button>
          <button type="button" class="vpe-save" id="vpeSave"><i class="fa-solid fa-download"></i> Save PDF</button>
        </div>
      </header>
      <div class="vpe-help">Click existing text on the page to edit it. Use “Add text” to place new text anywhere. Changes are made on the page itself.</div>
      <main class="vpe-workspace">
        <aside class="vpe-pages">
          <button type="button" id="vpePrev">Previous</button>
          <span id="vpePageCount">Page 1</span>
          <button type="button" id="vpeNext">Next</button>
        </aside>
        <div class="vpe-canvas-wrap"><div class="vpe-page" id="vpePage">
          <canvas id="vpeCanvas"></canvas><div id="vpeTextLayer" class="vpe-text-layer"></div>
        </div></div>
      </main>
      <div class="vpe-status" id="vpeStatus" role="status">Loading PDF...</div>`;
    document.body.appendChild(editor);
    document.getElementById("vpeBack").addEventListener("click", () => { editor.classList.remove("active"); document.body.style.overflow = ""; });
    document.getElementById("vpePrev").addEventListener("click", () => renderVisualPdfPage(Math.max(1, visualPdfPage - 1)));
    document.getElementById("vpeNext").addEventListener("click", () => renderVisualPdfPage(Math.min(visualPdfDoc.numPages, visualPdfPage + 1)));
    document.getElementById("vpeAddText").addEventListener("click", () => {
      const layer = document.getElementById("vpeTextLayer");
      const node = document.createElement("div");
      node.className = "vpe-added-text";
      node.contentEditable = "true";
      node.textContent = "Type here";
      node.style.left = "18%"; node.style.top = "18%";
      node.style.fontSize = "18px";
      layer.appendChild(node);
      node.focus();
      const range = document.createRange(); range.selectNodeContents(node);
      const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
      visualPdfDirty = true;
    });
    document.getElementById("vpeSave").addEventListener("click", saveVisualPdf);
  }
  editor.classList.add("active");
  document.body.style.overflow = "hidden";
  document.getElementById("vpeFilename").textContent = file.name;
  try {
    await loadPdfToolLibraries("edit");
    const bytes = new Uint8Array(await file.arrayBuffer());
    visualPdfDoc = await pdfjsLib.getDocument({ data: bytes }).promise;
    visualPdfPage = 1; visualPdfDirty = false;
    await renderVisualPdfPage(1);
  } catch (error) {
    document.getElementById("vpeStatus").textContent = error.message || "Could not open this PDF.";
  }
}

async function renderVisualPdfPage(pageNo) {
  visualPdfPage = pageNo;
  const page = await visualPdfDoc.getPage(pageNo);
  const viewport = page.getViewport({ scale: visualPdfScale });
  const canvas = document.getElementById("vpeCanvas");
  const ctx = canvas.getContext("2d");
  canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
  canvas.style.width = viewport.width + "px"; canvas.style.height = viewport.height + "px";
  const layer = document.getElementById("vpeTextLayer");
  layer.innerHTML = ""; layer.style.width = viewport.width + "px"; layer.style.height = viewport.height + "px";
  await page.render({ canvasContext: ctx, viewport }).promise;
  const textContent = await page.getTextContent();
  if (pdfjsLib.renderTextLayer) {
    const task = pdfjsLib.renderTextLayer({ textContent, container: layer, viewport, textDivs: [] });
    if (task.promise) await task.promise;
  }
  layer.querySelectorAll("span").forEach(span => {
    span.contentEditable = "true";
    span.spellcheck = false;
    span.addEventListener("input", () => { visualPdfDirty = true; });
    span.title = "Click and edit this text";
  });
  layer.querySelectorAll("div").forEach(div => { if (div.textContent.trim()) { div.contentEditable = "true"; div.addEventListener("input", () => visualPdfDirty = true); }});
  document.getElementById("vpePageCount").textContent = "Page " + pageNo + " of " + visualPdfDoc.numPages;
  document.getElementById("vpeStatus").textContent = "Edit text directly on the page, then select Save PDF.";
}

async function saveVisualPdf() {
  const button = document.getElementById("vpeSave");
  const status = document.getElementById("vpeStatus");
  button.disabled = true; status.textContent = "Preparing edited PDF pages...";
  try {
    if (!window.html2canvas) {
      await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
        script.onload = resolve; script.onerror = () => reject(new Error("Could not load PDF export helper."));
        document.head.appendChild(script);
      });
    }
    const output = await PDFLib.PDFDocument.create();
    for (let pageNo = 1; pageNo <= visualPdfDoc.numPages; pageNo++) {
      status.textContent = "Saving page " + pageNo + " of " + visualPdfDoc.numPages + "...";
      await renderVisualPdfPage(pageNo);
      const pageNode = document.getElementById("vpePage");
      const snapshot = await html2canvas(pageNode, { backgroundColor: "#ffffff", scale: 2, useCORS: true });
      const png = await new Promise(resolve => snapshot.toBlob(resolve, "image/png"));
      if (!png) throw new Error("Could not render page " + pageNo);
      const image = await output.embedPng(new Uint8Array(await png.arrayBuffer()));
      const sourcePage = await visualPdfDoc.getPage(pageNo);
      const originalViewport = sourcePage.getViewport({ scale: 1 });
      const outPage = output.addPage([originalViewport.width, originalViewport.height]);
      outPage.drawImage(image, { x: 0, y: 0, width: originalViewport.width, height: originalViewport.height });
    }
    const bytes = await output.save();
    downloadBlob(new Blob([bytes], { type: "application/pdf" }), outputName(visualPdfFile, "-edited"));
    status.textContent = "Edited PDF saved successfully.";
  } catch (error) {
    status.textContent = error.message || "Could not save edited PDF.";
  } finally { button.disabled = false; }
}

/* FILE SELECTION */

fileInput.addEventListener("change", () => {
  selectedFiles = Array.from(fileInput.files || []);
  if (activeTool === "edit" && selectedFiles[0]) { launchVisualPdfEditor(selectedFiles[0]); return; }

  if (!selectedFiles.length) {
    processBtn.disabled = true;
    fileName.textContent = "Supported files: " + tools[activeTool].accept;
    modalStatus.textContent = "Please select a supported file.";
    return;
  }

  const allowedTypes = tools[activeTool].accept.split(",");
  const invalidFiles = selectedFiles.filter(file =>
    !allowedTypes.includes("." + file.name.split(".").pop().toLowerCase())
  );
  if (invalidFiles.length) {
    selectedFiles = [];
    fileInput.value = "";
    processBtn.disabled = true;
    modalStatus.textContent = "One or more files have an unsupported file type.";
    return;
  }

  if (!tools[activeTool].multiple) selectedFiles = selectedFiles.slice(0, 1);
  fileName.textContent = selectedFiles.map(file => file.name).join(", ");
  if (activeTool === "protect") {
    const password = $("#protectPassword")?.value || "";
    const confirmation = $("#confirmProtectPassword")?.value || "";
    processBtn.disabled = password.length < 6 || password !== confirmation;
  } else { processBtn.disabled = false; }
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

  if (!config.multiple) selectedFiles = selectedFiles.slice(0, 1);

  fileInput.value = "";
  if (!selectedFiles.length) {
    processBtn.disabled = true;
    fileName.textContent = "Supported files: " + config.accept;
    modalStatus.textContent = "No supported files found. Please choose " + config.accept + ".";
    return;
  }

  fileName.textContent = selectedFiles.map(f => f.name).join(", ");
  if (activeTool === "protect") {
    const password = $("#protectPassword")?.value || "";
    const confirmation = $("#confirmProtectPassword")?.value || "";
    processBtn.disabled = password.length < 6 || password !== confirmation;
  } else {
    processBtn.disabled = false;
  }
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
  if (!selectedFiles.length) {
    throw new Error("Please select a supported file before continuing.");
  }

  // Keep the first selected file available to every single-file tool,
  // including Protect PDF, before any tool-specific processing begins.
  const file = selectedFiles[0];

  if (activeTool === "protect") {
    const password = $("#protectPassword")?.value || "";
    const confirmation = $("#confirmProtectPassword")?.value || "";
    if (password.length < 6) throw new Error("Please use a password with at least 6 characters.");
    if (password !== confirmation) throw new Error("The passwords do not match.");
    modalStatus.textContent = "Loading secure PDF encryption engine...";
    const { default: createQpdf } = await import("https://cdn.jsdelivr.net/npm/@jspawn/qpdf-wasm@0.0.2/qpdf.mjs");
    const qpdf = await createQpdf({ locateFile: path => "https://cdn.jsdelivr.net/npm/@jspawn/qpdf-wasm@0.0.2/" + path, noInitialRun: true, print: () => {}, printErr: () => {} });
    modalStatus.textContent = "Encrypting your PDF with AES-256...";
    qpdf.FS.writeFile("/input.pdf", new Uint8Array(await file.arrayBuffer()));
    const exitCode = qpdf.callMain(["--encrypt", password, password, "256", "--", "/input.pdf", "/protected.pdf"]);
    if (exitCode !== 0) throw new Error("PDF encryption failed. Please check that this is a valid, unprotected PDF.");
    const encryptedBytes = qpdf.FS.readFile("/protected.pdf");
    if (!encryptedBytes || encryptedBytes.length < 10) throw new Error("The encrypted PDF could not be created.");
    downloadBlob(new Blob([encryptedBytes], { type: "application/pdf" }), outputName(file, "-protected"));
    qpdf.FS.unlink("/input.pdf"); qpdf.FS.unlink("/protected.pdf");
    return;
  }

  const needsPdfLib = ["merge", "split", "compress", "rotate", "watermark", "unlock", "edit"].includes(activeTool);
  const needsPdfJs = ["pdf-word", "pdf-jpg", "pdf-excel", "edit"].includes(activeTool);
  const needsJsPdf = ["jpg-pdf", "word-pdf"].includes(activeTool);

  modalStatus.textContent = "Loading required tool...";
  await loadPdfToolLibraries(activeTool);

  if (needsPdfLib && !window.PDFLib) {
    throw new Error("The PDF editing library could not load. Check your connection and refresh the page.");
  }
  if (needsPdfJs && !window.pdfjsLib) {
    throw new Error("The PDF reading library could not load. Check your connection and refresh the page.");
  }
  if (needsJsPdf && !window.jspdf) {
    throw new Error("The PDF creation library could not load. Check your connection and refresh the page.");
  }
  if (activeTool === "word-pdf" && !window.mammoth) {
    throw new Error("The Word reading library could not load. Check your connection and refresh the page.");
  }
  if (activeTool === "pdf-excel" && !window.XLSX) {
    throw new Error("The Excel export library could not load. Check your connection and refresh the page.");
  }

  switch (activeTool) {

    /* EDIT PDF — VISUAL PAGE REPLACEMENT */
    case "edit": {
      const findText = $("#editFindText").value;
      const replaceText = $("#editReplaceText").value;
      const pageInput = $("#editPageNumber").value.trim();
      if (!findText) throw new Error("Enter the existing name or text exactly as it appears.");
      if (!replaceText.trim()) throw new Error("Enter the corrected name or text.");
      const requestedPage = pageInput ? Number(pageInput) : null;
      if (requestedPage !== null && (!Number.isInteger(requestedPage) || requestedPage < 1)) throw new Error("Enter a valid page number.");

      const data = new Uint8Array(await file.arrayBuffer());
      const sourcePdf = await pdfjsLib.getDocument({ data }).promise;
      if (requestedPage && requestedPage > sourcePdf.numPages) throw new Error("That page number is beyond the end of this PDF.");
      const output = await PDFLib.PDFDocument.create();
      const sourceLayout = await readPDF(file);
      let replacements = 0;
      const firstPage = requestedPage || 1;
      const lastPage = requestedPage || sourcePdf.numPages;

      for (let pageNo = firstPage; pageNo <= lastPage; pageNo++) {
        modalStatus.textContent = `Opening page ${pageNo} of ${sourcePdf.numPages}...`;
        const page = await sourcePdf.getPage(pageNo);
        const scale = 2;
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        await page.render({ canvasContext: ctx, viewport }).promise;

        const textContent = await page.getTextContent();
        for (const item of textContent.items) {
          if (!item.str) continue;
          let from = 0;
          while (true) {
            const foundAt = item.str.indexOf(findText, from);
            if (foundAt < 0) break;
            const style = textContent.styles[item.fontName] || {};
            const baseFont = Math.max(7, Math.abs(item.transform[3]) || item.height || 10);
            const fontPx = baseFont * scale;
            const family = style.fontFamily || "Arial";
            const bold = /bold|black|heavy/i.test(item.fontName + " " + family);
            const italic = /italic|oblique/i.test(item.fontName + " " + family);
            ctx.save();
            ctx.font = `${italic ? "italic " : ""}${bold ? "bold " : ""}${fontPx}px "${family}", Arial, sans-serif`;
            const beforeWidth = ctx.measureText(item.str.slice(0, foundAt)).width;
            const oldWidth = ctx.measureText(findText).width;
            const newWidth = ctx.measureText(replaceText).width;
            const textScale = item.width > 0 ? (item.width * scale) / Math.max(ctx.measureText(item.str).width, 1) : 1;
            const point = viewport.convertToViewportPoint(item.transform[4], item.transform[5]);
            const x = point[0] + beforeWidth * textScale;
            const baseline = point[1];
            const patchWidth = Math.max(oldWidth, newWidth) * textScale + 6;
            const patchHeight = Math.max(fontPx * 1.35, (item.height || baseFont) * scale * 1.35);
            const top = Math.max(0, Math.floor(baseline - fontPx * 1.05));
            const left = Math.max(0, Math.floor(x - 2));
            const right = Math.min(canvas.width - 1, Math.ceil(left + patchWidth));
            const bottom = Math.min(canvas.height - 1, Math.ceil(top + patchHeight));

            // Match the surrounding page colour instead of placing a fixed white box.
            const samplePoints = [
              [Math.max(0,left-3), Math.max(0,top-2)],
              [Math.min(canvas.width-1,right+3), Math.max(0,top-2)],
              [Math.max(0,left-3), Math.min(canvas.height-1,bottom+2)],
              [Math.min(canvas.width-1,right+3), Math.min(canvas.height-1,bottom+2)]
            ];
            const samples = samplePoints.map(([sx,sy]) => Array.from(ctx.getImageData(sx,sy,1,1).data).slice(0,3));
            const bg = [0,1,2].map(channel => Math.round(samples.reduce((sum,p) => sum+p[channel],0)/samples.length));
            ctx.fillStyle = `rgb(${bg[0]}, ${bg[1]}, ${bg[2]})`;
            ctx.fillRect(left, top, Math.max(1,right-left), Math.max(1,bottom-top));
            ctx.font = `${italic ? "italic " : ""}${bold ? "bold " : ""}${fontPx}px "${family}", Arial, sans-serif`;
            ctx.textBaseline = "alphabetic";
            ctx.fillStyle = "rgb(20,20,20)";
            ctx.fillText(replaceText, x, baseline, Math.max(1, patchWidth - 4));
            ctx.restore();
            replacements++;
            from = foundAt + findText.length;
          }
        }

        const png = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
        if (!png) throw new Error("Could not prepare the edited page image.");
        const imageBytes = new Uint8Array(await png.arrayBuffer());
        const embedded = await output.embedPng(imageBytes);
        const originalPage = sourceLayout.getPage(pageNo - 1);
        const pageSize = originalPage.getSize();
        const outPage = output.addPage([pageSize.width, pageSize.height]);
        outPage.drawImage(embedded, { x: 0, y: 0, width: pageSize.width, height: pageSize.height });
        canvas.width = 0;
        canvas.height = 0;
      }

      if (!replacements) throw new Error("No exact match was found in the selected page(s). Check the spelling. Scanned/handwritten text cannot be searched automatically.");
      const bytes = await output.save();
      downloadBlob(new Blob([bytes], { type: "application/pdf" }), outputName(file, "-edited"));
      modalStatus.textContent = `${replacements} correction(s) applied directly on the page. Your edited PDF is downloading.`;
      break;
    }

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

  processBtn.disabled = selectedFiles.length === 0;
});

/* LEGAL LINKS
   Privacy and Terms now point to real sections in index.html. */

/* PAGE READY */

console.log("PDFS website initialized successfully.");




/* FEATURED IMAGE TO PDF QUICK CONVERTER */
(() => {
  const drop = $("#quickImageDrop");
  const input = $("#quickImageInput");
  const choose = $("#quickImageChoose");
  const convert = $("#quickImageConvert");
  const status = $("#quickImageStatus");
  const selected = $("#quickImageSelected");
  const addMore = $("#quickImageAddMore");
  const list = $("#quickImageList");
  if (!drop || !input || !choose || !convert || !status || !selected || !list || !addMore) return;

  let images = [];
  let previews = [];
  const revokePreviews = () => { previews.forEach(url => URL.revokeObjectURL(url)); previews = []; };

  const renderImages = () => {
    revokePreviews();
    list.innerHTML = "";
    images.forEach((file, index) => {
      const item = document.createElement("div");
      item.className = "quick-image-item";
      const preview = URL.createObjectURL(file);
      previews.push(preview);
      const img = document.createElement("img");
      img.src = preview; img.alt = "";
      const name = document.createElement("strong"); name.textContent = file.name; name.title = file.name;
      const order = document.createElement("span"); order.className = "quick-image-order"; order.textContent = "#" + (index + 1);
      const up = document.createElement("button"); up.type = "button"; up.setAttribute("aria-label", "Move " + file.name + " up"); up.innerHTML = '<i class="fa-solid fa-chevron-up"></i>'; up.disabled = index === 0;
      up.addEventListener("click", () => { [images[index - 1], images[index]] = [images[index], images[index - 1]]; renderImages(); });
      const down = document.createElement("button"); down.type = "button"; down.setAttribute("aria-label", "Move " + file.name + " down"); down.innerHTML = '<i class="fa-solid fa-chevron-down"></i>'; down.disabled = index === images.length - 1;
      down.addEventListener("click", () => { [images[index + 1], images[index]] = [images[index], images[index + 1]]; renderImages(); });
      const remove = document.createElement("button"); remove.type = "button"; remove.className = "remove-image"; remove.setAttribute("aria-label", "Remove " + file.name); remove.innerHTML = '<i class="fa-solid fa-xmark"></i>';
      remove.addEventListener("click", () => { images.splice(index, 1); renderImages(); });
      item.append(img, name, order, up, down, remove); list.appendChild(item);
    });
    selected.hidden = images.length === 0;
    drop.hidden = images.length > 0;
    status.textContent = images.length + " image" + (images.length === 1 ? "" : "s") + " selected";
    convert.disabled = images.length === 0;
  };

  const showFiles = files => {
    const incoming = Array.from(files || []).filter(file => ["image/jpeg", "image/png"].includes(file.type) || /\.(jpe?g|png)$/i.test(file.name));
    const invalidCount = Array.from(files || []).length - incoming.length;
    if (invalidCount) status.textContent = invalidCount + " unsupported file(s) skipped. JPG, JPEG and PNG only.";
    if (!incoming.length) { if (!images.length) status.textContent = "Please choose JPG, JPEG or PNG images."; return; }
    images.push(...incoming); renderImages();
  };

  choose.addEventListener("click", () => input.click());
  addMore.addEventListener("click", () => input.click());
  input.addEventListener("change", () => { showFiles(input.files); input.value = ""; });
  ["dragenter", "dragover"].forEach(type => drop.addEventListener(type, event => { event.preventDefault(); drop.classList.add("dragover"); }));
  ["dragleave", "dragend"].forEach(type => drop.addEventListener(type, event => { event.preventDefault(); if (!drop.contains(event.relatedTarget)) drop.classList.remove("dragover"); }));
  drop.addEventListener("drop", event => { event.preventDefault(); drop.classList.remove("dragover"); showFiles(event.dataTransfer.files); });

  convert.addEventListener("click", async () => {
    if (!images.length) return;
    convert.disabled = true; choose.disabled = true; status.textContent = "Loading PDF engine...";
    try {
      await loadPdfToolLibraries("jpg-pdf");
      status.textContent = "Creating your PDF...";
      const { jsPDF } = window.jspdf;
      let pdf;
      for (let i = 0; i < images.length; i++) {
        const file = images[i];
        const dataUrl = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error("Could not read " + file.name)); reader.readAsDataURL(file); });
        const dimensions = await new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight }); image.onerror = () => reject(new Error("Invalid image: " + file.name)); image.src = dataUrl; });
        const orientation = dimensions.width >= dimensions.height ? "landscape" : "portrait";
        if (!pdf) pdf = new jsPDF({ orientation, unit: "pt", format: "a4" }); else pdf.addPage("a4", orientation);
        const pageWidth = pdf.internal.pageSize.getWidth(); const pageHeight = pdf.internal.pageSize.getHeight(); const margin = 24;
        const ratio = Math.min((pageWidth - margin * 2) / dimensions.width, (pageHeight - margin * 2) / dimensions.height);
        const width = dimensions.width * ratio; const height = dimensions.height * ratio;
        pdf.addImage(dataUrl, file.type === "image/png" ? "PNG" : "JPEG", (pageWidth - width) / 2, (pageHeight - height) / 2, width, height);
      }
      pdf.save("images-to-pdf.pdf"); status.textContent = "Your PDF download has started.";
    } catch (error) { console.error(error); status.textContent = error.message || "Could not create the PDF. Please try again."; }
    finally { convert.disabled = images.length === 0; choose.disabled = false; }
  });
  window.addEventListener("beforeunload", revokePreviews);
})();


/* ==========================================
   PDFS — LIVE CMS + PRIVACY-LIGHT ANALYTICS
   Public content is read through RLS-protected
   Supabase tables. File processing stays local.
========================================== */
(async () => {
  const SUPABASE_URL = "https://ifbhikajorxrslvnxmjx.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_GZuBTRceNBx0sYIb4M4FOQ_ksWzxrq7";
  try {
    await window.pdfsLoadScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2", () => !!window.supabase?.createClient);
  } catch (error) {
    console.warn("Live site content is temporarily unavailable.", error);
    return;
  }
  const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

  const loadTools = async () => {
    const { data, error } = await db.from("tools")
      .select("slug,name,description,is_enabled,sort_order")
      .order("sort_order", { ascending: true });
    if (error || !data?.length) return;
    const cards = Array.from(document.querySelectorAll("[data-tool]"));
    data.forEach(item => {
      if (tools[item.slug]) {
        tools[item.slug].title = item.name;
        tools[item.slug].description = item.description;
      }
      const card = cards.find(el => el.dataset.tool === item.slug);
      if (!card) return;
      card.hidden = !item.is_enabled;
      const name = card.querySelector("strong");
      const description = card.querySelector("small");
      if (name) name.textContent = item.name;
      if (description) description.textContent = item.description;
      card.setAttribute("aria-label", item.name + ": " + item.description);
    });
    const count = data.filter(item => item.is_enabled).length + 1; // Edit PDF is a built-in tool, not CMS-managed.
    document.querySelectorAll(".tool-count").forEach(el => el.textContent = count + " AVAILABLE TOOLS");
    document.querySelectorAll(".stats-section .stats-grid > div:first-child strong").forEach(el => el.textContent = count);
    document.querySelectorAll(".cta-highlight-item:first-child .highlight-number").forEach(el => el.textContent = count);
  };

  const loadFeaturedImageTool = async () => {
    const featured = document.querySelector("#imageToPdfQuick");
    if (!featured) return;
    const { data, error } = await db.from("tools")
      .select("is_enabled")
      .eq("slug", "jpg-pdf")
      .maybeSingle();
    // Keep the converter visible if the control record cannot be read.
    if (!error && data) featured.hidden = !data.is_enabled;
  };

  const loadFaqs = async () => {
    const { data, error } = await db.from("faqs")
      .select("question,answer,sort_order")
      .order("sort_order", { ascending: true });
    if (error || !data?.length) return;
    const container = document.querySelector(".faq-container");
    if (!container) return;
    container.replaceChildren();
    data.forEach(item => {
      const details = document.createElement("details");
      details.className = "faq-item reveal visible";
      const summary = document.createElement("summary");
      const answer = document.createElement("p");
      summary.textContent = item.question;
      answer.textContent = item.answer;
      details.append(summary, answer);
      container.appendChild(details);
    });
  };

  const loadBanners = async () => {
    const now = new Date().toISOString();
    const { data, error } = await db.from("banners")
      .select("title,message,cta_label,cta_url,image_url,starts_at,ends_at")
      .eq("is_enabled", true);
    if (error || !data?.length) return;
    const active = data.find(item =>
      (!item.starts_at || item.starts_at <= now) &&
      (!item.ends_at || item.ends_at >= now)
    );
    if (!active) return;
    const host = document.createElement("section");
    host.className = "pdfs-live-banner";
    host.setAttribute("aria-label", "Announcement");
    host.style.cssText = "max-width:1180px;margin:18px auto;padding:22px 26px;border:1px solid rgba(114,85,233,.18);border-radius:18px;background:linear-gradient(110deg,#f7f5ff,#fff);display:flex;align-items:center;justify-content:space-between;gap:18px;flex-wrap:wrap";
    const copy = document.createElement("div");
    const title = document.createElement("strong");
    const message = document.createElement("p");
    title.textContent = active.title;
    message.textContent = active.message;
    message.style.cssText = "margin:6px 0 0;color:#68708a";
    copy.append(title, message);
    host.appendChild(copy);
    if (active.cta_label && active.cta_url) {
      const link = document.createElement("a");
      link.textContent = active.cta_label;
      link.href = active.cta_url;
      link.style.cssText = "font-weight:700;color:#684ee0;text-decoration:none";
      host.appendChild(link);
    }
    const main = document.querySelector("main");
    if (main) main.prepend(host);
  };

  const loadCustomSections = async () => {
    const { data, error } = await db.from("content_sections")
      .select("slug,title,body,sort_order")
      .order("sort_order", { ascending: true });
    if (error || !data?.length) return;
    const main = document.querySelector("main");
    if (!main) return;
    const host = document.createElement("div");
    host.className = "pdfs-managed-content";
    data.forEach(item => {
      const section = document.createElement("section");
      section.className = "section-wrap";
      section.style.cssText = "padding-top:28px;padding-bottom:28px";
      const heading = document.createElement("h2");
      const body = document.createElement("p");
      heading.textContent = item.title;
      body.textContent = item.body;
      section.append(heading, body);
      host.appendChild(section);
    });
    const faq = document.querySelector("#faq");
    main.insertBefore(host, faq || main.lastElementChild);
  };

  const loadSettings = async () => {
    const { data, error } = await db.from("site_settings")
      .select("setting_key,setting_value")
      .eq("is_public", true);
    if (error || !data?.length) return;
    const settings = Object.fromEntries(data.map(item => [item.setting_key, item.setting_value]));
    if (typeof settings.site_title === "string" && settings.site_title.trim()) {
      document.title = settings.site_title;
    }
    if (typeof settings.meta_description === "string" && settings.meta_description.trim()) {
      const meta = document.querySelector('meta[name="description"]');
      if (meta) meta.content = settings.meta_description;
    }
  };

  // Load CMS content after the initial page has rendered.
  const loadCmsContent = () => {
    loadTools();
    loadFeaturedImageTool();
    loadFaqs();
    loadBanners();
    loadCustomSections();
    loadSettings();
  };
  if ("requestIdleCallback" in window) requestIdleCallback(loadCmsContent, { timeout: 2500 });
  else setTimeout(loadCmsContent, 1200);

})();

/* OPEN A TOOL FROM ITS SEO GUIDE PAGE */
const requestedTool = new URLSearchParams(window.location.search).get("tool");
if (requestedTool && Object.prototype.hasOwnProperty.call(tools, requestedTool)) {
  openTool(requestedTool);
  document.querySelector("#tools")?.scrollIntoView({ behavior: "smooth", block: "start" });
}
