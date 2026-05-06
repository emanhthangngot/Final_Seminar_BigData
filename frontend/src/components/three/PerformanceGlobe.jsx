import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Sparkles } from '@react-three/drei'
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
          <lineBasicMaterial color={color} transparent opacity={0.82} />
        </line>
      ))}
    </group>
  )
}

function ReactorCore() {
  const ref = useRef()
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.35
      ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.4) * 0.18
    }
  })
  return (
    <group ref={ref}>
      <mesh>
        <sphereGeometry args={[0.55, 48, 48]} />
        <meshStandardMaterial color="#0b1024" emissive="#22D3EE" emissiveIntensity={0.55} roughness={0.2} metalness={0.45} transparent opacity={0.82} />
      </mesh>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} rotation={[Math.PI / 2 + i * 0.4, i * 0.8, 0]}>
          <torusGeometry args={[1.05 + i * 0.27, 0.01, 8, 160]} />
          <meshBasicMaterial color={i % 2 ? '#C084FC' : '#22D3EE'} transparent opacity={0.46} />
        </mesh>
      ))}
    </group>
  )
}

export default function PerformanceGlobe({ metrics = { Qdrant: 0.9, Weaviate: 0.75, Milvus: 0.85 } }) {
  return (
    <Canvas camera={{ position: [0, 2, 5], fov: 60 }} style={{ background: 'transparent' }}>
      <fog attach="fog" args={['#060816', 5, 13]} />
      <ambientLight intensity={0.45} />
      <pointLight position={[3, 3, 3]} intensity={1.2} color="#A8B4FF" />
      <pointLight position={[-3, 1, 2]} intensity={0.8} color="#22D3EE" />
      <Sparkles count={70} scale={4.2} size={1.6} speed={0.35} color="#A8F3FF" opacity={0.45} />
      <ReactorCore />
      <RadarRing metrics={metrics} />
      <OrbitControls enablePan={false} autoRotate autoRotateSpeed={0.6} />
    </Canvas>
  )
}
