# GyroLock V28 — Vulkan Native (Experimental)

V28 is an experimental migration of GyroLock's video stabilizer from OpenGL ES/EGL to a native Vulkan renderer. The Java stabilizer no longer imports or calls `android.opengl`, `GLES20`, `EGL14`, or `SurfaceTexture`. Rendering is performed by `app/src/main/cpp/gyrolock_vulkan.cpp` through JNI and Vulkan.

## Pipeline

1. `MediaExtractor` reads the original video track.
2. `MediaCodec` decodes frames to CPU-readable `YUV_420_888` images.
3. Java packs the decoder Y, U, and V planes into contiguous buffers; Vulkan performs YUV-to-RGB conversion in the fragment shader.
4. Vulkan uploads the RGBA frame to a GPU image, applies orientation/correction/crop/mirror-edge blur in a fragment shader, and presents the rendered frame to the MediaCodec encoder input surface.
5. `MediaCodec` encodes H.264 at a 30 FPS target.
6. The original audio track is remuxed without re-encoding.

The gyro correction arrays still come from the existing 240-point stabilization path. This version is experimental: Copying the decoded YUV planes through Java still adds CPU work; actual GPU/codec compatibility, frame timing, audio sync, portrait orientation, and output quality must be tested on a device. Vulkan support is required at runtime; unsupported devices should show a renderer error rather than silently falling back to OpenGL.

## Build on GitHub Actions

1. Upload the **contents** of this ZIP to the repository root.
2. Open **Actions** → **Build GyroLock Vulkan APK** → **Run workflow**.
3. Download the artifact named `GyroLock-V28-Vulkan-debug-apk` after a successful build.

The workflow installs Android NDK 27.2, CMake 3.22.1, and `glslang-tools`. GLSL shaders are compiled to SPIR-V as part of the Gradle pre-build task.

## Important limitations

- V28 has not been compiled or device-tested in the author's local environment; the GitHub Actions result is the first build check.
- `MediaCodec` decoder support for readable flexible YUV output varies by codec/device.
- The renderer requires a Vulkan-capable Android device and a Vulkan present queue that supports the encoder input surface.
- The current migration uses a genuine Vulkan-only render path, with YUV color conversion on the GPU, but speed is not guaranteed. Benchmarking and further optimization are still needed before treating it as a stable replacement for V27.


## V28.1 motion/throughput adjustments
- Launcher display name is **Camera**. Exported videos are published to `Movies/Camera`.
- Camera-path smoothing window widened to 1.35 s to better suppress rhythmic walking shake.
- Correction path receives a short 0.14 s centered smoothing pass to reduce visible counter-bounce.
- Trajectory smoothing uses a sliding-window prefix sum (linear-time) instead of repeated nested scans.
- Vulkan fragment shader reduced from five texture samples per output pixel to one to lower GPU work at FHD.

These are algorithm/performance changes and still require on-device testing. Gyroscope-only stabilization cannot fully correct translational motion or rolling-shutter distortion, and the actual improvement depends on sensor alignment and device camera timing.


## V28.2 camera-pivot tuning (experimental)
- Reduced X/Y translation correction to 8% to reduce visible whole-frame dragging/rubber-band motion; roll correction remains centered on the image.
- Reduced trajectory window from 1.35 s to 0.90 s and correction gain from 0.92 to 0.78 to reduce over-correction and improve responsiveness.
- Reduced correction-path smoothing from 0.14 s to 0.10 s.
- This is a conservative gyro-only tuning, not a full 3D camera-pose lock. Gyroscope data cannot infer camera translation; robust correction of walking parallax requires optical-flow/feature tracking and usually camera calibration. Runtime quality and speed remain unverified until built and tested on the target phone.


## V28.3 Jelly-reduction tuning
- Keuntungan koreksi stabilisasi tetap 0.78; crop tetap 1/1.12 dan pivot shift gain tetap 0.08.
- Referensi lintasan gyro memakai centered smoothing 1.00 s (sebelumnya 0.90 s).
- Kurva koreksi memakai centered smoothing 0.20 s (sebelumnya 0.10 s) untuk menekan perubahan koreksi berfrekuensi tinggi yang tampak seperti jelly, tanpa menurunkan gain stabilisasi.
- Ini penyetelan eksperimental: jelly akibat rolling shutter fisik/gerakan translasi tidak dapat dihilangkan sepenuhnya hanya dengan transformasi global berbasis gyro.
