"use client";

import { useEffect, useRef, useState } from "react";
import { Hands } from "@mediapipe/hands";
import { Camera } from "@mediapipe/camera_utils";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import { HAND_CONNECTIONS } from "@mediapipe/hands";

interface MediaPipeHandsProps {
  onHandLandmarks?: (landmarks: any) => void;
  onError?: (error: Error) => void;
  videoRef?: React.RefObject<HTMLVideoElement>;
  canvasRef?: React.RefObject<HTMLCanvasElement>;
}

export default function MediaPipeHandsComponent({
  onHandLandmarks,
  onError,
  videoRef,
  canvasRef,
}: MediaPipeHandsProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handsRef = useRef<Hands | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  const internalVideoRef = useRef<HTMLVideoElement | null>(null);
  const internalCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const video = videoRef?.current || internalVideoRef.current;
    const canvas = canvasRef?.current || internalCanvasRef.current;

    if (!video || !canvas) return;

    // Initialize MediaPipe Hands
    const hands = new Hands({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      },
    });

    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    hands.onResults((results) => {
      // Draw hand landmarks on canvas
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.save();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

        if (results.multiHandLandmarks) {
          for (const landmarks of results.multiHandLandmarks) {
            // Draw connections
            drawConnectors(ctx, landmarks, HAND_CONNECTIONS, {
              color: "#00FF00",
              lineWidth: 2,
            });
            // Draw landmarks
            drawLandmarks(ctx, landmarks, {
              color: "#FF0000",
              lineWidth: 1,
              radius: 3,
            });
          }
        }

        ctx.restore();
      }

      // Callback with hand landmarks
      if (onHandLandmarks && results.multiHandLandmarks) {
        onHandLandmarks(results.multiHandLandmarks);
      }
    });

    handsRef.current = hands;

    // Initialize camera
    const camera = new Camera(video, {
      onFrame: async () => {
        if (handsRef.current) {
          await handsRef.current.send({ image: video });
        }
      },
      width: 640,
      height: 480,
    });

    cameraRef.current = camera;

    // Start camera
    camera
      .start()
      .then(() => {
        setIsInitialized(true);
        setError(null);
      })
      .catch((err) => {
        const errorMessage = err.message || "Failed to start camera";
        setError(errorMessage);
        if (onError) {
          onError(new Error(errorMessage));
        }
      });

    // Cleanup
    return () => {
      if (cameraRef.current) {
        cameraRef.current.stop();
        cameraRef.current = null;
      }
      if (handsRef.current) {
        handsRef.current.close();
        handsRef.current = null;
      }
    };
  }, [onHandLandmarks, onError, videoRef, canvasRef]);

  return {
    isInitialized,
    error,
    videoRef: videoRef || internalVideoRef,
    canvasRef: canvasRef || internalCanvasRef,
  };
}

