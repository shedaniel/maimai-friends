import { addRatingsAndSort, SongWithRating } from "./rating-calculator";
import { SnapshotWithSongs } from "./types";
import { createSafeMaimaiImageUrlAsync } from "./utils";
import { getCachedImagePath } from "./image_cacher";

// Helper function to detect if we're on the server
function isServer() {
  return typeof window === 'undefined';
}

export const getFabric = async () => {
  if (isServer()) {
    console.log('Loading Node.js Fabric...');
    const fabric = await import('fabric/node');
    return fabric;
  } else {
    console.log('Loading Browser Fabric...');
    const fabric = await import('fabric');
    return fabric;
  }
};

type FabricType = Awaited<ReturnType<typeof getFabric>>;
import type { FabricImage, FabricText, Gradient, Group, Rect, Shadow, StaticCanvas } from 'fabric';

const TARGET_HEIGHT = 204;
const PADDING = 36;

const FONT_FAMILY = 'Inter, Murecho, "Noto Sans JP"';
const FONT_FAMILY_MONO = 'Geist Mono, Inter, "Noto Sans JP"';

// Helper function to check if a URL is a data URL (base64)
function isDataUrl(url: string): boolean {
  return url.startsWith('data:');
}

// Relay method for FabricImage.fromURL that handles both client and server environments
async function fabricImageFromURL(
  fabric: FabricType,
  url: string, 
  options: any = {}, 
  fabricOptions: any = {}
): Promise<FabricImage> {
  if (isServer() && !isDataUrl(url)) {
    try {
      let finalUrl = url;
      
      // For maimaidx URLs, use caching system
      if (url.includes('maimaidx.jp') || url.includes('maimaidx-eng.com')) {
        finalUrl = await getCachedImagePath(url);
      }
      
      let buffer: Buffer;
      let contentType: string;

      if (finalUrl.startsWith('/')) {
        // Local file - read directly from filesystem
        console.log("reading local file", finalUrl);
        const fs = await import('fs/promises');
        const path = await import('path');
        
        // Convert URL path to filesystem path (remove leading /, add public/)
        const filePath = path.join(process.cwd(), 'public', finalUrl);
        
        buffer = await fs.readFile(filePath);
        
        // Determine content type from file extension
        const ext = path.extname(finalUrl).toLowerCase();
        contentType = ext === '.png' ? 'image/png' 
          : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg'
          : ext === '.gif' ? 'image/gif'
          : ext === '.webp' ? 'image/webp'
          : ext === '.svg' ? 'image/svg+xml'
          : 'image/png'; // default fallback
      } else {
        // Remote URL - fetch it
        console.log("fetching remote image", finalUrl);
        const { Agent } = await import('undici');
        const httpsAgent = new Agent({
          connect: {
            rejectUnauthorized: false
          }
        });
        const response = await fetch(finalUrl, {
          // @ts-ignore - dispatcher property exists but TypeScript doesn't recognize it
          dispatcher: httpsAgent,
        });
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.statusText}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
        contentType = response.headers.get('content-type') || 'image/png';
      }
      
      const base64 = `data:${contentType};base64,${buffer.toString('base64')}`;
      return fabric.FabricImage.fromURL(base64, options, fabricOptions);
    } catch (error) {
      console.error('Error loading image for server-side rendering:', error);
      throw error;
    }
  } else {
    // On client: use FabricImage.fromURL directly
    // Add crossOrigin: 'anonymous' if it's not a data URL and not already specified
    const finalOptions = { ...options };
    if (!isDataUrl(url) && !finalOptions.crossOrigin) {
      finalOptions.crossOrigin = 'anonymous';
    }
    
    const safeUrl = await createSafeMaimaiImageUrlAsync(url);
    return fabric.FabricImage.fromURL(safeUrl, finalOptions, fabricOptions);
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

export async function renderImage(canvas: StaticCanvas, data: SnapshotWithSongs) {
  const fabric = await getFabric();
  canvas.clear();

  await renderBackground(fabric, canvas, data);
  const { overlayRect } = await renderHeader(fabric, canvas, data);
  await renderContent(fabric, canvas, data, overlayRect);

  canvas.renderAll();
}

async function renderBackground(fabric: FabricType, canvas: StaticCanvas, data: SnapshotWithSongs) {
  const backgroundGradient = new fabric.Gradient({
    type: 'linear',
    coords: {
      x1: 0,
      y1: canvas.height,  // Start from bottom (0deg = vertical)
      x2: 0,
      y2: 0               // End at top
    },
    colorStops: (data.snapshot.gameVersion === 10 ? [
      { offset: 0, color: '#C0F4E2' },
      { offset: 1, color: '#96ADF5' },
    ] : data.snapshot.gameVersion === 11 ? [
      { offset: 0, color: '#9B71B6' },
      { offset: 1, color: '#E392A5' },
    ] : [])
  });

  const backgroundRect = new fabric.Rect({
    width: canvas.width,
    height: canvas.height,
    fill: backgroundGradient,
  });
  canvas.add(backgroundRect);
}

async function renderHeaderBackground(fabric: FabricType, canvas: StaticCanvas, data: SnapshotWithSongs, trophyBackground: FabricImage) {
  const INNER_PADDING = 30;

  const shineImg = await fabricImageFromURL(
    fabric, `/res/shine/${data.snapshot.gameVersion}.png`, {}, {
    opacity: 0.3,
  });
  shineImg.scaleToWidth(canvas.width);
  canvas.insertAt(1, shineImg);

  const cloudImg = await fabricImageFromURL(
    fabric, `/res/down/${data.snapshot.gameVersion}.png`, {}, {
    opacity: 0.2,
  });
  cloudImg.scaleToWidth(canvas.width);
  cloudImg.top = canvas.height - cloudImg.getScaledHeight() - PADDING;
  canvas.insertAt(1, cloudImg);

  const characterImg = await fabricImageFromURL(
    fabric, `/res/character/${data.snapshot.gameVersion}.png`, {}, data.snapshot.gameVersion === 10 ? {
    scaleX: 0.56,
    scaleY: 0.56,
    left: canvas.width - 580,
    top: -100,
    opacity: 0.9,
  } : data.snapshot.gameVersion === 11 ? {
    scaleX: 0.7,
    scaleY: 0.7,
    left: canvas.width - 520,
    top: -100,
    opacity: 0.9,
  } : {});
  characterImg.clipPath = new fabric.Rect({
    top: 0,
    left: 0,
    width: canvas.width,
    height: TARGET_HEIGHT + PADDING * 2,
    absolutePositioned: true,
  });

  canvas.insertAt(2, characterImg);

  const logoImg = await fabricImageFromURL(
    fabric, `/res/logo/${data.snapshot.gameVersion}.png`, {}, {
    shadow: new fabric.Shadow({
      color: '#FFFFFF50',
      blur: 32,
      offsetX: 0,
      offsetY: 0,
    }),
  });

  logoImg.scaleX = logoImg.scaleY = (TARGET_HEIGHT - INNER_PADDING * 2) / logoImg.height;
  logoImg.top = TARGET_HEIGHT - logoImg.getScaledHeight() / 2;
  // logoImg.left = canvas.width - (logoImg.width * logoImg.scaleX + PADDING + INNER_PADDING / 2);
  logoImg.left = canvas.width - (canvas.width - trophyBackground.left - trophyBackground.getScaledWidth()) / 2 - logoImg.getScaledWidth() / 2;
  logoImg.left = characterImg.left + characterImg.getScaledWidth() / 2 - logoImg.getScaledWidth() / 2;
  canvas.add(logoImg);
}

async function renderHeader(fabric: FabricType, canvas: StaticCanvas, data: SnapshotWithSongs): Promise<{
  overlayRect: Rect,
}> {
  const TROPHY_FONT_SIZE = 18, NAME_FONT_SIZE = 28;
  const PROFILE_IMG_RIGHT_MARGIN = 28;
  const TROPHY_BOTTOM_MARGIN = 20;

  const profileImg = await fabricImageFromURL(
    fabric, data.snapshot.iconUrl, {},
    {
      left: PADDING,
      top: PADDING,
    }
  )

  profileImg.scaleX = profileImg.scaleY = TARGET_HEIGHT / profileImg.height;
  canvas.add(profileImg);

  const trophyBackground = await fabricImageFromURL(
    fabric, '/res/trophy/normal.png', {}, {
    scaleX: 1.6,
    scaleY: 1.6,
    left: PADDING + PROFILE_IMG_RIGHT_MARGIN + profileImg.getScaledWidth(),
    top: PADDING,
  });
  canvas.add(trophyBackground);

  const trophyText = new fabric.FabricText(data.snapshot.title, {
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
  trophyText.left += trophyBackground.getScaledWidth() / 2 - trophyText.getLineWidth(0) / 2;
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

  const nameText = new fabric.FabricText(data.snapshot.displayName, {
    fontSize: NAME_FONT_SIZE,
    fill: '#f9f0f4',
    fontWeight: 'bold',
    fontFamily: 'Inter, "Noto Sans JP"',
    left: nameRect.left,
    top: nameRect.top + nameRect.getScaledHeight() / 2 - NAME_FONT_SIZE / 2,
    textAlign: 'center',
  });
  nameText.left += trophyBackground.getScaledWidth() / 2 - nameText.getLineWidth(0) / 2;
  canvas.add(nameText);

  const ratingFrame = await fabricImageFromURL(
    fabric, getRatingImageUrl(data.snapshot.rating), {}, {
    scaleX: 0.75,
    scaleY: 0.75,
    left: nameRect.left - 2,
    top: nameRect.top + nameRect.getScaledHeight() + TROPHY_BOTTOM_MARGIN - 2,
  });

  canvas.add(ratingFrame);

  let left = ratingFrame.left + ratingFrame.getScaledWidth() * 0.43;
  for (const char of data.snapshot.rating.toString()) {
    canvas.add(new fabric.FabricText(char, {
      fontSize: ratingFrame.getScaledHeight() * 0.53,
      fill: '#f9f0f4',
      fontWeight: '400',
      fontFamily: FONT_FAMILY_MONO,
      left: left,
      top: ratingFrame.top + ratingFrame.getScaledHeight() * 0.24,
    }));
    left += 23;
  }

  const classRankImg = await fabricImageFromURL(
    fabric, data.snapshot.classRankUrl, {}, {
    scaleX: 0.7,
    scaleY: 0.7,
    left: ratingFrame.left + ratingFrame.getScaledWidth() + 10,
    top: ratingFrame.top + ratingFrame.getScaledHeight() / 2,
    originY: 'center',
  })
  canvas.add(classRankImg);

  const courseRankImg = await fabricImageFromURL(
    fabric, data.snapshot.courseRankUrl, {}, {
    scaleX: 0.6,
    scaleY: 0.6,
    left: classRankImg.left + classRankImg.getScaledWidth() + 10,
    top: ratingFrame.top + ratingFrame.getScaledHeight() / 2,
    originY: 'center',
  });
  canvas.add(courseRankImg);

  await renderHeaderBackground(fabric, canvas, data, trophyBackground);

  const darkGradient = new fabric.Gradient({
    type: 'linear',
    coords: {
      x1: 0,
      y1: canvas.height,
      x2: 0,
      y2: 0
    },
    colorStops: [
      { offset: 1, color: '#00000020' },
      { offset: 0, color: '#00000030' },
    ]
  });

  const overlayRect = new fabric.Rect({
    width: canvas.width - PADDING * 2,
    height: canvas.height - TARGET_HEIGHT - PADDING * 3,
    fill: darkGradient,
    left: PADDING,
    top: TARGET_HEIGHT + PADDING * 2,
    rx: 10 + 24 - 4,
    ry: 10 + 24 - 4,
  });

  // canvas.add(overlayRect);

  canvas.add(new fabric.Rect({
    width: canvas.width,
    height: canvas.height - overlayRect.top,
    fill: darkGradient,
    left: 0,
    top: overlayRect.top,
  }));

  return {
    overlayRect,
  }
}

const SONG_OUTER_PADDING = 0
const SONG_PADDING = 16

async function renderSong(fabric: FabricType, canvas: StaticCanvas, overlayRect: Rect, song: SongWithRating, index: number, yOffset: number) {
  const difficultyColor = song.difficulty === "basic" ? "green" :
  song.difficulty === "advanced" ? "yellow" :
    song.difficulty === "expert" ? "#d13b42" :
      song.difficulty === "master" ? "#8729cf" :
        song.difficulty === "remaster" ? "#E8D4FF" :
          song.difficulty === "utage" ? "pink" :
            "white"
  
  const img = await fabricImageFromURL(fabric, song.cover);

  img.scaleToWidth((overlayRect.width - SONG_OUTER_PADDING * 2 - SONG_PADDING * 4) / 5);
  const requiredHeight = img.getScaledWidth() / 16 * 11;

  img.top = overlayRect.top + SONG_OUTER_PADDING + yOffset + Math.floor(index / 5) * (requiredHeight + 2 + SONG_PADDING);
  img.left = overlayRect.left + SONG_OUTER_PADDING + (index % 5) * (img.getScaledWidth() + SONG_PADDING);

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
      { offset: 0, color: '#000000CC' },
      { offset: 0.5, color: '#00000099' },
      { offset: 1, color: '#0000004C' },
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

  const ratingText = new fabric.FabricText(song.rating.toString(), {
    fontSize: 20,
    fill: '#dcdcdc',
    fontWeight: '600',
    fontFamily: FONT_FAMILY_MONO,
    left: realBounds.left + realBounds.width - 8,
    top: realBounds.top + realBounds.height - 10,
    originX: 'right',
    originY: 'bottom',
  })

  const achievementText = new fabric.FabricText((song.achievement / 10000).toFixed(4) + '%', {
    fontSize: 12,
    fill: '#dcdcdc',
    fontWeight: '400',
    fontFamily: FONT_FAMILY_MONO,
    left: realBounds.left + 14,
    top: realBounds.top + realBounds.height - 14,
    originX: 'left',
    originY: 'bottom',
  })

  const songNameText = new fabric.FabricText(song.songName, {
    fontSize: 16,
    fill: '#dcdcdc',
    fontWeight: '600',
    fontFamily: FONT_FAMILY,
    charSpacing: 24,
    left: realBounds.left + 14,
    top: achievementText.top - achievementText.getScaledHeight() - 8,
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
  })

  const songDifficultyText = new fabric.FabricText((song.levelPrecise / 10).toFixed(1), {
    fontSize: 14,
    fill: '#dcdcdc',
    fontWeight: '400',
    fontFamily: FONT_FAMILY,
    left: realBounds.left + realBounds.width - 10,
    top: realBounds.top + 6,
    originX: 'right',
    originY: 'top',
  })

  const songDifficultyTextBg = new fabric.Rect({
    width: songDifficultyText.getScaledWidth() + 23,
    height: songDifficultyText.getScaledHeight() + 10,
    fill: difficultyColor,
    left: realBounds.left + realBounds.width - songDifficultyText.getScaledWidth() - 22,
    top: realBounds.top - 1,
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
      top: songDifficultyTextBg.top + songDifficultyTextBg.getScaledHeight() - 16,
      left: songDifficultyTextBg.left + songDifficultyTextBg.getScaledWidth() - 16,
      width: 16,
      height: 16,
    })
  ], {
    absolutePositioned: true,
  })

  const songTypeBadgeImg = await fabricImageFromURL(
    fabric,
    song.type === "dx"
      ? "https://maimaidx.jp/maimai-mobile/img/music_dx.png"
      : "https://maimaidx.jp/maimai-mobile/img/music_standard.png"
    , {}, {
    scaleX: 0.4,
    scaleY: 0.4,
    left: realBounds.left + 14,
    top: realBounds.top + 14,
  })

  canvas.add(cover);
  canvas.add(ratingText);
  canvas.add(achievementText);
  canvas.add(songNameText);
  canvas.add(songDifficultyTextBg);
  canvas.add(songDifficultyText);
  canvas.add(songTypeBadgeImg);
}

async function renderContent(fabric: FabricType, canvas: StaticCanvas, data: SnapshotWithSongs, overlayRect: Rect) {
  const songs = addRatingsAndSort(data.songs);
  const newSongs = songs.filter(song => song.addedVersion === data.snapshot.gameVersion);
  const oldSongs = songs.filter(song => song.addedVersion !== data.snapshot.gameVersion);

  const newSongsB15 = newSongs.slice(0, 15);
  const oldSongsB35 = oldSongs.slice(0, 35);

  // Use proper async iteration for server-side reliability
  for (let i = 0; i < newSongsB15.length; i++) {
    await renderSong(fabric, canvas, overlayRect, newSongsB15[i], i, 32);
  }

  for (let i = 0; i < oldSongsB35.length; i++) {
    await renderSong(fabric, canvas, overlayRect, oldSongsB35[i], i + 15, 74);
  }
}