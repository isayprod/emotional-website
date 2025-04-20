import { useCallback, useState, useEffect, useRef } from "react";
import "@mediapipe/face_mesh";
import "@tensorflow/tfjs-core";
import "@tensorflow/tfjs-backend-webgl";
// import * as faceapi from "@tensorflow-models/face-detection";
import * as facelandmark from "@tensorflow-models/face-landmarks-detection";
import rough from "roughjs";
import { TRIANGULATION_INDEX } from "./triangulation";
import { Point } from "roughjs/bin/geometry";

const generator = rough.generator();

function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const modelRef = useRef<facelandmark.FaceLandmarksDetector>(null);

  const [modelLoaded, setModelLoaded] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);

  const [detectionStarted, setDetectionStarted] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const loadModel = async () => {
      setModelLoaded(false);
      const model = facelandmark.SupportedModels.MediaPipeFaceMesh;
      const detectorConfig: facelandmark.MediaPipeFaceMeshMediaPipeModelConfig =
        {
          runtime: "mediapipe",
          refineLandmarks: true,
          solutionPath: "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh",
        };
      modelRef.current = await facelandmark.createDetector(
        model,
        detectorConfig
      );
      console.log("Model loaded");
      setModelLoaded(true);
    };
    loadModel();
  }, []);

  const getVideo = () => {
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          video.play();
          setVideoLoaded(true);
        }
      })
      .catch((err) => {
        console.log(err);
      });
  };

  const beginDetection = useCallback(async () => {
    const video = videoRef.current;
    if (video) {
      const detections = await modelRef.current?.estimateFaces(video);
      console.log(detections);
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
        const roughCanvas = rough.canvas(canvas);
        detections?.map((detection) => {
          let j = 0;
          const facialPoints: Array<Array<Point>> = [];
          while (j < TRIANGULATION_INDEX.length - 2) {
            facialPoints.push(
              TRIANGULATION_INDEX.slice(j, j + 3).map((triangleIndex) => [
                detection.keypoints[triangleIndex].x,
                detection.keypoints[triangleIndex].y,
              ])
            );
            j += 3;
          }
          for (const point of facialPoints) {
            const pol = generator.polygon(point as Point[]);
            roughCanvas.draw(pol);
          }
        });
      }
    }
  }, []);

  const toggleDetection = () => {
    setDetectionStarted((prevState) => {
      return !prevState;
    });
  };

  const clear = (id: number) => {
    clearInterval(id);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas?.getContext("2d");
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  useEffect(() => {
    if (detectionStarted) {
      const id = setInterval(() => {
        console.log("detect interval");
        beginDetection();
      }, 40);
      return () => clear(id);
    }
  }, [beginDetection, detectionStarted]);

  return (
    <div className="container">
      <h1>Live with your emotions</h1>
      <div className="buttons">
        <button onClick={getVideo}>Activate the camera</button>
        <button
          onClick={toggleDetection}
          disabled={!(videoLoaded && modelLoaded)}
        >
          {detectionStarted ? "Stop the detection" : "Begin the detection"}
        </button>
      </div>
      <div className="video-container">
        <canvas
          className="landmark-canvas"
          ref={canvasRef}
          width="640"
          height="480"
        ></canvas>
        <video ref={videoRef} width="640" height="480"></video>
      </div>
      <div className="status">
        <p className={modelLoaded ? "loaded" : "loading"}>
          {modelLoaded ? "Model loaded" : "Model loading"}
        </p>
        <p className={videoLoaded ? "loaded" : "loading"}>
          {videoLoaded ? "Video activated" : "Video not activated"}
        </p>
      </div>
    </div>
  );
}

export default App;
