
const imageInput = document.getElementById("imageInput");
const canvas = document.getElementById("imageCanvas");
const ctx = canvas.getContext("2d");

const baseColor = document.getElementById("baseColor");
const hexValue = document.getElementById("hexValue");
const palette = document.getElementById("palette");
const grayscale = document.getElementById("grayscale");

// HEXをRGBに変換
function hexToRgb(hex) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16)
  };
}

// RGBをHEXに変換
function rgbToHex(r, g, b) {
  return "#" + [r, g, b]
    .map(v => Math.round(v).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

// HSLをRGBに変換
function hslToRgb(h, s, l) {
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;

  let r = 0, g = 0, b = 0;

  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  return {
    r: (r + m) * 255,
    g: (g + m) * 255,
    b: (b + m) * 255
  };
}

// sRGBの相対輝度を計算
function luminance(rgb) {
  function linearize(value) {
    value /= 255;

    return value <= 0.04045
      ? value / 12.92
      : Math.pow((value + 0.055) / 1.055, 2.4);
  }

  return (
    0.2126 * linearize(rgb.r) +
    0.7152 * linearize(rgb.g) +
    0.0722 * linearize(rgb.b)
  );
}

// 相対輝度をグレースケール用のRGB値に変換
function luminanceToGray(value) {
  const encoded = value <= 0.0031308
    ? value * 12.92
    : 1.055 * Math.pow(value, 1 / 2.4) - 0.055;

  return Math.round(encoded * 255);
}

// 指定した色相・彩度で同じ輝度になる明るさを探す
function findMatchingColor(hue, saturation, target) {
  let low = 0;
  let high = 100;

  for (let i = 0; i < 25; i++) {
    const middle = (low + high) / 2;
    const rgb = hslToRgb(hue, saturation, middle);

    if (luminance(rgb) < target) {
      low = middle;
    } else {
      high = middle;
    }
  }

  const rgb = hslToRgb(
    hue,
    saturation,
    (low + high) / 2
  );

  return rgb;
}

// パレットを作る
function updatePalette() {
  const base = hexToRgb(baseColor.value);
  const target = luminance(base);

  hexValue.textContent = baseColor.value.toUpperCase();

  palette.innerHTML = "";
  grayscale.innerHTML = "";

  const grayValue = luminanceToGray(target);

  // 基準色のモノクロ表示
  const grayBox = document.createElement("div");
  grayBox.style.width = "100%";
  grayBox.style.height = "65px";
  grayBox.style.backgroundColor =
    `rgb(${grayValue}, ${grayValue}, ${grayValue})`;
  grayBox.style.borderRadius = "8px";
  grayBox.title = `グレー値: ${grayValue}`;

  grayscale.appendChild(grayBox);

  // 重複する色を防ぐ
  const usedColors = new Set();

  // 色相を5度ずつ、彩度を10%ずつ調べる
  for (let hue = 0; hue < 360; hue += 5) {
    for (let saturation = 10; saturation <= 100; saturation += 10) {
      const color = findMatchingColor(
        hue,
        saturation,
        target
      );

      const hex = rgbToHex(
        color.r,
        color.g,
        color.b
      );

      if (usedColors.has(hex)) continue;

      // 輝度が基準色と十分近いか確認
      const difference = Math.abs(
        luminance(color) - target
      );

      if (difference > 0.001) continue;

      usedColors.add(hex);

      // 色見本
      const swatch = document.createElement("button");

      swatch.style.backgroundColor = hex;
      swatch.style.border = "none";
      swatch.style.borderRadius = "7px";
      swatch.style.height = "65px";
      swatch.style.minWidth = "0";
      swatch.style.cursor = "pointer";
      swatch.style.color =
        luminance(color) > 0.35 ? "#222" : "#fff";
      swatch.style.fontSize = "10px";
      swatch.style.overflow = "hidden";
      swatch.textContent = hex;
      swatch.title = `${hex} / 色相 ${hue}° / 彩度 ${saturation}%`;

      // クリックすると基準色に設定
      swatch.addEventListener("click", () => {
        baseColor.value = hex;
        updatePalette();
      });

      // 右クリックでカラーコードをコピー
      swatch.addEventListener("contextmenu", event => {
        event.preventDefault();
        navigator.clipboard.writeText(hex);
      });

      palette.appendChild(swatch);
    }
  }
}

// 基準色を変更したとき
baseColor.addEventListener("input", updatePalette);

// 画像を読み込む
imageInput.addEventListener("change", event => {
  const file = event.target.files[0];
  if (!file) return;

  const image = new Image();

  image.onload = () => {
    const scale = Math.min(
      1,
      1000 / Math.max(image.width, image.height)
    );

    canvas.width = Math.round(image.width * scale);
    canvas.height = Math.round(image.height * scale);

    ctx.drawImage(
      image,
      0,
      0,
      canvas.width,
      canvas.height
    );

    canvas.style.display = "block";
    document.querySelector("#imageArea p").style.display = "none";

    URL.revokeObjectURL(image.src);
  };

  image.src = URL.createObjectURL(file);
});

// 画像をクリックして色を選ぶ
canvas.addEventListener("click", event => {
  const rect = canvas.getBoundingClientRect();

  const x = Math.floor(
    (event.clientX - rect.left) *
    canvas.width / rect.width
  );

  const y = Math.floor(
    (event.clientY - rect.top) *
    canvas.height / rect.height
  );

  const pixel = ctx.getImageData(x, y, 1, 1).data;

  baseColor.value = rgbToHex(
    pixel[0],
    pixel[1],
    pixel[2]
  );

  updatePalette();
});

// 最初の表示
updatePalette();
