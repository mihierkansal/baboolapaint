window.addEventListener("DOMContentLoaded", () => {
  window.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.key === "z") {
      undoAllSinceLastMouseDown();
    }
  });

  const $ = document.querySelector.bind(document);

  const canvas = $("canvas");

  const ctx = canvas.getContext("2d");

  ctx.lineWidth = 8;

  ctx.lineCap = "round";

  ctx.strokeStyle = $("#stroke_color").value;

  ctx.fillStyle = $("#fill_color").value;

  ctx.globalCompositeOperation = "source-over"; // Set default composite mode

  let prevX,
    prevY = null;

  let tool = "pen";

  let isMousedn = false;

  let snapshot;

  canvas.onmousedown = (e) => {
    startDraw(e);
  };
  canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    startDraw(e.touches[0]);
  });

  window.onmouseup = () => {
    isMousedn = false;
  };
  window.addEventListener("touchend", () => {
    isMousedn = false;
  });

  canvas.onmousemove = (e) => {
    if (!isMousedn) return;
    useToolWithEvent(e);
  };
  canvas.addEventListener("touchmove", (e) => {
    e.preventDefault();
    if (!isMousedn) return;
    useToolWithEvent(e.touches[0]);
  });

  $("#clear").onclick = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  $("#thickness").oninput = (e) => {
    ctx.lineWidth = e.target.value;
  };
  $("#save").onclick = () => {
    download();
  };
  $("#undo").onclick = () => {
    undoAllSinceLastMouseDown();
  };

  function setTool(newTool, e) {
    tool = newTool;
    const prevButton = $("#toolbar button.selected");

    if (prevButton) {
      prevButton.classList.remove("selected");
    }

    if (!e.currentTarget.classList.contains("selected")) {
      e.currentTarget.classList.add("selected");
    }
  }

  $("#eraser").onclick = (e) => {
    setTool("eraser", e);
  };

  $("#pen").onclick = (e) => {
    setTool("pen", e);
  };

  $("#line").onclick = (e) => {
    setTool("line", e);
  };

  $("#rect").onclick = (e) => {
    setTool("rect", e);
  };
  $("#circle").onclick = (e) => {
    setTool("circle", e);
  };

  $("#triangle_right").onclick = (e) => {
    setTool("triangle_right", e);
  };
  $("#triangle_isoceles").onclick = (e) => {
    setTool("triangle_isoceles", e);
  };

  $("#stroke_color").oninput = (e) => {
    ctx.strokeStyle = e.target.value;
  };
  $("#fill_color").oninput = (e) => {
    ctx.fillStyle = e.target.value;
  };

  const backupCanvas = document.createElement("canvas");
  backupCanvas.width = canvas.width;
  backupCanvas.height = canvas.height;
  const backupCtx = backupCanvas.getContext("2d");

  function startDraw(e) {
    saveCanvasState(); // Save the current state

    setPrevToMouseLoc(e);
    useToolWithEvent(e);
    isMousedn = true;
  }

  function useToolWithEvent(e) {
    const shouldFillShape =
      $("#should_fill").checked &&
      tool !== "eraser" &&
      tool !== "pen" &&
      tool !== "line";
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(prevX, prevY);
    backupCtx.moveTo(prevX, prevY);
    const { x, y } = determineXY(e);
    if (tool === "eraser") {
      ctx.save(); // Save the current state
      ctx.globalCompositeOperation = "destination-out"; // Set composite mode
      ctx.lineTo(x, y);
      ctx.stroke(); // stroke erases in this mode
      ctx.restore(); // Restore the state
      setPrevToMouseLoc(e);
    } else if (tool === "pen") {
      ctx.lineTo(x, y);
      ctx.stroke();
      setPrevToMouseLoc(e);
    } else if (tool === "line") {
      undoAllSinceLastMouseDown(); // so we dont have a buncha lines all over da place when the user decides to move 2nd line point
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (tool === "rect") {
      undoAllSinceLastMouseDown(); // so we dont have a buncha rectangle all over da place
      ctx.rect(prevX, prevY, x - prevX, y - prevY);

      ctx.stroke();
    } else if (tool === "circle") {
      undoAllSinceLastMouseDown(); // so we dont have a buncha circles  all over da place
      ctx.beginPath();
      var radius = Math.abs(Math.min((x - prevX) / 2, (y - prevY) / 2));
      ctx.arc(prevX + radius, prevY + radius, radius, 0, 2 * Math.PI);

      ctx.stroke();
    } else if (tool === "triangle_right") {
      undoAllSinceLastMouseDown(); // so we dont have a buncha triangles  all over da place

      ctx.lineTo(prevX, y);
      ctx.lineTo(x, y);
      ctx.closePath();

      ctx.stroke();
    } else if (tool === "triangle_isoceles") {
      undoAllSinceLastMouseDown(); // so we dont have a buncha triangles  all over da place

      ctx.lineTo(x - (x - prevX) / 2, y);
      ctx.lineTo(x, prevY);

      ctx.closePath();

      ctx.stroke();
    }
    if (shouldFillShape) {
      ctx.fill();
    }
  }

  function saveCanvasState() {
    backupCtx.clearRect(0, 0, backupCanvas.width, backupCanvas.height); // Clear backup canvas
    backupCtx.drawImage(canvas, 0, 0); // Copy the current canvas to the backup canvas
  }

  function undoAllSinceLastMouseDown() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the main canvas
    ctx.drawImage(backupCanvas, 0, 0); // Restore the backup canvas state to the main canvas
  }
  function setPrevToMouseLoc(e) {
    const rect = canvas.getBoundingClientRect();

    const { x, y } = determineXY(e);
    prevX = x;
    prevY = y;
  }

  function determineXY(e) {
    const rect = canvas.getBoundingClientRect();

    const x = e.clientX - rect.left,
      y = e.clientY - rect.top;

    return { x, y };
  }

  function download() {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    let minX = canvas.width;
    let minY = canvas.height;
    let maxX = 0;
    let maxY = 0;

    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3];
      if (alpha > 0) {
        const x = (i / 4) % canvas.width;
        const y = Math.floor(i / 4 / canvas.width);

        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }

    const drawnWidth = maxX - minX + 1;
    const drawnHeight = maxY - minY + 1;
    const croppedCanvas = document.createElement("canvas");
    croppedCanvas.width = drawnWidth;
    croppedCanvas.height = drawnHeight;
    const croppedCtx = croppedCanvas.getContext("2d");
    croppedCtx.drawImage(
      canvas,
      minX,
      minY,
      drawnWidth,
      drawnHeight, // Source rectangle
      0,
      0,
      drawnWidth,
      drawnHeight // Destination rectangle
    );

    const dataURL = croppedCanvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = dataURL;
    link.download = "image.png";
    link.click();
  }
});
