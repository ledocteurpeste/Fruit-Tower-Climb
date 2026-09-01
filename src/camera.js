import { cam as camState } from './state.js';

export const VFOV_RAD = 1.05;

export function cameraEye(player, cam) {
  const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
  return {
    eye: [
      player.x + Math.sin(cam.yaw) * cam.dist * cp,
      player.y + 1.5 + cam.dist * sp,
      player.z + Math.cos(cam.yaw) * cam.dist * cp,
    ],
    look: [player.x, player.y + 0.7, player.z],
  };
}

export function applyCamera(threeCamera, player) {
  const { eye, look } = cameraEye(player, camState);
  threeCamera.position.set(eye[0], eye[1], eye[2]);
  threeCamera.lookAt(look[0], look[1], look[2]);
}

export function recenterCam() { camState.yaw = Math.PI; camState.pitch = 0.42; }
