"use client"

import { useState, useEffect, useRef } from "react"
import { Canvas } from " @react-three/fiber"
import { EffectComposer } from " @react-three/postprocessing"
import { OrbitControls } from " @react-three/drei"
import { Vector2 } from "three"
import { AsciiEffect } from "./ascii-effect"

export function AsciiScene() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [mousePos, setMousePos] = useState(new Vector2(0, 0))
  const [resolution, setResolution] = useState(new Vector2(1920, 1080))

  // Track mouse position for glow effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        const x = e.clientX - rect.left
        // Flip Y coordinate to match shader UV space (bottom-up instead of top-down)
        const y = rect.height - (e.clientY - rect.top)
        setMousePos(new Vector2(x, y))
      }
    }

    const container = containerRef.current
    if (container) {
      container.addEventListener("mousemove", handleMouseMove)

      // Set initial resolution
      const rect = container.getBoundingClientRect()
      setResolution(new Vector2(rect.width, rect.height))

      // Update resolution on resize
      const handleResize = () => {
        const rect = container.getBoundingClientRect()
        setResolution(new Vector2(rect.width, rect.height))
      }
      window.addEventListener("resize", handleResize)

      return () => {
        container.removeEventListener("mousemove", handleMouseMove)
        window.removeEventListener("resize", handleResize)
      }
    }
  }, [])

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100vh" }}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        style={{ background: "#000000" }}
      >
        <color attach="background" args={["#000000"]} />

        

        {/* ASCII Effect with PostFX */}
        <EffectComposer>
          <AsciiEffect
            style="standard"
            cellSize={4}
            invert={true}
            color={true}
            resolution={resolution}
            mousePos={mousePos}
            postfx={{
              scanlineIntensity: 0,
              scanlineCount: 250,
              targetFPS: 13,
              jitterIntensity: 0,
              jitterSpeed: 10,
              mouseGlowEnabled: false,
              mouseGlowRadius: 200,
              mouseGlowIntensity: 1.5,
              vignetteIntensity: 0,
              vignetteRadius: 0.7,
              colorPalette: "original",
              curvature: 0,
              aberrationStrength: 0,
              noiseIntensity: 1,
              noiseScale: 10,
              noiseSpeed: 5,
              waveAmplitude: 0,
              waveFrequency: 20,
              waveSpeed: 5,
              glitchIntensity: 0,
              glitchFrequency: 10,
              brightnessAdjust: 0,
              contrastAdjust: 1,
            }}
          />
        </EffectComposer>
      </Canvas>
    </div>
  )
}
