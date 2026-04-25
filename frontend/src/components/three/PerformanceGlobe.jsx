import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

const DB_METRICS = {
  Qdrant:   { color: '#EF4444', baseRadius: 1.0 },
  Weaviate: { color: '#3B82F6', baseRadius: 1.0 },
  Milvus:   { color: '#10B981', baseRadius: 1.0 },
}

function RadarRing({ metrics, colors }) {
  const ref = useRef()

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.15
    }
  })

  const rings = useMemo(() => {
    return Object.entries(metrics).map(([db, value], i) => {
      const { color } = DB_METRICS[db]
      const r = 0.5 + value * 1.2
      const points = []
      for (let j = 0; j <= 64; j++) {
        const angle = (j / 64) * Math.PI * 2
        points.push(new THREE.Vector3(Math.cos(angle) * r, (i - 1) * 0.6, Math.sin(angle) * r))
      }
      const geo = new THREE.BufferGeometry().setFromPoints(points)
      return { geo, color, db }
    })
  }, [metrics])

  return (
    <group ref={ref}>
      {rings.map(({ geo, color, db }) => (
        <line key={db} geometry={geo}>
          <lineBasicMaterial color={color} transparent opacity={0.8} linewidth={2} />
        </line>
      ))}
    </group>
  )
}

export default function PerformanceGlobe({ metrics = { Qdrant: 0.9, Weaviate: 0.75, Milvus: 0.85 } }) {
  return (
    <Canvas camera={{ position: [0, 2, 5], fov: 60 }} style={{ background: 'transparent' }}>
      <ambientLight intensity={0.4} />
      <pointLight position={[3, 3, 3]} intensity={1} />
      <RadarRing metrics={metrics} />
      <OrbitControls enablePan={false} autoRotate autoRotateSpeed={0.6} />
    </Canvas>
  )
}
