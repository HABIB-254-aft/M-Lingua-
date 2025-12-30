"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { getSignAnimation, interpolateKeyframes, SignKeyframe } from "@/lib/sign-animations";
import { loadSignDictionaryFromIndexedDB, hasSignDictionaryInIndexedDB } from "@/lib/sign-dictionary-sync";
import { initDatabase } from "@/lib/indexeddb";

interface SignLanguageAvatar3DProps {
  text: string;
  speed?: number;
  containerId?: string;
}

// 3D Model Loader Component
// This will only render if /public/models/avatar.glb exists
// Note: For now, this always returns null to use fallback
// When a 3D model is added, this component can be updated to use useGLTF properly
function ModelAvatar({ text, speed = 1 }: { text: string; speed: number }) {
  // TODO: When 3D model is added, use useGLTF hook here
  // const gltf = useGLTF("/models/avatar.glb");
  // Hooks must be called unconditionally, so we'll always use fallback for now
  return null;
}

// Fallback: Geometric avatar (temporary - replace with 3D model)
// See 3D_MODEL_SETUP.md for instructions on adding a realistic model
function FallbackAvatar({ text, speed = 1 }: { text: string; speed: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const signMapRef = useRef<Record<string, { type: string; color: string; emoji?: string }> | null>(null);
  const [isDictionaryLoaded, setIsDictionaryLoaded] = useState(false);
  
  // Body part references
  const bodyPartsRef = useRef<{
    head?: THREE.Mesh;
    body?: THREE.Mesh;
    leftArm?: THREE.Mesh;
    rightArm?: THREE.Mesh;
    leftHand?: THREE.Mesh;
    rightHand?: THREE.Mesh;
    leftElbow?: THREE.Mesh;
    rightElbow?: THREE.Mesh;
    leftShoulder?: THREE.Mesh;
    rightShoulder?: THREE.Mesh;
    bodyGroup?: THREE.Group;
  }>({});

  // Animation state
  const animationStateRef = useRef<{
    currentSign: string | null;
    animationStartTime: number;
    isAnimating: boolean;
    wordsQueue: string[];
    currentWordIndex: number;
  }>({
    currentSign: null,
    animationStartTime: 0,
    isAnimating: false,
    wordsQueue: [],
    currentWordIndex: 0,
  });

  // Initialize dictionary
  useEffect(() => {
    const initializeDictionary = async () => {
      try {
        await initDatabase();
        const hasDictionary = await hasSignDictionaryInIndexedDB();
        if (hasDictionary) {
          const cachedMap = await loadSignDictionaryFromIndexedDB();
          if (cachedMap) {
            signMapRef.current = cachedMap;
            setIsDictionaryLoaded(true);
            return;
          }
        }
        setIsDictionaryLoaded(true);
      } catch (error) {
        console.error("Failed to initialize dictionary:", error);
        setIsDictionaryLoaded(true);
      }
    };
    initializeDictionary();
  }, []);

  // Get sign type from word
  const getSignType = (word: string): string => {
    const normalizedWord = word.toLowerCase().trim();
    if (signMapRef.current && signMapRef.current[normalizedWord]) {
      return signMapRef.current[normalizedWord].type;
    }
    
    // Fallback: check common mappings
    const fallbackMap: Record<string, string> = {
      hello: "hello",
      hi: "hello",
      hey: "hello",
      thank: "thank-you",
      thanks: "thank-you",
      yes: "yes",
      no: "no",
    };
    
    return fallbackMap[normalizedWord] || "default";
  };

  // Parse text into sign units (phrases first, then words)
  const parseTextToSigns = (text: string): string[] => {
    const normalized = text.toLowerCase().trim();
    const signs: string[] = [];
    
    // Check for common phrases first
    const phrases = [
      "thank you",
      "good morning",
      "good afternoon",
      "good evening",
      "good night",
      "how are you",
    ];
    
    let remaining = normalized;
    for (const phrase of phrases) {
      if (remaining.includes(phrase)) {
        signs.push(phrase);
        remaining = remaining.replace(phrase, "").trim();
      }
    }
    
    // Add remaining words
    const words = remaining.split(/\s+/).filter((w) => w.length > 0);
    signs.push(...words);
    
    return signs.length > 0 ? signs : ["default"];
  };

  // Apply keyframe to avatar
  const applyKeyframe = (keyframe: SignKeyframe) => {
    const parts = bodyPartsRef.current;
    if (!parts.rightHand || !parts.leftHand || !parts.rightArm || !parts.leftArm) return;

    // Calculate world positions relative to body center (0, 1, 0)
    const bodyY = 1.0;
    
    // Apply right hand position and rotation
    if (parts.rightHand) {
      // Position is relative to body center
      parts.rightHand.position.set(
        keyframe.rightHand.position[0],
        bodyY + keyframe.rightHand.position[1] - 0.4, // Adjust for body center
        keyframe.rightHand.position[2]
      );
      parts.rightHand.rotation.set(...keyframe.rightHand.rotation);
    }
    
    // Apply left hand position and rotation
    if (parts.leftHand) {
      parts.leftHand.position.set(
        keyframe.leftHand.position[0],
        bodyY + keyframe.leftHand.position[1] - 0.4,
        keyframe.leftHand.position[2]
      );
      parts.leftHand.rotation.set(...keyframe.leftHand.rotation);
    }

    // Apply arm rotations (shoulder rotation affects arm direction)
    if (parts.rightArm && parts.rightShoulder) {
      // Shoulder rotation
      parts.rightShoulder.rotation.set(...keyframe.rightArm.shoulderRotation);
      // Arm follows shoulder rotation
      parts.rightArm.rotation.set(
        keyframe.rightArm.shoulderRotation[0],
        keyframe.rightArm.shoulderRotation[1],
        keyframe.rightArm.shoulderRotation[2] - 0.3 // Base arm angle
      );
      // Elbow bend
      if (parts.rightElbow) {
        parts.rightElbow.rotation.z = keyframe.rightArm.elbowRotation;
      }
      // Update arm position based on rotation
      const armLength = 0.5;
      const angle = keyframe.rightArm.shoulderRotation[2];
      parts.rightArm.position.set(
        0.3 + Math.sin(angle) * 0.1,
        1.0 + Math.cos(angle) * 0.1,
        0
      );
    }

    if (parts.leftArm && parts.leftShoulder) {
      parts.leftShoulder.rotation.set(...keyframe.leftArm.shoulderRotation);
      parts.leftArm.rotation.set(
        keyframe.leftArm.shoulderRotation[0],
        keyframe.leftArm.shoulderRotation[1],
        keyframe.leftArm.shoulderRotation[2] + 0.3
      );
      if (parts.leftElbow) {
        parts.leftElbow.rotation.z = keyframe.leftArm.elbowRotation;
      }
      const armLength = 0.5;
      const angle = keyframe.leftArm.shoulderRotation[2];
      parts.leftArm.position.set(
        -0.3 - Math.sin(angle) * 0.1,
        1.0 + Math.cos(angle) * 0.1,
        0
      );
    }

    // Apply body pose
    if (keyframe.body && parts.bodyGroup) {
      if (keyframe.body.lean) {
        parts.bodyGroup.rotation.x = keyframe.body.lean[0];
        parts.bodyGroup.rotation.z = keyframe.body.lean[1];
      }
      if (keyframe.body.rotation !== undefined) {
        parts.bodyGroup.rotation.y = keyframe.body.rotation;
      }
    }

    // Apply facial expressions
    if (keyframe.facialExpression) {
      const expr = keyframe.facialExpression;
      const leftEyebrow = (parts as any).leftEyebrow;
      const rightEyebrow = (parts as any).rightEyebrow;
      const mouth = (parts as any).mouth;

      // Eyebrow raise
      if (expr.eyebrowRaise !== undefined && leftEyebrow && rightEyebrow) {
        const raiseAmount = expr.eyebrowRaise * 0.02;
        leftEyebrow.position.y = 1.68 + raiseAmount;
        rightEyebrow.position.y = 1.68 + raiseAmount;
      }

      // Eye widen
      if (expr.eyeWiden !== undefined) {
        const leftEye = (parts as any).leftEye;
        const rightEye = (parts as any).rightEye;
        if (leftEye && rightEye) {
          const scale = 1 + expr.eyeWiden * 0.3;
          leftEye.scale.set(scale, scale, scale);
          rightEye.scale.set(scale, scale, scale);
        }
      }

      // Mouth shape
      if (expr.mouthShape && mouth) {
        switch (expr.mouthShape) {
          case "smile":
            mouth.rotation.z = -0.3;
            mouth.scale.set(1.2, 1, 1);
            break;
          case "open":
            mouth.scale.set(1, 1.5, 1);
            break;
          case "pursed":
            mouth.scale.set(0.8, 0.6, 1);
            break;
          default: // neutral
            mouth.rotation.z = 0;
            mouth.scale.set(1, 1, 1);
        }
      }

      // Head nod
      if (expr.headNod && parts.head) {
        parts.head.rotation.x = Math.sin(Date.now() * 0.01) * 0.1;
      }
    }
  };

  // Animate sign sequence
  useEffect(() => {
    if (!isDictionaryLoaded || !groupRef.current) return;

    const signs = parseTextToSigns(text);
    animationStateRef.current.wordsQueue = signs;
    animationStateRef.current.currentWordIndex = 0;
    animationStateRef.current.isAnimating = true;

    const animateNextSign = () => {
      const state = animationStateRef.current;
      if (state.currentWordIndex >= state.wordsQueue.length) {
        state.currentWordIndex = 0; // Loop
      }

      const signWord = state.wordsQueue[state.currentWordIndex];
      const signType = getSignType(signWord);
      const animation = getSignAnimation(signType);
      
      state.currentSign = signType;
      state.animationStartTime = Date.now();
      const duration = animation.duration * 1000 / speed; // Convert to ms and apply speed

      const animate = () => {
        const elapsed = Date.now() - state.animationStartTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const keyframe = interpolateKeyframes(animation, progress);
        applyKeyframe(keyframe);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          // Move to next sign
          state.currentWordIndex++;
          setTimeout(animateNextSign, 300); // Pause between signs
        }
      };

      animate();
    };

    animateNextSign();
  }, [text, speed, isDictionaryLoaded]);

  // Create realistic humanoid avatar
  useEffect(() => {
    if (!groupRef.current) return;

    const group = groupRef.current;
    const parts = bodyPartsRef.current;

    // Body group for body movements
    const bodyGroup = new THREE.Group();
    bodyGroup.position.set(0, 0, 0);
    parts.bodyGroup = bodyGroup;
    group.add(bodyGroup);

    // Head with facial features
    const headGroup = new THREE.Group();
    const headGeometry = new THREE.SphereGeometry(0.18, 32, 32);
    const headMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xffdbac,
      roughness: 0.7,
      metalness: 0.1
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.set(0, 1.6, 0);
    parts.head = head;
    headGroup.add(head);

    // Eyes
    const eyeGeometry = new THREE.SphereGeometry(0.03, 16, 16);
    const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.06, 1.65, 0.15);
    leftEye.name = "leftEye";
    headGroup.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.06, 1.65, 0.15);
    rightEye.name = "rightEye";
    headGroup.add(rightEye);

    // Eyebrows
    const eyebrowGeometry = new THREE.BoxGeometry(0.04, 0.01, 0.01);
    const eyebrowMaterial = new THREE.MeshStandardMaterial({ color: 0x3d2817 });
    const leftEyebrow = new THREE.Mesh(eyebrowGeometry, eyebrowMaterial);
    leftEyebrow.position.set(-0.06, 1.68, 0.14);
    leftEyebrow.name = "leftEyebrow";
    headGroup.add(leftEyebrow);
    const rightEyebrow = new THREE.Mesh(eyebrowGeometry, eyebrowMaterial);
    rightEyebrow.position.set(0.06, 1.68, 0.14);
    rightEyebrow.name = "rightEyebrow";
    headGroup.add(rightEyebrow);

    // Mouth
    const mouthGeometry = new THREE.TorusGeometry(0.02, 0.005, 8, 16, Math.PI);
    const mouthMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
    const mouth = new THREE.Mesh(mouthGeometry, mouthMaterial);
    mouth.position.set(0, 1.55, 0.15);
    mouth.rotation.x = Math.PI / 2;
    mouth.name = "mouth";
    headGroup.add(mouth);

    // Store facial features for animation
    parts.head = head;
    (parts as any).leftEye = leftEye;
    (parts as any).rightEye = rightEye;
    (parts as any).leftEyebrow = leftEyebrow;
    (parts as any).rightEyebrow = rightEyebrow;
    (parts as any).mouth = mouth;

    // Body
    const bodyGeometry = new THREE.CylinderGeometry(0.22, 0.28, 0.9, 16);
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x4a90e2,
      roughness: 0.8
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.set(0, 1.0, 0);
    parts.body = body;
    bodyGroup.add(body);

    // Shoulders
    const shoulderGeometry = new THREE.SphereGeometry(0.12, 16, 16);
    const shoulderMaterial = new THREE.MeshStandardMaterial({ color: 0xffdbac });
    
    const leftShoulder = new THREE.Mesh(shoulderGeometry, shoulderMaterial);
    leftShoulder.position.set(-0.3, 1.3, 0);
    parts.leftShoulder = leftShoulder;
    bodyGroup.add(leftShoulder);

    const rightShoulder = new THREE.Mesh(shoulderGeometry, shoulderMaterial);
    rightShoulder.position.set(0.3, 1.3, 0);
    parts.rightShoulder = rightShoulder;
    bodyGroup.add(rightShoulder);

    // Arms
    const armGeometry = new THREE.CylinderGeometry(0.06, 0.06, 0.5, 12);
    const armMaterial = new THREE.MeshStandardMaterial({ color: 0xffdbac });
    
    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-0.3, 1.0, 0);
    leftArm.rotation.z = 0.3;
    parts.leftArm = leftArm;
    bodyGroup.add(leftArm);

    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(0.3, 1.0, 0);
    rightArm.rotation.z = -0.3;
    parts.rightArm = rightArm;
    bodyGroup.add(rightArm);

    // Elbows (for bending)
    const elbowGeometry = new THREE.SphereGeometry(0.08, 12, 12);
    const elbowMaterial = new THREE.MeshStandardMaterial({ color: 0xffdbac });
    
    const leftElbow = new THREE.Mesh(elbowGeometry, elbowMaterial);
    leftElbow.position.set(-0.3, 0.75, 0);
    parts.leftElbow = leftElbow;
    bodyGroup.add(leftElbow);

    const rightElbow = new THREE.Mesh(elbowGeometry, elbowMaterial);
    rightElbow.position.set(0.3, 0.75, 0);
    parts.rightElbow = rightElbow;
    bodyGroup.add(rightElbow);

    // Hands (more detailed)
    const handGeometry = new THREE.BoxGeometry(0.1, 0.12, 0.05);
    const handMaterial = new THREE.MeshStandardMaterial({ color: 0xffdbac });
    
    const leftHand = new THREE.Mesh(handGeometry, handMaterial);
    leftHand.position.set(-0.3, 0.6, 0);
    parts.leftHand = leftHand;
    bodyGroup.add(leftHand);

    const rightHand = new THREE.Mesh(handGeometry, handMaterial);
    rightHand.position.set(0.3, 0.6, 0);
    parts.rightHand = rightHand;
    bodyGroup.add(rightHand);

    // Legs
    const legGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.9, 12);
    const legMaterial = new THREE.MeshStandardMaterial({ color: 0x2c3e50 });
    
    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.12, -0.45, 0);
    bodyGroup.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.12, -0.45, 0);
    bodyGroup.add(rightLeg);

    bodyGroup.add(headGroup);

    return () => {
      // Cleanup
    };
  }, []);

  return (
    <group ref={groupRef} position={[0, -1, 0]}>
      {/* Avatar is created in useEffect */}
    </group>
  );
}

// Main Component
export default function SignLanguageAvatar3D({ 
  text, 
  speed = 1, 
  containerId = "sign-avatar-3d" 
}: SignLanguageAvatar3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 400, height: 400 });

  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({
          width: rect.width || 400,
          height: rect.height || 400,
        });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  return (
    <div
      ref={containerRef}
      id={containerId}
      className="w-full h-full bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20"
      style={{ minHeight: "200px" }}
    >
      <Canvas
        camera={{ position: [0, 1, 3], fov: 50 }}
        style={{ width: "100%", height: "100%" }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} />
        <pointLight position={[-5, -5, -5]} intensity={0.4} />
        
        <Suspense fallback={null}>
          <ModelAvatar text={text} speed={speed} />
        </Suspense>
        <FallbackAvatar text={text} speed={speed} />
        
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          minPolarAngle={Math.PI / 3}
          maxPolarAngle={Math.PI / 2.2}
        />
      </Canvas>
    </div>
  );
}

