import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // console.log('🚀 Starting export-image API request');
  try {
    const { snapshotId } = await request.json();
    // console.log('📋 Received snapshot ID:', snapshotId);
    
    if (!snapshotId) {
      console.error('❌ No snapshot ID provided');
      return NextResponse.json({ error: 'Snapshot ID is required' }, { status: 400 });
    }
    
    // Launch Puppeteer browser following Vercel's recommended pattern
    // console.log('🌐 Launching Puppeteer browser...');
    const browserStartTime = Date.now();
    
    const isVercel = !!process.env.VERCEL_ENV;
    let puppeteer: any;
    let launchOptions: any = {
      headless: true,
    };

    if (isVercel) {
      // Production: Use puppeteer-core with Sparticuz Chromium
      const chromium = (await import('@sparticuz/chromium')).default;
      puppeteer = await import('puppeteer-core');
      launchOptions = {
        ...launchOptions,
        args: [...chromium.args, '--disable-web-security'],
        executablePath: await chromium.executablePath(),
      };
    } else {
      // Development: Use regular puppeteer
      puppeteer = await import('puppeteer');
      launchOptions = {
        ...launchOptions,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--enable-font-antialiasing',
        ],
      };
    }

    const browser = await puppeteer.launch(launchOptions);
    // console.log(`✅ Browser launched in ${Date.now() - browserStartTime}ms`);

    try {
      // console.log('📄 Creating new page...');
      const page = await browser.newPage();

      // Set viewport to ensure consistent rendering
      // console.log('📐 Setting viewport...');
      await page.setViewport({
        width: 1400,
        height: 2200,
        deviceScaleFactor: 2,
      });
      
      // Enable console logging from the page
      page.on('console', (msg: any) => {
        // console.log('🖥️ Browser console:', msg.type(), msg.text());
      });
      
      // Log page errors
      page.on('pageerror', (err: Error) => {
        console.error('❌ Page error:', err.message);
      });
      
      // Log failed requests
      page.on('requestfailed', (req: any) => {
        console.error('🚫 Request failed:', req.url(), req.failure()?.errorText);
      });

      // Construct the URL for our rendering page
      const renderUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/render-image?snapshotId=${snapshotId}`;

      // console.log('🔗 Render URL:', renderUrl);

      // Navigate to the rendering page
      // console.log('🧭 Navigating to render page...');
      const navStartTime = Date.now();
      await page.goto(renderUrl, { 
        waitUntil: 'networkidle0',
        timeout: 60000 // Increase navigation timeout
      });
      // console.log(`✅ Navigation completed in ${Date.now() - navStartTime}ms`);

      // Check if page loaded successfully
      const title = await page.title();
      // console.log('📋 Page title:', title);

      // Wait for rendering to complete
      // console.log('⏳ Waiting for rendering to complete...');
      const renderStartTime = Date.now();
      
      try {
        await page.waitForFunction(() => (window as any).renderComplete === true, { 
          timeout: 45000, // Increase render timeout
          polling: 1000   // Check every second
        });
        // console.log(`✅ Rendering completed in ${Date.now() - renderStartTime}ms`);
      } catch (timeoutError) {
        console.error('⏰ Rendering timeout after 45s');
        
        // Try to get more info about the current state
        const renderStatus = await page.evaluate(() => {
          return {
            renderComplete: (window as any).renderComplete,
            canvasPresent: !!document.querySelector('canvas'),
            fabricLoaded: !!(window as any).fabric,
            anyErrors: (window as any).lastError,
            readyState: document.readyState
          };
        });
        // console.log('🔍 Current page state:', renderStatus);
        
        throw new Error(`Rendering timeout: ${JSON.stringify(renderStatus)}`);
      }

      // Wait a bit more for all images to load
      // console.log('🖼️ Waiting for additional image loading...');
      await new Promise(resolve => setTimeout(resolve, 2000)); // Increase wait time

      // Take a high-quality screenshot of the canvas
      // console.log('📸 Taking canvas screenshot...');
      const screenshotStartTime = Date.now();
      
      const canvasElement = await page.$('canvas');
      if (!canvasElement) {
        // Try to get more info about what's on the page
        const pageContent = await page.evaluate(() => {
          return {
            bodyHTML: document.body.innerHTML.substring(0, 500),
            canvasCount: document.querySelectorAll('canvas').length,
            hasRenderStatus: !!document.querySelector('#render-status')
          };
        });
        console.error('❌ Canvas element not found. Page content:', pageContent);
        throw new Error('Canvas element not found');
      }

      const imageBuffer = await canvasElement.screenshot({ 
        type: 'png',
        omitBackground: false,
      });
      
      // console.log(`✅ Screenshot taken in ${Date.now() - screenshotStartTime}ms, size: ${imageBuffer.length} bytes`);

      // console.log('🔒 Closing browser...');
      await browser.close();

      // Use snapshot ID for filename
      const sanitizedName = `snapshot-${snapshotId}`;

      // Convert to proper Buffer for Response
      const buffer = Buffer.from(imageBuffer);

      // console.log('🎉 Export completed successfully!');
      return new Response(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Content-Disposition': `attachment; filename="maimai-profile-${sanitizedName}.png"`,
          'Content-Length': buffer.length.toString(),
        },
      });

    } finally {
      // console.log('🧹 Cleaning up browser...');
      await browser.close();
    }
  } catch (error) {
    console.error('💥 Failed to generate image:', error);
    console.error('📍 Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    return NextResponse.json(
      { 
        error: 'Failed to generate image',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
