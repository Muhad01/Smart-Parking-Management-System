declare module "@react-three/fiber" {
  export const Canvas: any
}

declare module "@react-three/drei" {
  export const OrbitControls: any
  export const Float: any
}

declare module "framer-motion" {
  export const motion: any
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      ambientLight: any
      directionalLight: any
      mesh: any
      boxGeometry: any
      meshStandardMaterial: any
    }
  }
}









