import { BlendFunction, Effect } from 'postprocessing';
import { Uniform, Vector2 } from 'three';

const fragmentShader = `
// Basic uniforms
uniform float cellSize;
uniform bool invert;
uniform bool colorMode;
uniform int asciiStyle;

// PostFX uniforms
uniform float time;
uniform vec2 resolution;
uniform vec2 mousePos;
uniform float scanlineIntensity;
uniform float scanlineCount;
uniform float targetFPS;
uniform float jitterIntensity;
uniform float jitterSpeed;
uniform bool mouseGlowEnabled;
uniform float mouseGlowRadius;
uniform float mouseGlowIntensity;
uniform float vignetteIntensity;
uniform float vignetteRadius;
uniform int colorPalette;
uniform float curvature;
uniform float aberrationStrength;
uniform float noiseIntensity;
uniform float noiseScale;
uniform float noiseSpeed;
uniform float waveAmplitude;
uniform float waveFrequency;
uniform float waveSpeed;
uniform float glitchIntensity;
uniform float glitchFrequency;
uniform float brightnessAdjust;
uniform float contrastAdjust;

// Helper functions
float random(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

float noise(vec2 st) {
  vec2 i = floor(st);
  vec2 f = fract(st);
  float a = random(i);
  float b = random(i + vec2(1.0, 0.0));
  float c = random(i + vec2(0.0, 1.0));
  float d = random(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

vec3 rgb2hsl(vec3 color) {
  float maxC = max(max(color.r, color.g), color.b);
  float minC = min(min(color.r, color.g), color.b);
  float delta = maxC - minC;
  float h = 0.0, s = 0.0, l = (maxC + minC) / 2.0;
  if (delta > 0.0) {
    s = l < 0.5 ? delta / (maxC + minC) : delta / (2.0 - maxC - minC);
    if (maxC == color.r) h = ((color.g - color.b) / delta) + (color.g < color.b ? 6.0 : 0.0);
    else if (maxC == color.g) h = ((color.b - color.r) / delta) + 2.0;
    else h = ((color.r - color.g) / delta) + 4.0;
    h /= 6.0;
  }
  return vec3(h, s, l);
}

vec3 hsl2rgb(vec3 hsl) {
  float h = hsl.x, s = hsl.y, l = hsl.z;
  float c = (1.0 - abs(2.0 * l - 1.0)) * s;
  float x = c * (1.0 - abs(mod(h * 6.0, 2.0) - 1.0));
  float m = l - c / 2.0;
  vec3 rgb;
  if (h < 1.0/6.0) rgb = vec3(c, x, 0.0);
  else if (h < 2.0/6.0) rgb = vec3(x, c, 0.0);
  else if (h < 3.0/6.0) rgb = vec3(0.0, c, x);
  else if (h < 4.0/6.0) rgb = vec3(0.0, x, c);
  else if (h < 5.0/6.0) rgb = vec3(x, 0.0, c);
  else rgb = vec3(c, 0.0, x);
  return rgb + m;
}

vec3 applyColorPalette(vec3 color, int palette) {
  if (palette == 1) { // Green
    float lum = dot(color, vec3(0.299, 0.587, 0.114));
    return vec3(0.1, lum * 0.9, 0.1);
  } else if (palette == 2) { // Amber
    float lum = dot(color, vec3(0.299, 0.587, 0.114));
    return vec3(lum * 1.0, lum * 0.6, lum * 0.2);
  } else if (palette == 3) { // Cyan
    float lum = dot(color, vec3(0.299, 0.587, 0.114));
    return vec3(0.0, lum * 0.8, lum);
  } else if (palette == 4) { // Blue
    float lum = dot(color, vec3(0.299, 0.587, 0.114));
    return vec3(0.1, 0.2, lum);
  }
  return color;
}

float getChar(float brightness, vec2 p, int style) {
  vec2 grid = floor(p * 4.0);
  float val = 0.0;
  if (style == 0) { // Standard
    if (brightness < 0.2) val = (grid.x == 1.0 && grid.y == 1.0) ? 0.3 : 0.0;
    else if (brightness < 0.35) val = (grid.x == 1.0 || grid.x == 2.0) && (grid.y == 1.0 || grid.y == 2.0) ? 1.0 : 0.0;
    else if (brightness < 0.5) val = (grid.y == 1.0 || grid.y == 2.0) ? 1.0 : 0.0;
    else if (brightness < 0.65) val = (grid.y == 0.0 || grid.y == 3.0) ? 1.0 : (grid.y == 1.0 || grid.y == 2.0) ? 0.5 : 0.0;
    else if (brightness < 0.8) val = (grid.x == 0.0 || grid.x == 2.0 || grid.y == 0.0 || grid.y == 2.0) ? 1.0 : 0.3;
    else val = 1.0;
  }
  return val;
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 workUV = uv;

  // PRE-PROCESSING (Tier 2)
  // Screen curvature
  if (curvature > 0.0) {
    vec2 centered = workUV * 2.0 - 1.0;
    centered *= 1.0 + curvature * dot(centered, centered);
    workUV = centered * 0.5 + 0.5;
    if (workUV.x < 0.0 || workUV.x > 1.0 || workUV.y < 0.0 || workUV.y > 1.0) {
      outputColor = vec4(0.0);
      return;
    }
  }

  // Wave distortion
  if (waveAmplitude > 0.0) {
    workUV.x += sin(workUV.y * waveFrequency + time * waveSpeed) * waveAmplitude;
    workUV.y += cos(workUV.x * waveFrequency + time * waveSpeed) * waveAmplitude;
  }

  // CORE ASCII RENDERING
  float currentTime = targetFPS > 0.0 ? floor(time * targetFPS) / targetFPS : time;

  vec4 sampledColor;
  if (aberrationStrength > 0.0) {
    float offset = aberrationStrength;
    vec2 uvR = workUV + vec2(offset, 0.0);
    vec2 uvG = workUV;
    vec2 uvB = workUV - vec2(offset, 0.0);
    float r = texture(inputBuffer, uvR).r;
    float g = texture(inputBuffer, uvG).g;
    float b = texture(inputBuffer, uvB).b;
    sampledColor = vec4(r, g, b, 1.0);
  } else {
    sampledColor = texture(inputBuffer, workUV);
  }

  // Contrast and brightness
  sampledColor.rgb = (sampledColor.rgb - 0.5) * contrastAdjust + 0.5 + brightnessAdjust;

  // Time-based noise
  if (noiseIntensity > 0.0) {
    float noiseVal = noise(workUV * noiseScale + time * noiseSpeed);
    sampledColor.rgb += (noiseVal - 0.5) * noiseIntensity;
  }

  // Jitter
  vec2 cellCount = resolution / cellSize;
  vec2 cellCoord = floor(uv * cellCount);
  if (jitterIntensity > 0.0) {
    float jitterTime = time * jitterSpeed;
    float jitterX = (random(vec2(cellCoord.y, floor(jitterTime))) - 0.5) * jitterIntensity * 2.0;
    float jitterY = (random(vec2(cellCoord.x, floor(jitterTime + 1000.0))) - 0.5) * jitterIntensity * 2.0;
    cellCoord += vec2(jitterX, jitterY);
  }

  // RGB Glitch
  if (glitchIntensity > 0.0 && glitchFrequency > 0.0) {
    float glitchTime = floor(time * glitchFrequency);
    float glitchRand = random(vec2(glitchTime, cellCoord.y));
    if (glitchRand < glitchIntensity) {
      float shift = (random(vec2(glitchTime + 1.0, cellCoord.y)) - 0.5) * 20.0;
      cellCoord.x += shift;
    }
  }

  vec2 cellUV = (cellCoord + 0.5) / cellCount;
  vec4 cellColor = texture(inputBuffer, cellUV);
  float brightness = dot(cellColor.rgb, vec3(0.299, 0.587, 0.114));

  if (invert) brightness = 1.0 - brightness;

  vec2 localUV = fract(uv * cellCount);
  float charValue = getChar(brightness, localUV, asciiStyle);

  vec3 finalColor;
  if (colorMode) {
    finalColor = cellColor.rgb * charValue;
  } else {
    finalColor = vec3(brightness * charValue);
  }

  // POST-PROCESSING (Tier 1)
  finalColor = applyColorPalette(finalColor, colorPalette);

  // Mouse glow
  if (mouseGlowEnabled) {
    vec2 pixelPos = uv * resolution;
    float dist = length(pixelPos - mousePos);
    float glow = exp(-dist / mouseGlowRadius) * mouseGlowIntensity;
    finalColor += glow;
  }

  // Scanlines
  if (scanlineIntensity > 0.0) {
    float scanline = sin(uv.y * scanlineCount * 3.14159) * 0.5 + 0.5;
    finalColor *= 1.0 - (scanline * scanlineIntensity);
  }

  // Vignette
  if (vignetteIntensity > 0.0) {
    vec2 centered = uv * 2.0 - 1.0;
    float vignette = 1.0 - dot(centered, centered) / vignetteRadius;
    finalColor *= mix(1.0, vignette, vignetteIntensity);
  }

  outputColor = vec4(finalColor, cellColor.a);
}
`;

export type AsciiEffectOptions = {
  cellSize?: number;
  invert?: boolean;
  colorMode?: boolean;
  style?: number;
  resolution?: Vector2;
  mousePos?: Vector2;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  postfx?: Record<string, any>;
};

export class AsciiEffect extends Effect {
  public declare uniforms: Map<string, Uniform>;

  constructor(opts: AsciiEffectOptions = {}) {
    const {
      cellSize = 4,
      invert = true,
      colorMode = true,
      style = 0,
      resolution = new Vector2(1920, 1080),
      mousePos = new Vector2(0, 0),
      postfx = {},
    } = opts;

    super('AsciiEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map([
        ['cellSize', new Uniform(cellSize)],
        ['invert', new Uniform(invert)],
        ['colorMode', new Uniform(colorMode)],
        ['asciiStyle', new Uniform(style)],
        ['time', new Uniform(0)],
        ['resolution', new Uniform(resolution)],
        ['mousePos', new Uniform(mousePos)],
        ['scanlineIntensity', new Uniform(postfx.scanlineIntensity || 0)],
        ['scanlineCount', new Uniform(postfx.scanlineCount || 250)],
        ['targetFPS', new Uniform(postfx.targetFPS || 13)],
        ['jitterIntensity', new Uniform(postfx.jitterIntensity || 0)],
        ['jitterSpeed', new Uniform(postfx.jitterSpeed || 10)],
        ['mouseGlowEnabled', new Uniform(postfx.mouseGlowEnabled || false)],
        ['mouseGlowRadius', new Uniform(postfx.mouseGlowRadius || 200)],
        ['mouseGlowIntensity', new Uniform(postfx.mouseGlowIntensity || 1.5)],
        ['vignetteIntensity', new Uniform(postfx.vignetteIntensity || 0)],
        ['vignetteRadius', new Uniform(postfx.vignetteRadius || 0.7)],
        ['colorPalette', new Uniform(postfx.colorPalette || 0)],
        ['curvature', new Uniform(postfx.curvature || 0)],
        ['aberrationStrength', new Uniform(postfx.aberrationStrength || 0)],
        ['noiseIntensity', new Uniform(postfx.noiseIntensity || 1)],
        ['noiseScale', new Uniform(postfx.noiseScale || 10)],
        ['noiseSpeed', new Uniform(postfx.noiseSpeed || 5)],
        ['waveAmplitude', new Uniform(postfx.waveAmplitude || 0)],
        ['waveFrequency', new Uniform(postfx.waveFrequency || 20)],
        ['waveSpeed', new Uniform(postfx.waveSpeed || 5)],
        ['glitchIntensity', new Uniform(postfx.glitchIntensity || 0)],
        ['glitchFrequency', new Uniform(postfx.glitchFrequency || 10)],
        ['brightnessAdjust', new Uniform(postfx.brightnessAdjust || 0)],
        ['contrastAdjust', new Uniform(postfx.contrastAdjust || 1)],
      ]),
    });
    
    // Asignar manualmente la referencia a uniforms ya que la clase base no la expone en su tipo público pero sí la usa
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.uniforms = (this as any).uniforms as unknown as Map<string, Uniform>;
    if (!this.uniforms) {
      // Fallback por si la implementación interna cambia (sin @ts-expect-error)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const anySelf = this as any;
      const maybeUniforms = anySelf.nav?.uniforms as Map<string, Uniform> | undefined;
      this.uniforms = maybeUniforms ?? new Map();
    }
  }

  // Helpers to update uniforms from the host app
  setResolution(v: Vector2) {
    this.uniforms.get('resolution')!.value = v;
  }
  setMousePos(v: Vector2) {
    this.uniforms.get('mousePos')!.value = v;
  }
  setCellSize(n: number) {
    this.uniforms.get('cellSize')!.value = n;
  }
  setInvert(b: boolean) {
    this.uniforms.get('invert')!.value = b;
  }
  setColorMode(b: boolean) {
    this.uniforms.get('colorMode')!.value = b;
  }
  setAsciiStyle(i: number) {
    this.uniforms.get('asciiStyle')!.value = i;
  }
  addTime(dt: number) {
    this.uniforms.get('time')!.value += dt;
  }
}

export default AsciiEffect;
