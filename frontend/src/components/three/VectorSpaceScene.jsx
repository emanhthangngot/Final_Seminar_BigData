import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Stars, Float } from '@react-three/drei'
import * as THREE from 'three'

const DB_CONFIG = {
  Qdrant:   { color: '#EF4444', position: [-3, 0, 0] },
  Weaviate: { color: '#3B82F6', position: [0, 2, 0] },
  Milvus:   { color: '#10B981', position: [3, 0, 0] },
}

function VectorCloud({ dbName, color, position, vectorCount = 120 }) {
  const groupRef = useRef()

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
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.08
    }
  })

  return (
    <group ref={groupRef} position={position}>
      <points geometry={geometry}>
        <pointsMaterial color={color} size={0.04} transparent opacity={0.7} sizeAttenuation />
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

      {/* Central sphere representing the DB node */}
      <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.3}>
        <mesh>
          <sphereGeometry args={[0.18, 24, 24]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} />
        </mesh>
      </Float>
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

export default function VectorSpaceScene({ activeDB = null }) {
  const entries = Object.entries(DB_CONFIG)

  return (
    <Canvas camera={{ position: [0, 2, 9], fov: 55 }} style={{ background: 'transparent' }}>
      <ambientLight intensity={0.3} />
      <pointLight position={[0, 5, 5]} intensity={1.2} />
      <Stars radius={80} depth={50} count={2000} factor={4} fade speed={0.5} />

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
        autoRotateSpeed={0.4}
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
