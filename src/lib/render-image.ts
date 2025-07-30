import { addRatingsAndSort, SongWithRating } from "./rating-calculator";
import { SnapshotWithSongs } from "./types";
import { createSafeMaimaiImageUrlAsync } from "./utils";
import { fabric } from 'fabric';

// Helper function to detect if we're on the server
function isServer() {
  return typeof window === 'undefined';
}

export const CANVAS_WIDTH = 1200;
export const CANVAS_HEIGHT = 2100;

const TARGET_HEIGHT = 204;
const PADDING = 36;

const FONT_FAMILY = 'Inter, Murecho, "Noto Sans JP"';
const FONT_FAMILY_MONO = '"Geist Mono"';

// Helper function to check if a URL is a data URL (base64)
function isDataUrl(url: string): boolean {
  return url.startsWith('data:');
}

// Relay method for FabricImage.fromURL that handles both client and server environments
async function fabricImageFromURL(
  url: string, 
  fabricOptions: any = {}
): Promise<fabric.Image> {
  if (isServer() && !isDataUrl(url)) {
    // Use server-only module for Node.js-specific logic
    const { fabricImageFromURLServer } = await import('./render-image-server');
    return fabricImageFromURLServer(url, fabricOptions);
  } else {
    // On client: use FabricImage.fromURL directly
    // Add crossOrigin: 'anonymous' if it's not a data URL and not already specified
    const finalOptions = { ...fabricOptions };
    if (!isDataUrl(url) && !finalOptions.crossOrigin) {
      finalOptions.crossOrigin = 'anonymous';
    }
    
    const safeUrl = await createSafeMaimaiImageUrlAsync(url);
    return new Promise((resolve) => {
      fabric.Image.fromURL(safeUrl, image => resolve(image), finalOptions)!
    });
  }
}

export function getRatingImageUrl(rating: number) {
  const variant = rating >= 15000 ? "rainbow"
    : rating >= 14500 ? "platinum"
      : rating >= 14000 ? "gold"
        : rating >= 13000 ? "silver"
          : rating >= 12000 ? "bronze"
            : rating >= 10000 ? "purple"
              : rating >= 7000 ? "red"
                : rating >= 4000 ? "yellow"
                  : rating >= 2000 ? "green"
                    : rating >= 1 ? "blue"
                      : "white";

  return `https://maimaidx.jp/maimai-mobile/img/rating_base_${variant}.png?ver=1.55`;
}

export async function renderImage(canvas: fabric.StaticCanvas, data: SnapshotWithSongs, visitableProfileAt: string | null) {
  canvas.clear();

  // Load fonts before rendering
  await loadFonts();

  await renderBackground(canvas, data);
  const { overlayRect } = await renderHeader(canvas, data);
  await renderContent(canvas, data, overlayRect);
  await renderFooter(canvas, data, visitableProfileAt);

  canvas.renderAll();
}

async function loadFonts() {
  // Skip font loading on server side
  if (isServer()) {
    return;
  }

  try {
    // Get base URL for font loading
    const baseUrl = typeof window !== 'undefined' && window.location 
      ? `${window.location.protocol}//${window.location.host}`
      : 'http://localhost:3000';

    // Font URL map
    const urlMap = {
      Inter: `url(${baseUrl}/res/fonts/Inter-VariableFont_opsz,wght.woff2)`,
      Murecho: `url(${baseUrl}/res/fonts/Murecho-VariableFont_wght.woff2)`,
      GeistMono: `url(${baseUrl}/res/fonts/GeistMono-VariableFont_wght.woff2)`,
      NotoSansJP: `url(${baseUrl}/res/fonts/NotoSansJP-VariableFont_wght.woff2)`,
    };

    // Create FontFace instances
    const fontInter = new FontFace('Inter', urlMap.Inter, {
      style: 'normal',
      weight: '100 900', // Variable font weight range
    });

    const fontMurecho = new FontFace('Murecho', urlMap.Murecho, {
      style: 'normal',
      weight: '100 900', // Variable font weight range
    });

    const fontGeistMono = new FontFace('Geist Mono', urlMap.GeistMono, {
      style: 'normal',
      weight: '100 900', // Variable font weight range
    });

    const fontNotoSansJP = new FontFace('Noto Sans JP', urlMap.NotoSansJP, {
      style: 'normal',
      weight: '100 900', // Variable font weight range
    });

    // Load all fonts
    console.log('🔤 Loading fonts for canvas rendering...');
    await Promise.all([
      fontInter.load().then(font => {
        document.fonts.add(font);
        console.log('✅ Inter font loaded');
      }),
      fontMurecho.load().then(font => {
        document.fonts.add(font);
        console.log('✅ Murecho font loaded');
      }),
      fontGeistMono.load().then(font => {
        document.fonts.add(font);
        console.log('✅ Geist Mono font loaded');
      }),
      fontNotoSansJP.load().then(font => {
        document.fonts.add(font);
        console.log('✅ Noto Sans JP font loaded');
      }),
    ]);

    console.log('✅ All fonts loaded successfully for canvas rendering');
    
    // Small delay to ensure fonts are available to fabric.js
    await new Promise(resolve => setTimeout(resolve, 100));
    
  } catch (error) {
    console.warn('⚠️ Font loading failed, continuing with fallback fonts:', error);
  }
}

async function renderBackground(canvas: fabric.StaticCanvas, data: SnapshotWithSongs) {
  const backgroundGradient = new fabric.Gradient({
    type: 'linear',
    coords: {
      x1: 0,
      y1: CANVAS_HEIGHT,  // Start from bottom (0deg = vertical)
      x2: 0,
      y2: 0               // End at top
    },
    colorStops: (data.snapshot.gameVersion === 10 ? [
      { offset: 0, color: '#C0F4E2' },
      { offset: 1, color: '#BFCCF2' },
    ] : data.snapshot.gameVersion === 11 ? [
      { offset: 0, color: '#F6D7FC' },
      { offset: 1, color: '#F5BAC8' },
    ] : [])
  });

  const backgroundRect = new fabric.Rect({
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    fill: backgroundGradient,
  });
  canvas.add(backgroundRect);
}

async function renderHeaderBackground(canvas: fabric.StaticCanvas, data: SnapshotWithSongs, trophyBackground: fabric.Image) {
  const INNER_PADDING = 30;

  const shineImg = await fabricImageFromURL(
    `/res/shine/${data.snapshot.gameVersion}.png`, {
    opacity: 0.3,
  });
  shineImg.scaleToWidth(CANVAS_WIDTH);
  canvas.insertAt(shineImg, 1, false);

  const cloudImg = await fabricImageFromURL(
    `/res/down/${data.snapshot.gameVersion}.png`, {
    opacity: 0.4,
  });
  cloudImg.scaleToWidth(CANVAS_WIDTH);
  cloudImg.top = CANVAS_HEIGHT - cloudImg.getScaledHeight() - PADDING;
  canvas.insertAt(cloudImg, 1, false);

  const characterImg = await fabricImageFromURL(
    `/res/character/${data.snapshot.gameVersion}.png`, data.snapshot.gameVersion === 10 ? {
    scaleX: 0.56,
    scaleY: 0.56,
    left: CANVAS_WIDTH - 580,
    top: -100,
    opacity: 0.9,
  } : data.snapshot.gameVersion === 11 ? {
    scaleX: 0.7,
    scaleY: 0.7,
    left: CANVAS_WIDTH - 520,
    top: -100,
    opacity: 0.9,
  } : {});
  characterImg.clipPath = new fabric.Rect({
    top: 0,
    left: 0,
    width: CANVAS_WIDTH,
    height: TARGET_HEIGHT + PADDING * 2,
    absolutePositioned: true,
  });

  canvas.insertAt(characterImg, 2, false);

  const logoImg = await fabricImageFromURL(
    `/res/logo/${data.snapshot.gameVersion}.png`, {
    shadow: new fabric.Shadow({
      color: '#FFFFFF50',
      blur: 32,
      offsetX: 0,
      offsetY: 0,
    }),
  });

  logoImg.scaleX = logoImg.scaleY = (TARGET_HEIGHT - INNER_PADDING * 2) / logoImg.height!;
  logoImg.top = TARGET_HEIGHT - logoImg.getScaledHeight() / 2;
  // logoImg.left = canvas.width - (logoImg.width * logoImg.scaleX + PADDING + INNER_PADDING / 2);
  logoImg.left = CANVAS_WIDTH - (CANVAS_WIDTH - trophyBackground.left! - trophyBackground.getScaledWidth()) / 2 - logoImg.getScaledWidth() / 2;
  logoImg.left = characterImg.left! + characterImg.getScaledWidth()! / 2 - logoImg.getScaledWidth() / 2;
  canvas.add(logoImg);
}

async function renderHeader(canvas: fabric.StaticCanvas, data: SnapshotWithSongs): Promise<{
  overlayRect: fabric.Rect,
}> {
  const TROPHY_FONT_SIZE = 18, NAME_FONT_SIZE = 28;
  const PROFILE_IMG_RIGHT_MARGIN = 28;
  const TROPHY_BOTTOM_MARGIN = 20;

  const profileImg = await fabricImageFromURL(
    data.snapshot.iconUrl,
    {
      left: PADDING,
      top: PADDING,
    }
  )

  profileImg.scaleX = profileImg.scaleY = TARGET_HEIGHT / profileImg.height!;
  canvas.add(profileImg);

  const trophyBackground = await fabricImageFromURL(
    '/res/trophy/normal.png', {
    scaleX: 1.6,
    scaleY: 1.6,
    left: PADDING + PROFILE_IMG_RIGHT_MARGIN + profileImg.getScaledWidth(),
    top: PADDING,
  });
  canvas.add(trophyBackground);

  const trophyText = new fabric.Text(data.snapshot.title, {
    fontSize: TROPHY_FONT_SIZE,
    fill: 'white',
    stroke: '#111111',
    strokeWidth: 4,
    paintFirst: 'stroke',
    fontWeight: '450',
    fontFamily: FONT_FAMILY,
    left: PADDING + PROFILE_IMG_RIGHT_MARGIN + profileImg.getScaledWidth(),
    top: PADDING + trophyBackground.getScaledHeight() / 2 - TROPHY_FONT_SIZE / 2 - 2,
    textAlign: 'center',
  });
  trophyText.left! += trophyBackground.getScaledWidth()! / 2 - trophyText.getLineWidth(0) / 2;
  canvas.add(trophyText);

  const nameRect = new fabric.Rect({
    width: trophyBackground.getScaledWidth(),
    height: trophyBackground.getScaledHeight() + NAME_FONT_SIZE,
    fill: 'black',
    opacity: 0.2,
    left: PADDING + PROFILE_IMG_RIGHT_MARGIN + profileImg.getScaledWidth(),
    top: PADDING + trophyBackground.getScaledHeight() + TROPHY_BOTTOM_MARGIN,
    rx: 10,
    ry: 10,
  });

  canvas.add(nameRect);

  const nameText = new fabric.Text(data.snapshot.displayName, {
    fontSize: NAME_FONT_SIZE,
    fill: '#f9f0f4',
    fontWeight: 600,
    fontFamily: FONT_FAMILY,
    left: nameRect.left!,
    top: nameRect.top! + nameRect.getScaledHeight() / 2 - NAME_FONT_SIZE / 2,
    textAlign: 'center',
  });
  nameText.left! += trophyBackground.getScaledWidth()! / 2 - nameText.getLineWidth(0)! / 2;
  canvas.add(nameText);

  const ratingFrame = await fabricImageFromURL(
    getRatingImageUrl(data.snapshot.rating), {
    scaleX: 0.75,
    scaleY: 0.75,
    left: nameRect.left! - 2,
    top: nameRect.top! + nameRect.getScaledHeight() + TROPHY_BOTTOM_MARGIN - 2,
  });

  canvas.add(ratingFrame);

  let left = ratingFrame.left! + ratingFrame.getScaledWidth() * 0.43;
  for (const char of data.snapshot.rating.toString()) {
    canvas.add(new fabric.Text(char, {
      fontSize: ratingFrame.getScaledHeight() * 0.53,
      fill: '#f9f0f4',
      fontWeight: '600',
      fontFamily: FONT_FAMILY_MONO,
      left: left,
      top: ratingFrame.top! + ratingFrame.getScaledHeight()! * 0.225,
    }));
    left += 23;
  }

  const classRankImg = await fabricImageFromURL(
    data.snapshot.classRankUrl, {
    scaleX: 0.7,
    scaleY: 0.7,
    left: ratingFrame.left! + ratingFrame.getScaledWidth()! + 10,
    top: ratingFrame.top! + ratingFrame.getScaledHeight()! / 2,
    originY: 'center',
  })
  canvas.add(classRankImg);

  const courseRankImg = await fabricImageFromURL(
    data.snapshot.courseRankUrl, {
    scaleX: 0.6,
    scaleY: 0.6,
    left: classRankImg.left! + classRankImg.getScaledWidth()! + 10,
    top: ratingFrame.top! + ratingFrame.getScaledHeight()! / 2,
    originY: 'center',
  });
  canvas.add(courseRankImg);

  await renderHeaderBackground(canvas, data, trophyBackground);

  const darkGradient = new fabric.Gradient({
    type: 'linear',
    coords: {
      x1: 0,
      y1: CANVAS_HEIGHT,
      x2: 0,
      y2: 0
    },
    colorStops: [
      { offset: 1, color: '#00000015' },
      { offset: 0, color: '#00000020' },
    ]
  });

  const overlayRect = new fabric.Rect({
    width: CANVAS_WIDTH - PADDING * 2,
    height: CANVAS_HEIGHT - TARGET_HEIGHT - PADDING * 3,
    fill: darkGradient,
    left: PADDING,
    top: TARGET_HEIGHT + PADDING * 2,
    rx: 10 + 24 - 4,
    ry: 10 + 24 - 4,
  });

  // canvas.add(overlayRect);

  canvas.add(new fabric.Rect({
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT - overlayRect.top!,
    fill: darkGradient,
    left: 0,
    top: overlayRect.top!,
  }));

  return {
    overlayRect,
  }
}

const SONG_OUTER_PADDING = 0
const SONG_PADDING = 16

async function renderSong(canvas: fabric.StaticCanvas, overlayRect: fabric.Rect, song: SongWithRating, index: number, yOffset: number) {
  const difficultyColor = song.difficulty === "basic" ? "green" :
  song.difficulty === "advanced" ? "yellow" :
    song.difficulty === "expert" ? "#d13b42" :
      song.difficulty === "master" ? "#8729cf" :
        song.difficulty === "remaster" ? "#E8D4FF" :
          song.difficulty === "utage" ? "pink" :
            "white"
  
  const img = await fabricImageFromURL(song.cover);

  img.scaleToWidth((overlayRect.width! - SONG_OUTER_PADDING * 2 - SONG_PADDING * 4) / 5);
  const requiredHeight = img.getScaledWidth() / 16 * 11;

  img.top = overlayRect.top! + SONG_OUTER_PADDING + yOffset + Math.floor(index / 5) * (requiredHeight + 2 + SONG_PADDING);
  img.left = overlayRect.left! + SONG_OUTER_PADDING + (index % 5) * (img.getScaledWidth() + SONG_PADDING);
  
  const realBounds = {
    top: img.top,
    left: img.left,
    width: img.getScaledWidth(),
    height: requiredHeight,
  }

  img.top -= (img.getScaledHeight() - requiredHeight) / 2;
  img.clipPath = new fabric.Rect({
    top: img.top + (img.getScaledHeight() - requiredHeight) / 2,
    left: img.left,
    width: img.getScaledWidth(),
    height: requiredHeight,
    absolutePositioned: true,
    rx: 10,
    ry: 10,
  });

  canvas.add(img);

  const coverGradient = new fabric.Gradient({
    type: 'linear',
    coords: {
      x1: 0,
      y1: realBounds.height,
      x2: 0,
      y2: 0,
    },
    colorStops: [
      { offset: 0, color: '#000000AC' },
      { offset: 0.5, color: '#00000069' },
      { offset: 1, color: '#0000005C' },
    ]
  });

  const cover = new fabric.Rect({
    width: realBounds.width,
    height: realBounds.height,
    fill: coverGradient,
    left: realBounds.left,
    top: realBounds.top,
    rx: 10,
    ry: 10,
    stroke: difficultyColor,
    strokeWidth: 4,
    shadow: new fabric.Shadow({
      color: '#00000016',
      blur: 10,
      offsetX: 2,
      offsetY: 2,
    }),
  })

  const ratingText = new fabric.Text(song.rating.toString(), {
    fontSize: 20,
    fill: '#dcdcdc',
    fontWeight: '600',
    fontFamily: FONT_FAMILY_MONO,
    left: realBounds.left + realBounds.width - 8,
    top: realBounds.top + realBounds.height - 10,
    originX: 'right',
    originY: 'bottom',
    shadow: new fabric.Shadow({
      color: '#000000AA',
      blur: 10,
      offsetX: 2,
      offsetY: 2,
    }),
  })

  const achievementText = new fabric.Text((song.achievement / 10000).toFixed(4) + '%', {
    fontSize: 12,
    fill: '#dcdcdc',
    fontWeight: '400',
    fontFamily: FONT_FAMILY_MONO,
    left: realBounds.left + 14,
    top: realBounds.top + realBounds.height - 14,
    originX: 'left',
    originY: 'bottom',
    shadow: new fabric.Shadow({
      color: '#000000AA',
      blur: 10,
      offsetX: 2,
      offsetY: 2,
    }),
  })

  const songNameText = new fabric.Text(song.songName, {
    fontSize: 16,
    fill: '#dcdcdc',
    fontWeight: '600',
    fontFamily: FONT_FAMILY,
    charSpacing: 24,
    left: realBounds.left + 14,
    top: achievementText.top! - achievementText.getScaledHeight() - 8,
    width: realBounds.width - 28,
    originX: 'left',
    originY: 'bottom',
    clipPath: new fabric.Rect({
      top: realBounds.top + 14,
      left: realBounds.left + 14,
      width: realBounds.width - 28,
      height: realBounds.height - 28,
      absolutePositioned: true,
    }),
    shadow: new fabric.Shadow({
      color: '#000000AA',
      blur: 10,
      offsetX: 2,
      offsetY: 2,
    }),
  })

  const songDifficultyText = new fabric.Text((song.levelPrecise / 10).toFixed(1), {
    fontSize: 14,
    fill: song.difficulty === "remaster" ? "#591a8b" : "#dcdcdc",
    fontWeight: '500',
    fontFamily: FONT_FAMILY_MONO,
    left: realBounds.left + realBounds.width - 10,
    top: realBounds.top + 6,
    originX: 'right',
    originY: 'top',
    charSpacing: -10,
  })

  const songDifficultyTextBg = new fabric.Rect({
    width: songDifficultyText.getScaledWidth() + 23,
    height: songDifficultyText.getScaledHeight() + 10,
    fill: difficultyColor,
    left: realBounds.left + realBounds.width - songDifficultyText.getScaledWidth() - 22,
    top: realBounds.top,
  })

  songDifficultyTextBg.clipPath = new fabric.Group([
    new fabric.Rect({
      top: songDifficultyTextBg.top,
      left: songDifficultyTextBg.left,
      width: songDifficultyTextBg.getScaledWidth(),
      height: songDifficultyTextBg.getScaledHeight(),
      rx: 16,
      ry: 16,
    }),
    new fabric.Rect({
      top: songDifficultyTextBg.top,
      left: songDifficultyTextBg.left,
      width: 16,
      height: 16,
    }),
    new fabric.Rect({
      top: songDifficultyTextBg.top! + songDifficultyTextBg.getScaledHeight() - 16,
      left: songDifficultyTextBg.left! + songDifficultyTextBg.getScaledWidth() - 16,
      width: 16,
      height: 16,
    })
  ], {
    absolutePositioned: true,
  })

  const songTypeBadgeImg = await fabricImageFromURL(
    song.type === "dx"
      ? "https://maimaidx.jp/maimai-mobile/img/music_dx.png"
      : "https://maimaidx.jp/maimai-mobile/img/music_standard.png"
    , {
    scaleX: 0.4,
    scaleY: 0.4,
    left: realBounds.left + 14,
    top: realBounds.top + 14,
  })

  canvas.add(new fabric.Group([
    cover,
    ratingText,
    achievementText,
    songNameText,
    songDifficultyTextBg,
    songDifficultyText,
    songTypeBadgeImg,
  ]))
}

async function renderContent(canvas: fabric.StaticCanvas, data: SnapshotWithSongs, overlayRect: fabric.Rect) {
  const songs = addRatingsAndSort(data.songs);
  const newSongs = songs.filter(song => song.addedVersion === data.snapshot.gameVersion);
  const oldSongs = songs.filter(song => song.addedVersion !== data.snapshot.gameVersion);

  const newSongsB15 = newSongs.slice(0, 15);
  const oldSongsB35 = oldSongs.slice(0, 35);

  const promises = [];

  // Use proper async iteration for server-side reliability
  for (let i = 0; i < newSongsB15.length; i++) {
    promises.push(renderSong(canvas, overlayRect, newSongsB15[i], i, 60));
  }

  for (let i = 0; i < oldSongsB35.length; i++) {
    promises.push(renderSong(canvas, overlayRect, oldSongsB35[i], i + 15, 110));
  }

  await Promise.all(promises);

  await renderSongsLabel(canvas, overlayRect, true, 24);
  await renderSongsLabel(canvas, overlayRect, false, 566);
}

async function renderSongsLabel(canvas: fabric.StaticCanvas, overlayRect: fabric.Rect, newSongs: boolean, yOffset: number) {
  const label = await fabricImageFromURL(
    newSongs
      ? "/res/label/new.png"
      : "/res/label/old.png"
    , {
    scaleX: 0.26,
    scaleY: 0.26,
    top: overlayRect.top! + yOffset,
    left: overlayRect.left! + 2,
    opacity: 0.98,
    shadow: new fabric.Shadow({
      color: '#00000010',
      blur: 30,
      offsetX: 0,
      offsetY: 0,
    }),
  });

  canvas.add(label);
}

async function renderFooter(canvas: fabric.StaticCanvas, data: SnapshotWithSongs, visitableProfileAt: string | null) {
  const rect = new fabric.Rect({
    width: CANVAS_WIDTH,
    height: 50,
    fill: '#00000020',
    left: 0,
    top: CANVAS_HEIGHT - 50,
  });

  const text = new fabric.Text(visitableProfileAt ? `Visit my profile at https://tomomai.lol/profile/${visitableProfileAt}/` : "Generated with https://tomomai.lol/", {
    fontSize: 16,
    fill: '#f9f0f4',
    fontWeight: 500,
    fontFamily: FONT_FAMILY,
    left: 15,
    top: rect.top! + 15,
    charSpacing: 40,
    opacity: 0.86,
  });

  const dateText = new fabric.Text("at " + new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), {
    fontSize: 16,
    fill: '#f9f0f4',
    fontWeight: 400,
    fontFamily: FONT_FAMILY,
    left: CANVAS_WIDTH - 15,
    top: rect.top! + 15,
    charSpacing: 40,
    opacity: 0.86,
    originX: 'right',
  });

  canvas.add(new fabric.Group([rect, text, dateText]));
}