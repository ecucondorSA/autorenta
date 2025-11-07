
# TestSprite AI Testing Report(MCP)

---

## 1️⃣ Document Metadata
- **Project Name:** autorenta
- **Date:** 2025-11-06
- **Prepared by:** TestSprite AI Team

---

## 2️⃣ Requirement Validation Summary

#### Test TC001
- **Test Name:** Successful Car Booking with Wallet Payment
- **Test Code:** [TC001_Successful_Car_Booking_with_Wallet_Payment.py](./TC001_Successful_Car_Booking_with_Wallet_Payment.py)
- **Test Error:** The booking flow is blocked due to a UI issue where no car listings or price breakdown are shown after applying filters and clicking 'Buscar autos'. Reporting this issue and stopping further testing as the core functionality cannot be validated.
Browser Console Logs:
[WARNING] <link rel=preload> uses an unsupported `as` value (at http://localhost:4200/:45:0)
[WARNING] The 'allowSignalWrites' flag is deprecated and no longer impacts effect() (writes are always allowed) (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-AY6GKBS4.js?v=af777c5b:3143:12)
[WARNING] ⚠️ LCP is above target (2.5s): 28.99s (at http://localhost:4200/main.js:6357:20)
[WARNING] Error getting current position: User denied Geolocation (at http://localhost:4200/chunk-YEIUFSFY.js:256:18)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-images/22222222-2222-2222-2222-222222222222/8447c379-6b51-4b5e-8647-0f5de243f729/e6d81e06-8013-4a28-9363-d75f512c28a1-no-bg.png?t=1760916490501"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 600w x 400h (aspect-ratio: 1.50). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-59011ffc-b8e1-432a-b4f6-4fd5bdc4e3ee-3/4-front-1761490262740.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-d10aad20-280a-4819-ac79-ff22b79449e6-3/4-front-1761490075780.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] ⚠️ Low FPS detected: 12fps (at http://localhost:4200/main.js:6337:18)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-95dadd02-5b5e-4cd0-89aa-0adad31c78a7-3/4-front-1761490291667.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] [GroupMarkerNotSet(crbug.com/242999)!:A0C44200742B0000]Automatic fallback to software WebGL has been deprecated. Please use the --enable-unsafe-swiftshader flag to opt in to lower security guarantees for trusted content. (at http://localhost:4200/:0:0)
[WARNING] [.WebGL-0x2b740c991580]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels (at http://localhost:4200/:0:0)
[WARNING] [.WebGL-0x2b740c991580]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels (at http://localhost:4200/:0:0)
[WARNING] [.WebGL-0x2b740c991580]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels (at http://localhost:4200/:0:0)
[WARNING] [.WebGL-0x2b740c991580]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels (this message will no longer repeat) (at http://localhost:4200/:0:0)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-caa404cc-6423-4f5e-b5df-f0d02f7d1aff-3/4-front-1761490282306.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[ERROR] Failed to load resource: the server responded with a status of 404 () (at https://example.com/cars/demo.jpg:0:0)
[WARNING] ⚠️ No se pudo obtener ubicación del usuario: User denied Geolocation (at http://localhost:4200/chunk-HLEQ3OH3.js:895:16)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-images/ae4a91fa-e951-49a3-94fb-0c3ee4786166/8a854591-3fec-4425-946e-c7bb764a7333/93adfdee-0014-4796-bf77-c53b25231576.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-82c3ecf6-1d8c-46fc-9fad-6dd63c3aeac7-3/4-front-1761490271806.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[ERROR] Failed to load resource: the server responded with a status of 404 () (at https://example.com/cars/demo.jpg:0:0)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/449c2d1e-d329-493e-b6ba-2c30209ae999/4d5f0828-aefa-47e0-91a6-4d32855c8883
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC002
- **Test Name:** Booking Rejection Due to Insufficient Wallet Funds
- **Test Code:** [TC002_Booking_Rejection_Due_to_Insufficient_Wallet_Funds.py](./TC002_Booking_Rejection_Due_to_Insufficient_Wallet_Funds.py)
- **Test Error:** Test stopped due to UI bug: Clicking 'Ver calendario' opens an empty modal preventing booking confirmation and payment method selection. Cannot verify wallet payment with insufficient funds. Issue reported for fix.
Browser Console Logs:
[WARNING] <link rel=preload> uses an unsupported `as` value (at http://localhost:4200/:45:0)
[WARNING] The 'allowSignalWrites' flag is deprecated and no longer impacts effect() (writes are always allowed) (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-AY6GKBS4.js?v=af777c5b:3143:12)
[WARNING] Error getting current position: User denied Geolocation (at http://localhost:4200/chunk-YEIUFSFY.js:256:18)
[WARNING] ⚠️ LCP is above target (2.5s): 30.71s (at http://localhost:4200/main.js:6357:20)
[WARNING] ⚠️ Low FPS detected: 12fps (at http://localhost:4200/main.js:6337:18)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-images/22222222-2222-2222-2222-222222222222/8447c379-6b51-4b5e-8647-0f5de243f729/e6d81e06-8013-4a28-9363-d75f512c28a1-no-bg.png?t=1760916490501"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 600w x 400h (aspect-ratio: 1.50). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] ⚠️ Low FPS detected: 15fps (at http://localhost:4200/main.js:6337:18)
[WARNING] [GroupMarkerNotSet(crbug.com/242999)!:A0C44400F4370000]Automatic fallback to software WebGL has been deprecated. Please use the --enable-unsafe-swiftshader flag to opt in to lower security guarantees for trusted content. (at http://localhost:4200/:0:0)
[WARNING] [.WebGL-0x37f4075c8000]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels (at http://localhost:4200/:0:0)
[WARNING] [.WebGL-0x37f4075c8000]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels (at http://localhost:4200/:0:0)
[WARNING] [.WebGL-0x37f4075c8000]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels (at http://localhost:4200/:0:0)
[WARNING] [.WebGL-0x37f4075c8000]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels (this message will no longer repeat) (at http://localhost:4200/:0:0)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-59011ffc-b8e1-432a-b4f6-4fd5bdc4e3ee-3/4-front-1761490262740.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-d10aad20-280a-4819-ac79-ff22b79449e6-3/4-front-1761490075780.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-95dadd02-5b5e-4cd0-89aa-0adad31c78a7-3/4-front-1761490291667.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-caa404cc-6423-4f5e-b5df-f0d02f7d1aff-3/4-front-1761490282306.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-82c3ecf6-1d8c-46fc-9fad-6dd63c3aeac7-3/4-front-1761490271806.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-images/ae4a91fa-e951-49a3-94fb-0c3ee4786166/8a854591-3fec-4425-946e-c7bb764a7333/93adfdee-0014-4796-bf77-c53b25231576.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] ⚠️ No se pudo obtener ubicación del usuario: User denied Geolocation (at http://localhost:4200/chunk-HLEQ3OH3.js:895:16)
[ERROR] Failed to load resource: the server responded with a status of 404 () (at https://example.com/cars/demo.jpg:0:0)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/449c2d1e-d329-493e-b6ba-2c30209ae999/19dcb522-c71e-48e7-956a-14f64861538a
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC003
- **Test Name:** Booking with MercadoPago Payment Success
- **Test Code:** [TC003_Booking_with_MercadoPago_Payment_Success.py](./TC003_Booking_with_MercadoPago_Payment_Success.py)
- **Test Error:** The booking flow test for MercadoPago payment method could not be fully completed. After successfully inputting rental dates and searching for cars, the search results page showed a map and filters but no car listings were visible. Attempts to reveal car listings by scrolling and interacting with the filter panel failed, as the filter panel remained open and obscured the listings. This prevented selecting a car and proceeding to payment selection, thus blocking verification of the MercadoPago payment flow. The test is stopped due to these UI issues preventing completion.
Browser Console Logs:
[WARNING] <link rel=preload> uses an unsupported `as` value (at http://localhost:4200/:45:0)
[WARNING] The 'allowSignalWrites' flag is deprecated and no longer impacts effect() (writes are always allowed) (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-AY6GKBS4.js?v=af777c5b:3143:12)
[WARNING] Error getting current position: User denied Geolocation (at http://localhost:4200/chunk-YEIUFSFY.js:256:18)
[WARNING] ⚠️ LCP is above target (2.5s): 35.32s (at http://localhost:4200/main.js:6357:20)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-images/22222222-2222-2222-2222-222222222222/8447c379-6b51-4b5e-8647-0f5de243f729/e6d81e06-8013-4a28-9363-d75f512c28a1-no-bg.png?t=1760916490501"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 600w x 400h (aspect-ratio: 1.50). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-59011ffc-b8e1-432a-b4f6-4fd5bdc4e3ee-3/4-front-1761490262740.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-d10aad20-280a-4819-ac79-ff22b79449e6-3/4-front-1761490075780.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-images/ae4a91fa-e951-49a3-94fb-0c3ee4786166/8a854591-3fec-4425-946e-c7bb764a7333/93adfdee-0014-4796-bf77-c53b25231576.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-95dadd02-5b5e-4cd0-89aa-0adad31c78a7-3/4-front-1761490291667.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-caa404cc-6423-4f5e-b5df-f0d02f7d1aff-3/4-front-1761490282306.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-82c3ecf6-1d8c-46fc-9fad-6dd63c3aeac7-3/4-front-1761490271806.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] ⚠️ Low FPS detected: 10fps (at http://localhost:4200/main.js:6337:18)
[WARNING] ⚠️ Low FPS detected: 15fps (at http://localhost:4200/main.js:6337:18)
[WARNING] [GroupMarkerNotSet(crbug.com/242999)!:A0584600FC080000]Automatic fallback to software WebGL has been deprecated. Please use the --enable-unsafe-swiftshader flag to opt in to lower security guarantees for trusted content. (at http://localhost:4200/:0:0)
[WARNING] [.WebGL-0x8fc07125a00]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels (at http://localhost:4200/:0:0)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-images/1ed1dcf4-7a41-4213-8369-b2a86ca534ba/4b3c5aed-8e3b-463e-8f3a-909a92e072e0/1cecf709-7383-4ef0-a62a-6a13100d3eac.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-22be81b9-2067-444a-a35d-ccf3997f2c4b-3/4-front-1761490091152.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[ERROR] Failed to load resource: the server responded with a status of 404 () (at https://example.com/cars/demo.jpg:0:0)
[WARNING] [.WebGL-0x8fc07125a00]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels (at http://localhost:4200/:0:0)
[WARNING] [.WebGL-0x8fc07125a00]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels (at http://localhost:4200/:0:0)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/449c2d1e-d329-493e-b6ba-2c30209ae999/8563b289-7fce-4cb6-bd7f-13a99785bf65
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC004
- **Test Name:** Handle MercadoPago Payment Failure
- **Test Code:** [TC004_Handle_MercadoPago_Payment_Failure.py](./TC004_Handle_MercadoPago_Payment_Failure.py)
- **Test Error:** Testing stopped due to inability to access the login form. The booking process cannot proceed to payment selection or simulate MercadoPago payment failure. Please fix the login flow to enable further testing.
Browser Console Logs:
[WARNING] <link rel=preload> uses an unsupported `as` value (at http://localhost:4200/:45:0)
[WARNING] The 'allowSignalWrites' flag is deprecated and no longer impacts effect() (writes are always allowed) (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-AY6GKBS4.js?v=af777c5b:3143:12)
[WARNING] Error getting current position: User denied Geolocation (at http://localhost:4200/chunk-YEIUFSFY.js:256:18)
[WARNING] ⚠️ LCP is above target (2.5s): 31.48s (at http://localhost:4200/main.js:6357:20)
[WARNING] ⚠️ Low FPS detected: 15fps (at http://localhost:4200/main.js:6337:18)
[WARNING] ⚠️ Low FPS detected: 15fps (at http://localhost:4200/main.js:6337:18)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-images/22222222-2222-2222-2222-222222222222/8447c379-6b51-4b5e-8647-0f5de243f729/e6d81e06-8013-4a28-9363-d75f512c28a1-no-bg.png?t=1760916490501"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 600w x 400h (aspect-ratio: 1.50). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] ⚠️ Low FPS detected: 10fps (at http://localhost:4200/main.js:6337:18)
[WARNING] [GroupMarkerNotSet(crbug.com/242999)!:A0443B00D4150000]Automatic fallback to software WebGL has been deprecated. Please use the --enable-unsafe-swiftshader flag to opt in to lower security guarantees for trusted content. (at http://localhost:4200/:0:0)
[WARNING] [.WebGL-0x15d406add580]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels (at http://localhost:4200/:0:0)
[WARNING] [.WebGL-0x15d406add580]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels (at http://localhost:4200/:0:0)
[WARNING] [.WebGL-0x15d406add580]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels (at http://localhost:4200/:0:0)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-images/ae4a91fa-e951-49a3-94fb-0c3ee4786166/8a854591-3fec-4425-946e-c7bb764a7333/93adfdee-0014-4796-bf77-c53b25231576.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] [.WebGL-0x15d406add580]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels (this message will no longer repeat) (at http://localhost:4200/:0:0)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-caa404cc-6423-4f5e-b5df-f0d02f7d1aff-3/4-front-1761490282306.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-82c3ecf6-1d8c-46fc-9fad-6dd63c3aeac7-3/4-front-1761490271806.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-d10aad20-280a-4819-ac79-ff22b79449e6-3/4-front-1761490075780.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-59011ffc-b8e1-432a-b4f6-4fd5bdc4e3ee-3/4-front-1761490262740.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-95dadd02-5b5e-4cd0-89aa-0adad31c78a7-3/4-front-1761490291667.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[ERROR] Failed to load resource: the server responded with a status of 404 () (at https://example.com/cars/demo.jpg:0:0)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/449c2d1e-d329-493e-b6ba-2c30209ae999/2a497e02-6e90-44cb-9eec-fb4fe31c9a69
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC005
- **Test Name:** Prevent Locatario from Booking Own Car
- **Test Code:** [TC005_Prevent_Locatario_from_Booking_Own_Car.py](./TC005_Prevent_Locatario_from_Booking_Own_Car.py)
- **Test Error:** Test could not be completed because no car listings were visible or available to attempt booking. The system did not load any cars for the logged-in locador user. Please verify test data and environment setup.
Browser Console Logs:
[WARNING] <link rel=preload> uses an unsupported `as` value (at http://localhost:4200/:45:0)
[WARNING] The 'allowSignalWrites' flag is deprecated and no longer impacts effect() (writes are always allowed) (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-AY6GKBS4.js?v=af777c5b:3143:12)
[WARNING] Error getting current position: User denied Geolocation (at http://localhost:4200/chunk-YEIUFSFY.js:256:18)
[WARNING] ⚠️ LCP is above target (2.5s): 29.59s (at http://localhost:4200/main.js:6357:20)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-d10aad20-280a-4819-ac79-ff22b79449e6-3/4-front-1761490075780.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-images/22222222-2222-2222-2222-222222222222/8447c379-6b51-4b5e-8647-0f5de243f729/e6d81e06-8013-4a28-9363-d75f512c28a1-no-bg.png?t=1760916490501"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 600w x 400h (aspect-ratio: 1.50). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-59011ffc-b8e1-432a-b4f6-4fd5bdc4e3ee-3/4-front-1761490262740.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-caa404cc-6423-4f5e-b5df-f0d02f7d1aff-3/4-front-1761490282306.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-95dadd02-5b5e-4cd0-89aa-0adad31c78a7-3/4-front-1761490291667.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-82c3ecf6-1d8c-46fc-9fad-6dd63c3aeac7-3/4-front-1761490271806.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-images/ae4a91fa-e951-49a3-94fb-0c3ee4786166/8a854591-3fec-4425-946e-c7bb764a7333/93adfdee-0014-4796-bf77-c53b25231576.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] ⚠️ Low FPS detected: 15fps (at http://localhost:4200/main.js:6337:18)
[ERROR] Failed to load resource: the server responded with a status of 404 () (at https://example.com/cars/demo.jpg:0:0)
[WARNING] ⚠️ Low FPS detected: 15fps (at http://localhost:4200/main.js:6337:18)
[WARNING] ⚠️ Low FPS detected: 20fps (at http://localhost:4200/main.js:6337:18)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-images/1ed1dcf4-7a41-4213-8369-b2a86ca534ba/4b3c5aed-8e3b-463e-8f3a-909a92e072e0/1cecf709-7383-4ef0-a62a-6a13100d3eac.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] [GroupMarkerNotSet(crbug.com/242999)!:A0EC390094370000]Automatic fallback to software WebGL has been deprecated. Please use the --enable-unsafe-swiftshader flag to opt in to lower security guarantees for trusted content. (at http://localhost:4200/:0:0)
[WARNING] [.WebGL-0x37940a5f4f00]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels (at http://localhost:4200/:0:0)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-22be81b9-2067-444a-a35d-ccf3997f2c4b-3/4-front-1761490091152.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] [.WebGL-0x37940a5f4f00]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels (at http://localhost:4200/:0:0)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/449c2d1e-d329-493e-b6ba-2c30209ae999/1a34b2d9-f004-4210-8fe5-b6d09dc7e4cf
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC006
- **Test Name:** Booking Conflict Detection for Overlapping Rentals
- **Test Code:** [TC006_Booking_Conflict_Detection_for_Overlapping_Rentals.py](./TC006_Booking_Conflict_Detection_for_Overlapping_Rentals.py)
- **Test Error:** The 'Mis reservas' page does not display any existing confirmed bookings after clicking the link. This prevents verifying booking conflicts as required by the test. Further testing cannot proceed until this issue is resolved.
Browser Console Logs:
[WARNING] <link rel=preload> uses an unsupported `as` value (at http://localhost:4200/:45:0)
[WARNING] The 'allowSignalWrites' flag is deprecated and no longer impacts effect() (writes are always allowed) (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-AY6GKBS4.js?v=af777c5b:3143:12)
[WARNING] Error getting current position: User denied Geolocation (at http://localhost:4200/chunk-YEIUFSFY.js:256:18)
[WARNING] ⚠️ Low FPS detected: 30fps (at http://localhost:4200/main.js:6337:18)
[WARNING] ⚠️ LCP is above target (2.5s): 28.56s (at http://localhost:4200/main.js:6357:20)
[WARNING] ⚠️ Low FPS detected: 12fps (at http://localhost:4200/main.js:6337:18)
[ERROR] Failed to load resource: the server responded with a status of 404 () (at https://example.com/cars/demo.jpg:0:0)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-d10aad20-280a-4819-ac79-ff22b79449e6-3/4-front-1761490075780.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-images/22222222-2222-2222-2222-222222222222/8447c379-6b51-4b5e-8647-0f5de243f729/e6d81e06-8013-4a28-9363-d75f512c28a1-no-bg.png?t=1760916490501"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 600w x 400h (aspect-ratio: 1.50). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] ⚠️ Low FPS detected: 15fps (at http://localhost:4200/main.js:6337:18)
[WARNING] [GroupMarkerNotSet(crbug.com/242999)!:A0583B00C43E0000]Automatic fallback to software WebGL has been deprecated. Please use the --enable-unsafe-swiftshader flag to opt in to lower security guarantees for trusted content. (at http://localhost:4200/:0:0)
[WARNING] [.WebGL-0x3ec4081e6280]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels (at http://localhost:4200/:0:0)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-82c3ecf6-1d8c-46fc-9fad-6dd63c3aeac7-3/4-front-1761490271806.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] [.WebGL-0x3ec4081e6280]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels (at http://localhost:4200/:0:0)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-images/ae4a91fa-e951-49a3-94fb-0c3ee4786166/8a854591-3fec-4425-946e-c7bb764a7333/93adfdee-0014-4796-bf77-c53b25231576.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] [.WebGL-0x3ec4081e6280]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels (at http://localhost:4200/:0:0)
[WARNING] [.WebGL-0x3ec4081e6280]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels (this message will no longer repeat) (at http://localhost:4200/:0:0)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-caa404cc-6423-4f5e-b5df-f0d02f7d1aff-3/4-front-1761490282306.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-95dadd02-5b5e-4cd0-89aa-0adad31c78a7-3/4-front-1761490291667.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-59011ffc-b8e1-432a-b4f6-4fd5bdc4e3ee-3/4-front-1761490262740.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/449c2d1e-d329-493e-b6ba-2c30209ae999/93e8f28c-b360-4f23-a845-9b189df530fc
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC007
- **Test Name:** Locador Car Publication with MercadoPago OAuth Verification
- **Test Code:** [TC007_Locador_Car_Publication_with_MercadoPago_OAuth_Verification.py](./TC007_Locador_Car_Publication_with_MercadoPago_OAuth_Verification.py)
- **Test Error:** Test stopped due to critical issue: 'Publicar' link does not work, blocking the ability to verify MercadoPago OAuth onboarding enforcement for car publication by locadores.
Browser Console Logs:
[WARNING] <link rel=preload> uses an unsupported `as` value (at http://localhost:4200/:45:0)
[WARNING] The 'allowSignalWrites' flag is deprecated and no longer impacts effect() (writes are always allowed) (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-AY6GKBS4.js?v=af777c5b:3143:12)
[WARNING] Error getting current position: User denied Geolocation (at http://localhost:4200/chunk-YEIUFSFY.js:256:18)
[WARNING] ⚠️ LCP is above target (2.5s): 35.06s (at http://localhost:4200/main.js:6357:20)
[WARNING] ⚠️ Low FPS detected: 9fps (at http://localhost:4200/main.js:6337:18)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-images/22222222-2222-2222-2222-222222222222/8447c379-6b51-4b5e-8647-0f5de243f729/e6d81e06-8013-4a28-9363-d75f512c28a1-no-bg.png?t=1760916490501"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 600w x 400h (aspect-ratio: 1.50). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] ⚠️ Low FPS detected: 20fps (at http://localhost:4200/main.js:6337:18)
[WARNING] [GroupMarkerNotSet(crbug.com/242999)!:A06C3B00343A0000]Automatic fallback to software WebGL has been deprecated. Please use the --enable-unsafe-swiftshader flag to opt in to lower security guarantees for trusted content. (at http://localhost:4200/:0:0)
[WARNING] [.WebGL-0x3a3409112700]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels (at http://localhost:4200/:0:0)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-d10aad20-280a-4819-ac79-ff22b79449e6-3/4-front-1761490075780.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-59011ffc-b8e1-432a-b4f6-4fd5bdc4e3ee-3/4-front-1761490262740.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-95dadd02-5b5e-4cd0-89aa-0adad31c78a7-3/4-front-1761490291667.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] [.WebGL-0x3a3409112700]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels (at http://localhost:4200/:0:0)
[WARNING] [.WebGL-0x3a3409112700]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels (at http://localhost:4200/:0:0)
[WARNING] [.WebGL-0x3a3409112700]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels (this message will no longer repeat) (at http://localhost:4200/:0:0)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-caa404cc-6423-4f5e-b5df-f0d02f7d1aff-3/4-front-1761490282306.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-82c3ecf6-1d8c-46fc-9fad-6dd63c3aeac7-3/4-front-1761490271806.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-images/ae4a91fa-e951-49a3-94fb-0c3ee4786166/8a854591-3fec-4425-946e-c7bb764a7333/93adfdee-0014-4796-bf77-c53b25231576.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] ⚠️ Low FPS detected: 1fps (at http://localhost:4200/main.js:6337:18)
[WARNING] ⚠️ No se pudo obtener ubicación del usuario: User denied Geolocation (at http://localhost:4200/chunk-HLEQ3OH3.js:895:16)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/449c2d1e-d329-493e-b6ba-2c30209ae999/d2953dc8-9b9d-4e7e-97a5-29bfdefd1bf2
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC008
- **Test Name:** Wallet Deposit via MercadoPago with Webhook Confirmation
- **Test Code:** [TC008_Wallet_Deposit_via_MercadoPago_with_Webhook_Confirmation.py](./TC008_Wallet_Deposit_via_MercadoPago_with_Webhook_Confirmation.py)
- **Test Error:** Login failed due to Supabase connection error. Cannot proceed with wallet deposit process testing. Please fix the backend connection issue and retry.
Browser Console Logs:
[WARNING] <link rel=preload> uses an unsupported `as` value (at http://localhost:4200/:45:0)
[WARNING] The 'allowSignalWrites' flag is deprecated and no longer impacts effect() (writes are always allowed) (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-AY6GKBS4.js?v=af777c5b:3143:12)
[WARNING] Error getting current position: User denied Geolocation (at http://localhost:4200/chunk-YEIUFSFY.js:256:18)
[WARNING] ⚠️ LCP is above target (2.5s): 33.36s (at http://localhost:4200/main.js:6357:20)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-images/22222222-2222-2222-2222-222222222222/8447c379-6b51-4b5e-8647-0f5de243f729/e6d81e06-8013-4a28-9363-d75f512c28a1-no-bg.png?t=1760916490501"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 600w x 400h (aspect-ratio: 1.50). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] ⚠️ Low FPS detected: 12fps (at http://localhost:4200/main.js:6337:18)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-59011ffc-b8e1-432a-b4f6-4fd5bdc4e3ee-3/4-front-1761490262740.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-d10aad20-280a-4819-ac79-ff22b79449e6-3/4-front-1761490075780.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] ⚠️ Low FPS detected: 15fps (at http://localhost:4200/main.js:6337:18)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-95dadd02-5b5e-4cd0-89aa-0adad31c78a7-3/4-front-1761490291667.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] [GroupMarkerNotSet(crbug.com/242999)!:A0AC450024040000]Automatic fallback to software WebGL has been deprecated. Please use the --enable-unsafe-swiftshader flag to opt in to lower security guarantees for trusted content. (at http://localhost:4200/:0:0)
[WARNING] [.WebGL-0x42406d51480]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels (at http://localhost:4200/:0:0)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-caa404cc-6423-4f5e-b5df-f0d02f7d1aff-3/4-front-1761490282306.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-82c3ecf6-1d8c-46fc-9fad-6dd63c3aeac7-3/4-front-1761490271806.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] [.WebGL-0x42406d51480]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels (at http://localhost:4200/:0:0)
[WARNING] [.WebGL-0x42406d51480]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels (at http://localhost:4200/:0:0)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-images/ae4a91fa-e951-49a3-94fb-0c3ee4786166/8a854591-3fec-4425-946e-c7bb764a7333/93adfdee-0014-4796-bf77-c53b25231576.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[ERROR] Failed to load resource: the server responded with a status of 404 () (at https://example.com/cars/demo.jpg:0:0)
[WARNING] [.WebGL-0x42406d51480]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels (this message will no longer repeat) (at http://localhost:4200/:0:0)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-22be81b9-2067-444a-a35d-ccf3997f2c4b-3/4-front-1761490091152.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/449c2d1e-d329-493e-b6ba-2c30209ae999/6643c309-228a-4f32-ab7d-cbc840f13a4c
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC009
- **Test Name:** Prevent Duplicate Wallet Deposits from Repeated Webhooks
- **Test Code:** [TC009_Prevent_Duplicate_Wallet_Deposits_from_Repeated_Webhooks.py](./TC009_Prevent_Duplicate_Wallet_Deposits_from_Repeated_Webhooks.py)
- **Test Error:** Test stopped due to inability to access the wallet section. The 'Wallet' link is unresponsive or broken, preventing further testing of wallet deposit and duplicate webhook notification handling.
Browser Console Logs:
[WARNING] <link rel=preload> uses an unsupported `as` value (at http://localhost:4200/:45:0)
[WARNING] The 'allowSignalWrites' flag is deprecated and no longer impacts effect() (writes are always allowed) (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-AY6GKBS4.js?v=af777c5b:3143:12)
[WARNING] Error getting current position: User denied Geolocation (at http://localhost:4200/chunk-YEIUFSFY.js:256:18)
[WARNING] ⚠️ LCP is above target (2.5s): 30.82s (at http://localhost:4200/main.js:6357:20)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-images/22222222-2222-2222-2222-222222222222/8447c379-6b51-4b5e-8647-0f5de243f729/e6d81e06-8013-4a28-9363-d75f512c28a1-no-bg.png?t=1760916490501"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 600w x 400h (aspect-ratio: 1.50). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] [GroupMarkerNotSet(crbug.com/242999)!:A0C44600CC380000]Automatic fallback to software WebGL has been deprecated. Please use the --enable-unsafe-swiftshader flag to opt in to lower security guarantees for trusted content. (at http://localhost:4200/:0:0)
[WARNING] [.WebGL-0x38cc0bfa2800]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels (at http://localhost:4200/:0:0)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-d10aad20-280a-4819-ac79-ff22b79449e6-3/4-front-1761490075780.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] ⚠️ Low FPS detected: 12fps (at http://localhost:4200/main.js:6337:18)
[WARNING] [.WebGL-0x38cc0bfa2800]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels (at http://localhost:4200/:0:0)
[WARNING] [.WebGL-0x38cc0bfa2800]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels (at http://localhost:4200/:0:0)
[WARNING] [.WebGL-0x38cc0bfa2800]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels (this message will no longer repeat) (at http://localhost:4200/:0:0)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-59011ffc-b8e1-432a-b4f6-4fd5bdc4e3ee-3/4-front-1761490262740.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-95dadd02-5b5e-4cd0-89aa-0adad31c78a7-3/4-front-1761490291667.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-caa404cc-6423-4f5e-b5df-f0d02f7d1aff-3/4-front-1761490282306.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-images/ae4a91fa-e951-49a3-94fb-0c3ee4786166/8a854591-3fec-4425-946e-c7bb764a7333/93adfdee-0014-4796-bf77-c53b25231576.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-82c3ecf6-1d8c-46fc-9fad-6dd63c3aeac7-3/4-front-1761490271806.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] ⚠️ No se pudo obtener ubicación del usuario: User denied Geolocation (at http://localhost:4200/chunk-HLEQ3OH3.js:895:16)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-99d5af74-a2c7-43d5-9c02-93d7446000a2-3/4-front-1761490251766.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-images/1ed1dcf4-7a41-4213-8369-b2a86ca534ba/4b3c5aed-8e3b-463e-8f3a-909a92e072e0/1cecf709-7383-4ef0-a62a-6a13100d3eac.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/449c2d1e-d329-493e-b6ba-2c30209ae999/076d335b-f68b-4f30-b475-a4df6036677a
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC010
- **Test Name:** Withdrawal Request with Insufficient Wallet Balance
- **Test Code:** [TC010_Withdrawal_Request_with_Insufficient_Wallet_Balance.py](./TC010_Withdrawal_Request_with_Insufficient_Wallet_Balance.py)
- **Test Error:** Login failed due to Supabase connection error. Cannot verify withdrawal limits for locadores. Testing stopped.
Browser Console Logs:
[WARNING] <link rel=preload> uses an unsupported `as` value (at http://localhost:4200/:45:0)
[WARNING] The 'allowSignalWrites' flag is deprecated and no longer impacts effect() (writes are always allowed) (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-AY6GKBS4.js?v=af777c5b:3143:12)
[WARNING] Error getting current position: User denied Geolocation (at http://localhost:4200/chunk-YEIUFSFY.js:256:18)
[WARNING] ⚠️ LCP is above target (2.5s): 31.07s (at http://localhost:4200/main.js:6357:20)
[WARNING] ⚠️ Low FPS detected: 12fps (at http://localhost:4200/main.js:6337:18)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-images/22222222-2222-2222-2222-222222222222/8447c379-6b51-4b5e-8647-0f5de243f729/e6d81e06-8013-4a28-9363-d75f512c28a1-no-bg.png?t=1760916490501"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 600w x 400h (aspect-ratio: 1.50). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] ⚠️ Low FPS detected: 12fps (at http://localhost:4200/main.js:6337:18)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-d10aad20-280a-4819-ac79-ff22b79449e6-3/4-front-1761490075780.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-59011ffc-b8e1-432a-b4f6-4fd5bdc4e3ee-3/4-front-1761490262740.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] ⚠️ Low FPS detected: 2fps (at http://localhost:4200/main.js:6337:18)
[WARNING] [GroupMarkerNotSet(crbug.com/242999)!:A0043B0054130000]Automatic fallback to software WebGL has been deprecated. Please use the --enable-unsafe-swiftshader flag to opt in to lower security guarantees for trusted content. (at http://localhost:4200/:0:0)
[WARNING] [.WebGL-0x135409af4e00]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels (at http://localhost:4200/:0:0)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-95dadd02-5b5e-4cd0-89aa-0adad31c78a7-3/4-front-1761490291667.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-caa404cc-6423-4f5e-b5df-f0d02f7d1aff-3/4-front-1761490282306.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] [.WebGL-0x135409af4e00]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels (at http://localhost:4200/:0:0)
[WARNING] [.WebGL-0x135409af4e00]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels (at http://localhost:4200/:0:0)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-82c3ecf6-1d8c-46fc-9fad-6dd63c3aeac7-3/4-front-1761490271806.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] [.WebGL-0x135409af4e00]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels (this message will no longer repeat) (at http://localhost:4200/:0:0)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-images/ae4a91fa-e951-49a3-94fb-0c3ee4786166/8a854591-3fec-4425-946e-c7bb764a7333/93adfdee-0014-4796-bf77-c53b25231576.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[ERROR] Failed to load resource: the server responded with a status of 404 () (at https://example.com/cars/demo.jpg:0:0)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/449c2d1e-d329-493e-b6ba-2c30209ae999/17d39bc9-2e69-4290-8f70-25f8c08d6dfb
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC011
- **Test Name:** Locador Messaging with Locatario Linked to Booking
- **Test Code:** [TC011_Locador_Messaging_with_Locatario_Linked_to_Booking.py](./TC011_Locador_Messaging_with_Locatario_Linked_to_Booking.py)
- **Test Error:** Login as locador failed due to Supabase connection error. Cannot proceed with messaging system verification. Please fix the backend connection and retry.
Browser Console Logs:
[WARNING] <link rel=preload> uses an unsupported `as` value (at http://localhost:4200/:45:0)
[WARNING] The 'allowSignalWrites' flag is deprecated and no longer impacts effect() (writes are always allowed) (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-AY6GKBS4.js?v=af777c5b:3143:12)
[WARNING] Error getting current position: User denied Geolocation (at http://localhost:4200/chunk-YEIUFSFY.js:256:18)
[WARNING] ⚠️ LCP is above target (2.5s): 31.18s (at http://localhost:4200/main.js:6357:20)
[WARNING] ⚠️ Low FPS detected: 15fps (at http://localhost:4200/main.js:6337:18)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-images/22222222-2222-2222-2222-222222222222/8447c379-6b51-4b5e-8647-0f5de243f729/e6d81e06-8013-4a28-9363-d75f512c28a1-no-bg.png?t=1760916490501"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 600w x 400h (aspect-ratio: 1.50). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] ⚠️ Low FPS detected: 12fps (at http://localhost:4200/main.js:6337:18)
[WARNING] ⚠️ Low FPS detected: 12fps (at http://localhost:4200/main.js:6337:18)
[WARNING] [GroupMarkerNotSet(crbug.com/242999)!:A0984500EC380000]Automatic fallback to software WebGL has been deprecated. Please use the --enable-unsafe-swiftshader flag to opt in to lower security guarantees for trusted content. (at http://localhost:4200/:0:0)
[WARNING] [.WebGL-0x38ec0c4d2e80]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels (at http://localhost:4200/:0:0)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-59011ffc-b8e1-432a-b4f6-4fd5bdc4e3ee-3/4-front-1761490262740.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] [.WebGL-0x38ec0c4d2e80]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels (at http://localhost:4200/:0:0)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-d10aad20-280a-4819-ac79-ff22b79449e6-3/4-front-1761490075780.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] [.WebGL-0x38ec0c4d2e80]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels (at http://localhost:4200/:0:0)
[WARNING] [.WebGL-0x38ec0c4d2e80]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels (this message will no longer repeat) (at http://localhost:4200/:0:0)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-95dadd02-5b5e-4cd0-89aa-0adad31c78a7-3/4-front-1761490291667.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-caa404cc-6423-4f5e-b5df-f0d02f7d1aff-3/4-front-1761490282306.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-images/ae4a91fa-e951-49a3-94fb-0c3ee4786166/8a854591-3fec-4425-946e-c7bb764a7333/93adfdee-0014-4796-bf77-c53b25231576.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-82c3ecf6-1d8c-46fc-9fad-6dd63c3aeac7-3/4-front-1761490271806.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[ERROR] Failed to load resource: the server responded with a status of 404 () (at https://example.com/cars/demo.jpg:0:0)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/449c2d1e-d329-493e-b6ba-2c30209ae999/cfd56b56-a9b9-4aa4-aec6-a0ffa2c16f1b
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC012
- **Test Name:** Unauthorized Data Access Prevention via RLS
- **Test Code:** [TC012_Unauthorized_Data_Access_Prevention_via_RLS.py](./TC012_Unauthorized_Data_Access_Prevention_via_RLS.py)
- **Test Error:** The 'Mis reservas' tab failed to load bookings, blocking the ability to test row-level security policies for bookings. Further testing cannot proceed until this issue is resolved. Stopping the task as requested.
Browser Console Logs:
[WARNING] <link rel=preload> uses an unsupported `as` value (at http://localhost:4200/:45:0)
[WARNING] The 'allowSignalWrites' flag is deprecated and no longer impacts effect() (writes are always allowed) (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-AY6GKBS4.js?v=af777c5b:3143:12)
[WARNING] Error getting current position: User denied Geolocation (at http://localhost:4200/chunk-YEIUFSFY.js:256:18)
[WARNING] ⚠️ LCP is above target (2.5s): 33.56s (at http://localhost:4200/main.js:6357:20)
[WARNING] ⚠️ Low FPS detected: 30fps (at http://localhost:4200/main.js:6337:18)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-images/22222222-2222-2222-2222-222222222222/8447c379-6b51-4b5e-8647-0f5de243f729/e6d81e06-8013-4a28-9363-d75f512c28a1-no-bg.png?t=1760916490501"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 600w x 400h (aspect-ratio: 1.50). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] [GroupMarkerNotSet(crbug.com/242999)!:A0D84600E4260000]Automatic fallback to software WebGL has been deprecated. Please use the --enable-unsafe-swiftshader flag to opt in to lower security guarantees for trusted content. (at http://localhost:4200/:0:0)
[WARNING] [.WebGL-0x26e4091c0f00]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels (at http://localhost:4200/:0:0)
[WARNING] [.WebGL-0x26e4091c0f00]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels (at http://localhost:4200/:0:0)
[WARNING] [.WebGL-0x26e4091c0f00]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels (at http://localhost:4200/:0:0)
[WARNING] [.WebGL-0x26e4091c0f00]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels (this message will no longer repeat) (at http://localhost:4200/:0:0)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-59011ffc-b8e1-432a-b4f6-4fd5bdc4e3ee-3/4-front-1761490262740.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-d10aad20-280a-4819-ac79-ff22b79449e6-3/4-front-1761490075780.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-95dadd02-5b5e-4cd0-89aa-0adad31c78a7-3/4-front-1761490291667.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-caa404cc-6423-4f5e-b5df-f0d02f7d1aff-3/4-front-1761490282306.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] ⚠️ No se pudo obtener ubicación del usuario: User denied Geolocation (at http://localhost:4200/chunk-HLEQ3OH3.js:895:16)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-images/ae4a91fa-e951-49a3-94fb-0c3ee4786166/8a854591-3fec-4425-946e-c7bb764a7333/93adfdee-0014-4796-bf77-c53b25231576.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-82c3ecf6-1d8c-46fc-9fad-6dd63c3aeac7-3/4-front-1761490271806.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[ERROR] Failed to load resource: the server responded with a status of 404 () (at https://example.com/cars/demo.jpg:0:0)
[WARNING] ⚠️ Low FPS detected: 9fps (at http://localhost:4200/main.js:6337:18)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/449c2d1e-d329-493e-b6ba-2c30209ae999/404a6633-d356-49c9-a6a4-e79957f15782
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC013
- **Test Name:** Performance Test: Page Load Times Under 2 Seconds
- **Test Code:** [TC013_Performance_Test_Page_Load_Times_Under_2_Seconds.py](./TC013_Performance_Test_Page_Load_Times_Under_2_Seconds.py)
- **Test Error:** Reported the issue of navigation failure from car listing to booking checkout page. Task stopped as further testing depends on this navigation.
Browser Console Logs:
[WARNING] <link rel=preload> uses an unsupported `as` value (at http://localhost:4200/:45:0)
[WARNING] The 'allowSignalWrites' flag is deprecated and no longer impacts effect() (writes are always allowed) (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-AY6GKBS4.js?v=af777c5b:3143:12)
[WARNING] Error getting current position: User denied Geolocation (at http://localhost:4200/chunk-YEIUFSFY.js:256:18)
[WARNING] ⚠️ LCP is above target (2.5s): 30.56s (at http://localhost:4200/main.js:6357:20)
[WARNING] [GroupMarkerNotSet(crbug.com/242999)!:A0D83C0044090000]Automatic fallback to software WebGL has been deprecated. Please use the --enable-unsafe-swiftshader flag to opt in to lower security guarantees for trusted content. (at http://localhost:4200/:0:0)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-images/22222222-2222-2222-2222-222222222222/8447c379-6b51-4b5e-8647-0f5de243f729/e6d81e06-8013-4a28-9363-d75f512c28a1-no-bg.png?t=1760916490501"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 600w x 400h (aspect-ratio: 1.50). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] [.WebGL-0x94400d66d80]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels (at http://localhost:4200/:0:0)
[WARNING] [.WebGL-0x94400d66d80]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels (at http://localhost:4200/:0:0)
[ERROR] Failed to load resource: the server responded with a status of 404 () (at https://example.com/cars/demo.jpg:0:0)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-82c3ecf6-1d8c-46fc-9fad-6dd63c3aeac7-3/4-front-1761490271806.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] [.WebGL-0x94400d66d80]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels (at http://localhost:4200/:0:0)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-images/ae4a91fa-e951-49a3-94fb-0c3ee4786166/8a854591-3fec-4425-946e-c7bb764a7333/93adfdee-0014-4796-bf77-c53b25231576.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-95dadd02-5b5e-4cd0-89aa-0adad31c78a7-3/4-front-1761490291667.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-caa404cc-6423-4f5e-b5df-f0d02f7d1aff-3/4-front-1761490282306.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-d10aad20-280a-4819-ac79-ff22b79449e6-3/4-front-1761490075780.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] [.WebGL-0x94400d66d80]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels (this message will no longer repeat) (at http://localhost:4200/:0:0)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-59011ffc-b8e1-432a-b4f6-4fd5bdc4e3ee-3/4-front-1761490262740.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] ⚠️ No se pudo obtener ubicación del usuario: User denied Geolocation (at http://localhost:4200/chunk-HLEQ3OH3.js:895:16)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-images/1ed1dcf4-7a41-4213-8369-b2a86ca534ba/e8644fdd-e8a3-4565-8c50-ebb779cf6ba3/6e2b85e9-33e6-4bc9-b670-bef3bf9df0fe.jpg"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 4992w x 2124h (aspect-ratio: 2.35). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-47738b52-5173-4079-a236-996bc57940f9-3/4-front-1761490242123.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/449c2d1e-d329-493e-b6ba-2c30209ae999/c066f447-2aa8-46be-a1c0-1793a34ce537
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC014
- **Test Name:** Price Calculation API Response Time Verification
- **Test Code:** [TC014_Price_Calculation_API_Response_Time_Verification.py](./TC014_Price_Calculation_API_Response_Time_Verification.py)
- **Test Error:** Testing stopped due to inability to verify price calculation API response time and price breakdown correctness. The UI remains stuck in loading state after setting rental dates and selecting cars. Issue reported to development team.
Browser Console Logs:
[WARNING] <link rel=preload> uses an unsupported `as` value (at http://localhost:4200/:45:0)
[WARNING] The 'allowSignalWrites' flag is deprecated and no longer impacts effect() (writes are always allowed) (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-AY6GKBS4.js?v=af777c5b:3143:12)
[WARNING] Error getting current position: User denied Geolocation (at http://localhost:4200/chunk-YEIUFSFY.js:256:18)
[WARNING] ⚠️ LCP is above target (2.5s): 30.43s (at http://localhost:4200/main.js:6357:20)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-images/22222222-2222-2222-2222-222222222222/8447c379-6b51-4b5e-8647-0f5de243f729/e6d81e06-8013-4a28-9363-d75f512c28a1-no-bg.png?t=1760916490501"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 600w x 400h (aspect-ratio: 1.50). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] ⚠️ Low FPS detected: 15fps (at http://localhost:4200/main.js:6337:18)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-d10aad20-280a-4819-ac79-ff22b79449e6-3/4-front-1761490075780.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-59011ffc-b8e1-432a-b4f6-4fd5bdc4e3ee-3/4-front-1761490262740.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] ⚠️ Low FPS detected: 12fps (at http://localhost:4200/main.js:6337:18)
[WARNING] [GroupMarkerNotSet(crbug.com/242999)!:A0183C0074020000]Automatic fallback to software WebGL has been deprecated. Please use the --enable-unsafe-swiftshader flag to opt in to lower security guarantees for trusted content. (at http://localhost:4200/:0:0)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-95dadd02-5b5e-4cd0-89aa-0adad31c78a7-3/4-front-1761490291667.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] [.WebGL-0x27407a78780]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels (at http://localhost:4200/:0:0)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-caa404cc-6423-4f5e-b5df-f0d02f7d1aff-3/4-front-1761490282306.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] [.WebGL-0x27407a78780]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels (at http://localhost:4200/:0:0)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-82c3ecf6-1d8c-46fc-9fad-6dd63c3aeac7-3/4-front-1761490271806.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] [.WebGL-0x27407a78780]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels (at http://localhost:4200/:0:0)
[WARNING] [.WebGL-0x27407a78780]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels (this message will no longer repeat) (at http://localhost:4200/:0:0)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-images/ae4a91fa-e951-49a3-94fb-0c3ee4786166/8a854591-3fec-4425-946e-c7bb764a7333/93adfdee-0014-4796-bf77-c53b25231576.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-images/1ed1dcf4-7a41-4213-8369-b2a86ca534ba/4b3c5aed-8e3b-463e-8f3a-909a92e072e0/1cecf709-7383-4ef0-a62a-6a13100d3eac.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] ⚠️ No se pudo obtener ubicación del usuario: User denied Geolocation (at http://localhost:4200/chunk-HLEQ3OH3.js:895:16)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/449c2d1e-d329-493e-b6ba-2c30209ae999/d5fa001f-4882-4013-aee3-5b0ac93a0c39
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC015
- **Test Name:** Booking Completion Time Within 3 Minutes
- **Test Code:** [TC015_Booking_Completion_Time_Within_3_Minutes.py](./TC015_Booking_Completion_Time_Within_3_Minutes.py)
- **Test Error:** Booking process validation stopped due to a blocking issue: the date selection modal cannot be closed, preventing progress to booking confirmation. This blocks measuring the booking process time under 3 minutes. Please fix the modal closure issue to continue testing.
Browser Console Logs:
[WARNING] <link rel=preload> uses an unsupported `as` value (at http://localhost:4200/:45:0)
[WARNING] The 'allowSignalWrites' flag is deprecated and no longer impacts effect() (writes are always allowed) (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-AY6GKBS4.js?v=af777c5b:3143:12)
[WARNING] Error getting current position: User denied Geolocation (at http://localhost:4200/chunk-YEIUFSFY.js:256:18)
[WARNING] ⚠️ LCP is above target (2.5s): 35.40s (at http://localhost:4200/main.js:6357:20)
[WARNING] ⚠️ Low FPS detected: 4fps (at http://localhost:4200/main.js:6337:18)
[WARNING] [GroupMarkerNotSet(crbug.com/242999)!:A0043D0084200000]Automatic fallback to software WebGL has been deprecated. Please use the --enable-unsafe-swiftshader flag to opt in to lower security guarantees for trusted content. (at http://localhost:4200/:0:0)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-d10aad20-280a-4819-ac79-ff22b79449e6-3/4-front-1761490075780.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] [.WebGL-0x20840c19cd00]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels (at http://localhost:4200/:0:0)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-images/22222222-2222-2222-2222-222222222222/8447c379-6b51-4b5e-8647-0f5de243f729/e6d81e06-8013-4a28-9363-d75f512c28a1-no-bg.png?t=1760916490501"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 600w x 400h (aspect-ratio: 1.50). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-59011ffc-b8e1-432a-b4f6-4fd5bdc4e3ee-3/4-front-1761490262740.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-caa404cc-6423-4f5e-b5df-f0d02f7d1aff-3/4-front-1761490282306.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-images/ae4a91fa-e951-49a3-94fb-0c3ee4786166/8a854591-3fec-4425-946e-c7bb764a7333/93adfdee-0014-4796-bf77-c53b25231576.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-95dadd02-5b5e-4cd0-89aa-0adad31c78a7-3/4-front-1761490291667.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-82c3ecf6-1d8c-46fc-9fad-6dd63c3aeac7-3/4-front-1761490271806.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] [.WebGL-0x20840c19cd00]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels (at http://localhost:4200/:0:0)
[WARNING] [.WebGL-0x20840c19cd00]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels (at http://localhost:4200/:0:0)
[WARNING] [.WebGL-0x20840c19cd00]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels (this message will no longer repeat) (at http://localhost:4200/:0:0)
[WARNING] ⚠️ No se pudo obtener ubicación del usuario: User denied Geolocation (at http://localhost:4200/chunk-HLEQ3OH3.js:895:16)
[WARNING] ⚠️ Low FPS detected: 9fps (at http://localhost:4200/main.js:6337:18)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-087227cd-24f6-49ed-901d-4c337abe4533-3/4-front-1761490100451.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/449c2d1e-d329-493e-b6ba-2c30209ae999/66227381-4fcb-4b89-ab3e-732e0a20192e
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC016
- **Test Name:** Handle Delayed Payment Confirmation Webhook
- **Test Code:** [TC016_Handle_Delayed_Payment_Confirmation_Webhook.py](./TC016_Handle_Delayed_Payment_Confirmation_Webhook.py)
- **Test Error:** Stopped testing due to critical issue: 'Ingresar' link is unresponsive and prevents booking initiation. Cannot proceed with MercadoPago webhook delay test.
Browser Console Logs:
[WARNING] <link rel=preload> uses an unsupported `as` value (at http://localhost:4200/:45:0)
[WARNING] ⚠️ Low FPS detected: 30fps (at http://localhost:4200/main.js:6337:18)
[WARNING] The 'allowSignalWrites' flag is deprecated and no longer impacts effect() (writes are always allowed) (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-AY6GKBS4.js?v=af777c5b:3143:12)
[WARNING] Error getting current position: User denied Geolocation (at http://localhost:4200/chunk-YEIUFSFY.js:256:18)
[WARNING] ⚠️ LCP is above target (2.5s): 29.35s (at http://localhost:4200/main.js:6357:20)
[WARNING] ⚠️ Low FPS detected: 15fps (at http://localhost:4200/main.js:6337:18)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-images/22222222-2222-2222-2222-222222222222/8447c379-6b51-4b5e-8647-0f5de243f729/e6d81e06-8013-4a28-9363-d75f512c28a1-no-bg.png?t=1760916490501"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 600w x 400h (aspect-ratio: 1.50). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] [GroupMarkerNotSet(crbug.com/242999)!:A0983C004C3C0000]Automatic fallback to software WebGL has been deprecated. Please use the --enable-unsafe-swiftshader flag to opt in to lower security guarantees for trusted content. (at http://localhost:4200/:0:0)
[WARNING] [.WebGL-0x3c4c0cd05a00]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels (at http://localhost:4200/:0:0)
[WARNING] ⚠️ Low FPS detected: 9fps (at http://localhost:4200/main.js:6337:18)
[WARNING] [.WebGL-0x3c4c0cd05a00]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels (at http://localhost:4200/:0:0)
[WARNING] [.WebGL-0x3c4c0cd05a00]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels (at http://localhost:4200/:0:0)
[WARNING] [.WebGL-0x3c4c0cd05a00]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels (this message will no longer repeat) (at http://localhost:4200/:0:0)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-59011ffc-b8e1-432a-b4f6-4fd5bdc4e3ee-3/4-front-1761490262740.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-d10aad20-280a-4819-ac79-ff22b79449e6-3/4-front-1761490075780.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-95dadd02-5b5e-4cd0-89aa-0adad31c78a7-3/4-front-1761490291667.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-caa404cc-6423-4f5e-b5df-f0d02f7d1aff-3/4-front-1761490282306.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] ⚠️ No se pudo obtener ubicación del usuario: User denied Geolocation (at http://localhost:4200/chunk-HLEQ3OH3.js:895:16)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-82c3ecf6-1d8c-46fc-9fad-6dd63c3aeac7-3/4-front-1761490271806.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-images/ae4a91fa-e951-49a3-94fb-0c3ee4786166/8a854591-3fec-4425-946e-c7bb764a7333/93adfdee-0014-4796-bf77-c53b25231576.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/449c2d1e-d329-493e-b6ba-2c30209ae999/a00cba3d-8b40-439b-a91e-659f70f0ff5d
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC017
- **Test Name:** User Profile Update with Avatar and Verification
- **Test Code:** [TC017_User_Profile_Update_with_Avatar_and_Verification.py](./TC017_User_Profile_Update_with_Avatar_and_Verification.py)
- **Test Error:** Testing stopped due to inability to access user profile page. The 'Mi perfil' link is broken and prevents further testing of profile update, avatar upload, and verification process.
Browser Console Logs:
[WARNING] <link rel=preload> uses an unsupported `as` value (at http://localhost:4200/:45:0)
[WARNING] The 'allowSignalWrites' flag is deprecated and no longer impacts effect() (writes are always allowed) (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-AY6GKBS4.js?v=af777c5b:3143:12)
[WARNING] Error getting current position: User denied Geolocation (at http://localhost:4200/chunk-YEIUFSFY.js:256:18)
[WARNING] ⚠️ LCP is above target (2.5s): 31.39s (at http://localhost:4200/main.js:6357:20)
[WARNING] ⚠️ Low FPS detected: 12fps (at http://localhost:4200/main.js:6337:18)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-images/22222222-2222-2222-2222-222222222222/8447c379-6b51-4b5e-8647-0f5de243f729/e6d81e06-8013-4a28-9363-d75f512c28a1-no-bg.png?t=1760916490501"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 600w x 400h (aspect-ratio: 1.50). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[ERROR] Failed to load resource: the server responded with a status of 404 () (at https://example.com/cars/demo.jpg:0:0)
[WARNING] ⚠️ Low FPS detected: 12fps (at http://localhost:4200/main.js:6337:18)
[WARNING] [GroupMarkerNotSet(crbug.com/242999)!:A0ECDB00BC040000]Automatic fallback to software WebGL has been deprecated. Please use the --enable-unsafe-swiftshader flag to opt in to lower security guarantees for trusted content. (at http://localhost:4200/:0:0)
[WARNING] [.WebGL-0x4bc080b3600]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels (at http://localhost:4200/:0:0)
[WARNING] [.WebGL-0x4bc080b3600]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels (at http://localhost:4200/:0:0)
[WARNING] [.WebGL-0x4bc080b3600]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels (at http://localhost:4200/:0:0)
[WARNING] [.WebGL-0x4bc080b3600]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels (this message will no longer repeat) (at http://localhost:4200/:0:0)
[WARNING] ⚠️ Low FPS detected: 1fps (at http://localhost:4200/main.js:6337:18)
[WARNING] ⚠️ No se pudo obtener ubicación del usuario: User denied Geolocation (at http://localhost:4200/chunk-HLEQ3OH3.js:895:16)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-caa404cc-6423-4f5e-b5df-f0d02f7d1aff-3/4-front-1761490282306.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-d10aad20-280a-4819-ac79-ff22b79449e6-3/4-front-1761490075780.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-59011ffc-b8e1-432a-b4f6-4fd5bdc4e3ee-3/4-front-1761490262740.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-images/ae4a91fa-e951-49a3-94fb-0c3ee4786166/8a854591-3fec-4425-946e-c7bb764a7333/93adfdee-0014-4796-bf77-c53b25231576.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-95dadd02-5b5e-4cd0-89aa-0adad31c78a7-3/4-front-1761490291667.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/449c2d1e-d329-493e-b6ba-2c30209ae999/a5ebca8c-0aa2-4486-a9e5-486b8923218c
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC018
- **Test Name:** Booking Review Submission Post Rental Completion
- **Test Code:** [TC018_Booking_Review_Submission_Post_Rental_Completion.py](./TC018_Booking_Review_Submission_Post_Rental_Completion.py)
- **Test Error:** The task to verify that locadores and locatarios can submit reviews and ratings after rental completion could not be fully completed. The main blocker was a backend connection error with Supabase preventing login and access to the dashboard or bookings page. Without successful login and booking completion, review submission could not be tested. Please resolve the backend connection issue and retry the test.
Browser Console Logs:
[WARNING] <link rel=preload> uses an unsupported `as` value (at http://localhost:4200/:45:0)
[WARNING] The 'allowSignalWrites' flag is deprecated and no longer impacts effect() (writes are always allowed) (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-AY6GKBS4.js?v=af777c5b:3143:12)
[WARNING] Error getting current position: User denied Geolocation (at http://localhost:4200/chunk-YEIUFSFY.js:256:18)
[WARNING] ⚠️ LCP is above target (2.5s): 30.58s (at http://localhost:4200/main.js:6357:20)
[WARNING] ⚠️ Low FPS detected: 2fps (at http://localhost:4200/main.js:6337:18)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-images/22222222-2222-2222-2222-222222222222/8447c379-6b51-4b5e-8647-0f5de243f729/e6d81e06-8013-4a28-9363-d75f512c28a1-no-bg.png?t=1760916490501"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 600w x 400h (aspect-ratio: 1.50). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[ERROR] Failed to load resource: the server responded with a status of 404 () (at https://example.com/cars/demo.jpg:0:0)
[WARNING] ⚠️ Low FPS detected: 15fps (at http://localhost:4200/main.js:6337:18)
[WARNING] [GroupMarkerNotSet(crbug.com/242999)!:A0AC3B005C290000]Automatic fallback to software WebGL has been deprecated. Please use the --enable-unsafe-swiftshader flag to opt in to lower security guarantees for trusted content. (at http://localhost:4200/:0:0)
[WARNING] [.WebGL-0x295c0e237600]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels (at http://localhost:4200/:0:0)
[WARNING] [.WebGL-0x295c0e237600]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels (at http://localhost:4200/:0:0)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-d10aad20-280a-4819-ac79-ff22b79449e6-3/4-front-1761490075780.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-59011ffc-b8e1-432a-b4f6-4fd5bdc4e3ee-3/4-front-1761490262740.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] [.WebGL-0x295c0e237600]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels (at http://localhost:4200/:0:0)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-caa404cc-6423-4f5e-b5df-f0d02f7d1aff-3/4-front-1761490282306.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] [.WebGL-0x295c0e237600]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels (this message will no longer repeat) (at http://localhost:4200/:0:0)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-82c3ecf6-1d8c-46fc-9fad-6dd63c3aeac7-3/4-front-1761490271806.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-images/ae4a91fa-e951-49a3-94fb-0c3ee4786166/8a854591-3fec-4425-946e-c7bb764a7333/93adfdee-0014-4796-bf77-c53b25231576.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-95dadd02-5b5e-4cd0-89aa-0adad31c78a7-3/4-front-1761490291667.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
[WARNING] NG02952: The NgOptimizedImage directive (activated on an <img> element with the `ngSrc="https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-47738b52-5173-4079-a236-996bc57940f9-3/4-front-1761490242123.png"`) has detected that the aspect ratio of the image does not match the aspect ratio indicated by the width and height attributes. 
Intrinsic image size: 1024w x 1024h (aspect-ratio: 1). 
Supplied width and height attributes: 400w x 300h (aspect-ratio: 1.33). 
To fix this, update the width and height attributes. (at http://localhost:4200/@fs/home/edu/autorenta/apps/web/.angular/cache/20.3.8/web/vite/deps/chunk-RZZERZYN.js?v=af777c5b:4949:14)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/449c2d1e-d329-493e-b6ba-2c30209ae999/be49ceab-c0f7-47a2-8733-5d4fd0a03498
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---


## 3️⃣ Coverage & Matching Metrics

- **0.00** of tests passed

| Requirement        | Total Tests | ✅ Passed | ❌ Failed  |
|--------------------|-------------|-----------|------------|
| ...                | ...         | ...       | ...        |
---


## 4️⃣ Key Gaps / Risks
{AI_GNERATED_KET_GAPS_AND_RISKS}
---