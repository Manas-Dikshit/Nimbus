import * as THREE from "three";
import React, { useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { GLTF } from "three-stdlib";
import { ThreeEvent, useThree } from "@react-three/fiber";
import gsap from "gsap";

export const SOUND_MAP = {
  red: ["/sounds/red-1.mp3", "/sounds/red-2.mp3", "/sounds/red-3.mp3"],
  brown: ["/sounds/brown-1.mp3", "/sounds/brown-2.mp3", "/sounds/brown-3.mp3"],
  blue: ["/sounds/blue-1.mp3", "/sounds/blue-2.mp3", "/sounds/blue-3.mp3"],
  black: ["/sounds/black-1.mp3", "/sounds/black-2.mp3", "/sounds/black-3.mp3"],
};

// Type definitions
type GLTFResult = GLTF & {
  nodes: {
    Single_Switch_Mesh_1: THREE.Mesh;
    Single_Switch_Mesh_2: THREE.Mesh;
    Single_Switch_Mesh_3: THREE.Mesh;
    Single_Switch_Mesh_4: THREE.Mesh;
  };
  materials: Record<string, unknown>;
};

type SwitchProps = React.ComponentProps<"group"> & {
  color: "red" | "brown" | "blue" | "black";
  hexColor: string;
};

export function Switch({ color, hexColor, ...restProps }: SwitchProps) {
  const { invalidate } = useThree();
  const { nodes } = useGLTF("/switch.gltf") as unknown as GLTFResult;
  const switchGroupRef = useRef<THREE.Group>(null);
  const stemRef = useRef<THREE.Mesh>(null);
  const isPressedRef = useRef(false);
  const audio = useRef<HTMLAudioElement>(null);
  const audioTimeout = useRef<ReturnType<typeof setTimeout>>(null);
  const allAudio = useRef(
    SOUND_MAP[color].map((url) => {
      const audio = new Audio(url);
      audio.volume = 0.6;
      return audio;
    }),
  );

  const handlePointerDown = async (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();

    if (!stemRef.current || !switchGroupRef.current || isPressedRef.current)
      return;
    isPressedRef.current = true;

    const stem = stemRef.current;
    const switchGroup = switchGroupRef.current;

    gsap.killTweensOf(stem.position);
    gsap.killTweensOf(switchGroup.rotation);

    gsap.to(switchGroup.rotation, {
      x: Math.PI / 2 + 0.1,
      duration: 0.05,
      ease: "power2.out",
      onUpdate: () => invalidate(),
    });

    gsap.to(stem.position, {
      z: 0.005,
      duration: 0.08,
      ease: "power2.out",
      onUpdate: () => invalidate(),
    });

    // Audio

    // pick a random preloaded audio element
    const picked = (audio.current = gsap.utils.random(allAudio.current));
    picked.currentTime = 0;

    try {
      // await the play() promise so we don't race with an immediate pause
      await picked.play();
    } catch (err) {
      // If play() is interrupted (autoplay policy or other), just log and continue
      console.warn("audio play failed:", err);
    }

    // duration may be NaN/0 until metadata is available. Use a sensible fallback
    const pauseMs =
      Number.isFinite(picked.duration) && picked.duration > 0
        ? (picked.duration / 2) * 1000
        : 400; // fallback to 400ms

    audioTimeout.current = setTimeout(() => picked.pause(), pauseMs);
  };

  const releaseSwitch = () => {
    if (!stemRef.current || !switchGroupRef.current || !isPressedRef.current)
      return;
    isPressedRef.current = false;

    const stem = stemRef.current;
    const switchGroup = switchGroupRef.current;

    gsap.to(switchGroup.rotation, {
      x: Math.PI / 2,
      duration: 0.6,
      ease: "elastic.out(1,0.3)",
      onUpdate: () => invalidate(),
    });

    gsap.to(stem.position, {
      z: 0,
      duration: 0.15,
      ease: "elastic.out(1, 0.3)",
      onUpdate: () => invalidate(),
    });

    if (audioTimeout.current) clearTimeout(audioTimeout.current);

    // Try to play again on release; ignore rejections to avoid uncaught promise warnings
    try {
      audio.current && audio.current.currentTime === 0 && (audio.current.currentTime = 0);
      const p = audio.current?.play();
      p?.catch(() => {
        /* noop */
      });
    } catch (err) {
      // ignore
    }
  };

  const handlePointerUp = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    releaseSwitch();
  };

  const handlePointerLeave = () => {
    releaseSwitch();
  };

  return (
    <group {...restProps}>
      {/* Hit box */}
      <mesh
        position={[0, 0.05, 0]}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onPointerOver={() => (document.body.style.cursor = "pointer")}
        onPointerOut={() => (document.body.style.cursor = "default")}
      >
        <boxGeometry args={[0.15, 0.15, 0.15]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      <group ref={switchGroupRef} scale={10} rotation={[Math.PI / 2, 0, 0]}>
        {/* Switch housing */}
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.Single_Switch_Mesh_1.geometry}
        >
          <meshStandardMaterial color="#999999" roughness={0.7} />
        </mesh>

        {/* Gold contacts */}
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.Single_Switch_Mesh_2.geometry}
        >
          <meshStandardMaterial color="#ffd700" roughness={0.1} metalness={1} />
        </mesh>

        {/* Colored stem */}
        <mesh
          ref={stemRef}
          castShadow
          receiveShadow
          geometry={nodes.Single_Switch_Mesh_3.geometry}
        >
          <meshStandardMaterial color={hexColor} roughness={0.7} />
        </mesh>

        {/* Switch base */}
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.Single_Switch_Mesh_4.geometry}
        >
          <meshStandardMaterial color="#999999" roughness={0.7} />
        </mesh>
      </group>
    </group>
  );
}

useGLTF.preload("/switch.gltf");
