#version 450
layout(set = 0, binding = 0) uniform sampler2D yPlane;
layout(set = 0, binding = 1) uniform sampler2D uPlane;
layout(set = 0, binding = 2) uniform sampler2D vPlane;
layout(push_constant) uniform Params {
    float angle;
    float offsetX;
    float offsetY;
    float crop;
    float rotation;
    float invWidth;
    float invHeight;
} pc;
layout(location = 0) in vec2 vUv;
layout(location = 0) out vec4 outColor;
vec2 mirrorUv(vec2 p) { return vec2(1.0) - abs(mod(p, 2.0) - vec2(1.0)); }
vec2 orientUv(vec2 p) {
    if (pc.rotation > 45.0 && pc.rotation < 135.0) return vec2(p.y, 1.0 - p.x);
    if (pc.rotation > 135.0 && pc.rotation < 225.0) return vec2(1.0 - p.x, 1.0 - p.y);
    if (pc.rotation > 225.0 && pc.rotation < 315.0) return vec2(1.0 - p.y, p.x);
    return p;
}
vec4 sampleMirror(vec2 p) {
    vec2 uv = mirrorUv(orientUv(p));
    float yy = texture(yPlane, uv).r;
    float uu = texture(uPlane, uv).r - 0.5;
    float vv = texture(vPlane, uv).r - 0.5;
    float c = max(0.0, yy - 0.0625);
    float r = 1.1643 * c + 1.5958 * vv;
    float g = 1.1643 * c - 0.3917 * uu - 0.8129 * vv;
    float b = 1.1643 * c + 2.0170 * uu;
    return vec4(clamp(vec3(r, g, b), 0.0, 1.0), 1.0);
}
void main() {
    vec2 p = (vUv - vec2(0.5)) * pc.crop;
    float c = cos(pc.angle), s = sin(pc.angle);
    p = mat2(c, -s, s, c) * p;
    vec2 warped = p + vec2(0.5) + vec2(pc.offsetX, pc.offsetY);
    // One texture sample per output pixel. The previous five-tap edge blur was
    // expensive at FHD and softened the whole frame on mobile GPUs. Mirror sampling
    // already fills the crop boundary, so keep the image crisp and render faster.
    outColor = sampleMirror(warped);
}
