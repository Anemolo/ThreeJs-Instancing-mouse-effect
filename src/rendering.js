
import { BloomEffect, EffectComposer, EffectPass, NormalPass, OverrideMaterialManager, RenderPass, SSAOEffect, ToneMappingEffect } from "postprocessing";
import * as THREE from "three";
import Stats from 'stats-js'

let stats = new Stats()
// document.body.append(stats.dom)

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import { N8AOPostPass } from "n8ao";

export class Rendering {
  constructor(canvas, usePostProcess = false) {
    this.canvas = canvas;
    // let hex = "#"+ palette.highlight.getHexString()
    // document.documentElement.style.setProperty("--text", hex);



    this.vp = {
      canvas: {
        width: canvas.offsetWidth,
        height: canvas.offsetHeight,
        dpr: Math.min(window.devicePixelRatio, 1.5)
      },
      scene: {
        width: 1,
        height: 1
      },
      screen: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
    }
    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      canvas,
      stencil: false,
    });

    this.renderer.setSize(this.vp.canvas.width, this.vp.canvas.height, false);
    this.renderer.setPixelRatio(this.vp.canvas.dpr);

    let size = 4
    let ratio = this.vp.canvas.width / this.vp.canvas.height;
    let ratioW = this.vp.canvas.height / this.vp.canvas.width;

    if(ratio > ratioW){
      ratioW = 1;
    } else {
      ratio = 1;
    }

    this.camera = new THREE.OrthographicCamera(-size * ratio, size * ratio,size * ratioW ,-size  * ratioW , 0.001, 1000)


    this.scene = new THREE.Scene();

    // this.scene.background = palette.BG.clone()

    this.clock = new THREE.Clock();

    // this.vp.scene = this.getViewSizeAtDepth();

    this.disposed = false;
    // this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace
    OverrideMaterialManager.workaroundEnabled = true;
    if(usePostProcess){
      const composer = new EffectComposer(this.renderer);
      composer.addPass(new RenderPass(this.scene, this.camera));

      // const normalPass = new NormalPass(this.scene, this.camera, {resolutionScale: 0.75});
      // normalPass.renderPass.overrideMaterialManager.render = function (renderer, scene, camera) {
      //
      //
      //   // Ignore shadows.
      //   const shadowMapEnabled = renderer.shadowMap.enabled;
      //   renderer.shadowMap.enabled = false;
      //
      //   if(OverrideMaterialManager.workaroundEnabled) {
      //
      //
      //     const originalMaterials = this.originalMaterials;
      //
      //     this.meshCount = 0;
      //     scene.traverse((node) => {
      //       this.replaceMaterial(node)
      //       if(!node.isMesh) return;
      //       if(node.customNormalMaterial){
      //         node.material = node.customNormalMaterial;
      //       }
      //     });
      //     renderer.render(scene, camera);
      //
      //     for(const entry of originalMaterials) {
      //
      //       entry[0].material = entry[1];
      //
      //     }
      //
      //     if(this.meshCount !== originalMaterials.size) {
      //
      //       originalMaterials.clear();
      //
      //     }
      //
      //   } else {
      //
      //     const overrideMaterial = scene.overrideMaterial;
      //     scene.overrideMaterial = this.material;
      //     renderer.render(scene, camera);
      //     scene.overrideMaterial = overrideMaterial;
      //
      //   }
      //
      //   renderer.shadowMap.enabled = shadowMapEnabled;
      //
      // }

      // composer.addPass(normalPass)
      // composer.addPass(new EffectPass(this.camera, new SSAOEffect(this.camera, normalPass.texture, {resolutionScale: 0.75, intensity: 2, color: new THREE.Color(0x000000), radius: 0.020, samples: 10, rings: 4 })));
      //
      const n8aopass = new N8AOPostPass(
        this.scene,
        this.camera,
        this.vp.canvas.width ,
        this.vp.canvas.height 
      );
      n8aopass.configuration.aoRadius = 0.2;
      n8aopass.configuration.distanceFalloff = 0.5;
      n8aopass.configuration.intensity = 20.0;
      n8aopass.configuration.color = new THREE.Color(0, 0, 0);
      n8aopass.configuration.aoSamples = 8;
      n8aopass.configuration.denoiseSamples = 4;
      n8aopass.configuration.denoiseRadius = 12;
      n8aopass.configuration.halfRes = true;
      n8aopass.setQualityMode("Medium")

      n8aopass.configuration.halfRes = true;


      n8aopass.screenSpaceRadius = true
      composer.addPass(n8aopass)
      // n8aopass.setDisplayMode("Split");
      // composer.addPass(new EffectPass(this.camera, new ToneMappingEffect({ mode: THREE.ACESFilmicToneMapping })));
      
      
      this.composer = composer
    }
    this.usePostProcess = usePostProcess;


    this.addEvents(); 
  }
  addEvents() {
    window.addEventListener("resize", this.onResize);
  }
  dispose() {}
  getViewSizeAtDepth(depth = 0) {
    const fovInRadians = (this.camera.fov * Math.PI) / 180;
    const height = Math.abs(
      (this.camera.position.z - depth) * Math.tan(fovInRadians / 2) * 2
    );
    return { width: height * this.camera.aspect, height };
  }
  init() { }
  render() {
    stats.begin()
    if(this.usePostProcess){
      this.composer.render()
    } else {
      this.renderer.render(this.scene, this.camera);
    }
    stats.end()
  }
  onResize = () => {
    let canvas = this.canvas
    this.vp.canvas.width = canvas.offsetWidth;
    this.vp.canvas.height = canvas.offsetHeight;
    this.vp.canvas.dpr = Math.min(window.devicePixelRatio, 2);

    this.vp.scene.width = window.innerWidth;
    this.vp.scene.height = window.innerHeight;

    this.renderer.setSize(this.vp.canvas.width, this.vp.canvas.height, false);

    let size = 4
    let ratio = this.vp.canvas.width / this.vp.canvas.height;
    let ratioW = this.vp.canvas.height / this.vp.canvas.width;

    if(ratio > ratioW){
      ratioW = 1;
    } else {
      ratio = 1;
    }

    this.camera.left = -size * ratio
    this.camera.right = size * ratio
    this.camera.top = size * ratioW
    this.camera.bottom = -size * ratioW

    // this.camera.aspect = this.vp.canvas.width / this.vp.canvas.height;
    this.camera.updateProjectionMatrix();

    this.vp.scene = this.getViewSizeAtDepth();
  }
}

// let a = new Demo(GL.canvas);
// a.init();
