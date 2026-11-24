
const imageInput = document.getElementById("imageInput");
const canvas = document.getElementById("imageCanvas");
const ctx = canvas.getContext("2d");

const baseColor = document.getElementById("baseColor");
const hexValue = document.getElementById("hexValue");
const palette = document.getElementById("palette");
const grayscale = document.getElementById("grayscale");

const jaButton = document.getElementById("jaButton");
const enButton = document.getElementById("enButton");

let currentLanguage = localStorage.getItem("lumamatch-language") || "ja";

const translations = {
  ja: {
    subtitle: "モノクロにしたとき、同じ明るさになる色を見つける",
    heading1: "1. 基準色を選ぶ",
    heading2: "2. 同じ輝度の色",
    heading3: "3. モノクロで比較",
    uploadButton: "画像を選択",
    noFile: "ファイルが選択されていません",
    imageMessage: "画像をここに読み込んでください",
    grayTitle: "グレー値",
    grayDescription: "基準色をグレースケールに変換した表示です。",
    hue: "色相",
    saturation: "彩度"
  },

  en: {
    subtitle: "Find colors that have the same brightness in grayscale",
    heading1: "1. Choose a Base Color",
    heading2: "2. Colors with Matching Brightness",
    heading3: "3. Grayscale Comparison",
    uploadButton: "Choose Image",
    noFile: "No file selected",
    imageMessage: "Load an image here",
    grayTitle: "Grayscale value",
    grayDescription: "Grayscale representation of the base color.",
    hue: "Hue",
    saturation: "Saturation"
  }
};

// 言語切り替え
function setLanguage(language) {
  currentLanguage = language;
  localStorage.setItem("lumamatch-language", language);

  const t = translations[language];

  document.documentElement.lang = language;

  document.getElementById("subtitle").textContent = t.subtitle;
  document.getElementById("heading1").textContent = t.heading1;
  document.getElementById("heading2").textContent = t.heading2;
  document.getElementById("heading3").textContent = t.heading3;

  document.getElementById("uploadButton").textContent = t.uploadButton;
  document.getElementById("grayDescription").textContent = t.grayDescription;

  if (!imageInput.files.length) {
    document.getElementById("fileName").textContent = t.noFile;
  }

  if (!canvas.width || !canvas.height) {
    document.getElementById("imageMessage").textContent = t.imageMessage;
  }

  jaButton.classList.toggle("active", language === "ja");
  enButton.classList.toggle("active", language === "en");

  updatePalette();
}

jaButton.addEventListener("click", () => setLanguage("ja"));
enButton.addEventListener("click", () => setLanguage("en"));

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

// sRGBの相対輝度
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

// 相対輝度をグレースケール値に変換
function luminanceToGray(value) {
  const encoded = value <= 0.0031308
    ? value * 12.92
    : 1.055 * Math.pow(value, 1 / 2.4) - 0.055;

  return Math.round(encoded * 255);
}

// 同じ輝度になる明るさを探す
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

  return hslToRgb(
    hue,
    saturation,
    (low + high) / 2
  );
}

// パレットを作る
function updatePalette() {
  const base = hexToRgb(baseColor.value);
  const target = luminance(base);
  const t = translations[currentLanguage];

  hexValue.textContent = baseColor.value.toUpperCase();

  palette.innerHTML = "";
  grayscale.innerHTML = "";

  const grayValue = luminanceToGray(target);

  // モノクロ表示
  const grayBox = document.createElement("div");
  grayBox.style.width = "100%";
  grayBox.style.height = "65px";
  grayBox.style.backgroundColor =
    `rgb(${grayValue}, ${grayValue}, ${grayValue})`;
  grayBox.style.borderRadius = "8px";
  grayBox.title = `${t.grayTitle}: ${grayValue}`;

  grayscale.appendChild(grayBox);

  const usedColors = new Set();

  // 色相5度ごと、彩度10%ごと
  for (let hue = 0; hue < 360; hue += 5) {
    for (let saturation = 10; saturation <= 100; saturation += 10) {
      const color = findMatchingColor(hue, saturation, target);

      const hex = rgbToHex(
        color.r,
        color.g,
        color.b
      );

      if (usedColors.has(hex)) continue;

      const difference = Math.abs(
        luminance(color) - target
      );

      if (difference > 0.001) continue;

      usedColors.add(hex);

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

      swatch.title =
        `${hex} / ${t.hue} ${hue}° / ${t.saturation} ${saturation}%`;

      swatch.addEventListener("click", () => {
        baseColor.value = hex;
        updatePalette();
      });

      swatch.addEventListener("contextmenu", event => {
        event.preventDefault();
        navigator.clipboard.writeText(hex);
      });

      palette.appendChild(swatch);
    }
  }
}

// 基準色の変更
baseColor.addEventListener("input", updatePalette);

// 画像ファイルの選択
imageInput.addEventListener("change", event => {
  const file = event.target.files[0];
  if (!file) return;

  document.getElementById("fileName").textContent = file.name;

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
    document.getElementById("imageMessage").style.display = "none";

    URL.revokeObjectURL(image.src);
  };

  image.onerror = () => {
    URL.revokeObjectURL(image.src);
    alert(
      currentLanguage === "ja"
        ? "画像を読み込めませんでした。"
        : "Could not load the image."
    );
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
setLanguage(currentLanguage);
