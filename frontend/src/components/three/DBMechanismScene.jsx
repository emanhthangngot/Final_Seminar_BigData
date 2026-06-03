import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Html, OrbitControls, Sparkles } from '@react-three/drei'
import * as THREE from 'three'

const COLORS = {
  Qdrant: '#FB7185',
  Weaviate: '#22D3EE',
  Milvus: '#34D399',
  paper: '#E2E8F0',
  chunk: '#A7F3D0',
  amber: '#F59E0B',
  blue: '#60A5FA',
  pink: '#F472B6',
}

const TONES = {
  Qdrant: 'border-qdrant/30 bg-qdrant/10 text-qdrant',
  Weaviate: 'border-weaviate/30 bg-weaviate/10 text-weaviate',
  Milvus: 'border-milvus/30 bg-milvus/10 text-milvus',
  neutral: 'border-cyan/25 bg-cyan/10 text-cyan',
  result: 'border-emerald/25 bg-emerald/10 text-emerald',
}

function stageStrength(step, index) {
  if (step == null) return 1
  if (step === index) return 1
  if (step > index) return 0.72
  return 0.24
}

function Label({ children, position = [0, 0, 0], tone = 'neutral', wide = false }) {
  return (
    <Html position={position} center distanceFactor={8}>
      <div className={`rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] backdrop-blur-xl ${TONES[tone] ?? TONES.neutral} ${wide ? 'min-w-[150px] text-center' : ''}`}>
        {children}
      </div>
    </Html>
  )
}

function LabFloor({ width = 7.6, depth = 2.7, color = '#111827' }) {
  return (
    <group position={[0, -0.9, 0]}>
      <mesh receiveShadow>
        <boxGeometry args={[width, 0.08, depth]} />
        <meshStandardMaterial color={color} roughness={0.65} metalness={0.2} transparent opacity={0.86} />
      </mesh>
      <mesh position={[0, 0.048, 0]}>
        <boxGeometry args={[width - 0.16, 0.012, 0.025]} />
        <meshBasicMaterial color="#22D3EE" transparent opacity={0.22} />
      </mesh>
    </group>
  )
}

function StageBackdrop({ db = 'Qdrant', width = 8.2 }) {
  const color = COLORS[db] ?? '#22D3EE'
  const ref = useRef()

  useFrame((state) => {
    if (!ref.current) return
    ref.current.material.opacity = 0.08 + Math.sin(state.clock.elapsedTime * 0.65) * 0.025
  })

  return (
    <group>
      <mesh position={[0, 0.02, -1.35]} rotation={[0, 0, 0]}>
        <boxGeometry args={[width, 2.2, 0.05]} />
        <meshStandardMaterial color="#020617" roughness={0.55} metalness={0.2} transparent opacity={0.56} />
      </mesh>
      <mesh ref={ref} position={[0, 0.2, -1.31]}>
        <planeGeometry args={[width - 0.7, 1.45]} />
        <meshBasicMaterial color={color} transparent opacity={0.1} depthWrite={false} />
      </mesh>
      {[-3, -1.5, 0, 1.5, 3].map((x) => (
        <mesh key={x} position={[x, 0.2, -1.27]}>
          <boxGeometry args={[0.012, 1.35, 0.012]} />
          <meshBasicMaterial color={color} transparent opacity={0.12} />
        </mesh>
      ))}
      {[0.84, 0.24, -0.36].map((y) => (
        <mesh key={y} position={[0, y, -1.26]}>
          <boxGeometry args={[width - 1.1, 0.012, 0.012]} />
          <meshBasicMaterial color={color} transparent opacity={0.1} />
        </mesh>
      ))}
    </group>
  )
}

function DocumentStack({ position, active = 1, compact = false }) {
  const group = useRef()
  useFrame((state) => {
    if (!group.current) return
    group.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 1.2) * 0.035 * active
  })

  return (
    <group ref={group} position={position} scale={compact ? 0.7 : 1}>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[i * 0.07, i * 0.045, -i * 0.025]} rotation={[0, 0, -0.05 + i * 0.035]}>
          <boxGeometry args={[0.72, 0.46, 0.025]} />
          <meshStandardMaterial color={COLORS.paper} roughness={0.5} transparent opacity={0.52 + active * 0.4} />
        </mesh>
      ))}
      {[0, 1, 2].map((i) => (
        <mesh key={`line-${i}`} position={[-0.06, 0.04 - i * 0.1, 0.055]}>
          <boxGeometry args={[0.42 - i * 0.06, 0.018, 0.018]} />
          <meshBasicMaterial color="#64748B" transparent opacity={0.25 + active * 0.4} />
        </mesh>
      ))}
      {!compact && <Label position={[0, -0.65, 0]} tone="neutral">documents</Label>}
    </group>
  )
}

function ChunkCards({ position, active = 1, compact = false, db = 'Qdrant' }) {
  const meta = db === 'Qdrant'
  return (
    <group position={position} scale={compact ? 0.68 : 1}>
      {[0, 1, 2].map((i) => (
        <group key={i} position={[0, (i - 1) * 0.22, i * 0.02]} rotation={[0, 0, i % 2 ? 0.05 : -0.05]}>
          <mesh>
            <boxGeometry args={[0.72, 0.15, 0.06]} />
            <meshStandardMaterial color={COLORS.chunk} emissive={COLORS.chunk} emissiveIntensity={0.08} transparent opacity={0.18 + active * 0.65} />
          </mesh>
          {meta && (
            <mesh position={[0.23, 0, 0.045]}>
              <boxGeometry args={[0.18, 0.055, 0.02]} />
              <meshBasicMaterial color={COLORS.Qdrant} transparent opacity={0.35 + active * 0.45} />
            </mesh>
          )}
        </group>
      ))}
      {!compact && <Label position={[0, -0.62, 0]} tone="neutral">{meta ? 'chunks + payload' : 'chunks'}</Label>}
    </group>
  )
}

function EmbeddingMachine({ position, active = 1, compact = false }) {
  const core = useRef()
  useFrame((state) => {
    if (!core.current) return
    core.current.rotation.y = state.clock.elapsedTime * (0.45 + active * 0.6)
    core.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 2.6) * 0.035 * active)
  })

  return (
    <group position={position} scale={compact ? 0.72 : 1}>
      <mesh>
        <boxGeometry args={[0.72, 0.56, 0.7]} />
        <meshStandardMaterial color="#172554" roughness={0.34} metalness={0.55} transparent opacity={0.46 + active * 0.42} />
      </mesh>
      <mesh ref={core} position={[0, 0, 0.05]}>
        <octahedronGeometry args={[0.25, 0]} />
        <meshStandardMaterial color="#22D3EE" emissive="#22D3EE" emissiveIntensity={0.25 + active * 0.55} roughness={0.18} metalness={0.55} />
      </mesh>
      <mesh position={[0, -0.4, 0]}>
        <boxGeometry args={[0.96, 0.08, 0.78]} />
        <meshStandardMaterial color="#020617" roughness={0.7} transparent opacity={0.6} />
      </mesh>
      {!compact && <Label position={[0, -0.78, 0]} tone="neutral" wide>embedding machine</Label>}
    </group>
  )
}

function SearchProbe({ position, color, active = 1, compact = false }) {
  const ref = useRef()
  useFrame((state) => {
    if (!ref.current) return
    ref.current.rotation.z = state.clock.elapsedTime * (0.8 + active * 0.9)
    ref.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2.1) * 0.04 * active
  })

  return (
    <group ref={ref} position={position} scale={compact ? 0.7 : 1}>
      <mesh>
        <sphereGeometry args={[0.13, 24, 24]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.45 + active * 0.55} roughness={0.18} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.32, 0.012, 8, 72]} />
        <meshBasicMaterial color={color} transparent opacity={0.22 + active * 0.42} />
      </mesh>
    </group>
  )
}

function VectorBlocks({ position, color, active = 1, count = 9, compact = false, label = 'vectors' }) {
  const group = useRef()
  const blocks = useMemo(() => {
    const rng = mulberry32(count * 971 + color.length)
    return Array.from({ length: count }, (_, i) => ({
      p: [(rng() - 0.5) * 0.95, (rng() - 0.5) * 0.65, (rng() - 0.5) * 0.45],
      r: [rng() * Math.PI, rng() * Math.PI, rng() * Math.PI],
      s: 0.085 + rng() * 0.035,
      keep: i % 3 !== 0,
    }))
  }, [color.length, count])

  useFrame((state) => {
    if (!group.current) return
    group.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.7) * 0.16
  })

  return (
    <group ref={group} position={position} scale={compact ? 0.7 : 1}>
      {blocks.map((block, i) => (
        <mesh key={i} position={block.p} rotation={block.r}>
          <octahedronGeometry args={[block.s, 0]} />
          <meshStandardMaterial color={block.keep ? color : '#64748B'} emissive={block.keep ? color : '#334155'} emissiveIntensity={block.keep ? 0.2 + active * 0.38 : 0.04} transparent opacity={(block.keep ? 0.22 : 0.08) + active * (block.keep ? 0.7 : 0.25)} />
        </mesh>
      ))}
      {!compact && label && <Label position={[0, -0.7, 0]} tone="neutral">{label}</Label>}
    </group>
  )
}

function FlowPacket({ path, color, active = true, delay = 0, radius = 0.06 }) {
  const ref = useRef()
  const points = useMemo(() => path.map((p) => new THREE.Vector3(...p)), [path])

  useFrame((state) => {
    if (!ref.current || !active) return
    const t = (state.clock.elapsedTime * 0.28 + delay) % 1
    const scaled = t * (points.length - 1)
    const index = Math.min(points.length - 2, Math.floor(scaled))
    const local = scaled - index
    ref.current.position.lerpVectors(points[index], points[index + 1], local)
    ref.current.rotation.x = state.clock.elapsedTime * 2
    ref.current.rotation.y = state.clock.elapsedTime * 1.4
  })

  if (!active) return null
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[radius, 18, 18]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.65} roughness={0.22} />
    </mesh>
  )
}

function Beam({ from, to, color, active = 1 }) {
  const ref = useRef()
  const geometry = useMemo(() => new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(...from),
    new THREE.Vector3(...to),
  ]), [from, to])

  useFrame((state) => {
    if (!ref.current) return
    ref.current.material.opacity = (0.08 + Math.sin(state.clock.elapsedTime * 1.4) * 0.04) * active
  })

  return (
    <line ref={ref} geometry={geometry}>
      <lineBasicMaterial color={color} transparent opacity={0.16 * active} />
    </line>
  )
}

function FilterGate({ position, active = 1, compact = false }) {
  const gate = useRef()
  useFrame((state) => {
    if (!gate.current) return
    gate.current.rotation.y = Math.sin(state.clock.elapsedTime * 1.1) * 0.18
  })
  return (
    <group position={position}>
      <mesh ref={gate} rotation={[0, 0, Math.PI / 4]}>
        <torusGeometry args={[0.54, 0.04, 8, 4]} />
        <meshStandardMaterial color={COLORS.Qdrant} emissive={COLORS.Qdrant} emissiveIntensity={0.35 + active * 0.45} transparent opacity={0.24 + active * 0.58} />
      </mesh>
      <mesh position={[0.74, 0, 0]}>
        <sphereGeometry args={[0.36, 24, 24]} />
        <meshStandardMaterial color="#FDE68A" emissive="#F59E0B" emissiveIntensity={0.24} transparent opacity={0.25 + active * 0.48} />
      </mesh>
      {!compact && <Label position={[0.3, -0.82, 0]} tone="Qdrant" wide>payload filter gate</Label>}
    </group>
  )
}

function FusionChamber({ position, active = 1, compact = false }) {
  const ref = useRef()
  useFrame((state) => {
    if (!ref.current) return
    ref.current.rotation.z = state.clock.elapsedTime * (0.28 + active * 0.35)
    ref.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 2.2) * 0.04 * active)
  })
  return (
    <group position={position}>
      <mesh position={[-0.68, 0.34, 0]}>
        <boxGeometry args={[0.62, 0.28, 0.32]} />
        <meshStandardMaterial color={COLORS.blue} emissive={COLORS.blue} emissiveIntensity={0.28} transparent opacity={0.35 + active * 0.48} />
      </mesh>
      <mesh position={[-0.68, -0.34, 0]}>
        <boxGeometry args={[0.62, 0.28, 0.32]} />
        <meshStandardMaterial color={COLORS.pink} emissive={COLORS.pink} emissiveIntensity={0.28} transparent opacity={0.35 + active * 0.48} />
      </mesh>
      <group ref={ref} position={[0.28, 0, 0]}>
        <mesh>
          <torusGeometry args={[0.52, 0.048, 12, 96]} />
          <meshStandardMaterial color={COLORS.Weaviate} emissive={COLORS.Weaviate} emissiveIntensity={0.48} transparent opacity={0.4 + active * 0.5} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.35, 0.026, 12, 96]} />
          <meshStandardMaterial color={COLORS.pink} emissive={COLORS.pink} emissiveIntensity={0.32} transparent opacity={0.28 + active * 0.4} />
        </mesh>
      </group>
      {!compact && <Label position={[0, -0.92, 0]} tone="Weaviate" wide>dense + BM25 fusion</Label>}
    </group>
  )
}

function MilvusCore({ position, active = 1, compact = false }) {
  const ram = useRef()
  useFrame((state) => {
    if (!ram.current) return
    ram.current.rotation.y = state.clock.elapsedTime * (0.22 + active * 0.32)
    ram.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.7) * 0.14
  })

  return (
    <group position={position}>
      <mesh position={[-0.95, 0.34, 0]}>
        <boxGeometry args={[0.58, 0.42, 0.5]} />
        <meshStandardMaterial color={COLORS.amber} emissive={COLORS.amber} emissiveIntensity={0.18} transparent opacity={0.38 + active * 0.38} />
      </mesh>
      {!compact && <Label position={[-0.95, -0.34, 0]} tone="Milvus">MinIO</Label>}
      <mesh position={[-0.2, 0.48, 0]}>
        <sphereGeometry args={[0.22, 24, 24]} />
        <meshStandardMaterial color="#94A3B8" emissive="#64748B" emissiveIntensity={0.2} transparent opacity={0.4 + active * 0.35} />
      </mesh>
      {!compact && <Label position={[-0.2, -0.16, 0]} tone="Milvus">etcd</Label>}
      {[-0.18, 0, 0.18].map((y, i) => (
        <mesh key={i} position={[0.52 + i * 0.13, y, 0]} rotation={[0, i * 0.3, 0]}>
          <boxGeometry args={[0.32, 0.1, 0.22]} />
          <meshStandardMaterial color={COLORS.Milvus} emissive={COLORS.Milvus} emissiveIntensity={0.2 + active * 0.28} transparent opacity={0.28 + active * 0.52} />
        </mesh>
      ))}
      <group ref={ram} position={[1.15, 0.12, 0]}>
        {[0.38, 0.58, 0.78].map((radius, i) => (
          <mesh key={radius} rotation={[Math.PI / 2 + i * 0.32, i * 0.55, 0]}>
            <torusGeometry args={[radius, 0.018, 8, 116]} />
            <meshBasicMaterial color={COLORS.Milvus} transparent opacity={0.28 + active * (0.42 - i * 0.08)} />
          </mesh>
        ))}
      </group>
      {!compact && <Label position={[0.45, -0.92, 0]} tone="Milvus" wide>segments loaded to RAM</Label>}
    </group>
  )
}

function EvidenceCards({ position, active = 1, color, labels = ['Top-1', 'Top-2', 'Top-3'], compact = false }) {
  const group = useRef()
  useFrame((state) => {
    if (!group.current) return
    group.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 1.5) * 0.025 * active
  })
  return (
    <group ref={group} position={position} scale={compact ? 0.68 : 1}>
      {labels.map((label, i) => (
        <group key={label} position={[0, (1 - i) * 0.23, 0.02 * i]}>
          <mesh>
            <boxGeometry args={[0.82, 0.16, 0.05]} />
            <meshStandardMaterial color={i === 0 ? color : '#CBD5E1'} emissive={i === 0 ? color : '#334155'} emissiveIntensity={i === 0 ? 0.22 + active * 0.32 : 0.05} transparent opacity={0.16 + active * (i === 0 ? 0.76 : 0.48)} />
          </mesh>
          <Html position={[0, 0, 0.06]} center distanceFactor={9}>
            <span className="rounded bg-black/30 px-1.5 py-0.5 font-mono text-[9px] text-white/90">{label}</span>
          </Html>
        </group>
      ))}
      {!compact && <Label position={[0, -0.68, 0]} tone="result">top-k evidence</Label>}
    </group>
  )
}

function LLMTerminal({ position, active = 1, color, compact = false }) {
  const cursor = useRef()
  useFrame((state) => {
    if (!cursor.current) return
    cursor.material.opacity = 0.2 + (Math.sin(state.clock.elapsedTime * 5.5) > 0 ? 0.65 : 0.1) * active
  })

  return (
    <group position={position} scale={compact ? 0.64 : 1}>
      <mesh>
        <boxGeometry args={[0.96, 0.58, 0.08]} />
        <meshStandardMaterial color="#020617" roughness={0.36} metalness={0.48} transparent opacity={0.52 + active * 0.35} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[-0.18 + i * 0.17, 0.18, 0.055]}>
          <boxGeometry args={[0.1, 0.035, 0.02]} />
          <meshBasicMaterial color={i === 0 ? color : '#94A3B8'} transparent opacity={0.28 + active * 0.55} />
        </mesh>
      ))}
      {[0, 1, 2].map((i) => (
        <mesh key={`line-${i}`} position={[-0.08, 0.02 - i * 0.12, 0.055]}>
          <boxGeometry args={[0.48 - i * 0.08, 0.026, 0.02]} />
          <meshBasicMaterial color="#CBD5E1" transparent opacity={0.16 + active * 0.38} />
        </mesh>
      ))}
      <mesh ref={cursor} position={[0.28, -0.22, 0.06]}>
        <boxGeometry args={[0.035, 0.12, 0.025]} />
        <meshBasicMaterial color={color} transparent opacity={0.55} />
      </mesh>
      {!compact && <Label position={[0, -0.7, 0]} tone="result">LLM answer</Label>}
    </group>
  )
}

function StoryPath({ db, step, compact = false }) {
  const color = COLORS[db]
  const path = compact
    ? [[-1.55, 0.12, 0], [-0.72, 0.18, 0], [0.12, 0.16, 0], [0.95, 0.12, 0], [1.58, 0.08, 0]]
    : [[-3.15, 0.24, 0], [-2.2, 0.18, 0], [-1.28, 0.15, 0], [0.48, 0.14, 0], [2.2, 0.14, 0], [3.15, 0.12, 0]]
  const activePackets = step == null || step >= 0
  return (
    <>
      {path.slice(0, -1).map((from, i) => (
        <Beam key={i} from={from} to={path[i + 1]} color={color} active={stageStrength(step, Math.min(i, 4))} />
      ))}
      {[0, 0.22, 0.44].map((delay) => (
        <FlowPacket key={delay} path={path} color={color} active={activePackets} delay={delay} radius={compact ? 0.045 : 0.065} />
      ))}
    </>
  )
}

function DBStoryScene({ db = 'Qdrant', step = null, compact = false, position = [0, 0, 0] }) {
  const color = COLORS[db]
  const scale = compact ? 0.62 : 1
  const core = db === 'Qdrant'
    ? <FilterGate position={[0.48, 0.1, 0]} active={stageStrength(step, 3)} compact={compact} />
    : db === 'Weaviate'
      ? <FusionChamber position={[0.42, 0.08, 0]} active={stageStrength(step, 3)} compact={compact} />
      : <MilvusCore position={[0.35, 0.08, 0]} active={stageStrength(step, 3)} compact={compact} />

  return (
    <group position={position} scale={scale}>
      <StageBackdrop db={db} width={compact ? 4.45 : 8.7} />
      <LabFloor width={compact ? 4.2 : 8.25} depth={compact ? 2.2 : 2.85} color={db === 'Milvus' ? '#1c1917' : '#0f172a'} />
      <DocumentStack position={[-3.22, 0.05, 0]} active={stageStrength(step, 0)} compact={compact} />
      {!compact && <ChunkCards position={[-2.28, 0.08, 0]} active={stageStrength(step, 0)} db={db} />}
      <EmbeddingMachine position={[-1.3, 0.1, 0]} active={stageStrength(step, 1)} compact={compact} />
      <VectorBlocks position={[-0.32, 0.08, 0]} color={color} active={stageStrength(step, 2)} count={compact ? 5 : 11} compact={compact} label={db === 'Weaviate' ? 'vector + tokens' : 'vectors'} />
      {core}
      <SearchProbe position={[2.02, 0.45, 0.08]} color={color} active={stageStrength(step, 3)} compact={compact} />
      <EvidenceCards position={[3.05, 0.12, 0]} active={stageStrength(step, 4)} color={color} compact={compact} labels={db === 'Weaviate' ? ['dense', 'BM25', 'fused'] : ['Top-1', 'Top-2', 'Top-3']} />
      {!compact && <LLMTerminal position={[4.0, 0.14, 0]} active={stageStrength(step, 4)} color={color} />}
      <StoryPath db={db} step={step} compact={compact} />
      <Label position={[0, 1.35, 0]} tone={db} wide>{db} RAG path</Label>
    </group>
  )
}

function OverviewLab() {
  return (
    <group rotation={[0.08, -0.08, 0]}>
      <DBStoryScene db="Qdrant" position={[0, 1.55, -0.55]} compact />
      <DBStoryScene db="Weaviate" position={[0, 0, 0.15]} compact />
      <DBStoryScene db="Milvus" position={[0, -1.55, 0.85]} compact />
    </group>
  )
}

function TradeoffAxis({ accuracy = [] }) {
  const markers = useMemo(() => {
    const fallback = { Qdrant: -1.8, Weaviate: 0, Milvus: 1.8 }
    const latencies = Object.fromEntries(accuracy.map((row) => [row.Engine, Number(row.AvgLatency_ms) || 0]))
    const values = Object.values(latencies).filter(Boolean)
    if (!values.length) return fallback
    const min = Math.min(...values)
    const max = Math.max(...values)
    return Object.fromEntries(Object.keys(fallback).map((db) => {
      const value = latencies[db]
      if (!value || min === max) return [db, fallback[db]]
      return [db, -2 + ((value - min) / (max - min)) * 4]
    }))
  }, [accuracy])

  return (
    <group>
      <LabFloor width={5.8} depth={1.7} />
      <mesh position={[0, -0.25, 0]}>
        <boxGeometry args={[4.9, 0.08, 0.08]} />
        <meshStandardMaterial color="#CBD5E1" emissive="#64748B" emissiveIntensity={0.12} transparent opacity={0.55} />
      </mesh>
      {Object.entries(markers).map(([db, x]) => (
        <group key={db} position={[x, 0.05, 0]}>
          <mesh>
            <cylinderGeometry args={[0.18, 0.18, 0.58, 28]} />
            <meshStandardMaterial color={COLORS[db]} emissive={COLORS[db]} emissiveIntensity={0.45} roughness={0.3} />
          </mesh>
          <VectorBlocks position={[0, 0.55, 0]} color={COLORS[db]} active={1} count={4} compact label="" />
          <Label position={[0, -0.65, 0]} tone={db}>{db}</Label>
        </group>
      ))}
      <Label position={[-2.25, 0.86, 0]}>low latency</Label>
      <Label position={[2.25, 0.86, 0]}>high recall / scale</Label>
    </group>
  )
}

function SceneContent({ mode, step, accuracy, activeDB }) {
  if (mode === 'qdrant') return <DBStoryScene db="Qdrant" step={step} />
  if (mode === 'weaviate') return <DBStoryScene db="Weaviate" step={step} />
  if (mode === 'milvus') return <DBStoryScene db="Milvus" step={step} />
  if (mode === 'tradeoff') return <TradeoffAxis accuracy={accuracy} />

  return (
    <group>
      <OverviewLab />
      {activeDB && <Label position={[0, 1.95, 0]}>{activeDB} selected</Label>}
    </group>
  )
}

export default function DBMechanismScene({ mode = 'overview', activeDB = null, accuracy = [], tradeoff = [], step = null }) {
  const camera = mode === 'overview'
    ? { position: [0.45, 2.5, 10.8], fov: 45 }
    : mode === 'tradeoff'
      ? { position: [0, 2.2, 5.7], fov: 50 }
      : { position: [0.18, 2.3, 7.0], fov: 50 }

  return (
    <Canvas camera={camera} style={{ background: 'transparent' }} dpr={[1, 1.5]} shadows>
      <fog attach="fog" args={['#060816', 6, 16]} />
      <ambientLight intensity={0.48} />
      <directionalLight position={[1.5, 4.5, 4]} intensity={1.3} color="#E0F2FE" castShadow />
      <pointLight position={[-4, 2, 3]} intensity={0.95} color="#22D3EE" />
      <pointLight position={[4, 1.3, 2]} intensity={0.75} color="#FB7185" />
      <Sparkles count={mode === 'overview' ? 135 : 68} scale={mode === 'overview' ? 8.2 : 6.3} size={1.1} speed={0.25} opacity={0.3} color="#A8F3FF" />
      <SceneContent mode={mode} activeDB={activeDB} accuracy={accuracy} tradeoff={tradeoff} step={step} />
      <OrbitControls enablePan={false} enableZoom={mode !== 'tradeoff'} autoRotate autoRotateSpeed={mode === 'overview' ? 0.22 : 0.24} minDistance={4.2} maxDistance={mode === 'overview' ? 13 : 10.5} />
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
