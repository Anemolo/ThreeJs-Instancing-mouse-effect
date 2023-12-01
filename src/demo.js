import "./style.css"
import { gsap } from "gsap"

import { Rendering } from "./rendering"

import * as THREE from "three";
import RoundedBox from './RoundedBox'

class InstancedMouseEffect {
  constructor(opts = {}, follower = null ){


    if(opts.speed == null) {
      opts.speed = 1
    }
    if(opts.frequency == null) {
      opts.frequency = 1
    }
    if(opts.mouseSize == null) {
      opts.mouseSize = 1
    }
    if(opts.rotationSpeed == null) {
      opts.rotationSpeed = 1
    }
    if(opts.rotationAmmount == null) {
      opts.rotationAmmount = 0
    }
    if(opts.mouseScaling == null) {
      opts.mouseScaling = 0
    }
    if(opts.mouseIndent == null) {
      opts.mouseIndent = 1
    }
    if(opts.color == null) {
      opts.color = "#1084ff"
    }
    if(opts.colorDegrade == null) {
      opts.colorDegrade = 1.
    }
    if(opts.shape == null) {
      opts.shape = "square"
    }
    // Renderer up
    let rendering = new Rendering(document.querySelector("#canvas"), false)
    rendering.renderer.shadowMap.enabled = true;
    rendering.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendering.camera.position.z = 40
    rendering.camera.position.y = 40
    rendering.camera.position.x = 40
    rendering.camera.lookAt(new THREE.Vector3(0,0,0))
    this.rendering = rendering;


    //  follower = new THREE.Mesh(
    //    new THREE.BoxGeometry(),
    //    new THREE.MeshPhysicalMaterial({ 
    //      emissive: 0x000000, 
    //      color:  "#ff4080", 
    //      color:  "#2040bb", 
    //      roughness: 0,
    //      metalness: 0.4
    //    })
    //  )
    // rendering.scene.add(follower)

    // let controls = new OrbitControls(rendering.camera, rendering.canvas)

    let uTime = { value: 0 };

    // Light Setup
    rendering.scene.add(new THREE.HemisphereLight(0x9f9f9f, 0xffffff, 1))
    rendering.scene.add(new THREE.AmbientLight(0xffffff, 1))
    let d2 = new THREE.DirectionalLight(0x909090, 1)
    rendering.scene.add(d2)
    d2.position.set( -1, 0.5,  1)
    d2.position.multiplyScalar(10)

    let d1 = new THREE.DirectionalLight(0xffffff, 4)
    rendering.scene.add(d1)
    d1.position.set( 1, 0.5,  1)
    d1.position.multiplyScalar(10)

    d1.castShadow = true
    d1.shadow.camera.left = -10
    d1.shadow.camera.right = 10
    d1.shadow.camera.top = 10
    d1.shadow.camera.bottom = -10
    d1.shadow.camera.far = 40

    d1.shadow.mapSize.width = 2048
    d1.shadow.mapSize.height = 2048

    // DEMO CODE

    let grid = 55;
    let size = .5;
    let gridSize = grid * size

    let geometry = new THREE.BoxGeometry(size, size, size);
    geometry = new RoundedBox(size, size, size, 0.1, 4);
    if(typeof(opts.shape) == "string"){
      switch(opts.shape){
        case "cylinder":
          geometry = new THREE.CylinderGeometry(size, size, size);
        break
        case "torus":
          geometry = new THREE.TorusGeometry(size * 0.5, size * 0.3) 
        break
        case "icosahedron":
          geometry = new THREE.IcosahedronGeometry(size, 0)
        break
      }
    } else {
      geometry = opts.shape;
    }


    let material = new THREE.MeshPhysicalMaterial({ color: opts.color, metalness: 0., roughness: 0.0 })
    let mesh = new THREE.InstancedMesh(geometry, material, grid * grid);

    mesh.castShadow = true
    mesh.receiveShadow = true


    const totalColor = material.color.r + material.color.g + material.color.b;
    const color = new THREE.Vector3()
    const weights = new THREE.Vector3()
    weights.x = material.color.r
    weights.y = material.color.g
    weights.z = material.color.b
    weights.divideScalar(totalColor)
    weights.multiplyScalar(-0.5)
    weights.addScalar(1.)

    let dummy = new THREE.Object3D()

    let i =0;
    for(let x = 0; x < grid; x++)
    for(let y = 0; y < grid; y++){


      dummy.position.set( 
        x * size - gridSize /2 + size / 2., 
        0, 
        y * size - gridSize/2 + size / 2.,
      );

      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)

      let center = 1.- dummy.position.length() * 0.12 * opts.colorDegrade
      color.set( center * weights.x + (1.-weights.x) , center * weights.y + (1.-weights.y) , center * weights.z + (1.-weights.z))
      mesh.setColorAt(i,color)

      i++;
    }
      let vertexHead = glsl`

      uniform float uTime;
      uniform float uAnimate;
      uniform vec2 uPos0;
      uniform vec2 uPos1;
      uniform vec4 uConfig;
      uniform vec4 uConfig2;

      float map(float value, float min1, float max1, float min2, float max2) {
        return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
        }
      mat4 rotationMatrix(vec3 axis, float angle) {
        axis = normalize(axis);
        float s = sin(angle);
        float c = cos(angle);
        float oc = 1.0 - c;
        
        return mat4(oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,  0.0,
                    oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,  0.0,
                    oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c,           0.0,
                    0.0,                                0.0,                                0.0,                                1.0);
    }

    vec3 rotate(vec3 v, vec3 axis, float angle) {
      mat4 m = rotationMatrix(axis, angle);
      return (m * vec4(v, 1.0)).xyz;
    }
    float sdSegment( in vec2 p, in vec2 a, in vec2 b )
    {
        vec2 pa = p-a, ba = b-a;
        float h = clamp( dot(pa,ba)/dot(ba,ba), 0.0, 1.0 );
        return length( pa - ba*h );
    }
        #pragma glslify: ease = require(glsl-easings/cubic-in-out)
        #pragma glslify: ease = require(glsl-easings/cubic-out)
      void main(){
    `
    let projectVertex = glsl`

            vec4 position = instanceMatrix[3];
            float toCenter = length(position.xz) ;


            // float mouseTrail = length(position.xz- uPos0.xy);
            float mouseTrail = sdSegment(position.xz, uPos0, uPos1 );
            mouseTrail = smoothstep(2.0, 5. * uConfig.z , mouseTrail)  ;

            // Mouse Scale
            transformed *= 1. + cubicOut(1.0-mouseTrail) * uConfig2.y;


            // Instance Animation
            float start = 0. + toCenter * 0.02;
            float end = start+  (toCenter + 1.5) * 0.06;
            float anim = (map(clamp(uAnimate, start,end) , start, end, 0., 1.));


            transformed = rotate(transformed, vec3(0., 1., 1. ),uConfig2.x * (anim * 3.14+  uTime * uConfig.x + toCenter * 0.4 * uConfig.w) );

            // Mouse Offset
            transformed.y += (-1.0 * (1.-mouseTrail)) * uConfig2.z;

            transformed.xyz *= cubicInOut(anim);
            transformed.y += cubicInOut(1.-anim) * 1.;

            transformed.y += sin(uTime * 2. * uConfig.x + toCenter * uConfig.y) * 0.1;

            vec4 mvPosition = vec4( transformed, 1.0 );

            #ifdef USE_INSTANCING

              mvPosition = instanceMatrix * mvPosition;

            #endif

            mvPosition = modelViewMatrix * mvPosition;

            gl_Position = projectionMatrix * mvPosition;
    `
    let uniforms = {
      uTime: uTime,
      uPos0: {value: new THREE.Vector2()},
      uPos1: {value: new THREE.Vector2()},
      uAnimate: {value: 0},
      uConfig: { value: new THREE.Vector4(opts.speed, opts.frequency, opts.mouseSize, opts.rotationSpeed)},
      uConfig2: { value: new THREE.Vector4(opts.rotationAmmount, opts.mouseScaling, opts.mouseIndent)}
    }
    mesh.material.onBeforeCompile = (shader)=>{
      shader.vertexShader = shader.vertexShader.replace("void main() {", vertexHead)
      shader.vertexShader = shader.vertexShader.replace("#include <project_vertex>", projectVertex)
      shader.uniforms = {
        ...shader.uniforms, 
        ...uniforms,
      }
    }


    mesh.customDepthMaterial = new THREE.MeshDepthMaterial()
    mesh.customDepthMaterial.onBeforeCompile = (shader)=>{
      shader.vertexShader = shader.vertexShader.replace("void main() {", vertexHead)
      shader.vertexShader = shader.vertexShader.replace("#include <project_vertex>", projectVertex)
      shader.uniforms = {
        ...shader.uniforms, 
        ...uniforms,
      }
    }
    mesh.customDepthMaterial.depthPacking = THREE.RGBADepthPacking
    rendering.scene.add(mesh)


    let t1= gsap.timeline()
    t1.to(uniforms.uAnimate, {
      value: 1,
      duration: 3.0,
      ease: "none"
    }, 0.0)
    if(follower){

    t1.from(follower.scale, 
        {x: 0, y: 0, z: 0, duration: 1, ease: "back.out"},
        1,
      )
    }
    this.animation = t1;

    // Events
    const hitplane = new THREE.Mesh(
      new THREE.PlaneGeometry(),
      new THREE.MeshBasicMaterial()
    ) 
    hitplane.scale.setScalar(20)
    hitplane.rotation.x = -Math.PI/2
    hitplane.updateMatrix()
    hitplane.updateMatrixWorld()
    let raycaster = new THREE.Raycaster()

    let mouse = new THREE.Vector2()
    let v2 = new THREE.Vector2()
    window.addEventListener('mousemove', (ev)=>{
      let x = ev.clientX / window.innerWidth - 0.5
      let y = ev.clientY / window.innerHeight - 0.5

      v2.x = x *2;
      v2.y = -y *2;
      raycaster.setFromCamera(v2,rendering.camera)

      let intersects = raycaster.intersectObject(hitplane)

      if(intersects.length > 0){
        let first = intersects[0]
        mouse.x = first.point.x
        mouse.y = first.point.z
        // mouse.copy(first.point)
      }

    })

    let vel = new THREE.Vector2()
    const tick = (t, delta)=>{
      uTime.value = t 

      let v3 = new THREE.Vector2()
      v3.copy(mouse)
      v3.sub(uniforms.uPos0.value)
      v3.multiplyScalar(0.08)
      uniforms.uPos0.value.add(v3)

      // Calculate the change/velocity
      v3.copy(uniforms.uPos0.value)
      v3.sub(uniforms.uPos1.value)
      v3.multiplyScalar(0.05)

      // Lerp the change as well
      v3.sub(vel)
      v3.multiplyScalar(0.05)
      vel.add(v3)

      // Add the lerped velocity
      uniforms.uPos1.value.add(vel)

      if(follower ){
        follower.position.x = uniforms.uPos0.value.x
        follower.position.z = uniforms.uPos0.value.y
        follower.rotation.x = t 
        follower.rotation.y = t 
      }

      rendering.render()

    }

    gsap.ticker.add(tick)

  }
}

if(process.env.NODE_ENV === "development"){
  new InstancedMouseEffect()
}

export default InstancedMouseEffect

window.InstancedMouseEffect = InstancedMouseEffect
