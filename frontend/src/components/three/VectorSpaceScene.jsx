import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Html, OrbitControls, Stars, Float } from '@react-three/drei'
import * as THREE from 'three'

const DB_CONFIG = {
  Qdrant:   { color: '#EF4444', position: [-3, 0, 0] },
  Weaviate: { color: '#3B82F6', position: [0, 2, 0] },
  Milvus:   { color: '#10B981', position: [3, 0, 0] },
}

function VectorCloud({ dbName, color, position, vectorCount = 120 }) {
  const groupRef = useRef()
  const materialRef = useRef()

  const points = useMemo(() => {
    const rng = mulberry32(dbName.charCodeAt(0) * 997)
    return Array.from({ length: vectorCount }, () => {
      const r = rng() * 1.4 + 0.2
      const theta = rng() * Math.PI * 2
      const phi = Math.acos(2 * rng() - 1)
      return [
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi),
      ]
    })
  }, [dbName, vectorCount])

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(points.flat(), 3))
    return geo
  }, [points])

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.1
      groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.7 + position[0]) * 0.08
    }
    if (materialRef.current) {
      materialRef.current.opacity = 0.54 + Math.sin(state.clock.elapsedTime * 1.8 + position[0]) * 0.16
    }
  })

  return (
    <group ref={groupRef} position={position}>
      <points geometry={geometry}>
        <pointsMaterial ref={materialRef} color={color} size={0.055} transparent opacity={0.7} sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>

      {/* Edges between nearby points */}
      {points.slice(0, 18).map((p, i) => {
        const next = points[(i + 1) % 18]
        const geo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(...p),
          new THREE.Vector3(...next),
        ])
        return (
          <line key={i} geometry={geo}>
            <lineBasicMaterial color={color} transparent opacity={0.15} />
          </line>
        )
      })}

      <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.3}>
        <mesh>
          <sphereGeometry args={[0.18, 24, 24]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} />
        </mesh>
      </Float>
      <Html position={[0, -1.45, 0]} center distanceFactor={8}>
        <div className="rounded-full border border-white/10 bg-[#081025]/70 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-white shadow-glow backdrop-blur-xl">
          {dbName}
        </div>
      </Html>
    </group>
  )
}

function ConnectionBeam({ from, to, color }) {
  const ref = useRef()
  const points = [new THREE.Vector3(...from), new THREE.Vector3(...to)]
  const geo = new THREE.BufferGeometry().setFromPoints(points)

  useFrame((state) => {
    if (ref.current) {
      ref.current.material.opacity = 0.1 + Math.sin(state.clock.elapsedTime * 0.8) * 0.08
    }
  })

  return (
    <line ref={ref} geometry={geo}>
      <lineBasicMaterial color={color} transparent opacity={0.18} />
    </line>
  )
}

function NeuralCore() {
  const ref = useRef()
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.x = state.clock.elapsedTime * 0.11
      ref.current.rotation.z = state.clock.elapsedTime * 0.08
    }
  })
  return (
    <group ref={ref}>
      {[1.45, 1.9, 2.35].map((r, i) => (
        <mesh key={r} rotation={[Math.PI / 2 + i * 0.35, i * 0.5, 0]}>
          <torusGeometry args={[r, 0.008, 8, 160]} />
          <meshBasicMaterial color={i === 0 ? '#22D3EE' : i === 1 ? '#7C8DFF' : '#C084FC'} transparent opacity={0.32} />
        </mesh>
      ))}
    </group>
  )
}

export default function VectorSpaceScene({ activeDB = null }) {
  const entries = Object.entries(DB_CONFIG)

  return (
    <Canvas camera={{ position: [0, 2.2, 9], fov: 52 }} style={{ background: 'transparent' }}>
      <fog attach="fog" args={['#060816', 8, 18]} />
      <ambientLight intensity={0.45} />
      <pointLight position={[0, 5, 5]} intensity={1.4} color="#A8B4FF" />
      <pointLight position={[-4, 1, 3]} intensity={1.1} color="#22D3EE" />
      <Stars radius={90} depth={55} count={2600} factor={4.5} fade speed={0.7} />
      <NeuralCore />

      {entries.map(([name, { color, position }]) => (
        <VectorCloud
          key={name}
          dbName={name}
          color={activeDB && activeDB !== name ? '#374151' : color}
          position={position}
          vectorCount={activeDB === name ? 200 : 100}
        />
      ))}

      <ConnectionBeam from={[-3, 0, 0]} to={[0, 2, 0]} color="#5E6AD2" />
      <ConnectionBeam from={[0, 2, 0]} to={[3, 0, 0]} color="#5E6AD2" />
      <ConnectionBeam from={[-3, 0, 0]} to={[3, 0, 0]} color="#5E6AD2" />

      <OrbitControls
        enablePan={false}
        minDistance={5}
        maxDistance={16}
        autoRotate
        autoRotateSpeed={0.55}
      />
    </Canvas>
  )
}

function mulberry32(seed) {
  let s = seed
  return () => {
    s |= 0; s = s + 0x6D2B79F5 | 0
    let t = Math.imul(s ^ s >>> 15, 1 | s)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}
