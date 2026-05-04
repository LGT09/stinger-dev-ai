import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial, Sphere, Torus, Icosahedron, Stars } from "@react-three/drei";
import { Suspense, useRef } from "react";
import * as THREE from "three";

const Orb = () => {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.x = state.clock.elapsedTime * 0.15;
    ref.current.rotation.y = state.clock.elapsedTime * 0.2;
  });
  return (
    <Sphere ref={ref} args={[1.4, 64, 64]} position={[0, 0, 0]}>
      <MeshDistortMaterial color="#fbbf24" attach="material" distort={0.45} speed={1.6} roughness={0.1} metalness={0.9} />
    </Sphere>
  );
};

const Ring = () => {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame((s) => {
    if (!ref.current) return;
    ref.current.rotation.x = s.clock.elapsedTime * 0.4;
    ref.current.rotation.z = s.clock.elapsedTime * 0.25;
  });
  return (
    <Torus ref={ref} args={[2.4, 0.05, 16, 100]} position={[0, 0, 0]}>
      <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={0.6} metalness={0.8} roughness={0.2} />
    </Torus>
  );
};

const FloatingShape = ({ pos, color }: { pos: [number, number, number]; color: string }) => (
  <Float speed={2} rotationIntensity={1.2} floatIntensity={2}>
    <Icosahedron args={[0.35, 0]} position={pos}>
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} metalness={0.7} roughness={0.25} />
    </Icosahedron>
  </Float>
);

const Hero3D = () => {
  return (
    <div className="absolute inset-0 -z-10 pointer-events-none opacity-90">
      <Canvas camera={{ position: [0, 0, 6], fov: 50 }} dpr={[1, 1.6]}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.4} />
          <pointLight position={[10, 10, 10]} intensity={1.4} color="#fbbf24" />
          <pointLight position={[-10, -5, -5]} intensity={1} color="#22d3ee" />
          <Stars radius={50} depth={50} count={1500} factor={3} saturation={0} fade speed={1} />
          <Orb />
          <Ring />
          <FloatingShape pos={[-3, 1.5, -1]} color="#a78bfa" />
          <FloatingShape pos={[3, -1.2, -1]} color="#22d3ee" />
          <FloatingShape pos={[2.4, 2, -2]} color="#fbbf24" />
          <FloatingShape pos={[-2.6, -1.8, -2]} color="#f472b6" />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default Hero3D;