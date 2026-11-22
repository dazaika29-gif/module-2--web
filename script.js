const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const fileInput = document.getElementById('fileInput');
const hint = document.getElementById('hint');

const brightnessInput = document.getElementById('brightness');
const contrastInput = document.getElementById('contrast');
const blurInput = document.getElementById('blur');
const grayInput = document.getElementById('gray');
const MAX_SIZE = 600;      
let originalData = null;   

let state = {              
  brightness: 0,
  contrast: 0,
  blur: 0,
  gray: false
};

function saveState() {
  localStorage.setItem('editorState', JSON.stringify(state));
}

function loadState() {
  const saved = localStorage.getItem('editorState');
  if (saved) {
    try {
      state = JSON.parse(saved);
    } catch (e) {
      console.log('Не удалось прочитать настройки');
    }
  }
}

function updateControls() {
  brightnessInput.value = state.brightness;
  contrastInput.value = state.contrast;
  blurInput.value = state.blur;
  grayInput.checked = state.gray;
  document.getElementById('brightnessValue').textContent = state.brightness;
  document.getElementById('contrastValue').textContent = state.contrast;
  document.getElementById('blurValue').textContent = state.blur;
}

fileInput.addEventListener('change', function () {
  const file = fileInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    const img = new Image();
    img.onload = function () {
      let scale = Math.min(1, MAX_SIZE / Math.max(img.width, img.height));
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      originalData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      hint.style.display = 'none';
      render();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
});

function applyBrightnessContrast(data, brightness, contrast) {
  const factor = (100 + contrast) / 100;  
  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) {          
      let value = data[i + c];
      value = (value - 128) * factor + 128;
      value = value + brightness;           
      data[i + c] = value;               
    }
  }
}

function applyGray(data) {
  for (let i = 0; i < data.length; i += 4) {
    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
    data[i] = avg;
    data[i + 1] = avg;
    data[i + 2] = avg;
  }
}

function convolve(imageData, kernel) {
  const w = imageData.width;
  const h = imageData.height;
  const src = imageData.data;
  const out = new Uint8ClampedArray(src.length);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;

      for (let c = 0; c < 3; c++) {
        let sum = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const px = Math.min(w - 1, Math.max(0, x + kx));
            const py = Math.min(h - 1, Math.max(0, y + ky));
            const weight = kernel[(ky + 1) * 3 + (kx + 1)];
            sum += src[(py * w + px) * 4 + c] * weight;
          }
        }
        out[idx + c] = sum;
      }
      out[idx + 3] = src[idx + 3];
    }
  }
  return new ImageData(out, w, h);
}

const BLUR_KERNEL = [
  1 / 9, 1 / 9, 1 / 9,
  1 / 9, 1 / 9, 1 / 9,
  1 / 9, 1 / 9, 1 / 9
];

function render() {
  if (!originalData) return;

  let result = new ImageData(
    new Uint8ClampedArray(originalData.data),
    originalData.width,
    originalData.height
  );

  applyBrightnessContrast(result.data, state.brightness, state.contrast);

  if (state.gray) {
    applyGray(result.data);
  }

  for (let i = 0; i < state.blur; i++) {
    result = convolve(result, BLUR_KERNEL);
  }

  ctx.putImageData(result, 0, 0);
}

function onChange() {
  state.brightness = Number(brightnessInput.value);
  state.contrast = Number(contrastInput.value);
  state.blur = Number(blurInput.value);
  state.gray = grayInput.checked;
  updateControls();
  saveState();
  render();
}

brightnessInput.addEventListener('input', onChange);
contrastInput.addEventListener('input', onChange);
blurInput.addEventListener('input', onChange);
grayInput.addEventListener('change', onChange);

document.getElementById('resetBtn').addEventListener('click', function () {
  state = { brightness: 0, contrast: 0, blur: 0, gray: false };
  updateControls();
  saveState();
  render();
});

document.getElementById('saveBtn').addEventListener('click', function () {
  if (!originalData) {
    alert('Сначала загрузите фото');
    return;
  }
  const link = document.createElement('a');
  link.download = 'edited.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
});

loadState();
updateControls();