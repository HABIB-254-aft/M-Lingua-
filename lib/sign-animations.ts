/**
 * Sign Language Animation System
 * 
 * Defines animation sequences for sign language gestures
 * Each sign has keyframe data for hand positions, arm movements, and facial expressions
 */

export interface SignAnimation {
  name: string;
  duration: number; // in seconds
  keyframes: SignKeyframe[];
  facialExpression?: FacialExpression;
}

export interface SignKeyframe {
  time: number; // 0-1 (normalized)
  leftHand: HandPose;
  rightHand: HandPose;
  leftArm: ArmPose;
  rightArm: ArmPose;
  body?: BodyPose;
  facialExpression?: FacialExpression;
}

export interface HandPose {
  position: [number, number, number]; // x, y, z relative to body
  rotation: [number, number, number]; // pitch, yaw, roll in radians
  fingerCurl?: number; // 0-1, how much fingers are curled
  thumbUp?: boolean;
}

export interface ArmPose {
  shoulderRotation: [number, number, number];
  elbowRotation: number; // bend angle
}

export interface BodyPose {
  lean?: [number, number]; // forward/back, left/right
  rotation?: number; // body rotation
}

export interface FacialExpression {
  eyebrowRaise?: number; // 0-1
  eyeWiden?: number; // 0-1
  mouthShape?: "neutral" | "smile" | "open" | "pursed";
  headNod?: boolean;
}

/**
 * Sign Animation Library
 * Maps sign names to animation sequences
 */
export const SIGN_ANIMATIONS: Record<string, SignAnimation> = {
  // Greetings
  "hello": {
    name: "hello",
    duration: 1.5,
    keyframes: [
      {
        time: 0,
        rightHand: { position: [0.3, 0.9, 0.2], rotation: [0, 0, -0.5], thumbUp: true },
        leftHand: { position: [-0.3, 0.9, 0], rotation: [0, 0, 0] },
        rightArm: { shoulderRotation: [0, -0.3, -0.5], elbowRotation: 0.3 },
        leftArm: { shoulderRotation: [0, 0, 0], elbowRotation: 0 },
        facialExpression: { mouthShape: "smile", eyebrowRaise: 0.3 }
      },
      {
        time: 0.3,
        rightHand: { position: [0.4, 0.8, 0.3], rotation: [0, 0.2, -0.7], thumbUp: true },
        leftHand: { position: [-0.3, 0.9, 0], rotation: [0, 0, 0] },
        rightArm: { shoulderRotation: [0, -0.4, -0.6], elbowRotation: 0.4 },
        leftArm: { shoulderRotation: [0, 0, 0], elbowRotation: 0 }
      },
      {
        time: 0.6,
        rightHand: { position: [0.3, 0.9, 0.2], rotation: [0, 0, -0.5], thumbUp: true },
        leftHand: { position: [-0.3, 0.9, 0], rotation: [0, 0, 0] },
        rightArm: { shoulderRotation: [0, -0.3, -0.5], elbowRotation: 0.3 },
        leftArm: { shoulderRotation: [0, 0, 0], elbowRotation: 0 }
      },
      {
        time: 1.0,
        rightHand: { position: [0.3, 0.9, 0], rotation: [0, 0, -0.3] },
        leftHand: { position: [-0.3, 0.9, 0], rotation: [0, 0, 0] },
        rightArm: { shoulderRotation: [0, -0.2, -0.3], elbowRotation: 0.2 },
        leftArm: { shoulderRotation: [0, 0, 0], elbowRotation: 0 }
      }
    ],
    facialExpression: { mouthShape: "smile", eyebrowRaise: 0.3 }
  },

  "thank-you": {
    name: "thank-you",
    duration: 1.2,
    keyframes: [
      {
        time: 0,
        rightHand: { position: [0.2, 0.7, 0.1], rotation: [0, 0, -0.3], fingerCurl: 0.8 },
        leftHand: { position: [-0.2, 0.7, 0.1], rotation: [0, 0, 0.3], fingerCurl: 0.8 },
        rightArm: { shoulderRotation: [0, -0.2, -0.3], elbowRotation: 0.5 },
        leftArm: { shoulderRotation: [0, -0.2, 0.3], elbowRotation: 0.5 },
        body: { lean: [0.1, 0] }
      },
      {
        time: 0.5,
        rightHand: { position: [0.2, 0.6, 0.15], rotation: [0, 0, -0.3], fingerCurl: 0.8 },
        leftHand: { position: [-0.2, 0.6, 0.15], rotation: [0, 0, 0.3], fingerCurl: 0.8 },
        rightArm: { shoulderRotation: [0, -0.2, -0.3], elbowRotation: 0.5 },
        leftArm: { shoulderRotation: [0, -0.2, 0.3], elbowRotation: 0.5 },
        body: { lean: [0.15, 0] }
      },
      {
        time: 1.0,
        rightHand: { position: [0.2, 0.7, 0.1], rotation: [0, 0, -0.3], fingerCurl: 0.8 },
        leftHand: { position: [-0.2, 0.7, 0.1], rotation: [0, 0, 0.3], fingerCurl: 0.8 },
        rightArm: { shoulderRotation: [0, -0.2, -0.3], elbowRotation: 0.5 },
        leftArm: { shoulderRotation: [0, -0.2, 0.3], elbowRotation: 0.5 },
        body: { lean: [0, 0] }
      }
    ],
    facialExpression: { mouthShape: "smile", eyebrowRaise: 0.2 }
  },

  "yes": {
    name: "yes",
    duration: 0.8,
    keyframes: [
      {
        time: 0,
        rightHand: { position: [0.3, 0.8, 0], rotation: [0, 0, -0.3], fingerCurl: 0.2 },
        leftHand: { position: [-0.3, 0.8, 0], rotation: [0, 0, 0.3] },
        rightArm: { shoulderRotation: [0, -0.2, -0.3], elbowRotation: 0.3 },
        leftArm: { shoulderRotation: [0, -0.2, 0.3], elbowRotation: 0.3 }
      },
      {
        time: 0.3,
        rightHand: { position: [0.3, 0.7, 0], rotation: [0, 0, -0.3], fingerCurl: 0.2 },
        leftHand: { position: [-0.3, 0.8, 0], rotation: [0, 0, 0.3] },
        rightArm: { shoulderRotation: [0, -0.2, -0.3], elbowRotation: 0.3 },
        leftArm: { shoulderRotation: [0, -0.2, 0.3], elbowRotation: 0.3 },
        body: { lean: [0.05, 0] }
      },
      {
        time: 0.6,
        rightHand: { position: [0.3, 0.8, 0], rotation: [0, 0, -0.3], fingerCurl: 0.2 },
        leftHand: { position: [-0.3, 0.8, 0], rotation: [0, 0, 0.3] },
        rightArm: { shoulderRotation: [0, -0.2, -0.3], elbowRotation: 0.3 },
        leftArm: { shoulderRotation: [0, -0.2, 0.3], elbowRotation: 0.3 },
        body: { lean: [0, 0] }
      }
    ],
    facialExpression: { headNod: true, mouthShape: "smile" }
  },

  "no": {
    name: "no",
    duration: 1.0,
    keyframes: [
      {
        time: 0,
        rightHand: { position: [0.3, 0.8, 0.1], rotation: [0, 0, -0.3], fingerCurl: 0.3 },
        leftHand: { position: [-0.3, 0.8, 0], rotation: [0, 0, 0.3] },
        rightArm: { shoulderRotation: [0, -0.2, -0.3], elbowRotation: 0.4 },
        leftArm: { shoulderRotation: [0, -0.2, 0.3], elbowRotation: 0.3 }
      },
      {
        time: 0.5,
        rightHand: { position: [0.4, 0.8, 0.1], rotation: [0, 0.3, -0.3], fingerCurl: 0.3 },
        leftHand: { position: [-0.3, 0.8, 0], rotation: [0, 0, 0.3] },
        rightArm: { shoulderRotation: [0, -0.2, -0.3], elbowRotation: 0.4 },
        leftArm: { shoulderRotation: [0, -0.2, 0.3], elbowRotation: 0.3 }
      },
      {
        time: 1.0,
        rightHand: { position: [0.3, 0.8, 0.1], rotation: [0, 0, -0.3], fingerCurl: 0.3 },
        leftHand: { position: [-0.3, 0.8, 0], rotation: [0, 0, 0.3] },
        rightArm: { shoulderRotation: [0, -0.2, -0.3], elbowRotation: 0.4 },
        leftArm: { shoulderRotation: [0, -0.2, 0.3], elbowRotation: 0.3 }
      }
    ],
    facialExpression: { eyebrowRaise: 0.2 }
  },

  "goodbye": {
    name: "goodbye",
    duration: 1.5,
    keyframes: [
      {
        time: 0,
        rightHand: { position: [0.3, 0.9, 0.2], rotation: [0, 0, -0.5], thumbUp: true },
        leftHand: { position: [-0.3, 0.9, 0], rotation: [0, 0, 0] },
        rightArm: { shoulderRotation: [0, -0.3, -0.5], elbowRotation: 0.3 },
        leftArm: { shoulderRotation: [0, 0, 0], elbowRotation: 0 }
      },
      {
        time: 0.5,
        rightHand: { position: [0.4, 0.8, 0.3], rotation: [0, 0.3, -0.7], thumbUp: true },
        leftHand: { position: [-0.3, 0.9, 0], rotation: [0, 0, 0] },
        rightArm: { shoulderRotation: [0, -0.4, -0.6], elbowRotation: 0.4 },
        leftArm: { shoulderRotation: [0, 0, 0], elbowRotation: 0 }
      },
      {
        time: 1.0,
        rightHand: { position: [0.3, 0.9, 0.2], rotation: [0, 0, -0.5], thumbUp: true },
        leftHand: { position: [-0.3, 0.9, 0], rotation: [0, 0, 0] },
        rightArm: { shoulderRotation: [0, -0.3, -0.5], elbowRotation: 0.3 },
        leftArm: { shoulderRotation: [0, 0, 0], elbowRotation: 0 }
      },
      {
        time: 1.5,
        rightHand: { position: [0.3, 0.9, 0], rotation: [0, 0, -0.3] },
        leftHand: { position: [-0.3, 0.9, 0], rotation: [0, 0, 0] },
        rightArm: { shoulderRotation: [0, -0.2, -0.3], elbowRotation: 0.2 },
        leftArm: { shoulderRotation: [0, 0, 0], elbowRotation: 0 }
      }
    ],
    facialExpression: { mouthShape: "smile" }
  },

  "please": {
    name: "please",
    duration: 1.2,
    keyframes: [
      {
        time: 0,
        rightHand: { position: [0.2, 0.8, 0.1], rotation: [0, 0, -0.2], fingerCurl: 0.5 },
        leftHand: { position: [-0.3, 0.8, 0], rotation: [0, 0, 0.3] },
        rightArm: { shoulderRotation: [0, -0.2, -0.2], elbowRotation: 0.4 },
        leftArm: { shoulderRotation: [0, -0.2, 0.3], elbowRotation: 0.3 },
        body: { lean: [0.1, 0] }
      },
      {
        time: 0.6,
        rightHand: { position: [0.2, 0.75, 0.15], rotation: [0, 0, -0.2], fingerCurl: 0.5 },
        leftHand: { position: [-0.3, 0.8, 0], rotation: [0, 0, 0.3] },
        rightArm: { shoulderRotation: [0, -0.2, -0.2], elbowRotation: 0.4 },
        leftArm: { shoulderRotation: [0, -0.2, 0.3], elbowRotation: 0.3 },
        body: { lean: [0.15, 0] }
      },
      {
        time: 1.2,
        rightHand: { position: [0.2, 0.8, 0.1], rotation: [0, 0, -0.2], fingerCurl: 0.5 },
        leftHand: { position: [-0.3, 0.8, 0], rotation: [0, 0, 0.3] },
        rightArm: { shoulderRotation: [0, -0.2, -0.2], elbowRotation: 0.4 },
        leftArm: { shoulderRotation: [0, -0.2, 0.3], elbowRotation: 0.3 },
        body: { lean: [0, 0] }
      }
    ],
    facialExpression: { mouthShape: "smile", eyebrowRaise: 0.1 }
  },

  "sorry": {
    name: "sorry",
    duration: 1.5,
    keyframes: [
      {
        time: 0,
        rightHand: { position: [0.25, 0.7, 0.1], rotation: [0, 0, -0.3], fingerCurl: 0.6 },
        leftHand: { position: [-0.25, 0.7, 0.1], rotation: [0, 0, 0.3], fingerCurl: 0.6 },
        rightArm: { shoulderRotation: [0, -0.2, -0.3], elbowRotation: 0.5 },
        leftArm: { shoulderRotation: [0, -0.2, 0.3], elbowRotation: 0.5 },
        body: { lean: [0.1, 0] }
      },
      {
        time: 0.5,
        rightHand: { position: [0.25, 0.65, 0.12], rotation: [0, 0, -0.3], fingerCurl: 0.6 },
        leftHand: { position: [-0.25, 0.65, 0.12], rotation: [0, 0, 0.3], fingerCurl: 0.6 },
        rightArm: { shoulderRotation: [0, -0.2, -0.3], elbowRotation: 0.5 },
        leftArm: { shoulderRotation: [0, -0.2, 0.3], elbowRotation: 0.5 },
        body: { lean: [0.12, 0] }
      },
      {
        time: 1.0,
        rightHand: { position: [0.25, 0.7, 0.1], rotation: [0, 0, -0.3], fingerCurl: 0.6 },
        leftHand: { position: [-0.25, 0.7, 0.1], rotation: [0, 0, 0.3], fingerCurl: 0.6 },
        rightArm: { shoulderRotation: [0, -0.2, -0.3], elbowRotation: 0.5 },
        leftArm: { shoulderRotation: [0, -0.2, 0.3], elbowRotation: 0.5 },
        body: { lean: [0, 0] }
      }
    ],
    facialExpression: { eyebrowRaise: 0.3, mouthShape: "pursed" }
  },

  // Default/fallback animation
  "default": {
    name: "default",
    duration: 1.0,
    keyframes: [
      {
        time: 0,
        rightHand: { position: [0.3, 0.8, 0], rotation: [0, 0, -0.3] },
        leftHand: { position: [-0.3, 0.8, 0], rotation: [0, 0, 0.3] },
        rightArm: { shoulderRotation: [0, -0.2, -0.3], elbowRotation: 0.3 },
        leftArm: { shoulderRotation: [0, -0.2, 0.3], elbowRotation: 0.3 }
      },
      {
        time: 0.5,
        rightHand: { position: [0.3, 0.75, 0.05], rotation: [0, 0, -0.3] },
        leftHand: { position: [-0.3, 0.75, 0.05], rotation: [0, 0, 0.3] },
        rightArm: { shoulderRotation: [0, -0.2, -0.3], elbowRotation: 0.3 },
        leftArm: { shoulderRotation: [0, -0.2, 0.3], elbowRotation: 0.3 }
      },
      {
        time: 1.0,
        rightHand: { position: [0.3, 0.8, 0], rotation: [0, 0, -0.3] },
        leftHand: { position: [-0.3, 0.8, 0], rotation: [0, 0, 0.3] },
        rightArm: { shoulderRotation: [0, -0.2, -0.3], elbowRotation: 0.3 },
        leftArm: { shoulderRotation: [0, -0.2, 0.3], elbowRotation: 0.3 }
      }
    ]
  }
};

/**
 * Get animation for a sign
 */
export function getSignAnimation(signName: string): SignAnimation {
  const normalizedName = signName.toLowerCase().replace(/\s+/g, "-");
  return SIGN_ANIMATIONS[normalizedName] || SIGN_ANIMATIONS["default"];
}

/**
 * Interpolate between keyframes
 */
export function interpolateKeyframes(
  animation: SignAnimation,
  progress: number // 0-1
): SignKeyframe {
  const keyframes = animation.keyframes;
  
  if (progress <= 0) return keyframes[0];
  if (progress >= 1) return keyframes[keyframes.length - 1];

  // Find the two keyframes to interpolate between
  for (let i = 0; i < keyframes.length - 1; i++) {
    const current = keyframes[i];
    const next = keyframes[i + 1];

    if (progress >= current.time && progress <= next.time) {
      const t = (progress - current.time) / (next.time - current.time);
      
      // Linear interpolation with null checks
      const defaultHandPose: HandPose = { position: [0, 0.8, 0], rotation: [0, 0, 0] };
      const defaultArmPose: ArmPose = { shoulderRotation: [0, 0, 0], elbowRotation: 0 };
      
      return {
        time: progress,
        leftHand: current.leftHand && next.leftHand
          ? interpolateHandPose(current.leftHand, next.leftHand, t)
          : current.leftHand || next.leftHand || defaultHandPose,
        rightHand: current.rightHand && next.rightHand
          ? interpolateHandPose(current.rightHand, next.rightHand, t)
          : current.rightHand || next.rightHand || defaultHandPose,
        leftArm: current.leftArm && next.leftArm 
          ? interpolateArmPose(current.leftArm, next.leftArm, t)
          : current.leftArm || next.leftArm || defaultArmPose,
        rightArm: current.rightArm && next.rightArm
          ? interpolateArmPose(current.rightArm, next.rightArm, t)
          : current.rightArm || next.rightArm || defaultArmPose,
        body: current.body && next.body ? interpolateBodyPose(current.body, next.body, t) : current.body,
        facialExpression: current.facialExpression || next.facialExpression
      };
    }
  }

  return keyframes[keyframes.length - 1];
}

function interpolateHandPose(a: HandPose, b: HandPose, t: number): HandPose {
  // Ensure both poses are valid
  if (!a || !b) {
    return a || b || { position: [0, 0.8, 0], rotation: [0, 0, 0] };
  }
  
  return {
    position: [
      a.position[0] + (b.position[0] - a.position[0]) * t,
      a.position[1] + (b.position[1] - a.position[1]) * t,
      a.position[2] + (b.position[2] - a.position[2]) * t,
    ],
    rotation: [
      a.rotation[0] + (b.rotation[0] - a.rotation[0]) * t,
      a.rotation[1] + (b.rotation[1] - a.rotation[1]) * t,
      a.rotation[2] + (b.rotation[2] - a.rotation[2]) * t,
    ],
    fingerCurl: a.fingerCurl !== undefined && b.fingerCurl !== undefined
      ? a.fingerCurl + (b.fingerCurl - a.fingerCurl) * t
      : a.fingerCurl,
    thumbUp: t < 0.5 ? a.thumbUp : b.thumbUp,
  };
}

function interpolateArmPose(a: ArmPose, b: ArmPose, t: number): ArmPose {
  return {
    shoulderRotation: [
      a.shoulderRotation[0] + (b.shoulderRotation[0] - a.shoulderRotation[0]) * t,
      a.shoulderRotation[1] + (b.shoulderRotation[1] - a.shoulderRotation[1]) * t,
      a.shoulderRotation[2] + (b.shoulderRotation[2] - a.shoulderRotation[2]) * t,
    ],
    elbowRotation: a.elbowRotation + (b.elbowRotation - a.elbowRotation) * t,
  };
}

function interpolateBodyPose(a: BodyPose, b: BodyPose, t: number): BodyPose {
  return {
    lean: a.lean && b.lean
      ? [
          a.lean[0] + (b.lean[0] - a.lean[0]) * t,
          a.lean[1] + (b.lean[1] - a.lean[1]) * t,
        ]
      : a.lean || b.lean,
    rotation: a.rotation !== undefined && b.rotation !== undefined
      ? a.rotation + (b.rotation - a.rotation) * t
      : a.rotation || b.rotation,
  };
}

