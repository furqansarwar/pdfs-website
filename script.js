
document.addEventListener("DOMContentLoaded", () => {
  const $ = s => document.querySelector(s);
  const $$ = s => document.querySelectorAll(s);

  const modal = $("#toolModal");
  const title = $("#modalTitle");
  const desc = $("#modalDescription");
  const input = $("#fileInput");
  const fileName = $("#fileName");
  const process = $("#processBtn");
  const status = $("#modalStatus");
  let tool = "", files = [];

  const names = {
    merge: "Merge PDF", split: "Split PDF", compress: "Compress PDF",
    "pdf-word": "PDF to Word", "word-pdf": "Word to PDF",
    "pdf-jpg": "PDF to JPG", "jpg-pdf": "JPG to PDF",
    "pdf-excel": "PDF to Excel", rotate: "Rotate PDF",
    watermark: "Watermark PDF", protect: "Protect PDF",
    unlock: "Unlock PDF"
  };

  // Navigation
  const menu = $("#menuToggle"), nav = $("#navLinks");
  if (menu && nav) menu.onclick = () => nav.classList.toggle("active");
  $$("#navLinks a").forEach(a => a.onclick = () => nav?.classList.remove("active"));

  // Reveal animations
  const reveal = $$(".reveal");
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add("visible");
          observer.unobserve(e.target);
        }
      });
    });
    reveal.forEach(el => observer.observe(el));
    setTimeout(() => reveal.forEach(el => el.classList.add("visible")), 2000);
  } else reveal.forEach(el => el.classList.add("visible"));

  // Open tool
  function openTool(key) {
    tool = key;
    files = [];
    title.textContent = names[key] || key;
    desc.textContent = "Select your file to get started.";
    input.value = "";
    input.accept = key === "jpg-pdf" ? ".jpg,.jpeg,.png" :
      key === "word-pdf" ? ".docx" : ".pdf";
    input.multiple = key === "merge" || key === "jpg-pdf";
    fileName.textContent = "Choose your file";
    process.disabled = true;
    status.textContent = "";
    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");
  }

  $$(".tool-card").forEach(card => {
    card.addEventListener("click", () => {
      const key = card.dataset.tool ||
        Object.keys(names).find(k => names[k] === card.textContent.trim());
      if (key) openTool(key);
    });
  });

  function closeTool() {
    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");
  }
  $("#modalClose")?.addEventListener("click", closeTool);
  $("#modalBackdrop")?.addEventListener("click", closeTool);
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") closeTool();
  });

  input.addEventListener("change", () => {
    files = [...input.files];
    fileName.textContent = files.map(f => f.name).join(", ");
    process.disabled = files.length === 0;
    status.textContent = files.length + " file(s) selected";
  });

  function download(bytes, name, type = "application/pdf") {
    const blob = bytes instanceof Blob ? bytes : new Blob([bytes], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  async function pdfFile(file) {
    if (!window.PDFLib) throw Error("PDF library not loaded. Refresh the page.");
    return PDFLib.PDFDocument.load(await file.arrayBuffer());
  }

  async function runTool() {
    if (!files.length) return;
    process.disabled = true;
    status.textContent = "Processing...";
    try {
      const file = files[0];
      let pdf, bytes;

      switch (tool) {
        case "merge": {
          if (files.length < 2) throw Error("Select at least 2 PDFs.");
          pdf = await PDFLib.PDFDocument.create();
          for (const f of files) {
            const source = await pdfFile(f);
            const pages = await pdf.copyPages(source, source.getPageIndices());
            pages.forEach(p => pdf.addPage(p));
          }
          download(await pdf.save(), "PDFS-Merged.pdf");
          break;
        }

        case "split": {
          pdf = await pdfFile(file);
          const range = prompt("Enter page range, e.g. 1-3", "1-1");
          if (!range) break;
          const match = range.match(/^(\d+)(?:-(\d+))?$/);
          if (!match) throw Error("Invalid page range.");
          const start = +match[1], end = +(match[2] || match[1]);
          if (start < 1 || end < start || end > pdf.getPageCount()) throw Error("Page range is outside the PDF.");
          const out = await PDFLib.PDFDocument.create();
          const pages = await out.copyPages(pdf, Array.from({length:end-start+1},(_,i)=>start-1+i));
          pages.forEach(p => out.addPage(p));
          download(await out.save(), "PDFS-Split.pdf");
          break;
        }

        case "compress":
          pdf = await pdfFile(file);
          download(await pdf.save({useObjectStreams:true}), "PDFS-Optimized.pdf");
          break;

        case "rotate": {
          pdf = await pdfFile(file);
          const angle = Number(prompt("Rotation angle: 90, 180 or 270", "90"));
          if (![90,180,270].includes(angle)) throw Error("Invalid rotation.");
          pdf.getPages().forEach(p => p.setRotation(PDFLib.degrees((p.getRotation().angle+angle)%360)));
          download(await pdf.save(), "PDFS-Rotated.pdf");
          break;
        }

        case "watermark": {
          pdf = await pdfFile(file);
          const text = prompt("Enter watermark text", "PDFS");
          if (!text) throw Error("Watermark text required.");
          const font = await pdf.embedFont(PDFLib.StandardFonts.HelveticaBold);
          pdf.getPages().forEach(p => {
            const s = p.getSize();
            p.drawText(text,{x:s.width/4,y:s.height/2,size:35,font,color:PDFLib.rgb(.5,.4,.8),opacity:.25,rotate:PDFLib.degrees(-30)});
          });
          download(await pdf.save(), "PDFS-Watermarked.pdf");
          break;
        }

        case "jpg-pdf": {
          pdf = await PDFLib.PDFDocument.create();
          for (const f of files) {
            const b = await f.arrayBuffer();
            const img = f.type === "image/png" ? await pdf.embedPng(b) : await pdf.embedJpg(b);
            const p = pdf.addPage([img.width,img.height]);
            p.drawImage(img,{x:0,y:0,width:img.width,height:img.height});
          }
          download(await pdf.save(), "PDFS-Images.pdf");
          break;
        }

        case "pdf-jpg": {
          if (!window.pdfjsLib) throw Error("PDF reader library not loaded.");
          pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
          const doc = await pdfjsLib.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
          for (let n=1;n<=doc.numPages;n++) {
            const page = await doc.getPage(n), view = page.getViewport({scale:1.5});
            const canvas = document.createElement("canvas");
            canvas.width=view.width; canvas.height=view.height;
            await page.render({canvasContext:canvas.getContext("2d"),viewport:view}).promise;
            const blob = await new Promise(r=>canvas.toBlob(r,"image/jpeg",.9));
            download(blob,`PDFS-Page-${n}.jpg`,"image/jpeg");
          }
          break;
        }

        case "pdf-word": {
          if (!window.pdfjsLib || !window.docx) throw Error("PDF or Word library not loaded.");
          pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
          const doc = await pdfjsLib.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
          const text = [];
          for(let n=1;n<=doc.numPages;n++){
            const p=await doc.getPage(n), c=await p.getTextContent();
            text.push(c.items.map(i=>i.str).join(" "));
          }
          if(!text.join("").trim()) throw Error("No selectable text found. OCR is needed for scanned PDFs.");
          const children=text.map(t=>new docx.Paragraph({text:t}));
          const word=new docx.Document({sections:[{children}]});
          download(await docx.Packer.toBlob(word),"PDFS.docx","application/vnd.openxmlformats-officedocument.wordprocessingml.document");
          break;
        }

        case "word-pdf": {
          if (!window.mammoth || !window.jspdf) throw Error("Word/PDF library not loaded.");
          const result=await mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()});
          const jsPDF=window.jspdf.jsPDF, out=new jsPDF();
          const lines=out.splitTextToSize(result.value,170);
          let y=15;
          lines.forEach(line=>{if(y>280){out.addPage();y=15;}out.text(line,15,y);y+=7;});
          out.save("PDFS.pdf");
          break;
        }

        case "pdf-excel": {
          if (!window.pdfjsLib || !window.XLSX) throw Error("PDF/Excel library not loaded.");
          pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
          const doc=await pdfjsLib.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
          const rows=[["Page","Extracted text"]];
          for(let n=1;n<=doc.numPages;n++){
            const p=await doc.getPage(n),c=await p.getTextContent();
            rows.push([n,c.items.map(i=>i.str).join(" ")]);
          }
          const wb=XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rows),"PDF Text");
          XLSX.writeFile(wb,"PDFS.xlsx");
          break;
        }

        case "protect":
          throw Error("Password protection needs a dedicated encryption library; not enabled yet.");

        case "unlock":
          throw Error("Password removal is not supported in this version.");

        default:
          throw Error("Tool not recognized.");
      }
      status.textContent = "Completed successfully!";
    } catch (err) {
      console.error(err);
      status.textContent = err.message || "Something went wrong.";
    } finally {
      process.disabled = false;
    }
  }

  process?.addEventListener("click", runTool);

  // Drag and drop
  const zone = $(".upload-zone");
  if (zone) {
    zone.addEventListener("dragover", e => {e.preventDefault();zone.classList.add("dragover");});
    zone.addEventListener("dragleave", () => zone.classList.remove("dragover"));
    zone.addEventListener("drop", e => {
      e.preventDefault(); zone.classList.remove("dragover");
      if (e.dataTransfer.files.length) {
        files=[...e.dataTransfer.files];
        fileName.textContent=files.map(f=>f.name).join(", ");
        process.disabled=false;
      }
    });
  }

  console.log("PDFS Professional Website Loaded");
});
