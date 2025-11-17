import * as THREE from 'https://unpkg.com/three@0.181.1/build/three.module.js'
import {
  EffectComposer,
  EffectPass,
  RenderPass,
  Effect,
  BlendFunction,
} from 'https://unpkg.com/postprocessing@6.38.0/dist/postprocessing.esm.js'

// Fragment shader (same as the Angular/React version) - trimmed comments
const fragmentShader = `
uniform float cellSize;
uniform bool invert;
uniform bool colorMode;
uniform int asciiStyle;
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

float random(vec2 st) { return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123); }
float noise(vec2 st) { vec2 i=floor(st), f=fract(st); float a=random(i), b=random(i+vec2(1.0,0.0)), c=random(i+vec2(0.0,1.0)), d=random(i+vec2(1.0,1.0)); vec2 u=f*f*(3.0-2.0*f); return mix(a,b,u.x) + (c-a)*u.y*(1.0-u.x) + (d-b)*u.x*u.y; }
float getChar(float brightness, vec2 p, int style) { vec2 grid = floor(p*4.0); float val=0.0; if(style==0){ if(brightness<0.2) val=(grid.x==1.0 && grid.y==1.0)?0.3:0.0; else if(brightness<0.35) val=(grid.x==1.0||grid.x==2.0)&&(grid.y==1.0||grid.y==2.0)?1.0:0.0; else if(brightness<0.5) val=(grid.y==1.0||grid.y==2.0)?1.0:0.0; else if(brightness<0.65) val=(grid.y==0.0||grid.y==3.0)?1.0:(grid.y==1.0||grid.y==2.0)?0.5:0.0; else if(brightness<0.8) val=(grid.x==0.0||grid.x==2.0||grid.y==0.0||grid.y==2.0)?1.0:0.3; else val=1.0; } return val; }

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 workUV = uv;
  if(curvature>0.0){ vec2 centered=workUV*2.0-1.0; centered*=1.0+curvature*dot(centered,centered); workUV=centered*0.5+0.5; if(workUV.x<0.0||workUV.x>1.0||workUV.y<0.0||workUV.y>1.0){ outputColor=vec4(0.0); return; } }
  if(waveAmplitude>0.0){ workUV.x += sin(workUV.y*waveFrequency + time*waveSpeed)*waveAmplitude; workUV.y += cos(workUV.x*waveFrequency + time*waveSpeed)*waveAmplitude; }
  vec4 sampledColor;
  if(aberrationStrength>0.0){ float offset = aberrationStrength; vec2 uvR=workUV+vec2(offset,0.0); vec2 uvG=workUV; vec2 uvB=workUV-vec2(offset,0.0); float r=texture(inputBuffer,uvR).r; float g=texture(inputBuffer,uvG).g; float b=texture(inputBuffer,uvB).b; sampledColor=vec4(r,g,b,1.0);} else sampledColor=texture(inputBuffer,workUV);
  sampledColor.rgb = (sampledColor.rgb - 0.5) * contrastAdjust + 0.5 + brightnessAdjust;
  if(noiseIntensity>0.0){ float n=noise(workUV*noiseScale + time*noiseSpeed); sampledColor.rgb += (n-0.5)*noiseIntensity; }
  vec2 cellCount = resolution / cellSize;
  vec2 cellCoord = floor(uv * cellCount);
  if(jitterIntensity>0.0){ float jitterTime=time*jitterSpeed; float jitterX=(random(vec2(cellCoord.y,floor(jitterTime)))-0.5)*jitterIntensity*2.0; float jitterY=(random(vec2(cellCoord.x,floor(jitterTime+1000.0)))-0.5)*jitterIntensity*2.0; cellCoord+=vec2(jitterX,jitterY); }
  vec2 cellUV = (cellCoord + 0.5) / cellCount;
  vec4 cellColor = texture(inputBuffer, cellUV);
  float brightness = dot(cellColor.rgb, vec3(0.299,0.587,0.114));
  if(invert) brightness = 1.0 - brightness;
  vec2 localUV = fract(uv * cellCount);
  float charValue = getChar(brightness, localUV, asciiStyle);
  vec3 finalColor = colorMode ? cellColor.rgb * charValue : vec3(brightness * charValue);
  if(mouseGlowEnabled){ vec2 pixelPos = uv * resolution; float dist=length(pixelPos-mousePos); float glow = exp(-dist/mouseGlowRadius) * mouseGlowIntensity; finalColor += glow; }
  if(scanlineIntensity>0.0){ float scanline = sin(uv.y * scanlineCount * 3.14159) * 0.5 + 0.5; finalColor *= 1.0 - (scanline * scanlineIntensity); }
  if(vignetteIntensity>0.0){ vec2 centered=uv*2.0-1.0; float vignette = 1.0 - dot(centered,centered) / vignetteRadius; finalColor *= mix(1.0, vignette, vignetteIntensity); }
  outputColor = vec4(finalColor, cellColor.a);
}
`

class AsciiEffect extends Effect {
  constructor({ cellSize = 6, invert = true, colorMode = true, style = 0, resolution = new THREE.Vector2(800,600), postfx = {} } = {}) {
    super('AsciiEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map([
        ['cellSize', { value: cellSize }],
        ['invert', { value: invert }],
        ['colorMode', { value: colorMode }],
        ['asciiStyle', { value: style }],
        ['time', { value: 0 }],
        ['resolution', { value: resolution }],
        ['mousePos', { value: new THREE.Vector2(0,0) }],
        ['scanlineIntensity', { value: postfx.scanlineIntensity || 0 }],
        ['scanlineCount', { value: postfx.scanlineCount || 250 }],
        ['targetFPS', { value: postfx.targetFPS || 13 }],
        ['jitterIntensity', { value: postfx.jitterIntensity || 0 }],
        ['jitterSpeed', { value: postfx.jitterSpeed || 10 }],
        ['mouseGlowEnabled', { value: postfx.mouseGlowEnabled || false }],
        ['mouseGlowRadius', { value: postfx.mouseGlowRadius || 200 }],
        ['mouseGlowIntensity', { value: postfx.mouseGlowIntensity || 1.5 }],
        ['vignetteIntensity', { value: postfx.vignetteIntensity || 0 }],
        ['vignetteRadius', { value: postfx.vignetteRadius || 0.7 }],
        ['colorPalette', { value: postfx.colorPalette || 0 }],
        ['curvature', { value: postfx.curvature || 0 }],
        ['aberrationStrength', { value: postfx.aberrationStrength || 0 }],
        ['noiseIntensity', { value: postfx.noiseIntensity || 1 }],
        ['noiseScale', { value: postfx.noiseScale || 10 }],
        ['noiseSpeed', { value: postfx.noiseSpeed || 5 }],
        ['waveAmplitude', { value: postfx.waveAmplitude || 0 }],
        ['waveFrequency', { value: postfx.waveFrequency || 20 }],
        ['waveSpeed', { value: postfx.waveSpeed || 5 }],
        ['glitchIntensity', { value: postfx.glitchIntensity || 0 }],
        ['glitchFrequency', { value: postfx.glitchFrequency || 10 }],
        ['brightnessAdjust', { value: postfx.brightnessAdjust || 0 }],
        ['contrastAdjust', { value: postfx.contrastAdjust || 1 }],
      ])
    })
    this._time = 0
  }
  addTime(dt){ this.uniforms.get('time').value += dt }
  setResolution(v){ this.uniforms.get('resolution').value = v }
  setMousePos(v){ this.uniforms.get('mousePos').value = v }
  setCellSize(n){ this.uniforms.get('cellSize').value = n }
  setInvert(b){ this.uniforms.get('invert').value = b }
}

async function main(){
  const container = document.getElementById('app')
  const w = container.clientWidth || window.innerWidth
  const h = container.clientHeight || window.innerHeight

  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(w, h)
  container.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(45, w/h, 0.1, 1000)
  camera.position.set(0,0,5)

  // A simple textured plane to visualize the effect
  const tex = new THREE.TextureLoader().load('https://picsum.photos/800/600')
  const geo = new THREE.PlaneGeometry(4,3)
  const mat = new THREE.MeshBasicMaterial({ map: tex })
  const quad = new THREE.Mesh(geo, mat)
  scene.add(quad)

  const composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))

  const ascii = new AsciiEffect({ cellSize: 6, invert: true, colorMode: true, resolution: new THREE.Vector2(w,h) })
  const effectPass = new EffectPass(camera, ascii)
  composer.addPass(effectPass)

  // Controls
  const cellEl = document.getElementById('cellSize')
  const invertEl = document.getElementById('invert')
  const colorEl = document.getElementById('color')
  cellEl.addEventListener('input', (e)=> ascii.setCellSize(Number(e.target.value)))
  invertEl.addEventListener('change', (e)=> ascii.setInvert(e.target.checked))
  colorEl.addEventListener('change', (e)=> ascii.uniforms.get('colorMode').value = e.target.checked)

  window.addEventListener('mousemove', (ev)=>{
    const r = renderer.domElement.getBoundingClientRect()
    const x = (ev.clientX - r.left)
    const y = (r.height - (ev.clientY - r.top))
    ascii.setMousePos(new THREE.Vector2(x, y))
  })

  const clock = new THREE.Clock()
  function frame(){
    const dt = clock.getDelta()
    ascii.addTime(dt)
    try{ composer.render(dt) } catch(e){ composer.render() }
    requestAnimationFrame(frame)
  }
  frame()
}

main().catch(err=> console.error(err))
