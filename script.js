const startScreen = document.getElementById('start-screen');
const cameraScreen = document.getElementById('camera-screen');
const developingScreen = document.getElementById('developing-screen');
const previewScreen = document.getElementById('preview-screen');
const actionsScreen = document.getElementById('actions-screen');

const startBtn = document.getElementById('start-btn');
const captureBtn = document.getElementById('capture-btn');
const continueBtn = document.getElementById('continue-btn');
const downloadBtn = document.getElementById('download-btn');
const retakeBtn = document.getElementById('retake-btn');
const nextGuestBtn = document.getElementById('next-guest-btn');

const video = document.getElementById('video');
const photoCanvas = document.getElementById('photo-canvas');
const stripCanvas = document.getElementById('strip-canvas');

const countdownOverlay = document.getElementById('countdown-overlay');
const countdownNumber = document.getElementById('countdown-number');
const flash = document.getElementById('flash');
const photoCount = document.getElementById('photo-count');
const iosMessage = document.getElementById('ios-message');
const stripDropEl = document.getElementById('strip-slot');


let stream = null;
let photos = [];
let currentPhotoIndex = 0;

const PHOTO_WIDTH = 400;
const PHOTO_HEIGHT = 415;
const STRIP_PADDING = 30;
const PHOTO_SPACING = 20;
const FOOTER_HEIGHT = 130;

function showScreen(screen) {
  [startScreen, cameraScreen, developingScreen, previewScreen, actionsScreen]
    .filter(Boolean)
    .forEach(s => s.classList.remove('active'));

  if (screen) screen.classList.add('active');
}

async function startCamera() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'user',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false
        });
        video.srcObject = stream;
        await video.play();
        return true;
    } catch (err) {
        console.error('Camera error:', err);
        alert('Could not access camera. Please ensure camera permissions are granted and try again.');
        return false;
    }
}

function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
}

function countdown() {
    return new Promise((resolve) => {
        let count = 3;
        countdownOverlay.classList.remove('hidden');
        countdownNumber.textContent = count;
        
        const interval = setInterval(() => {
            count--;
            if (count > 0) {
                countdownNumber.textContent = count;
            } else {
                clearInterval(interval);
                countdownOverlay.classList.add('hidden');
                resolve();
            }
        }, 1000); // TODO change this back to 1000, lowered for testing (changed)
    });
}

function triggerFlash() {
    flash.classList.add('active');
    setTimeout(() => {
        flash.classList.remove('active');
    }, 300);
}

function capturePhoto() {
    const ctx = photoCanvas.getContext('2d');
    photoCanvas.width = PHOTO_WIDTH;
    photoCanvas.height = PHOTO_HEIGHT;
    
    const videoAspect = video.videoWidth / video.videoHeight;
    const targetAspect = PHOTO_WIDTH / PHOTO_HEIGHT;
    
    let sx, sy, sw, sh;
    
    if (videoAspect > targetAspect) {
        sh = video.videoHeight;
        sw = sh * targetAspect;
        sx = (video.videoWidth - sw) / 2;
        sy = 0;
    } else {
        sw = video.videoWidth;
        sh = sw / targetAspect;
        sx = 0;
        sy = (video.videoHeight - sh) / 2;
    }
    
    ctx.save();
    ctx.translate(PHOTO_WIDTH, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, PHOTO_WIDTH, PHOTO_HEIGHT);
    ctx.restore();
    
    return photoCanvas.toDataURL('image/jpeg', 0.9);
}

function updatePhotoCounter() {
    photoCount.textContent = `Photo ${currentPhotoIndex + 1} of 3`;
}

async function takePhotoSequence() {
  // Prevent double-taps while we run the full 3-photo sequence
  captureBtn.disabled = true;

  // Take photos until we have 3
  while (currentPhotoIndex < 3) {
    // Show which photo we're about to take (1/3, 2/3, 3/3)
    updatePhotoCounter();

    await countdown();
    triggerFlash();

    const photoData = capturePhoto();
    photos.push(photoData);
    currentPhotoIndex++;

    // Small pause so it feels natural between shots (optional)
    if (currentPhotoIndex < 3) {
      await new Promise((r) => setTimeout(r, 350));
    }
  }

  // Done: move on
  stopCamera();
  showScreen(developingScreen);

  setTimeout(() => {
    createPhotoStrip();
  }, 2000);
}


function drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius, color) {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;
    
    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    
    for (let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outerRadius;
        y = cy - Math.sin(rot) * outerRadius;
        ctx.lineTo(x, y);
        rot += step;
        
        x = cx + Math.cos(rot) * innerRadius;
        y = cy - Math.sin(rot) * innerRadius;
        ctx.lineTo(x, y);
        rot += step;
    }
    
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
}

function drawSnowflake(ctx, x, y, size, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    
    for (let i = 0; i < 6; i++) {
        const angle = (i * 60) * Math.PI / 180;
        ctx.beginPath();
        ctx.moveTo(x, y);
        const endX = x + Math.cos(angle) * size;
        const endY = y + Math.sin(angle) * size;
        ctx.lineTo(endX, endY);
        ctx.stroke();
        
        const branchX = x + Math.cos(angle) * size * 0.6;
        const branchY = y + Math.sin(angle) * size * 0.6;
        
        ctx.beginPath();
        ctx.moveTo(branchX, branchY);
        ctx.lineTo(
            branchX + Math.cos(angle + Math.PI / 4) * size * 0.3,
            branchY + Math.sin(angle + Math.PI / 4) * size * 0.3
        );
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(branchX, branchY);
        ctx.lineTo(
            branchX + Math.cos(angle - Math.PI / 4) * size * 0.3,
            branchY + Math.sin(angle - Math.PI / 4) * size * 0.3
        );
        ctx.stroke();
    }
}

function drawHollyLeaf(ctx, x, y, size, angle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    
    ctx.fillStyle = '#228b22';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(size * 0.5, -size * 0.3, size, 0);
    ctx.quadraticCurveTo(size * 0.7, size * 0.15, size * 0.5, size * 0.1);
    ctx.quadraticCurveTo(size * 0.3, size * 0.2, 0, 0);
    ctx.fill();
    
    ctx.restore();
}

function drawHollyBerries(ctx, x, y, radius) {
    ctx.fillStyle = '#c41e3a';
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(x - radius * 0.3, y - radius * 0.3, radius * 0.3, 0, Math.PI * 2);
    ctx.fill();
}

function createPhotoStrip() {
  const stripWidth = PHOTO_WIDTH + (STRIP_PADDING * 2);
  const stripHeight =
    (PHOTO_HEIGHT * 3) +
    (PHOTO_SPACING * 2) +
    (STRIP_PADDING * 2) +
    FOOTER_HEIGHT;

  // Set canvas size
  const ctx = stripCanvas.getContext('2d');
  stripCanvas.width = stripWidth;
  stripCanvas.height = stripHeight;

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, stripWidth, stripHeight);

  // Border
  ctx.strokeStyle = '#c41e3a';
  ctx.lineWidth = 4;
  ctx.strokeRect(8, 8, stripWidth - 16, stripHeight - 16);

  // Load and draw photos
  const imagesLoaded = photos.map((photoData, index) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const y = STRIP_PADDING + (index * (PHOTO_HEIGHT + PHOTO_SPACING));

        ctx.shadowColor = 'rgba(0, 0, 0, 0.18)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 3;

        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(STRIP_PADDING - 5, y - 5, PHOTO_WIDTH + 10, PHOTO_HEIGHT + 10);

        ctx.shadowColor = 'transparent';
        ctx.drawImage(img, STRIP_PADDING, y, PHOTO_WIDTH, PHOTO_HEIGHT);

        ctx.strokeStyle = 'rgba(0,0,0,0.12)';
        ctx.lineWidth = 1;
        ctx.strokeRect(STRIP_PADDING, y, PHOTO_WIDTH, PHOTO_HEIGHT);

        resolve();
      };
      img.src = photoData;
    });
  });

  Promise.all(imagesLoaded).then(async () => {


 // Footer text (order: Merry Christmas > date > space > by michellelichen.com)
const footerY = STRIP_PADDING + (3 * PHOTO_HEIGHT) + (2 * PHOTO_SPACING) + 20;
const cx = stripCanvas.width / 2;

ctx.textAlign = 'center';

// Ensure font is available (safe even if it’s already loaded)
if (document.fonts && document.fonts.load) {
  await document.fonts.load('42px "Beau Rivage"');
}

// 1) Merry Christmas
ctx.font = '42px "Beau Rivage", cursive';
ctx.fillStyle = '#c41e3a';
ctx.fillText('Merry Christmas', cx, footerY + 44);

// 2) Date (with • separators)
const d = new Date();
const mm = String(d.getMonth() + 1).padStart(2, '0');
const dd = String(d.getDate()).padStart(2, '0');
const yyyy = d.getFullYear();
const dateStr = `${mm} • ${dd} • ${yyyy}`;

ctx.font = '20px Georgia, serif';
ctx.fillStyle = '#666';
ctx.fillText(dateStr, cx, footerY + 66);

// 3) Extra space, then by-line
ctx.font = '16px Georgia, serif';
ctx.fillStyle = '#8b8b8bff';
ctx.fillText('by michellelichen.com', cx, footerY + 96);


    // Go to screen 3 (preview)
    showScreen(previewScreen);

      // Restart drop animation every time + make it visible
      if (stripDropEl) {
        stripDropEl.classList.remove('run');
        void stripDropEl.offsetWidth; // force reflow
        stripDropEl.classList.add('run');
      }
  });
}


function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
           (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isSafari() {
    return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}

function downloadStrip() {
    const dataUrl = stripCanvas.toDataURL('image/png');
    
    if (isIOS() && isSafari()) {
        const newTab = window.open();
        if (newTab) {
            newTab.document.write(`
                <html>
                <head>
                    <title>Christmas Photo Strip</title>
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <style>
                        body {
                            margin: 0;
                            padding: 20px;
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            background: #1a1a1a;
                            min-height: 100vh;
                        }
                        img {
                            max-width: 100%;
                            height: auto;
                        }
                        p {
                            color: white;
                            font-family: -apple-system, sans-serif;
                            font-size: 18px;
                            text-align: center;
                            margin-bottom: 20px;
                        }
                    </style>
                </head>
                <body>
                    <p>📱 Tap and hold the image, then select "Save Image"</p>
                    <img src="${dataUrl}" alt="Christmas Photo Strip">
                </body>
                </html>
            `);
            newTab.document.close();
        }
        if (iosMessage) iosMessage.classList.remove('hidden');
    } else {
        const link = document.createElement('a');
        link.download = `christmas-photobooth-${Date.now()}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

function resetPhotobooth() {
  photos = [];
  currentPhotoIndex = 0;

  if (iosMessage) iosMessage.classList.add('hidden');

  // ✅ IMPORTANT: re-enable capture after any run
  if (captureBtn) captureBtn.disabled = false;

  updatePhotoCounter();
}

if (!startBtn) {
  console.error("❌ start-btn not found");
} else {
  startBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    console.log("✅ START CLICKED");

    // PROVE the screen switch works even before camera
    showScreen(cameraScreen);

    const cameraStarted = await startCamera();
    console.log("cameraStarted:", cameraStarted);

    if (!cameraStarted) {
      alert("Camera failed to start");
      // go back if camera fails
      showScreen(startScreen);
      return;
    }

    resetPhotobooth();
  });
}


if (captureBtn) captureBtn.addEventListener('click', takePhotoSequence);



function saveStripAndGoActions(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }

  downloadStrip();              // ✅ save
  showScreen(actionsScreen);    // ✅ then go to screen 4
}

if (previewScreen) {
  previewScreen.addEventListener('click', saveStripAndGoActions);
  // ❌ remove touchend to avoid double-firing on mobile
}



if (downloadBtn) {
  downloadBtn.addEventListener('click', downloadStrip);
}

if (retakeBtn) {
  retakeBtn.addEventListener('click', async (e) => {
    e.preventDefault();

    stopCamera();          // safety
    resetPhotobooth();     // re-enables captureBtn

    const cameraStarted = await startCamera();
    if (cameraStarted) showScreen(cameraScreen);
  });
}

if (nextGuestBtn) {
  nextGuestBtn.addEventListener('click', () => {
    resetPhotobooth();
    stopCamera();
    showScreen(startScreen);
  });
}
