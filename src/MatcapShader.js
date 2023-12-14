import * as THREE from 'three'

export const MatcapShader = {
  glslVersion: THREE.GLSL3,
  uniforms: {
    matcap: { value: null },
  },
  vertexShader: /* glsl */ `
    out vec3 v_normal;

    void main() {
      v_normal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    in vec3 v_normal;

    uniform sampler2D matcap;
    
    out vec4 fragColor;

    void main() {
      vec2 uv = v_normal.xy * 0.5 + 0.5;
      fragColor = texture(matcap, uv);
    }
  `,
}